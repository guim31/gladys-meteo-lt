// -----------------------------------------------------------------------------
// The places and stations of Meteo.lt, and the nearest of each to a house.
//
// Meteo.lt forecasts places (2,444 of them: every Lithuanian town and village
// of some size, plus the main towns of Latvia, Estonia and north-eastern
// Poland), not coordinates: a house gets the forecast of the nearest place,
// up to 30 km away. Farther, the house is outside the area of Meteo.lt: "no
// forecast", and the core moves on to its next weather provider. Every place
// of Lithuania is within 44 km of one of the 52 stations (measured on
// 2026-10-24): a station is used up to 50 km away.
//
// Both lists are read once a day. When a reading fails, the previous lists
// stay in use (they barely change); without any, the error goes up.
// -----------------------------------------------------------------------------

import { fetchPlaces, fetchStations } from './api.js';

const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PLACE_DISTANCE_KM = 30;
const MAX_STATION_DISTANCE_KM = 50;
const EARTH_RADIUS_KM = 6371;

/**
 * @description The great-circle distance between two points.
 * @param {number} lat1 - Degrees.
 * @param {number} lon1 - Degrees.
 * @param {number} lat2 - Degrees.
 * @param {number} lon2 - Degrees.
 * @returns {number} Kilometres.
 * @example
 * distanceKm(54.687, 25.28, 54.898, 23.904); // -> about 92
 */
function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * @description Keep the usable entries of a list: a code, a name and finite
 * coordinates.
 * @param {Array<object>} list - The raw list.
 * @returns {Array<object>} `[{ code, name, latitude, longitude }]`.
 * @example
 * slimList([{ code: 'vilnius', name: 'Vilnius', coordinates: { latitude: 54.687, longitude: 25.283 } }]);
 */
function slimList(list) {
  return list
    .map((entry) => ({
      code: entry?.code,
      name: typeof entry?.name === 'string' && entry.name !== '' ? entry.name : entry?.code,
      latitude: entry?.coordinates?.latitude,
      longitude: entry?.coordinates?.longitude,
    }))
    .filter(
      ({ code, latitude, longitude }) =>
        typeof code === 'string' &&
        code !== '' &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude),
    );
}

/**
 * @description The nearest entry of a list within a distance.
 * @param {Array<object>} list - Slim entries.
 * @param {number} latitude - The latitude of the house.
 * @param {number} longitude - Its longitude.
 * @param {number} maxKm - The farthest acceptable distance.
 * @returns {object|null} The entry with `distanceKm`, or null.
 * @example
 * nearest(places, 54.687, 25.283, 30);
 */
function nearest(list, latitude, longitude, maxKm) {
  let best = null;
  for (const entry of list) {
    const distance = distanceKm(latitude, longitude, entry.latitude, entry.longitude);
    if (distance <= maxKm && (best === null || distance < best.distance)) {
      best = { entry, distance };
    }
  }
  return best === null ? null : { ...best.entry, distanceKm: Math.round(best.distance * 10) / 10 };
}

/**
 * @description Create the catalog.
 * @param {object} [options] - Options.
 * @param {Function} [options.fetchImpl] - fetch, injectable for the tests.
 * @param {Function} [options.now] - `() => ms`.
 * @returns {object} `{ load(), placeFor(lat, lon), stationFor(lat, lon) }`.
 * @example
 * const catalog = createCatalog();
 */
function createCatalog({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  let places = null;
  let stations = null;
  let expiresAt = 0;
  let pending = null;

  /**
   * @description Read both lists when they are older than a day, sharing a
   * reading under way.
   * @returns {Promise<void>} Resolves once lists are available.
   * @throws {MeteoLtError} When no list was ever read and the reading fails.
   * @example
   * await catalog.load();
   */
  function load() {
    if (places !== null && expiresAt > now()) {
      return Promise.resolve();
    }
    if (pending !== null) {
      return pending;
    }
    pending = (async () => {
      try {
        const [rawPlaces, rawStations] = await Promise.all([
          fetchPlaces({ fetchImpl, now }),
          fetchStations({ fetchImpl, now }),
        ]);
        places = slimList(rawPlaces);
        stations = slimList(rawStations);
        expiresAt = now() + CATALOG_TTL_MS;
      } catch (err) {
        if (places === null) {
          throw err;
        }
        // Keep the lists we have; try again in an hour.
        expiresAt = now() + 60 * 60 * 1000;
      } finally {
        pending = null;
      }
    })();
    return pending;
  }

  return {
    load,
    placeFor: (latitude, longitude) =>
      places === null ? null : nearest(places, latitude, longitude, MAX_PLACE_DISTANCE_KM),
    stationFor: (latitude, longitude) =>
      stations === null ? null : nearest(stations, latitude, longitude, MAX_STATION_DISTANCE_KM),
    get loaded() {
      return places !== null;
    },
  };
}

export {
  CATALOG_TTL_MS,
  MAX_PLACE_DISTANCE_KM,
  MAX_STATION_DISTANCE_KM,
  createCatalog,
  distanceKm,
  nearest,
  slimList,
};
