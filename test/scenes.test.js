// -----------------------------------------------------------------------------
// Scene actions and the precipitation trigger, on the real answers of
// 2026-10-24 (showers staged by withHours()).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseForecast } from '../src/forecast.js';
import { readNextHour } from '../src/next-hour.js';
import { dayForecast, precipitationNextHour } from '../src/scene-actions.js';
import { createPrecipitationWatcher } from '../src/scene-triggers.js';
import {
  FIXTURE_NOW,
  HOUSES,
  forecastJson,
  forecastOf,
  silentLogger,
  withHours,
} from './helpers/fixtures.js';

const TZ = 'Europe/Vilnius';
const MINUTE = 60 * 1000;

test('a dry next hour, read from the hour under way and the next one', () => {
  const reading = readNextHour(forecastOf(HOUSES.vilnius), FIXTURE_NOW);
  assert.equal(reading.available, true);
  assert.equal(reading.minutesUntil, null);
  const outputs = precipitationNextHour(forecastOf(HOUSES.vilnius), {
    language: 'fr',
    units: 'metric',
    now: FIXTURE_NOW,
  });
  assert.deepEqual(outputs, {
    available: true,
    precipitation_expected: false,
    summary: 'Pas de précipitations prévues dans l’heure.',
  });
});

test('the real rain of Klaipėda on Sunday afternoon is announced 30 minutes ahead', () => {
  const outputs = precipitationNextHour(forecastOf(HOUSES.klaipeda), {
    language: 'en',
    units: 'metric',
    now: Date.parse('2026-10-25T13:30:00Z'),
  });
  assert.equal(outputs.precipitation_expected, true);
  assert.equal(outputs.minutes_until, 30);
  assert.equal(outputs.precipitation_type, 'rain');
  assert.equal(outputs.intensity, 'moderate');
  assert.equal(outputs.precipitation, 0.5);
  // Meteo.lt gives no probability: the output is left out.
  assert.equal(Object.hasOwn(outputs, 'probability'), false);
  assert.equal(outputs.summary, 'Moderate rain expected in 30 minutes.');
});

test('light rain at 05:00 UTC is announced 45 minutes ahead; in US units', () => {
  const forecast = parseForecast(
    withHours(forecastJson(HOUSES.vilnius), {
      '2026-10-24T05:00:00Z': { condition: 'light-rain', amount: 1.2 },
    }),
  );
  const outputs = precipitationNextHour(forecast, {
    language: 'en',
    units: 'us',
    now: FIXTURE_NOW,
  });
  assert.equal(outputs.minutes_until, 45);
  assert.equal(outputs.intensity, 'light');
  assert.equal(outputs.precipitation, 0.05);
  assert.equal(outputs.summary, 'Light rain expected in 45 minutes.');
});

test('beyond the hourly steps, the next hour is not available', () => {
  const outputs = precipitationNextHour(forecastOf(HOUSES.vilnius), {
    language: 'es',
    units: 'metric',
    now: Date.parse('2026-10-29T10:00:00Z'),
  });
  assert.deepEqual(outputs, {
    available: false,
    precipitation_expected: false,
    summary: 'Ninguna previsión horaria cubre la próxima hora.',
  });
});

test('the forecast of tomorrow, in German, without probability', () => {
  const outputs = dayForecast(forecastOf(HOUSES.vilnius), {
    house: HOUSES.vilnius,
    day: 'tomorrow',
    language: 'de',
    units: 'metric',
    timeZone: TZ,
    now: FIXTURE_NOW,
  });
  assert.equal(outputs.available, true);
  assert.deepEqual(
    [outputs.temperature_min, outputs.temperature_max, outputs.precipitation],
    [5.7, 11.7, 0],
  );
  assert.equal(Object.hasOwn(outputs, 'precipitation_probability'), false);
  assert.equal(typeof outputs.wind_gust, 'number');
  assert.equal(outputs.summary, 'Morgen: Klarer Himmel, 5,7 bis 11,7 °C, kein Niederschlag.');
});

test('the rainy Sunday of Vilnius, in French', () => {
  const outputs = dayForecast(forecastOf(HOUSES.vilnius), {
    house: HOUSES.vilnius,
    day: 'today',
    language: 'fr',
    units: 'metric',
    timeZone: TZ,
    now: Date.parse('2026-10-26T06:00:00Z'),
  });
  assert.equal(outputs.condition, 'rain');
  assert.equal(outputs.summary, 'Aujourd’hui : pluie, de 4,7 à 10,4 °C, 1,8 mm de précipitations.');
});

test('the precipitation trigger fires on the dry → wet transition only', async () => {
  const events = [];
  let now = FIXTURE_NOW;
  const watcher = createPrecipitationWatcher({
    publish: async (key, data) => events.push({ key, data }),
    getLanguage: () => 'fr',
    getUnits: () => 'metric',
    logger: silentLogger(),
    now: () => now,
  });
  const house = HOUSES.kaunas;
  const dry = forecastOf(house);
  const wet = parseForecast(
    withHours(forecastJson(house), {
      '2026-10-24T05:00:00Z': { condition: 'snow', amount: 3 },
    }),
  );
  assert.equal(await watcher.observe(house, dry), null, 'baseline');
  now += 30 * MINUTE;
  const data = await watcher.observe(house, wet);
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'precipitation_expected');
  assert.equal(data.house, 'cottage');
  assert.equal(data.house_name, 'Cottage');
  assert.equal(data.precipitation_type, 'snow');
  assert.equal(data.minutes_until, 15);
  assert.equal(data.summary, 'Neige modérée attendue dans 15 minutes.');
  assert.equal(await watcher.observe(house, wet), null, 'still wet: no new event');
});
