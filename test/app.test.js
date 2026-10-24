// -----------------------------------------------------------------------------
// The whole integration against the fake Gladys of the SDK and real Meteo.lt
// answers: weather requests, scene actions, trigger, test action, statuses.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createApp } from '../src/app.js';
import { MESSAGES } from '../src/texts.js';
import {
  FIXTURE_NOW,
  HOUSES,
  asGladysHouse,
  fakeFetch,
  forecastJson,
  manualClock,
  meteoLtRoute,
  silentLogger,
  withHours,
} from './helpers/fixtures.js';

const MINUTE = 60 * 1000;

/**
 * @param {object} [options] - { houses, config, route }.
 * @returns {Promise<object>} { gladys, app, fetchImpl, now }.
 */
async function start({ houses = [HOUSES.vilnius], config = {}, route } = {}) {
  const now = manualClock(FIXTURE_NOW);
  const fetchImpl = fakeFetch(route ?? meteoLtRoute());
  const gladys = createFakeGladys({ houses: houses.map(asGladysHouse), config });
  const app = createApp(gladys, {
    fetchImpl,
    now,
    random: () => 0,
    timeZone: 'Europe/Vilnius',
    logger: silentLogger(),
    // No real timer: the tests must not keep the process alive.
    setTimer: () => ({}),
    clearTimer: () => {},
  });
  await gladys.connect();
  await app.scheduler.settled();
  return { gladys, app, fetchImpl, now };
}

const forecastCalls = (fetchImpl) =>
  fetchImpl.calls.filter((call) => call.url.endsWith('/forecasts/long-term'));
const observationCalls = (fetchImpl) =>
  fetchImpl.calls.filter((call) => call.url.endsWith('/observations/latest'));
const listCalls = (fetchImpl) =>
  fetchImpl.calls.filter((call) => /\/(places|stations)$/.test(call.url));

test('at connection, the lists once, then a forecast and a reading per house; no device', async () => {
  const { gladys, fetchImpl } = await start({ houses: [HOUSES.vilnius, HOUSES.kaunas] });
  assert.equal(listCalls(fetchImpl).length, 2, 'places and stations, once for every house');
  assert.equal(forecastCalls(fetchImpl).length, 2);
  assert.equal(observationCalls(fetchImpl).length, 2);
  assert.deepEqual(gladys.fake.connectionStatus, { connected: true });
  // A weather provider: no device, no state (no conformity test of devices
  // to run here).
  assert.deepEqual(gladys.fake.discoveredDevices, []);
  assert.deepEqual(gladys.fake.states, []);
});

test('a weather request is answered from memory: station and forecast, no alerts', async () => {
  const { gladys, fetchImpl } = await start({ houses: [HOUSES.vilnius, HOUSES.klaipeda] });
  const calls = fetchImpl.calls.length;
  const ack = await gladys.fake.weatherGet({
    latitude: HOUSES.vilnius.latitude,
    longitude: HOUSES.vilnius.longitude,
    language: 'en',
    units: 'metric',
  });
  assert.equal(ack.success, true, ack.error);
  const { weather } = ack.data;
  assert.equal(weather.temperature, 6.1, 'Vilniaus AMS');
  assert.equal(weather.weather, 'fog');
  assert.equal(weather.hours.length, 24);
  assert.equal(weather.days.length, 7);
  assert.equal(weather.alerts, undefined);
  assert.equal(fetchImpl.calls.length, calls, 'no new call');

  const seaside = await gladys.fake.weatherGet({
    latitude: HOUSES.klaipeda.latitude,
    longitude: HOUSES.klaipeda.longitude,
    language: 'en',
    units: 'us',
  });
  assert.equal(seaside.success, true);
  assert.equal(seaside.data.weather.temperature, 45.7, 'Klaipėdos AMS, 7.6 °C');
});

test('outside the area of Meteo.lt, the core falls through to another provider', async () => {
  const { gladys, fetchImpl } = await start();
  const calls = fetchImpl.calls.length;
  const ack = await gladys.fake.weatherGet({
    latitude: HOUSES.paris.latitude,
    longitude: HOUSES.paris.longitude,
    language: 'fr',
    units: 'metric',
  });
  assert.equal(ack.success, false);
  assert.equal(fetchImpl.calls.length, calls, 'no call: no place near Paris');
  const noLocation = await gladys.fake.weatherGet({ language: 'en', units: 'metric' });
  assert.equal(noLocation.success, false);
});

test('only a house abroad: the status says no forecast', async () => {
  const { gladys } = await start({ houses: [HOUSES.paris] });
  assert.deepEqual(gladys.fake.connectionStatus, {
    connected: false,
    message: MESSAGES.noForecast,
  });
});

test('no located house: the status says where to set it', async () => {
  const { gladys, fetchImpl } = await start({ houses: [] });
  assert.equal(forecastCalls(fetchImpl).length, 0);
  assert.deepEqual(gladys.fake.connectionStatus, {
    connected: false,
    message: MESSAGES.noLocation,
  });
});

test('a refusal (403) shows in the status', async () => {
  const { gladys } = await start({ route: () => ({ status: 403, body: 'Forbidden' }) });
  assert.deepEqual(gladys.fake.connectionStatus, {
    connected: false,
    message: MESSAGES.forbidden,
  });
});

test('without observations, the forecast still answers', async () => {
  const base = meteoLtRoute();
  const { gladys } = await start({
    route: (url) => (url.includes('observations') ? { status: 503, body: '' } : base(url)),
  });
  assert.deepEqual(gladys.fake.connectionStatus, { connected: true });
  const ack = await gladys.fake.weatherGet({
    latitude: HOUSES.vilnius.latitude,
    longitude: HOUSES.vilnius.longitude,
    language: 'en',
    units: 'metric',
  });
  assert.equal(ack.data.weather.temperature, 5.3, 'the forecast of the hour');
  assert.equal(ack.data.weather.datetime, '2026-10-24T04:00:00.000Z');
});

test('the scene actions answer in the language and the units set', async () => {
  const { gladys } = await start({
    houses: [HOUSES.vilnius, HOUSES.kaunas],
    config: { language: 'es', units: 'us' },
  });
  const nextHour = await gladys.fake.sceneAction('get_precipitation_next_hour', { house: 'home' });
  assert.deepEqual(nextHour.data.outputs, {
    available: true,
    precipitation_expected: false,
    summary: 'No se esperan precipitaciones en la próxima hora.',
  });
  const tomorrow = await gladys.fake.sceneAction('get_day_forecast', {
    house: 'cottage',
    day: 'tomorrow',
  });
  assert.equal(tomorrow.success, true);
  assert.match(tomorrow.data.outputs.summary, /^Mañana: .* °F/);
  const unknown = await gladys.fake.sceneAction('get_day_forecast', { house: 'nowhere' });
  assert.equal(unknown.success, false);
});

test('the precipitation trigger fires through Gladys when rain comes into the hour', async () => {
  let wet = false;
  const route = meteoLtRoute({
    forecast: (house) =>
      wet
        ? withHours(forecastJson(house), {
            '2026-10-24T05:00:00Z': { condition: 'light-rain', amount: 0.4 },
          })
        : forecastJson(house),
  });
  const { gladys, app, now } = await start({
    houses: [HOUSES.kaunas],
    route,
    config: { language: 'en' },
  });
  wet = true;
  now.advance(31 * MINUTE);
  await app.scheduler.requestCycle();
  assert.deepEqual(gladys.fake.sceneEvents, [
    {
      key: 'precipitation_expected',
      data: {
        house: 'cottage',
        house_name: 'Cottage',
        // 04:46 UTC: the rain of 05:00 starts in 14 minutes.
        summary: 'Light rain expected in 14 minutes.',
        minutes_until: 14,
        precipitation_type: 'rain',
        intensity: 'light',
        thunder: false,
        precipitation: 0.4,
      },
    },
  ]);
});

test('the test action reports the station and the place, in four languages', async () => {
  const { gladys } = await start();
  const ack = await gladys.fake.action('test_connection', {});
  assert.equal(ack.success, true, ack.error);
  const { message } = ack.data;
  assert.equal(
    message.en,
    'It works: 43 °F (6.1 °C) now at Home (station Vilniaus AMS), forecast for Vilnius of 05:17.',
  );
  assert.equal(
    message.fr,
    'Ça fonctionne : 6,1 °C en ce moment à Home (station Vilniaus AMS), prévision pour Vilnius de 05:17.',
  );
  assert.deepEqual(Object.keys(message).sort(), ['de', 'en', 'es', 'fr']);
});

test('after a network failure, readers do not pay the timeout again at once', async () => {
  let down = true;
  const base = meteoLtRoute();
  const { gladys, fetchImpl } = await start({
    route: (url) => (down && url.includes('forecast') ? { status: 503, body: '' } : base(url)),
  });
  const before = forecastCalls(fetchImpl).length;
  down = false;
  const ack = await gladys.fake.weatherGet({
    latitude: HOUSES.vilnius.latitude,
    longitude: HOUSES.vilnius.longitude,
    language: 'en',
    units: 'metric',
  });
  assert.equal(ack.success, false, 'within 2 minutes: the failure is served');
  assert.equal(forecastCalls(fetchImpl).length, before);
});

test('a throttled list (429) pauses every call, and shows in the status', async () => {
  const base = meteoLtRoute();
  const { gladys, fetchImpl } = await start({
    route: (url) => (url.endsWith('/places') ? { status: 429, body: '' } : base(url)),
  });
  assert.deepEqual(gladys.fake.connectionStatus, {
    connected: false,
    message: MESSAGES.throttled,
  });
  assert.equal(forecastCalls(fetchImpl).length, 0);
});
