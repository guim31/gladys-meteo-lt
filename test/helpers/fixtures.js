// -----------------------------------------------------------------------------
// Fixture loading and a fake fetch answering like Meteo.lt.
// See test/fixtures/README.md for where each fixture comes from.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { API_URL } from '../../src/api.js';
import { parseForecast } from '../../src/forecast.js';

// The real responses were recorded on 2026-10-24 at 04:14 UTC: the forecasts
// were made at 02:17 UTC and start at 02:00, the latest readings of the
// stations are of 04:00.
const FIXTURE_NOW = Date.UTC(2026, 9, 24, 4, 15);

// The locations of the real fixtures, as houses of Gladys: each is next to
// the place whose forecast was recorded, and its nearest station is the one
// whose readings were.
const HOUSES = Object.freeze({
  vilnius: {
    id: 'h-vilnius',
    name: 'Home',
    selector: 'home',
    latitude: 54.687,
    longitude: 25.2829,
    place: 'vilnius',
    station: 'vilniaus-ams',
  },
  kaunas: {
    id: 'h-kaunas',
    name: 'Cottage',
    selector: 'cottage',
    latitude: 54.8982,
    longitude: 23.9045,
    place: 'kaunas',
    station: 'kauno-ams',
  },
  klaipeda: {
    id: 'h-klaipeda',
    name: 'Seaside',
    selector: 'seaside',
    latitude: 55.7127,
    longitude: 21.135,
    place: 'klaipeda',
    station: 'klaipedos-ams',
  },
  paris: {
    id: 'h-paris',
    name: 'Maison',
    selector: 'maison',
    latitude: 48.8566,
    longitude: 2.3522,
    place: null,
    station: null,
  },
});

/**
 * @description The house as Gladys returns it (GET /house): the five fields.
 * @param {object} house - A HOUSES entry.
 * @returns {object} `{ id, name, selector, latitude, longitude }`.
 * @example
 * asGladysHouse(HOUSES.vilnius);
 */
function asGladysHouse({ id, name, selector, latitude, longitude }) {
  return { id, name, selector, latitude, longitude };
}

/**
 * @description Load a text fixture.
 * @param {string} name - The file name in test/fixtures.
 * @returns {string} The content.
 * @example
 * loadText('real-stations.json');
 */
function loadText(name) {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
}

/**
 * @description Load a JSON fixture (a fresh copy on every call).
 * @param {string} name - The file name in test/fixtures.
 * @returns {any} The parsed JSON.
 * @example
 * loadFixture('gladys-feature-table.json');
 */
function loadFixture(name) {
  return JSON.parse(loadText(name));
}

/**
 * @description The raw forecast of a house (a fresh copy).
 * @param {object} house - A HOUSES entry.
 * @returns {object} The answer.
 * @example
 * forecastJson(HOUSES.vilnius);
 */
function forecastJson(house) {
  return loadFixture(`real-forecast-${house.place}.json`);
}

/**
 * @description The raw readings of the station of a house (a fresh copy).
 * @param {object} house - A HOUSES entry.
 * @returns {object} The answer.
 * @example
 * observationsJson(HOUSES.vilnius);
 */
function observationsJson(house) {
  return loadFixture(`real-observations-${house.station}.json`);
}

/**
 * @description The slim forecast of a house (without observation).
 * @param {object} house - A HOUSES entry.
 * @returns {object} The parsed forecast.
 * @example
 * forecastOf(HOUSES.vilnius);
 */
function forecastOf(house) {
  return parseForecast(forecastJson(house));
}

/**
 * @description Change the hourly periods of a raw forecast, to stage a
 * shower. The period starting at T is carried by the step of T + 1 h
 * (`totalPrecipitation` is the amount of the step ending at it).
 * @param {object} answer - A raw forecast.
 * @param {object} changes - `{ 'ISO start': { condition, amount } }`.
 * @returns {object} The changed forecast.
 * @example
 * withHours(answer, { '2026-10-24T05:00:00Z': { condition: 'light-rain', amount: 0.4 } });
 */
function withHours(answer, changes) {
  const copy = structuredClone(answer);
  for (const [from, change] of Object.entries(changes)) {
    const end = new Date(Date.parse(from) + 3600000).toISOString().replace('T', ' ').slice(0, 19);
    const step = copy.forecastTimestamps.find((candidate) => candidate.forecastTimeUtc === end);
    if (step === undefined) {
      throw new Error(`No hourly period from ${from}`);
    }
    step.totalPrecipitation = change.amount;
    step.conditionCode = change.condition;
  }
  return copy;
}

/**
 * @description A fake fetch. `route(url, init)` returns `{ status, body,
 * headers }` (or throws to simulate a network error); every call is recorded
 * with its headers.
 * @param {Function} route - The router.
 * @returns {Function} The fetch, with `.calls` (`{ url, headers }`).
 * @example
 * const fetchImpl = fakeFetch(() => ({ body: loadText('real-stations.json') }));
 */
function fakeFetch(route) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), headers: { ...init.headers } });
    const { status = 200, body = '', headers = {} } = await route(String(url), init);
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(text, { status, headers });
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

/**
 * @description An answer like Meteo.lt's: the real lists, the forecast of a
 * recorded place, the readings of a recorded station, and the real 404 of an
 * unknown code.
 * @param {object} [options] - Options.
 * @param {Function} [options.forecast] - `(house) => answer`, the fixture of
 * the house by default.
 * @param {Function} [options.observations] - `(house) => answer`, likewise.
 * @returns {Function} A route for fakeFetch.
 * @example
 * fakeFetch(meteoLtRoute());
 */
function meteoLtRoute({
  forecast = (house) => forecastJson(house),
  observations = (house) => observationsJson(house),
} = {}) {
  const json = { 'content-type': 'application/json' };
  return (url) => {
    if (!url.startsWith(`${API_URL}/`)) {
      throw new Error(`Unexpected URL ${url}`);
    }
    const path = url.slice(API_URL.length);
    if (path === '/places') {
      return { body: loadText('real-places.json'), headers: json };
    }
    if (path === '/stations') {
      return { body: loadText('real-stations.json'), headers: json };
    }
    const place = /^\/places\/([^/]+)\/forecasts\/long-term$/.exec(path)?.[1];
    const station = /^\/stations\/([^/]+)\/observations\/latest$/.exec(path)?.[1];
    const house = Object.values(HOUSES).find(
      (candidate) =>
        (place !== undefined && candidate.place === place) ||
        (station !== undefined && candidate.station === station),
    );
    if (house === undefined) {
      return { status: 404, body: loadText('real-not-found.json'), headers: json };
    }
    return { body: place !== undefined ? forecast(house) : observations(house), headers: json };
  };
}

/**
 * @description A logger that records nothing.
 * @returns {object} The logger.
 * @example
 * createApp(gladys, { logger: silentLogger() });
 */
function silentLogger() {
  return { info() {}, warn() {}, debug() {}, error() {} };
}

/**
 * @description A logger that keeps every line, by level.
 * @returns {object} The logger, with `lines` (`[{ level, message }]`) and
 * `at(level)` (the messages of one level).
 * @example
 * const logger = recordingLogger(); logger.at('info');
 */
function recordingLogger() {
  const lines = [];
  const record = (level) => (message) => lines.push({ level, message: String(message) });
  return {
    lines,
    at: (level) => lines.filter((line) => line.level === level).map((line) => line.message),
    debug: record('debug'),
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
  };
}

/**
 * @description A clock the test moves by hand.
 * @param {number} start - The start, in ms.
 * @returns {Function} `() => ms`, with `.advance(ms)` and `.set(ms)`.
 * @example
 * const clock = manualClock(FIXTURE_NOW); clock.advance(60000);
 */
function manualClock(start) {
  let current = start;
  const now = () => current;
  now.advance = (ms) => {
    current += ms;
  };
  now.set = (ms) => {
    current = ms;
  };
  return now;
}

export {
  FIXTURE_NOW,
  HOUSES,
  asGladysHouse,
  fakeFetch,
  forecastJson,
  forecastOf,
  loadFixture,
  loadText,
  manualClock,
  meteoLtRoute,
  observationsJson,
  recordingLogger,
  silentLogger,
  withHours,
};
