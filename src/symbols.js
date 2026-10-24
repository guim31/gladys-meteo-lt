// -----------------------------------------------------------------------------
// Meteo.lt condition codes → MET Norway weather symbols → Gladys conditions.
//
// Meteo.lt sends a `conditionCode` with every forecast step and every
// station reading (https://api.meteo.lt/, "conditionCode"): 19 codes in the
// forecasts, 30 in the observations. METEO_LT_SYMBOLS turns each into the
// MET Norway symbol that says the same thing (the vocabulary the rest of the
// integration reads: what falls, how hard, showers, thunder), and four into
// codes of their own, which MET has no symbol for:
//
//   Meteo.lt                                symbol                  Gladys
//   clear                                   clearsky                clear
//   partly-cloudy                           fair                    partly-cloudy
//   variable-cloudiness,
//   cloudy-with-sunny-intervals             partlycloudy            partly-cloudy
//   cloudy                                  cloudy                  cloud
//   fog                                     fog                     fog (freezing-fog at or below 0 °C)
//   light-rain, rain                        lightrain, rain         rain
//   heavy-rain                              heavyrain               pouring
//   rain-showers, *-rain-at-times           (light)rainshowers      rain
//   *sleet*                                 (light)sleet(showers)   sleet
//   *snow*                                  (light|heavy)snow(...)  snow
//   snowstorm                               heavysnow               snow
//   isolated-thunderstorms                  rainshowersandthunder   thunderstorm
//   thunderstorms                           rainandthunder          thunderstorm
//   heavy-rain-with-thunderstorms           heavyrainandthunder     thunderstorm
//   thunder (no rain)                       thunder                 thunderstorm
//   freezing-rain                           freezingrain            freezing-rain
//   hail                                    hail                    hail
//   squall                                  squall                  wind
//
// The MET table below is the official legend
// (https://github.com/metno/weathericons, weather/legend.csv). Meteo.lt has
// no day/night variant: the pivot's `is_day` comes from the computed sun
// (sun.js), never as the deprecated `night` condition.
//
// A code unknown to this table (a code added after this one, or `null`)
// falls back to the cloud cover, so the core never receives a condition it
// would turn into "unknown" for nothing.
// -----------------------------------------------------------------------------

import { WEATHER_CONDITIONS as C } from '@gladysassistant/integration-sdk';

// The 41 symbols of legend.csv, in its order. `variants`: drawn with a sun or
// a moon, hence the _day/_night/_polartwilight suffixes.
const SYMBOLS = Object.freeze([
  { id: 'clearsky', variants: true },
  { id: 'fair', variants: true },
  { id: 'partlycloudy', variants: true },
  { id: 'cloudy', variants: false },
  { id: 'lightrainshowers', variants: true },
  { id: 'rainshowers', variants: true },
  { id: 'heavyrainshowers', variants: true },
  { id: 'lightrainshowersandthunder', variants: true },
  { id: 'rainshowersandthunder', variants: true },
  { id: 'heavyrainshowersandthunder', variants: true },
  { id: 'lightsleetshowers', variants: true },
  { id: 'sleetshowers', variants: true },
  { id: 'heavysleetshowers', variants: true },
  { id: 'lightssleetshowersandthunder', variants: true },
  { id: 'sleetshowersandthunder', variants: true },
  { id: 'heavysleetshowersandthunder', variants: true },
  { id: 'lightsnowshowers', variants: true },
  { id: 'snowshowers', variants: true },
  { id: 'heavysnowshowers', variants: true },
  { id: 'lightssnowshowersandthunder', variants: true },
  { id: 'snowshowersandthunder', variants: true },
  { id: 'heavysnowshowersandthunder', variants: true },
  { id: 'lightrain', variants: false },
  { id: 'rain', variants: false },
  { id: 'heavyrain', variants: false },
  { id: 'lightrainandthunder', variants: false },
  { id: 'rainandthunder', variants: false },
  { id: 'heavyrainandthunder', variants: false },
  { id: 'lightsleet', variants: false },
  { id: 'sleet', variants: false },
  { id: 'heavysleet', variants: false },
  { id: 'lightsleetandthunder', variants: false },
  { id: 'sleetandthunder', variants: false },
  { id: 'heavysleetandthunder', variants: false },
  { id: 'lightsnow', variants: false },
  { id: 'snow', variants: false },
  { id: 'heavysnow', variants: false },
  { id: 'lightsnowandthunder', variants: false },
  { id: 'snowandthunder', variants: false },
  { id: 'heavysnowandthunder', variants: false },
  { id: 'fog', variants: false },
]);

// Meteo.lt's own codes, without a MET symbol.
const EXTRA_SYMBOLS = Object.freeze(['thunder', 'freezingrain', 'hail', 'squall']);

// Meteo.lt conditionCode -> symbol.
const METEO_LT_SYMBOLS = Object.freeze({
  clear: 'clearsky',
  'partly-cloudy': 'fair',
  'variable-cloudiness': 'partlycloudy',
  'cloudy-with-sunny-intervals': 'partlycloudy',
  cloudy: 'cloudy',
  'rain-showers': 'rainshowers',
  'light-rain-at-times': 'lightrainshowers',
  'rain-at-times': 'rainshowers',
  'light-rain': 'lightrain',
  rain: 'rain',
  'heavy-rain': 'heavyrain',
  thunder: 'thunder',
  'isolated-thunderstorms': 'rainshowersandthunder',
  thunderstorms: 'rainandthunder',
  'heavy-rain-with-thunderstorms': 'heavyrainandthunder',
  'sleet-showers': 'sleetshowers',
  'sleet-at-times': 'sleetshowers',
  'light-sleet': 'lightsleet',
  sleet: 'sleet',
  'freezing-rain': 'freezingrain',
  hail: 'hail',
  'snow-showers': 'snowshowers',
  'light-snow-at-times': 'lightsnowshowers',
  'snow-at-times': 'snowshowers',
  'light-snow': 'lightsnow',
  snow: 'snow',
  'heavy-snow': 'heavysnow',
  snowstorm: 'heavysnow',
  fog: 'fog',
  squall: 'squall',
});

/**
 * @description The symbol of a Meteo.lt condition code.
 * @param {any} code - The `conditionCode` (a string, or null).
 * @returns {string|null} The symbol, or null when unknown.
 * @example
 * meteoLtSymbol('light-rain-at-times'); // -> 'lightrainshowers'
 */
function meteoLtSymbol(code) {
  return typeof code === 'string' ? (METEO_LT_SYMBOLS[code.trim()] ?? null) : null;
}

const VARIANTS = Object.freeze(['day', 'night', 'polartwilight']);

const PRECIPITATION_KINDS = Object.freeze({ RAIN: 'rain', SLEET: 'sleet', SNOW: 'snow' });

// The intensity word of a symbol: `light…`, `heavy…`, or neither.
const SYMBOL_INTENSITIES = Object.freeze({ LIGHT: 'light', NORMAL: 'normal', HEAVY: 'heavy' });

/**
 * @description Every code the API can send: the symbols without a variant,
 * and the three variants of the others.
 * @returns {Array<string>} The 83 codes.
 * @example
 * allSymbolCodes().length; // -> 83
 */
function allSymbolCodes() {
  return SYMBOLS.flatMap(({ id, variants }) =>
    variants ? VARIANTS.map((variant) => `${id}_${variant}`) : [id],
  );
}

/**
 * @description Split a code into its symbol and its variant.
 * @param {any} code - A `symbol_code`, e.g. 'rainshowers_night'.
 * @returns {{id: string, variant: string|null}|null} The parts, or null.
 * @example
 * splitSymbol('fair_polartwilight'); // -> { id: 'fair', variant: 'polartwilight' }
 */
function splitSymbol(code) {
  if (typeof code !== 'string' || code.trim() === '') {
    return null;
  }
  const match = code.trim().match(/^([a-z]+)(?:_(day|night|polartwilight))?$/);
  if (!match) {
    return null;
  }
  return { id: match[1], variant: match[2] ?? null };
}

/**
 * @description Describe a symbol: what falls, how hard, with thunder or not.
 * Read from the name itself, so a symbol MET would add on the same pattern
 * (a new intensity, a fixed spelling) is still understood.
 * @param {any} code - A `symbol_code`.
 * @returns {object|null} `{ id, variant, known, kind (rain|sleet|snow|null),
 * intensity (light|normal|heavy|null), thunder, showers }`, or null.
 * @example
 * describeSymbol('heavysnowshowersandthunder_day').kind; // -> 'snow'
 */
function describeSymbol(code) {
  const parts = splitSymbol(code);
  if (parts === null) {
    return null;
  }
  const { id, variant } = parts;
  // Precipitation: [light|lights|heavy](rain|sleet|snow)[showers][andthunder].
  // Freezing rain is rain that freezes on the ground: what falls is rain.
  const match =
    id === 'freezingrain'
      ? [id, undefined, 'rain', undefined, undefined]
      : id.match(/^(lights?|heavy)?(rain|sleet|snow)(showers)?(andthunder)?$/);
  let kind = null;
  let intensity = null;
  let thunder = false;
  let showers = false;
  if (match) {
    kind = match[2];
    intensity = match[1]
      ? match[1].startsWith('light')
        ? SYMBOL_INTENSITIES.LIGHT
        : SYMBOL_INTENSITIES.HEAVY
      : SYMBOL_INTENSITIES.NORMAL;
    showers = match[3] !== undefined;
    thunder = match[4] !== undefined;
  }
  return {
    id,
    variant,
    known: SYMBOLS.some((symbol) => symbol.id === id) || EXTRA_SYMBOLS.includes(id),
    kind,
    intensity,
    thunder,
    showers,
  };
}

/**
 * @description The condition of a sky from its cloud cover (the fallback of
 * an unknown symbol), with the oktas boundaries of the WMO codes.
 * @param {number|null} cloudCover - Cloud cover, 0-100.
 * @returns {string} A condition (unknown without a cover).
 * @example
 * skyCondition(50); // -> 'partly-cloudy'
 */
function skyCondition(cloudCover) {
  if (typeof cloudCover !== 'number' || !Number.isFinite(cloudCover)) {
    return C.UNKNOWN;
  }
  if (cloudCover > 87.5) {
    return C.CLOUD;
  }
  if (cloudCover > 37.5) {
    return C.PARTLY_CLOUDY;
  }
  return C.CLEAR;
}

/**
 * @description Map a symbol to a Gladys condition.
 * @param {any} code - A `symbol_code`.
 * @param {object} [context] - What else is known of the period.
 * @param {number|null} [context.temperature] - °C, to tell freezing fog.
 * @param {number|null} [context.cloudCover] - 0-100, for an unknown symbol.
 * @returns {string} A condition of the Gladys enum.
 * @example
 * toCondition('heavyrainshowers_day'); // -> 'pouring'
 */
function toCondition(code, { temperature = null, cloudCover = null } = {}) {
  const symbol = describeSymbol(code);
  if (symbol === null) {
    return skyCondition(cloudCover);
  }
  if (symbol.id === 'freezingrain') {
    return C.FREEZING_RAIN;
  }
  if (symbol.kind !== null) {
    if (symbol.thunder) {
      return symbol.kind === PRECIPITATION_KINDS.SNOW ? C.SNOW_THUNDERSTORM : C.THUNDERSTORM;
    }
    if (symbol.kind === PRECIPITATION_KINDS.SNOW) {
      return C.SNOW;
    }
    if (symbol.kind === PRECIPITATION_KINDS.SLEET) {
      return C.SLEET;
    }
    return symbol.intensity === SYMBOL_INTENSITIES.HEAVY ? C.POURING : C.RAIN;
  }
  switch (symbol.id) {
    case 'clearsky':
      return C.CLEAR;
    case 'fair':
    case 'partlycloudy':
      return C.PARTLY_CLOUDY;
    case 'cloudy':
      return C.CLOUD;
    case 'thunder':
      return C.THUNDERSTORM;
    case 'hail':
      return C.HAIL;
    case 'squall':
      return C.WIND;
    case 'fog':
      return typeof temperature === 'number' && temperature <= 0 ? C.FREEZING_FOG : C.FOG;
    default:
      return skyCondition(cloudCover);
  }
}

/**
 * @description The day/night signal of a symbol's variant.
 * @param {any} code - A `symbol_code`.
 * @returns {boolean|null} true for `_day`, false for `_night` and
 * `_polartwilight`, null when the symbol has no variant.
 * @example
 * isDayFromSymbol('fair_night'); // -> false
 */
function isDayFromSymbol(code) {
  const variant = splitSymbol(code)?.variant ?? null;
  if (variant === null) {
    return null;
  }
  return variant === 'day';
}

export {
  EXTRA_SYMBOLS,
  METEO_LT_SYMBOLS,
  PRECIPITATION_KINDS,
  SYMBOLS,
  SYMBOL_INTENSITIES,
  VARIANTS,
  allSymbolCodes,
  describeSymbol,
  isDayFromSymbol,
  meteoLtSymbol,
  skyCondition,
  splitSymbol,
  toCondition,
};
