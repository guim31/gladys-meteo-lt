// -----------------------------------------------------------------------------
// Meteo.lt condition codes → MET Norway symbols → Gladys conditions: every
// code Meteo.lt documents is mapped, and every code of the official legend
// (test/fixtures/weathericons-legend.csv, from metno/weathericons) is mapped,
// to a condition Gladys renders, with its day/night variant.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEATHER_CONDITIONS as C } from '@gladysassistant/integration-sdk';
import {
  EXTRA_SYMBOLS,
  METEO_LT_SYMBOLS,
  SYMBOLS,
  allSymbolCodes,
  describeSymbol,
  isDayFromSymbol,
  meteoLtSymbol,
  skyCondition,
  toCondition,
} from '../src/symbols.js';
import { HOUSES, forecastOf, observationsJson } from './helpers/fixtures.js';

// The codes of https://api.meteo.lt/ ("conditionCode"), as documented on
// 2026-10-24: the forecasts use the first 19, the observations all 30.
const DOCUMENTED = [
  'clear',
  'partly-cloudy',
  'variable-cloudiness',
  'cloudy-with-sunny-intervals',
  'cloudy',
  'rain-showers',
  'light-rain-at-times',
  'rain-at-times',
  'light-rain',
  'rain',
  'heavy-rain',
  'thunder',
  'isolated-thunderstorms',
  'thunderstorms',
  'heavy-rain-with-thunderstorms',
  'sleet-showers',
  'sleet-at-times',
  'light-sleet',
  'sleet',
  'freezing-rain',
  'hail',
  'snow-showers',
  'light-snow-at-times',
  'snow-at-times',
  'light-snow',
  'snow',
  'heavy-snow',
  'snowstorm',
  'fog',
  'squall',
];

const legend = readFileSync(new URL('./fixtures/weathericons-legend.csv', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => {
    const columns = line.split(',');
    // The legend itself has a trailing space after one id.
    return {
      id: columns[0].trim(),
      oldId: Number(columns.at(-2)),
      variants: columns.at(-1).trim() === '1',
    };
  });

test('the table holds exactly the 41 symbols of the official legend', () => {
  assert.equal(legend.length, 41);
  assert.deepEqual(
    SYMBOLS.map(({ id, variants }) => ({ id, variants })),
    legend.map(({ id, variants }) => ({ id, variants })),
  );
});

test('the 83 codes the API can send all map to a condition Gladys renders', () => {
  const codes = allSymbolCodes();
  assert.equal(codes.length, 83);
  const rendered = Object.values(C).filter((value) => value !== C.UNKNOWN && value !== C.NIGHT);
  for (const code of codes) {
    const condition = toCondition(code, { temperature: 10 });
    assert.ok(rendered.includes(condition), `${code} -> ${condition}`);
    assert.equal(describeSymbol(code).known, true, code);
  }
});

test('the mapping, symbol by symbol', () => {
  const expected = {
    clearsky_day: C.CLEAR,
    fair_night: C.PARTLY_CLOUDY,
    partlycloudy_polartwilight: C.PARTLY_CLOUDY,
    cloudy: C.CLOUD,
    fog: C.FOG,
    lightrain: C.RAIN,
    rain: C.RAIN,
    heavyrain: C.POURING,
    lightrainshowers_day: C.RAIN,
    rainshowers_night: C.RAIN,
    heavyrainshowers_day: C.POURING,
    lightrainandthunder: C.THUNDERSTORM,
    heavyrainshowersandthunder_night: C.THUNDERSTORM,
    lightsleet: C.SLEET,
    heavysleetshowers_day: C.SLEET,
    sleetandthunder: C.THUNDERSTORM,
    lightssleetshowersandthunder_day: C.THUNDERSTORM,
    lightsnow: C.SNOW,
    snowshowers_polartwilight: C.SNOW,
    heavysnow: C.SNOW,
    lightssnowshowersandthunder_night: C.SNOW_THUNDERSTORM,
    heavysnowandthunder: C.SNOW_THUNDERSTORM,
  };
  for (const [code, condition] of Object.entries(expected)) {
    assert.equal(toCondition(code, { temperature: 5 }), condition, code);
  }
});

test('the two misspelled codes of the legend are understood, and so is their fix', () => {
  for (const code of [
    'lightssleetshowersandthunder_day',
    'lightsleetshowersandthunder_day',
    'lightssnowshowersandthunder_night',
    'lightsnowshowersandthunder_night',
  ]) {
    const symbol = describeSymbol(code);
    assert.equal(symbol.intensity, 'light', code);
    assert.equal(symbol.thunder, true, code);
    assert.equal(symbol.showers, true, code);
  }
  assert.equal(toCondition('lightsnowshowersandthunder_day'), C.SNOW_THUNDERSTORM);
});

test('fog freezes at or below 0 °C', () => {
  assert.equal(toCondition('fog', { temperature: 0.4 }), C.FOG);
  assert.equal(toCondition('fog', { temperature: 0 }), C.FREEZING_FOG);
  assert.equal(toCondition('fog', { temperature: -6 }), C.FREEZING_FOG);
  assert.equal(toCondition('fog'), C.FOG);
});

test('the variant is the day/night signal; polar twilight is night', () => {
  assert.equal(isDayFromSymbol('clearsky_day'), true);
  assert.equal(isDayFromSymbol('clearsky_night'), false);
  assert.equal(isDayFromSymbol('fair_polartwilight'), false);
  assert.equal(isDayFromSymbol('cloudy'), null);
  assert.equal(isDayFromSymbol(null), null);
});

test('an unknown or missing symbol falls back to the cloud cover', () => {
  assert.equal(toCondition('meteorshower_day', { cloudCover: 95 }), C.CLOUD);
  assert.equal(toCondition(null, { cloudCover: 50 }), C.PARTLY_CLOUDY);
  assert.equal(toCondition('', { cloudCover: 10 }), C.CLEAR);
  assert.equal(toCondition(42), C.UNKNOWN);
  assert.equal(skyCondition(null), C.UNKNOWN);
  assert.equal(describeSymbol('meteorshower_day').known, false);
});

test('a symbol MET adds on the same pattern is still read', () => {
  // Not in the legend, but built like the others.
  assert.equal(toCondition('heavyrainandthunder_day'), C.THUNDERSTORM);
  assert.equal(describeSymbol('heavysleetshowers_day').kind, 'sleet');
});

test('every documented Meteo.lt code is a symbol of the legend, or one of the four extras', () => {
  const ids = new Set([...legend.map(({ id }) => id), ...EXTRA_SYMBOLS]);
  assert.deepEqual(Object.keys(METEO_LT_SYMBOLS).sort(), [...DOCUMENTED].sort());
  for (const code of DOCUMENTED) {
    const symbol = meteoLtSymbol(code);
    assert.ok(ids.has(symbol), `${code}: ${symbol}`);
    assert.equal(describeSymbol(symbol).known, true, code);
  }
  assert.equal(meteoLtSymbol(null), null);
  assert.equal(meteoLtSymbol('volcanic-ash'), null);
});

test('Meteo.lt codes become the conditions of Gladys', () => {
  const cases = {
    clear: C.CLEAR,
    'partly-cloudy': C.PARTLY_CLOUDY,
    'cloudy-with-sunny-intervals': C.PARTLY_CLOUDY,
    cloudy: C.CLOUD,
    'light-rain-at-times': C.RAIN,
    'heavy-rain': C.POURING,
    thunder: C.THUNDERSTORM,
    'isolated-thunderstorms': C.THUNDERSTORM,
    'light-sleet': C.SLEET,
    'freezing-rain': C.FREEZING_RAIN,
    hail: C.HAIL,
    'snow-at-times': C.SNOW,
    snowstorm: C.SNOW,
    fog: C.FOG,
    squall: C.WIND,
  };
  for (const [code, condition] of Object.entries(cases)) {
    assert.equal(toCondition(meteoLtSymbol(code), { temperature: 5 }), condition, code);
  }
  // Freezing rain is rain on the ground: the trigger says rain.
  assert.equal(describeSymbol('freezingrain').kind, 'rain');
  assert.equal(describeSymbol('thunder').kind, null);
});

test('every condition of the real responses is a known Meteo.lt code', () => {
  for (const house of [HOUSES.vilnius, HOUSES.kaunas, HOUSES.klaipeda]) {
    for (const point of forecastOf(house).points) {
      if (point.period !== null) {
        assert.ok(point.period.symbol, `${house.place}: ${point.time}`);
      }
    }
    for (const reading of observationsJson(house).observations) {
      if (reading.conditionCode !== null) {
        assert.ok(meteoLtSymbol(reading.conditionCode), reading.conditionCode);
      }
    }
  }
});
