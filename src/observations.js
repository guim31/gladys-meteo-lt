// -----------------------------------------------------------------------------
// The current conditions of a house: the latest reading of the nearest
// Meteo.lt weather station (catalog.js).
//
// The answer (api.js) holds the hourly readings of the station over the last
// 24 hours. Measured on 2026-10-24:
//   - a station does not measure everything, and a value it missed is null
//     (the cloud cover is null in fog);
//   - the latest reading holds the condition the station observed (`fog`,
//     `rain-showers`…), from a richer list than the forecasts;
//   - `precipitation` is the amount of the hour ending at the reading.
// The latest reading with a temperature wins; older than 90 minutes, it is
// ignored and the forecast describes the current weather.
// -----------------------------------------------------------------------------

import { num, parseUtc } from './forecast.js';
import { meteoLtSymbol } from './symbols.js';

const MAX_AGE_MS = 90 * 60 * 1000;

/**
 * @description Read the latest usable reading of a station.
 * @param {object} answer - The parsed JSON of `observations/latest`.
 * @param {object} station - The station from the catalog (`{ code, name,
 * latitude, longitude, distanceKm }`).
 * @returns {object|null} `{ station, time, temperature, apparentTemperature,
 * humidity, pressure, windSpeed, windDirection, windGust, cloudCover,
 * precipitation1h, snowDepth, symbol }`, null when the station has no
 * reading with a temperature.
 * @example
 * readObservation(answer, station);
 */
function readObservation(answer, station) {
  const readings = (Array.isArray(answer?.observations) ? answer.observations : [])
    .map((reading) => ({ reading, time: parseUtc(reading?.observationTimeUtc) }))
    .filter(({ reading, time }) => time !== null && num(reading.airTemperature) !== null)
    .sort((a, b) => a.time - b.time);
  const latest = readings.at(-1);
  if (latest === undefined) {
    return null;
  }
  const { reading, time } = latest;
  return {
    station: {
      code: station.code,
      name: station.name,
      latitude: station.latitude,
      longitude: station.longitude,
      distanceKm: station.distanceKm,
    },
    time,
    temperature: num(reading.airTemperature),
    apparentTemperature: num(reading.feelsLikeTemperature),
    humidity: num(reading.relativeHumidity),
    pressure: num(reading.seaLevelPressure),
    windSpeed: num(reading.windSpeed),
    windDirection: num(reading.windDirection),
    windGust: num(reading.windGust),
    cloudCover: num(reading.cloudCover),
    precipitation1h: num(reading.precipitation),
    snowDepth: num(reading.snowDepth),
    symbol: meteoLtSymbol(reading.conditionCode),
  };
}

/**
 * @description Whether an observation still describes now.
 * @param {object|null} observation - The observation.
 * @param {number} now - The current time in ms.
 * @returns {boolean} true when recent enough.
 * @example
 * isFresh(observation, Date.now());
 */
function isFresh(observation, now) {
  return observation !== null && observation !== undefined && now - observation.time <= MAX_AGE_MS;
}

export { MAX_AGE_MS, isFresh, readObservation };
