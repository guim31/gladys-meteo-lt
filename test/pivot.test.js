// -----------------------------------------------------------------------------
// Slim forecast (+ observation) → the pivot weather of Gladys, on the real
// answers of 2026-10-24.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEATHER_CONDITIONS } from '@gladysassistant/integration-sdk';
import { buildDays, precipitationTimeline } from '../src/daily.js';
import { MAX_HOURS, buildWeather } from '../src/pivot.js';
import { HOUR_MS } from '../src/time.js';
import { readObservation } from '../src/observations.js';
import { FIXTURE_NOW, HOUSES, forecastOf, observationsJson } from './helpers/fixtures.js';

const TZ = 'Europe/Vilnius';

/**
 * @param {object} house - A HOUSES entry.
 * @param {object} [options] - Extra options of buildWeather.
 * @returns {object} The pivot weather.
 */
function pivotOf(house, options = {}) {
  return buildWeather(forecastOf(house), {
    latitude: house.latitude,
    longitude: house.longitude,
    units: 'metric',
    timeZone: TZ,
    now: FIXTURE_NOW,
    ...options,
  });
}

test('the current conditions of Kaunas, from the hour under way of the forecast', () => {
  const weather = pivotOf(HOUSES.kaunas);
  const current = forecastOf(HOUSES.kaunas).points.find(
    (point) => point.time === Date.parse('2026-10-24T04:00:00Z'),
  );
  assert.equal(weather.datetime, '2026-10-24T04:00:00.000Z');
  assert.equal(weather.temperature, current.temperature);
  assert.equal(weather.apparent_temperature, current.apparentTemperature);
  assert.equal(weather.humidity, current.humidity);
  assert.equal(weather.pressure, current.pressure);
  assert.equal(weather.wind_speed, current.windSpeed);
  assert.equal(weather.is_day, false, 'before sunrise');
  assert.ok(weather.sunrise < weather.sunset);
  for (const absent of ['uv_index', 'visibility', 'dew_point', 'alerts']) {
    assert.equal(Object.hasOwn(weather, absent), false, absent);
  }
});

test('a fresh observation replaces the values it measured, its condition included', () => {
  const forecast = forecastOf(HOUSES.vilnius);
  forecast.observation = readObservation(observationsJson(HOUSES.vilnius), {
    code: 'vilniaus-ams',
    name: 'Vilniaus AMS',
    distanceKm: 13.2,
  });
  const options = {
    latitude: HOUSES.vilnius.latitude,
    longitude: HOUSES.vilnius.longitude,
    units: 'metric',
    timeZone: TZ,
  };
  const weather = buildWeather(forecast, { ...options, now: FIXTURE_NOW });
  assert.equal(weather.temperature, 6.1, 'measured');
  assert.equal(weather.apparent_temperature, 4.9, 'measured');
  assert.equal(weather.humidity, 99, 'measured');
  assert.equal(weather.weather, WEATHER_CONDITIONS.FOG, 'observed');
  assert.equal(weather.cloud_cover, 59, 'no cover in fog: forecast');
  assert.equal(weather.datetime, '2026-10-24T04:00:00.000Z');
  // Three hours later, the observation is too old: the forecast again.
  const later = buildWeather(forecast, { ...options, now: FIXTURE_NOW + 3 * HOUR_MS });
  assert.equal(later.datetime, '2026-10-24T07:00:00.000Z');
  assert.notEqual(later.weather, WEATHER_CONDITIONS.FOG);
});

test('24 hours with their precipitation, and the 7 days of the forecast', () => {
  for (const house of [HOUSES.vilnius, HOUSES.kaunas, HOUSES.klaipeda]) {
    const weather = pivotOf(house);
    assert.equal(weather.hours.length, MAX_HOURS);
    assert.equal(weather.hours[0].datetime, '2026-10-24T04:00:00.000Z');
    // Saturday 24 to Friday 30 October; the 31st is barely entered.
    assert.equal(weather.days.length, 7);
    for (const hour of weather.hours) {
      assert.ok(Object.values(WEATHER_CONDITIONS).includes(hour.weather), hour.weather);
      assert.equal(typeof hour.precipitation, 'number');
      assert.equal(Object.hasOwn(hour, 'precipitation_probability'), false);
      assert.equal(typeof hour.is_day, 'boolean');
    }
    for (const day of weather.days) {
      assert.ok(day.temperature_min <= day.temperature_max);
      assert.ok(Object.values(WEATHER_CONDITIONS).includes(day.weather), day.weather);
      assert.equal(typeof day.precipitation, 'number');
    }
  }
});

test('US units convert every value', () => {
  const metric = pivotOf(HOUSES.vilnius);
  const us = pivotOf(HOUSES.vilnius, { units: 'us' });
  assert.ok(Math.abs(us.temperature - ((metric.temperature * 9) / 5 + 32)) <= 0.2);
  assert.ok(Math.abs(us.wind_speed - metric.wind_speed * 2.23694) < 0.1);
  assert.equal(us.pressure, metric.pressure, 'hPa in both systems');
});

test('the precipitation timeline covers the forecast without gap nor overlap', () => {
  const periods = precipitationTimeline(forecastOf(HOUSES.klaipeda).points);
  for (let i = 1; i < periods.length; i += 1) {
    assert.equal(periods[i].start, periods[i - 1].end);
  }
  assert.deepEqual([...new Set(periods.map((period) => period.hours))], [1, 3, 6]);
});

test('the symbol of a day is the one of its noon period, whatever the step', () => {
  const forecast = forecastOf(HOUSES.klaipeda);
  const days = buildDays(forecast, {
    latitude: HOUSES.klaipeda.latitude,
    longitude: HOUSES.klaipeda.longitude,
    timeZone: TZ,
  });
  // Days of 24 hours (Lithuania leaves summer time on 25 October 2026).
  for (const day of days.filter((candidate) => candidate.end - candidate.start === 24 * HOUR_MS)) {
    const noon = day.start + 12 * HOUR_MS;
    const period = precipitationTimeline(forecast.points).find(
      (candidate) => candidate.start <= noon && noon < candidate.end,
    );
    if (period !== undefined) {
      assert.equal(day.symbol, period.symbol, new Date(day.start).toISOString());
    }
  }
});

test('days sum the periods, pick the noon symbol, and drop a last day barely entered', () => {
  const forecast = forecastOf(HOUSES.vilnius);
  const days = buildDays(forecast, {
    latitude: HOUSES.vilnius.latitude,
    longitude: HOUSES.vilnius.longitude,
    timeZone: TZ,
  });
  const total = precipitationTimeline(forecast.points).reduce(
    (sum, period) => sum + (period.precipitation ?? 0),
    0,
  );
  const counted = days.reduce((sum, day) => sum + (day.precipitation ?? 0), 0);
  // Only the periods of a dropped last day are missing.
  assert.ok(counted <= total + 1e-9);
  assert.ok(days.at(-1).end <= forecast.points.at(-1).time + 6 * HOUR_MS);
  for (const day of days) {
    assert.ok(day.symbol !== null, 'every day has a symbol');
  }
});
