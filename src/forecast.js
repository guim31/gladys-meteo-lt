// -----------------------------------------------------------------------------
// Parse a Meteo.lt forecast (api.js) into the slim forecast the integration
// caches.
//
// `forecastTimestamps` is a list of steps, hourly for about 2.5 days, then
// every 3 hours, then every 6 hours, up to 7 days (measured on 2026-10-24:
// 52 hourly steps, 26 of 3 hours, 6 of 6 hours). It starts at the hour the
// forecast was made, a few hours before the current one. Every time is UTC
// ("2026-10-24 02:00:00"), every value metric.
//
// Each step holds the state of the air at its time (temperature, feels-like,
// wind, humidity, pressure, cloud cover) and what happened during the step
// that ENDS at it: `totalPrecipitation` is "the sum over 1 h when the step is
// 1 h, over 3 h when it is 3 h", `windGust` the strongest gust over the same
// span, and the condition goes with them. The period is attached to the
// point it STARTS at, the way MET Norway's `next_1_hours` does: the point of
// 15:00 carries the period 15:00-16:00, read from the step of 16:00.
//
// No probability of precipitation, no dew point, no UV index: Meteo.lt does
// not give them, and the pivot leaves them out.
// -----------------------------------------------------------------------------

import { meteoLtSymbol } from './symbols.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * @description Read a finite number, null otherwise.
 * @param {any} value - The raw value.
 * @returns {number|null} The number.
 * @example
 * num(5.7); // -> 5.7
 */
function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * @description Read a Meteo.lt UTC time.
 * @param {any} value - "2026-10-24 02:00:00".
 * @returns {number|null} The instant in ms, or null.
 * @example
 * parseUtc('2026-10-24 02:00:00'); // -> 1792807200000
 */
function parseUtc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return null;
  }
  const ms = Date.parse(`${value.replace(' ', 'T')}Z`);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @description Parse a Meteo.lt forecast.
 * @param {object} answer - The parsed JSON of a long-term forecast.
 * @returns {object} The slim forecast: `{ place: { code, name, latitude,
 * longitude }, updatedAt (ms or null), points: [{ time (ms), temperature,
 * apparentTemperature, humidity, pressure, dewPoint, windSpeed,
 * windDirection, windGust, cloudCover, uvIndex, next1, period }] }`, the
 * points sorted by time. `period` is the step starting at the point (`{
 * hours, symbol, precipitation, probability, gust }`), `next1` the same when
 * it lasts one hour.
 * @throws {Error} When the answer holds no usable step.
 * @example
 * const forecast = parseForecast(await fetchForecast('vilnius'));
 */
function parseForecast(answer) {
  const steps = Array.isArray(answer?.forecastTimestamps) ? answer.forecastTimestamps : [];
  const instants = [];
  for (const step of steps) {
    const time = parseUtc(step?.forecastTimeUtc);
    const temperature = num(step?.airTemperature);
    if (time === null || temperature === null) {
      continue;
    }
    instants.push({
      time,
      temperature,
      apparentTemperature: num(step.feelsLikeTemperature),
      humidity: num(step.relativeHumidity),
      pressure: num(step.seaLevelPressure),
      dewPoint: null,
      windSpeed: num(step.windSpeed),
      windDirection: num(step.windDirection),
      windGust: num(step.windGust),
      cloudCover: num(step.cloudCover),
      uvIndex: null,
      // The step that ends at this time.
      ending: {
        symbol: meteoLtSymbol(step.conditionCode),
        precipitation: num(step.totalPrecipitation),
        probability: null,
        gust: num(step.windGust),
      },
    });
  }
  if (instants.length === 0) {
    throw new Error('Meteo.lt has no forecast for this place');
  }
  instants.sort((a, b) => a.time - b.time);

  const points = instants.map(({ ending: _ending, ...instant }, index) => {
    const next = instants[index + 1];
    const period =
      next === undefined || next.time <= instant.time
        ? null
        : { hours: Math.round((next.time - instant.time) / HOUR_MS), ...next.ending };
    return { ...instant, period, next1: period?.hours === 1 ? period : null };
  });

  const place = answer?.place ?? {};
  return {
    place: {
      code: typeof place.code === 'string' ? place.code : null,
      name: typeof place.name === 'string' ? place.name : null,
      latitude: num(place.coordinates?.latitude),
      longitude: num(place.coordinates?.longitude),
    },
    updatedAt: parseUtc(answer?.forecastCreationTimeUtc),
    points,
  };
}

export { num, parseForecast, parseUtc };
