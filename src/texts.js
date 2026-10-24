// -----------------------------------------------------------------------------
// Texts the integration writes itself, in English, French, German and Spanish
// (the languages of the Gladys interface).
//
// The core gives the language of the user in a weather request, but a scene
// trigger or a scene action receives none: those texts follow the `language`
// setting, whose default ('auto') is the language of the last request of the
// core. The condition names are the ones of the Gladys weather widget
// (front/src/config/i18n/*.json, dashboard.boxes.weather.conditions).
//
// Every table below holds exactly one entry per language: test/i18n.test.js
// walks them all. German says "du", Spanish says "usted".
// -----------------------------------------------------------------------------

const LANGUAGES = Object.freeze({ EN: 'en', FR: 'fr', DE: 'de', ES: 'es' });

// Locales of the numbers and times of the sentences.
const LOCALES = Object.freeze({ en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' });

const CONDITION_NAMES = Object.freeze({
  clear: { en: 'Clear sky', fr: 'Ciel dégagé', de: 'Klarer Himmel', es: 'Cielo despejado' },
  'partly-cloudy': {
    en: 'Partly cloudy',
    fr: 'Peu nuageux',
    de: 'Leicht bewölkt',
    es: 'Parcialmente nublado',
  },
  cloud: { en: 'Cloudy', fr: 'Nuageux', de: 'Bewölkt', es: 'Nublado' },
  fog: { en: 'Fog', fr: 'Brouillard', de: 'Nebel', es: 'Niebla' },
  drizzle: { en: 'Drizzle', fr: 'Bruine', de: 'Nieselregen', es: 'Llovizna' },
  rain: { en: 'Rain', fr: 'Pluie', de: 'Regen', es: 'Lluvia' },
  pouring: { en: 'Heavy rain', fr: 'Fortes pluies', de: 'Starkregen', es: 'Lluvia intensa' },
  sleet: { en: 'Sleet', fr: 'Pluie et neige mêlées', de: 'Schneeregen', es: 'Aguanieve' },
  hail: { en: 'Hail', fr: 'Grêle', de: 'Hagel', es: 'Granizo' },
  snow: { en: 'Snow', fr: 'Neige', de: 'Schnee', es: 'Nieve' },
  thunderstorm: { en: 'Thunderstorm', fr: 'Orages', de: 'Gewitter', es: 'Tormenta' },
  wind: { en: 'Windy', fr: 'Vent', de: 'Windig', es: 'Ventoso' },
  night: { en: 'Night', fr: 'Nuit', de: 'Nacht', es: 'Noche' },
  'freezing-rain': {
    en: 'Freezing rain',
    fr: 'Pluie verglaçante',
    de: 'Gefrierender Regen',
    es: 'Lluvia helada',
  },
  'freezing-fog': {
    en: 'Freezing fog',
    fr: 'Brouillard givrant',
    de: 'Gefrierender Nebel',
    es: 'Niebla helada',
  },
  'snow-thunderstorm': {
    en: 'Thundery snow showers',
    fr: 'Averses de neige orageuses',
    de: 'Gewittrige Schneeschauer',
    es: 'Chubascos de nieve con tormenta',
  },
  sandstorm: { en: 'Sandstorm', fr: 'Tempête de sable', de: 'Sandsturm', es: 'Tormenta de arena' },
  tornado: { en: 'Tornado', fr: 'Tornade', de: 'Tornado', es: 'Tornado' },
  hurricane: { en: 'Hurricane', fr: 'Cyclone', de: 'Hurrikan', es: 'Huracán' },
  unknown: { en: 'Unavailable', fr: 'Indisponible', de: 'Nicht verfügbar', es: 'No disponible' },
});

// Every noun is feminine in French and Spanish and masculine in German, so the
// intensity words below are already agreed with all of them.
const TYPE_NOUNS = Object.freeze({
  rain: { en: 'rain', fr: 'pluie', de: 'Regen', es: 'lluvia' },
  sleet: { en: 'sleet', fr: 'neige fondue', de: 'Schneeregen', es: 'aguanieve' },
  snow: { en: 'snow', fr: 'neige', de: 'Schneefall', es: 'nieve' },
});

const INTENSITY_WORDS = Object.freeze({
  light: { en: 'Light', fr: 'faible', de: 'Leichter', es: 'débil' },
  moderate: { en: 'Moderate', fr: 'modérée', de: 'Mäßiger', es: 'moderada' },
  heavy: { en: 'Heavy', fr: 'forte', de: 'Starker', es: 'fuerte' },
});

const DAY_NAMES = Object.freeze({
  today: { en: 'Today', fr: 'Aujourd’hui', de: 'Heute', es: 'Hoy' },
  tomorrow: { en: 'Tomorrow', fr: 'Demain', de: 'Morgen', es: 'Mañana' },
});

// Fixed texts, sent as a whole to Gladys (statuses) or picked by language.
const MESSAGES = Object.freeze({
  noHourlyForecast: {
    en: 'No hourly forecast covers the next hour.',
    fr: 'Aucune prévision horaire ne couvre l’heure à venir.',
    de: 'Keine stündliche Vorhersage deckt die nächste Stunde ab.',
    es: 'Ninguna previsión horaria cubre la próxima hora.',
  },
  noPrecipitation: {
    en: 'No precipitation expected within the hour.',
    fr: 'Pas de précipitations prévues dans l’heure.',
    de: 'Kein Niederschlag in der nächsten Stunde erwartet.',
    es: 'No se esperan precipitaciones en la próxima hora.',
  },
  noDayForecast: {
    en: 'No forecast for this day.',
    fr: 'Pas de prévision pour ce jour.',
    de: 'Keine Vorhersage für diesen Tag.',
    es: 'No hay previsión para este día.',
  },
  noLocation: {
    en: 'No house of Gladys has a location: set it in Settings → Houses.',
    fr: 'Aucune maison de Gladys n’a de position : renseignez-la dans Paramètres → Maisons.',
    de: 'Kein Zuhause in Gladys hat einen Standort: Lege ihn unter Einstellungen → Zuhause fest.',
    es: 'Ninguna vivienda de Gladys tiene ubicación: indíquela en Configuración → Viviendas.',
  },
  throttled: {
    en: 'Meteo.lt asks to slow down (too many requests from your Internet connection): retrying later.',
    fr: 'Meteo.lt demande de ralentir (trop de requêtes depuis votre connexion Internet) : nouvel essai plus tard.',
    de: 'Meteo.lt bittet darum, langsamer zu werden (zu viele Anfragen von deiner Internetverbindung): neuer Versuch später.',
    es: 'Meteo.lt pide reducir el ritmo (demasiadas solicitudes desde su conexión a Internet): se reintentará más tarde.',
  },
  forbidden: {
    en: 'Meteo.lt refuses the requests (HTTP 403): retrying in 6 hours. Update the integration if this persists.',
    fr: 'Meteo.lt refuse les requêtes (HTTP 403) : nouvel essai dans 6 heures. Mettez à jour l’intégration si cela persiste.',
    de: 'Meteo.lt lehnt die Anfragen ab (HTTP 403): neuer Versuch in 6 Stunden. Aktualisiere die Integration, wenn das anhält.',
    es: 'Meteo.lt rechaza las solicitudes (HTTP 403): se reintentará dentro de 6 horas. Actualice la integración si persiste.',
  },
  noForecast: {
    en: 'Meteo.lt has no forecast for the location of your house: it covers Lithuania and nearby towns. Check it in Settings → Houses.',
    fr: 'Meteo.lt n’a pas de prévision pour la position de votre maison : il couvre la Lituanie et les villes proches. Vérifiez-la dans Paramètres → Maisons.',
    de: 'Meteo.lt hat keine Vorhersage für den Standort deines Zuhauses: Es deckt Litauen und nahe Städte ab. Prüfe ihn unter Einstellungen → Zuhause.',
    es: 'Meteo.lt no tiene previsión para la ubicación de su vivienda: cubre Lituania y las ciudades cercanas. Compruébela en Configuración → Viviendas.',
  },
  unreachable: {
    en: 'Meteo.lt is unreachable for now: retrying in a few minutes.',
    fr: 'Meteo.lt est injoignable pour le moment : nouvel essai dans quelques minutes.',
    de: 'Meteo.lt ist im Moment nicht erreichbar: neuer Versuch in ein paar Minuten.',
    es: 'Meteo.lt no está disponible por ahora: se reintentará en unos minutos.',
  },
});

const plural = (count, one, many) => (count > 1 ? many : one);

// Texts built from values, one function per language.
const TEMPLATES = Object.freeze({
  label: {
    en: (noun, intensity) => `${intensity} ${noun}`,
    fr: (noun, intensity) => `${noun} ${intensity}`,
    de: (noun, intensity) => `${intensity} ${noun}`,
    es: (noun, intensity) => `${noun} ${intensity}`,
  },
  thunder: {
    en: () => ' with thunder',
    fr: () => ' avec orage',
    de: () => ' mit Gewitter',
    es: () => ' con tormenta',
  },
  chance: {
    en: (probability) => ` (${probability}% chance)`,
    fr: (probability) => ` (probabilité ${probability} %)`,
    de: (probability) => ` (Wahrscheinlichkeit ${probability} %)`,
    es: (probability) => ` (probabilidad del ${probability} %)`,
  },
  now: {
    en: (label, chance) => `${label} now${chance}.`,
    fr: (label, chance) => `${label} en ce moment${chance}.`,
    de: (label, chance) => `${label} im Moment${chance}.`,
    es: (label, chance) => `${label} en este momento${chance}.`,
  },
  expected: {
    en: (label, minutes, chance) =>
      `${label} expected in ${minutes} ${plural(minutes, 'minute', 'minutes')}${chance}.`,
    fr: (label, minutes, chance) =>
      `${label} attendue dans ${minutes} ${plural(minutes, 'minute', 'minutes')}${chance}.`,
    de: (label, minutes, chance) =>
      `${label} in ${minutes} ${plural(minutes, 'Minute', 'Minuten')} erwartet${chance}.`,
    es: (label, minutes, chance) =>
      `${label} prevista dentro de ${minutes} ${plural(minutes, 'minuto', 'minutos')}${chance}.`,
  },
  temperatures: {
    en: (min, max, unit) => `${min} to ${max} ${unit}`,
    fr: (min, max, unit) => `de ${min} à ${max} ${unit}`,
    de: (min, max, unit) => `${min} bis ${max} ${unit}`,
    es: (min, max, unit) => `de ${min} a ${max} ${unit}`,
  },
  precipitation: {
    en: (amount, unit, chance) => `${amount} ${unit} of precipitation${chance}`,
    fr: (amount, unit, chance) => `${amount} ${unit} de précipitations${chance}`,
    de: (amount, unit, chance) => `${amount} ${unit} Niederschlag${chance}`,
    es: (amount, unit, chance) => `${amount} ${unit} de precipitación${chance}`,
  },
  dry: {
    en: (chance) => `no precipitation${chance}`,
    fr: (chance) => `pas de précipitations${chance}`,
    de: (chance) => `kein Niederschlag${chance}`,
    es: (chance) => `sin precipitación${chance}`,
  },
  day: {
    en: (day, parts) => `${day}: ${parts.join(', ')}.`,
    fr: (day, parts) => `${day} : ${parts.join(', ')}.`,
    de: (day, parts) => `${day}: ${parts.join(', ')}.`,
    es: (day, parts) => `${day}: ${parts.join(', ')}.`,
  },
  // Fahrenheit for the English text only: the others are metric countries.
  // The numbers take the decimal separator of each language.
  testSucceeded: {
    en: ({ us, metric, house, station, place, time }) =>
      `It works: ${formatNumber(us, 'en')} °F (${formatNumber(metric, 'en')} °C) now at ${house}${station ? ` (station ${station})` : ''}, forecast for ${place} of ${time}.`,
    fr: ({ metric, house, station, place, time }) =>
      `Ça fonctionne : ${formatNumber(metric, 'fr')} °C en ce moment à ${house}${station ? ` (station ${station})` : ''}, prévision pour ${place} de ${time}.`,
    de: ({ metric, house, station, place, time }) =>
      `Es funktioniert: gerade ${formatNumber(metric, 'de')} °C in ${house}${station ? ` (Station ${station})` : ''}, Vorhersage für ${place} von ${time}.`,
    es: ({ metric, house, station, place, time }) =>
      `Funciona: ${formatNumber(metric, 'es')} °C ahora en ${house}${station ? ` (estación ${station})` : ''}, previsión para ${place} de las ${time}.`,
  },
});

/**
 * @description Pick the language of a text: the setting, or with 'auto' the
 * language of the last request of the core. An unknown language is English.
 * @param {string} setting - The `language` setting ('auto', 'en', 'fr', 'de', 'es').
 * @param {string|null} [lastSeen] - The language of the last core request.
 * @returns {string} 'en', 'fr', 'de' or 'es'.
 * @example
 * resolveLanguage('auto', 'fr-FR'); // -> 'fr'
 */
function resolveLanguage(setting, lastSeen = null) {
  const wanted = setting === 'auto' ? lastSeen : setting;
  if (typeof wanted !== 'string') {
    return LANGUAGES.EN;
  }
  const prefix = wanted.toLowerCase().slice(0, 2);
  return Object.values(LANGUAGES).includes(prefix) ? prefix : LANGUAGES.EN;
}

/**
 * @description A text of a table in a language, English when unknown.
 * @param {object} table - A table of `{ en, fr, de, es }`.
 * @param {string} key - The key in the table.
 * @param {string} language - 'en', 'fr', 'de' or 'es'.
 * @returns {string} The text.
 * @example
 * pick(MESSAGES, 'noPrecipitation', 'de');
 */
function pick(table, key, language) {
  const texts = table[key];
  return texts[language] ?? texts.en;
}

/**
 * @description The function of a template in a language, English when unknown.
 * @param {string} key - A TEMPLATES key.
 * @param {string} language - 'en', 'fr', 'de' or 'es'.
 * @returns {Function} The template.
 * @example
 * template('thunder', 'es')();
 */
function template(key, language) {
  return TEMPLATES[key][language] ?? TEMPLATES[key].en;
}

/**
 * @description A template filled in every language, for the texts Gladys
 * localizes itself (action results).
 * @param {string} key - A TEMPLATES key.
 * @param {...*} args - The values of the template.
 * @returns {object} `{ en, fr, de, es }`.
 * @example
 * localized('testSucceeded', values);
 */
function localized(key, ...args) {
  return Object.fromEntries(
    Object.values(LANGUAGES).map((language) => [language, TEMPLATES[key][language](...args)]),
  );
}

/**
 * @description Format a number with the decimal separator of a language.
 * @param {number} value - The number.
 * @param {string} language - 'en', 'fr', 'de' or 'es'.
 * @returns {string} The formatted number.
 * @example
 * formatNumber(5.2, 'fr'); // -> '5,2'
 */
function formatNumber(value, language) {
  return new Intl.NumberFormat(LOCALES[language] ?? LOCALES.en, {
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * @description The name of a condition, as the weather widget of Gladys says it.
 * @param {string} condition - A Gladys condition.
 * @param {string} language - 'en', 'fr', 'de' or 'es'.
 * @returns {string} The capitalized name.
 * @example
 * conditionName('partly-cloudy', 'fr'); // -> 'Peu nuageux'
 */
function conditionName(condition, language) {
  return pick(
    CONDITION_NAMES,
    Object.hasOwn(CONDITION_NAMES, condition) ? condition : 'unknown',
    language,
  );
}

/**
 * @description Name a precipitation: "Light rain", "Neige forte".
 * @param {string} type - 'rain', 'sleet' or 'snow'.
 * @param {string} intensity - 'light', 'moderate' or 'heavy'.
 * @param {boolean} thunder - With thunder.
 * @param {string} language - 'en', 'fr', 'de' or 'es'.
 * @returns {string} The capitalized name.
 * @example
 * precipitationLabel('snow', 'heavy', false, 'fr'); // -> 'Neige forte'
 */
function precipitationLabel(type, intensity, thunder, language) {
  const lang = Object.values(LANGUAGES).includes(language) ? language : LANGUAGES.EN;
  const noun = (TYPE_NOUNS[type] ?? TYPE_NOUNS.rain)[lang];
  const words = (INTENSITY_WORDS[intensity] ?? INTENSITY_WORDS.light)[lang];
  const label = template('label', lang)(noun, words) + (thunder ? template('thunder', lang)() : '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * @description The sentence of the next hour, ready to put in a message.
 * @param {object} reading - A readNextHour() result.
 * @param {string} language - 'en', 'fr', 'de' or 'es'.
 * @returns {string} The sentence.
 * @example
 * nextHourSentence(reading, 'en'); // -> 'Light rain expected in 35 minutes.'
 */
function nextHourSentence(reading, language) {
  if (!reading.available) {
    return pick(MESSAGES, 'noHourlyForecast', language);
  }
  if (reading.minutesUntil === null) {
    return pick(MESSAGES, 'noPrecipitation', language);
  }
  const label = precipitationLabel(reading.type, reading.intensity, reading.thunder, language);
  const chance =
    reading.probability === null ? '' : template('chance', language)(reading.probability);
  if (reading.minutesUntil === 0) {
    return template('now', language)(label, chance);
  }
  return template('expected', language)(label, reading.minutesUntil, chance);
}

/**
 * @description The sentence of a day, ready to put in a message:
 * "Tomorrow: rain, 8 to 14 °C, 5.2 mm of precipitation (70% chance)."
 * @param {object} values - The day, in the unit system of the outputs.
 * @param {string} values.day - 'today' or 'tomorrow'.
 * @param {string} values.condition - The Gladys condition.
 * @param {number} values.min - The minimum temperature.
 * @param {number} values.max - The maximum temperature.
 * @param {number|null} values.precipitation - The amount, or null.
 * @param {number|null} values.probability - 0-100, or null.
 * @param {object} values.labels - The unit labels (units.js).
 * @param {string} language - 'en', 'fr', 'de' or 'es'.
 * @returns {string} The sentence.
 * @example
 * daySentence({ day: 'tomorrow', condition: 'rain', min: 8, max: 14, precipitation: 5.2, probability: null, labels }, 'en');
 */
function daySentence({ day, condition, min, max, precipitation, probability, labels }, language) {
  const number = (value) => formatNumber(value, language);
  let name = conditionName(condition, language);
  if (language !== LANGUAGES.DE) {
    // German nouns keep their capital; the others read as a sentence.
    name = name.charAt(0).toLowerCase() + name.slice(1);
  }
  const parts = [
    name,
    template('temperatures', language)(number(min), number(max), labels.temperature),
  ];
  const chance = probability === null ? '' : template('chance', language)(probability);
  if (precipitation !== null && precipitation > 0) {
    parts.push(
      template('precipitation', language)(number(precipitation), labels.precipitation, chance),
    );
  } else if (precipitation !== null) {
    parts.push(template('dry', language)(chance));
  }
  return template('day', language)(pick(DAY_NAMES, day, language), parts);
}

export {
  CONDITION_NAMES,
  DAY_NAMES,
  INTENSITY_WORDS,
  LANGUAGES,
  LOCALES,
  MESSAGES,
  TEMPLATES,
  TYPE_NOUNS,
  conditionName,
  daySentence,
  formatNumber,
  localized,
  nextHourSentence,
  pick,
  precipitationLabel,
  resolveLanguage,
  template,
};
