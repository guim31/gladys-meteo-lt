// -----------------------------------------------------------------------------
// The Meteo.lt client and the catalog of places and stations, against real
// answers.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_URL,
  ERROR_KINDS,
  USER_AGENT,
  checkCode,
  fetchForecast,
  fetchObservations,
  fetchPlaces,
  fetchStations,
  readReason,
  readRetryAfter,
} from '../src/api.js';
import { MAX_PLACE_DISTANCE_KM, createCatalog, distanceKm, slimList } from '../src/catalog.js';
import { FIXTURE_NOW, HOUSES, fakeFetch, loadText, meteoLtRoute } from './helpers/fixtures.js';

test('the User-Agent names the integration, its version and a contact', () => {
  assert.match(USER_AGENT, /^gladys-meteo-lt\/\d+\.\d+\.\d+ github\.com\/guim31\/gladys-meteo-lt$/);
});

test('the four requests hit the documented addresses, with the User-Agent', async () => {
  const fetchImpl = fakeFetch(meteoLtRoute());
  const places = await fetchPlaces({ fetchImpl });
  const stations = await fetchStations({ fetchImpl });
  const forecast = await fetchForecast('vilnius', { fetchImpl });
  const observations = await fetchObservations('vilniaus-ams', { fetchImpl });
  assert.equal(places.length, 2444);
  assert.equal(stations.length, 52);
  assert.equal(forecast.place.code, 'vilnius');
  assert.equal(observations.station.code, 'vilniaus-ams');
  assert.deepEqual(
    fetchImpl.calls.map((call) => call.url),
    [
      `${API_URL}/places`,
      `${API_URL}/stations`,
      `${API_URL}/places/vilnius/forecasts/long-term`,
      `${API_URL}/stations/vilniaus-ams/observations/latest`,
    ],
  );
  assert.equal(API_URL, 'https://api.meteo.lt/v1');
  for (const call of fetchImpl.calls) {
    assert.equal(call.headers['user-agent'], USER_AGENT);
  }
});

test('an unknown code gets the real 404, with its reason; a strange code is never sent', async () => {
  const fetchImpl = fakeFetch(meteoLtRoute());
  await assert.rejects(
    fetchForecast('nowhere', { fetchImpl }),
    (err) =>
      err.kind === ERROR_KINDS.REQUEST &&
      err.status === 404 &&
      err.message === 'Meteo.lt answered HTTP 404: Not Found',
  );
  assert.throws(
    () => checkCode('../stations'),
    (err) => err.kind === ERROR_KINDS.REQUEST,
  );
  await assert.rejects(fetchObservations('a/b?c', { fetchImpl }));
  assert.equal(fetchImpl.calls.length, 1);
});

test('failures are classified', async () => {
  for (const [status, kind] of [
    [400, ERROR_KINDS.REQUEST],
    [429, ERROR_KINDS.THROTTLED],
    [403, ERROR_KINDS.FORBIDDEN],
    [502, ERROR_KINDS.UPSTREAM],
  ]) {
    await assert.rejects(
      fetchForecast('vilnius', { fetchImpl: fakeFetch(() => ({ status, body: '<html>' })) }),
      (err) => err.kind === kind && err.status === status,
    );
  }
  await assert.rejects(
    fetchStations({
      fetchImpl: () =>
        Promise.reject(Object.assign(new Error('x'), { cause: { code: 'ENOTFOUND' } })),
    }),
    (err) => err.kind === ERROR_KINDS.NETWORK && /ENOTFOUND/.test(err.message),
  );
  await assert.rejects(
    fetchForecast('vilnius', { fetchImpl: fakeFetch(() => ({ body: '<html>' })) }),
    (err) => err.kind === ERROR_KINDS.INVALID,
  );
  await assert.rejects(
    fetchPlaces({ fetchImpl: fakeFetch(() => ({ body: { places: [] } })) }),
    (err) => err.kind === ERROR_KINDS.INVALID,
  );
});

test('Retry-After and error reasons are read safely', () => {
  assert.equal(readRetryAfter('120', 0), 120000);
  assert.equal(readRetryAfter(null, 0), null);
  assert.equal(readRetryAfter('Thu, 01 Jan 1970 00:01:00 GMT', 0), 60000);
  assert.equal(readReason(loadText('real-not-found.json')), 'Not Found');
  assert.equal(readReason('<html>404</html>'), null);
  assert.equal(readReason('{"error":{}}'), null);
});

test('the catalog finds the recorded place and station of each house', async () => {
  const catalog = createCatalog({ fetchImpl: fakeFetch(meteoLtRoute()), now: () => FIXTURE_NOW });
  await catalog.load();
  for (const house of [HOUSES.vilnius, HOUSES.kaunas, HOUSES.klaipeda]) {
    assert.equal(catalog.placeFor(house.latitude, house.longitude).code, house.place);
    assert.equal(catalog.stationFor(house.latitude, house.longitude).code, house.station);
  }
  assert.equal(
    catalog.stationFor(HOUSES.vilnius.latitude, HOUSES.vilnius.longitude).distanceKm,
    13.2,
  );
  // Riga and Warsaw are places of Meteo.lt; Paris is not near any.
  assert.equal(catalog.placeFor(56.9496, 24.1052).code, 'riga');
  assert.equal(catalog.placeFor(HOUSES.paris.latitude, HOUSES.paris.longitude), null);
  assert.equal(catalog.stationFor(HOUSES.paris.latitude, HOUSES.paris.longitude), null);
});

test('the catalog is read once a day, and kept when a later reading fails', async () => {
  let failing = false;
  let now = FIXTURE_NOW;
  const base = meteoLtRoute();
  const fetchImpl = fakeFetch((url) => (failing ? { status: 503 } : base(url)));
  const catalog = createCatalog({ fetchImpl, now: () => now });
  await Promise.all([catalog.load(), catalog.load()]);
  await catalog.load();
  assert.equal(fetchImpl.calls.length, 2);
  failing = true;
  now += 25 * 60 * 60 * 1000;
  await catalog.load();
  assert.equal(fetchImpl.calls.length, 4);
  assert.equal(catalog.placeFor(HOUSES.kaunas.latitude, HOUSES.kaunas.longitude).code, 'kaunas');
  // Without any list, the error goes up.
  const empty = createCatalog({ fetchImpl, now: () => now });
  await assert.rejects(empty.load(), (err) => err.kind === ERROR_KINDS.UPSTREAM);
  assert.equal(empty.loaded, false);
});

test('entries without code or coordinates are dropped; distances are great-circle', () => {
  assert.deepEqual(
    slimList([
      { code: 'a', name: 'A', coordinates: { latitude: 55, longitude: 24 } },
      { code: 'b', coordinates: { latitude: null, longitude: 24 } },
      { name: 'C', coordinates: { latitude: 55, longitude: 24 } },
    ]),
    [{ code: 'a', name: 'A', latitude: 55, longitude: 24 }],
  );
  assert.ok(Math.abs(distanceKm(54.687, 25.2829, 54.8982, 23.9045) - 91.6) < 1);
  assert.equal(MAX_PLACE_DISTANCE_KM, 30);
});
