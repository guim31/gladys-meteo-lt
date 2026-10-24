// -----------------------------------------------------------------------------
// Meteo.lt API client (LHMT, the Lithuanian Hydrometeorological Service):
// four JSON requests, no key, no account.
//
//   Places        GET https://api.meteo.lt/v1/places
//                 The 2,444 places with a forecast (Lithuania, plus the main
//                 towns of Latvia, Estonia and north-eastern Poland), with
//                 their coordinates. Read once a day (catalog.js).
//   Forecast      GET https://api.meteo.lt/v1/places/{code}/forecasts/long-term
//                 The forecast of a place: hourly for about 2.5 days, then
//                 every 3 hours, then every 6 hours, up to 7 days
//                 (forecast.js). Updated 8 times a day.
//   Stations      GET https://api.meteo.lt/v1/stations
//                 The 52 automatic weather stations. Read once a day.
//   Observations  GET https://api.meteo.lt/v1/stations/{code}/observations/latest
//                 The hourly readings of a station over the last 24 hours
//                 (observations.js).
//
// Terms (https://api.meteo.lt/): data under CC BY-SA 4.0, the source (LHMT)
// must be cited; 180 requests a minute per IP address, and no more than
// 20,000 a day. The integration stays far below: two requests per house
// every 30 minutes, and the two lists once a day (forecast-store.js).
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

const API_URL = 'https://api.meteo.lt/v1';
const CONTACT = 'github.com/guim31/gladys-meteo-lt';

// Under the 15 s the core waits for a weather answer, with room to build it.
const REQUEST_TIMEOUT_MS = 10000;

const PACKAGE = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const USER_AGENT = `gladys-meteo-lt/${PACKAGE.version} ${CONTACT}`;

// What went wrong, as the rest of the integration needs to react to it.
const ERROR_KINDS = Object.freeze({
  THROTTLED: 'throttled', // 429: too many requests — back off
  FORBIDDEN: 'forbidden', // 403: refused (or banned) — stop for a long while
  REQUEST: 'request', // other 4xx: unknown place or station — skip it
  UPSTREAM: 'upstream', // 5xx: retry later
  NETWORK: 'network', // DNS, timeout, reset: retry later
  INVALID: 'invalid', // no usable data (outside the area, unusable body)
});

class MeteoLtError extends Error {
  /**
   * @param {string} kind - One of ERROR_KINDS.
   * @param {string} message - A message safe to log.
   * @param {object} [details] - { status, retryAfterMs }.
   */
  constructor(kind, message, { status = null, retryAfterMs = null } = {}) {
    super(message);
    this.name = 'MeteoLtError';
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * @description Classify a non-success status.
 * @param {number} status - The HTTP status.
 * @returns {string} One of ERROR_KINDS.
 * @example
 * kindOfStatus(429); // -> 'throttled'
 */
function kindOfStatus(status) {
  if (status === 429) {
    return ERROR_KINDS.THROTTLED;
  }
  if (status === 403) {
    return ERROR_KINDS.FORBIDDEN;
  }
  if (status >= 400 && status < 500) {
    return ERROR_KINDS.REQUEST;
  }
  return ERROR_KINDS.UPSTREAM;
}

/**
 * @description Read a `Retry-After` header: seconds or an HTTP date.
 * @param {string|null} value - The header value.
 * @param {number} now - The current time in ms.
 * @returns {number|null} The delay in ms.
 * @example
 * readRetryAfter('120', Date.now()); // -> 120000
 */
function readRetryAfter(value, now) {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  if (/^\d+$/.test(value.trim())) {
    return Number(value.trim()) * 1000;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

/**
 * @description The message of an API error body (`{ error: { code,
 * message } }`), bounded.
 * @param {string} text - The body.
 * @returns {string|null} The message.
 * @example
 * readReason('{"error":{"code":404,"message":"Not Found"}}'); // -> 'Not Found'
 */
function readReason(text) {
  try {
    const message = JSON.parse(text)?.error?.message;
    return typeof message === 'string' && message.trim() !== ''
      ? message.trim().slice(0, 200)
      : null;
  } catch {
    return null;
  }
}

/**
 * @description GET a Meteo.lt address and parse its JSON.
 * @param {string} path - The path under /v1.
 * @param {object} options - Options.
 * @param {Function} options.fetchImpl - fetch.
 * @param {Function} options.now - `() => ms`.
 * @param {number} options.timeoutMs - The request timeout.
 * @returns {Promise<any>} The parsed body of a 200.
 * @throws {MeteoLtError} On any failure, classified by `kind`.
 * @example
 * await get('/stations', { fetchImpl: fetch, now: Date.now, timeoutMs: 10000 });
 */
async function get(path, { fetchImpl, now, timeoutMs }) {
  let response;
  try {
    response = await fetchImpl(`${API_URL}${path}`, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timeout' : err?.cause?.code || err?.name;
    throw new MeteoLtError(ERROR_KINDS.NETWORK, `Meteo.lt unreachable (${reason})`);
  }
  if (response.status !== 200) {
    const reason = readReason(await response.text().catch(() => ''));
    throw new MeteoLtError(
      kindOfStatus(response.status),
      `Meteo.lt answered HTTP ${response.status}${reason ? `: ${reason}` : ''}`,
      {
        status: response.status,
        retryAfterMs: readRetryAfter(response.headers.get('retry-after'), now()),
      },
    );
  }
  try {
    return JSON.parse(await response.text());
  } catch {
    throw new MeteoLtError(ERROR_KINDS.INVALID, 'Meteo.lt sent an unreadable body', {
      status: response.status,
    });
  }
}

/**
 * @description Check a place or station code before putting it in a path.
 * @param {any} code - The code (`vilnius`, `vilniaus-ams`).
 * @returns {string} The code.
 * @throws {MeteoLtError} When it is not a plain code.
 * @example
 * checkCode('vilnius'); // -> 'vilnius'
 */
function checkCode(code) {
  if (typeof code !== 'string' || !/^[a-z0-9-]{1,80}$/.test(code)) {
    throw new MeteoLtError(ERROR_KINDS.REQUEST, 'Invalid place or station code');
  }
  return code;
}

/**
 * @description Read a list answer (places, stations).
 * @param {string} path - `/places` or `/stations`.
 * @param {object} options - fetchImpl, now, timeoutMs.
 * @returns {Promise<Array<object>>} The list.
 * @throws {MeteoLtError} When the answer is not a list.
 * @example
 * await getList('/stations', options);
 */
async function getList(path, options) {
  const body = await get(path, options);
  if (!Array.isArray(body)) {
    throw new MeteoLtError(ERROR_KINDS.INVALID, `Meteo.lt ${path} is not a list`);
  }
  return body;
}

/**
 * @description Default options of every request.
 * @param {object} options - What the caller gave.
 * @returns {object} `{ fetchImpl, now, timeoutMs }`.
 * @example
 * withDefaults({});
 */
function withDefaults({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  return { fetchImpl, now, timeoutMs };
}

/**
 * @description Fetch the places with a forecast.
 * @param {object} [options] - fetchImpl, now, timeoutMs.
 * @returns {Promise<Array<object>>} `[{ code, name, administrativeDivision,
 * countryCode, coordinates: { latitude, longitude } }]`.
 * @example
 * const places = await fetchPlaces();
 */
function fetchPlaces(options) {
  return getList('/places', withDefaults(options));
}

/**
 * @description Fetch the weather stations.
 * @param {object} [options] - fetchImpl, now, timeoutMs.
 * @returns {Promise<Array<object>>} `[{ code, name, coordinates }]`.
 * @example
 * const stations = await fetchStations();
 */
function fetchStations(options) {
  return getList('/stations', withDefaults(options));
}

/**
 * @description Fetch the long-term forecast of a place.
 * @param {string} code - The place code.
 * @param {object} [options] - fetchImpl, now, timeoutMs.
 * @returns {Promise<object>} The answer.
 * @throws {MeteoLtError} On any failure, classified by `kind`.
 * @example
 * const answer = await fetchForecast('vilnius');
 */
async function fetchForecast(code, options) {
  return get(`/places/${checkCode(code)}/forecasts/long-term`, withDefaults(options));
}

/**
 * @description Fetch the readings of a station over the last 24 hours.
 * @param {string} code - The station code.
 * @param {object} [options] - fetchImpl, now, timeoutMs.
 * @returns {Promise<object>} The answer.
 * @throws {MeteoLtError} On any failure, classified by `kind`.
 * @example
 * const answer = await fetchObservations('vilniaus-ams');
 */
async function fetchObservations(code, options) {
  return get(`/stations/${checkCode(code)}/observations/latest`, withDefaults(options));
}

export {
  API_URL,
  ERROR_KINDS,
  MeteoLtError,
  REQUEST_TIMEOUT_MS,
  USER_AGENT,
  checkCode,
  fetchForecast,
  fetchObservations,
  fetchPlaces,
  fetchStations,
  kindOfStatus,
  readReason,
  readRetryAfter,
};
