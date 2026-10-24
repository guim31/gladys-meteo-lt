// -----------------------------------------------------------------------------
// The JSON of Meteo.lt → the slim forecast and the current observation, on
// the real answers of 2026-10-24 (Vilnius, Kaunas, Klaipėda).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseForecast, parseUtc } from '../src/forecast.js';
import { isFresh, readObservation } from '../src/observations.js';
import { HOUR_MS } from '../src/time.js';
import {
  FIXTURE_NOW,
  HOUSES,
  forecastJson,
  forecastOf,
  observationsJson,
} from './helpers/fixtures.js';

const FIRST_STEP = Date.parse('2026-10-24T02:00:00Z');
const STATION = { code: 'vilniaus-ams', name: 'Vilniaus AMS', distanceKm: 13.2 };

test('the real answers are read: place, creation time, 7 days of 1, 3 and 6-hour steps', () => {
  for (const house of [HOUSES.vilnius, HOUSES.kaunas, HOUSES.klaipeda]) {
    const forecast = forecastOf(house);
    assert.equal(forecast.place.code, house.place);
    assert.ok(Math.abs(forecast.place.latitude - house.latitude) < 0.001);
    assert.equal(forecast.updatedAt, Date.parse('2026-10-24T02:17:32Z'));
    assert.equal(forecast.points.length, 85);
    assert.equal(forecast.points[0].time, FIRST_STEP);
    assert.equal(forecast.points.at(-1).time, Date.parse('2026-10-31T00:00:00Z'));
    const steps = {};
    for (const point of forecast.points.slice(0, -1)) {
      steps[point.period.hours] = (steps[point.period.hours] ?? 0) + 1;
    }
    assert.deepEqual(steps, { 1: 52, 3: 26, 6: 6 });
    // The hourly steps come first.
    const firstLong = forecast.points.findIndex((point) => point.period.hours > 1);
    assert.ok(forecast.points.slice(0, firstLong).every((point) => point.next1 !== null));
    assert.ok(forecast.points.slice(firstLong).every((point) => point.next1 === null));
  }
  assert.equal(forecastOf(HOUSES.klaipeda).place.name, 'Klaipėda');
});

test('a step carries the air; the period it ends, the condition, the rain and the gust', () => {
  const { points } = forecastOf(HOUSES.vilnius);
  const [first, second] = points;
  assert.equal(first.temperature, 5.7);
  assert.equal(first.apparentTemperature, 3.3);
  assert.equal(first.humidity, 94);
  assert.equal(first.pressure, 1021);
  assert.equal(first.windSpeed, 3);
  assert.equal(first.windDirection, 163);
  assert.equal(first.cloudCover, 99);
  assert.equal(first.dewPoint, null);
  assert.equal(first.uvIndex, null);
  // 02:00-03:00 is read from the step of 03:00.
  assert.deepEqual(first.period, {
    hours: 1,
    symbol: 'cloudy',
    precipitation: 0,
    probability: null,
    gust: second.windGust,
  });
  assert.equal(first.next1, first.period);
  assert.equal(points.at(-1).period, null);
  // A 3-hour period sums the rain of its 3 hours: Klaipėda, 26/10 15:00-18:00.
  const rainy = forecastOf(HOUSES.klaipeda).points.find(
    (point) => point.time === Date.parse('2026-10-26T15:00:00Z'),
  );
  assert.deepEqual(
    { hours: rainy.period.hours, symbol: rainy.period.symbol, mm: rainy.period.precipitation },
    { hours: 3, symbol: 'rain', mm: 2.4 },
  );
});

test('without steps, or with a foreign body, there is no forecast', () => {
  assert.throws(() => parseForecast(null), /no forecast/);
  assert.throws(() => parseForecast({ error: { code: 404 } }), /no forecast/);
  const answer = forecastJson(HOUSES.vilnius);
  for (const step of answer.forecastTimestamps) {
    step.airTemperature = null;
  }
  assert.throws(() => parseForecast(answer), /no forecast/);
});

test('the UTC times of Meteo.lt are read strictly', () => {
  assert.equal(parseUtc('2026-10-24 02:00:00'), FIRST_STEP);
  assert.equal(parseUtc('2026-10-24T02:00'), FIRST_STEP);
  assert.equal(parseUtc('24/10/2026'), null);
  assert.equal(parseUtc(null), null);
});

test('the latest reading of the station is the observation, with its own condition', () => {
  const vilnius = readObservation(observationsJson(HOUSES.vilnius), STATION);
  assert.deepEqual(vilnius, {
    station: { ...STATION, latitude: undefined, longitude: undefined },
    time: Date.parse('2026-10-24T04:00:00Z'),
    temperature: 6.1,
    apparentTemperature: 4.9,
    humidity: 99,
    pressure: 1020.5,
    windSpeed: 1.7,
    windDirection: 114,
    windGust: 5.1,
    // In fog, the station cannot see the clouds.
    cloudCover: null,
    precipitation1h: 0,
    snowDepth: 0,
    symbol: 'fog',
  });
  assert.equal(isFresh(vilnius, FIXTURE_NOW), true);
  assert.equal(isFresh(vilnius, FIXTURE_NOW + 3 * HOUR_MS), false);
  assert.equal(isFresh(null, FIXTURE_NOW), false);
});

test('a reading without temperature is skipped; no reading at all gives no observation', () => {
  const answer = observationsJson(HOUSES.kaunas);
  const latest = answer.observations.at(-1);
  latest.airTemperature = null;
  const reading = readObservation(answer, STATION);
  assert.equal(reading.time, parseUtc(latest.observationTimeUtc) - HOUR_MS);
  assert.equal(readObservation({ observations: [] }, STATION), null);
  assert.equal(readObservation(null, STATION), null);
});
