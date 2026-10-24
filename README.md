# Meteo.lt for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) weather provider for
Lithuania: the station measurements and the official forecasts of
[Meteo.lt](https://www.meteo.lt/), the service of the Lithuanian
Hydrometeorological Service (LHMT). Open data: no account, no API key.

Source: Lithuanian Hydrometeorological Service under the Ministry of
Environment (LHMT), data under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). This is a
community project, **not affiliated with LHMT**.

> **Developed without a Gladys running in Lithuania**: tested against real
> answers of Meteo.lt (Vilnius, Kaunas, Klaipėda, 24 October 2026). Feedback
> welcome.

## What it does

- **Weather provider** (manifest `type: "weather"`, Gladys 5.2.0 or later):
  the Gladys weather widget and the chat assistant show the current weather
  measured by the nearest LHMT station (temperature, feels-like, the observed
  sky, completed by the forecast), the next 24 hours (precipitation, gusts,
  feels-like) and the next days (7 in all) of every house of Gladys in or
  near Lithuania, in metric or US units.
- **Scene trigger** "Rain or snow expected within the hour" (filters on
  house, precipitation, intensity).
- **Scene actions**: precipitation of the next hour, forecast of the day.
- Texts of the scenes in English, French, German or Spanish.

The user documentation, in four languages, is in [`docs/`](docs/en.md).

## Install

In Gladys 5.2.0 or later: **Integrations → Install from GitHub**, address
`https://github.com/guim31/gladys-meteo-lt` (or from the integration store
once published). Give your houses a location (**Settings → Houses**), then
click **Test Meteo.lt** in the **Configuration** tab.

## Calls and Meteo.lt's terms

All on the documented [Meteo.lt API](https://api.meteo.lt/), without key:

- Places: `GET /v1/places`, the 2,444 places with a forecast (Lithuania, and
  the main towns of Latvia, Estonia and north-eastern Poland). A house gets
  the forecast of the nearest place within 30 km; farther, there is no
  forecast and the core falls back to another provider.
- Forecast: `GET /v1/places/{code}/forecasts/long-term`, hourly for about 2.5
  days, then every 3 and 6 hours, up to 7 days; updated 8 times a day.
- Stations: `GET /v1/stations` (52 automatic stations) and
  `GET /v1/stations/{code}/observations/latest` (the hourly readings of the
  last 24 hours) of the nearest station within 50 km.
- One forecast and one station call per house location every 30 minutes at
  most (plus 0-5 min of jitter), and the two lists once a day: about 100
  requests a day for one house, against Meteo.lt's limits of 180 a minute and
  20,000 a day per IP address. The User-Agent is
  `gladys-meteo-lt/<version> github.com/guim31/gladys-meteo-lt`; 429 and 403
  pause the calls. The coordinates of the houses are never sent: the nearest
  place and station are picked locally.
- Data under CC BY-SA 4.0, the source to be cited: LHMT is credited in the
  configuration screen and in the documentation.

## Limits

- Lithuania and nearby towns only; the forecast is the one of the nearest
  place, not of the exact coordinates.
- **No weather warnings**: the Meteo.lt API publishes none. (The Home
  Assistant library reads an undocumented JSON file of the meteo.lt website;
  this integration keeps to the documented API.)
- No probability of precipitation, dew point nor UV index: Meteo.lt does not
  give them.

## Development

Node.js 22+, ESM, no build step; the only runtime dependency is
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

```bash
npm ci
npm run format:check   # Prettier (Markdown included)
npm run lint           # ESLint
npm test               # node --test, never touches the network
npx github:GladysAssistant/integration-store .   # store admission checks
```

```
index.js                 SDK wiring only
src/app.js               the integration on an injected client (handlers, status)
src/api.js               the four Meteo.lt calls: addresses, User-Agent, error kinds
src/catalog.js           places and stations, read once a day; the nearest of each
src/forecast.js          forecast → slim metric forecast (1, 3 and 6-hour periods)
src/observations.js      the latest reading of the nearest station
src/forecast-store.js    cache per location, 30 min floor, shared calls, 429 / 403 pauses
src/scheduler.js         the refresh timer (30 min, jitter, retries)
src/pivot.js             slim forecast → Gladys pivot weather, in the requested units
src/daily.js             the days, from the steps
src/symbols.js           Meteo.lt conditions → MET Norway symbols → Gladys conditions
src/sun.js, time.js      computed sunrise/sunset, local days
src/next-hour.js         precipitation within the hour
src/scene-triggers.js    "precipitation expected within the hour"
src/scene-actions.js     next hour, forecast of the day
src/houses.js            the houses of Gladys
src/units.js, texts.js   conversions, the texts in English, French, German, Spanish
```

Run it against a Gladys instance:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="meteo-lt" \
LOG_LEVEL=debug \
npm start
```

## Releasing

Versions belong to the **Release** workflow (Actions → Release → patch, minor
or major): it bumps `package.json` and the manifest `version`/`docker_image`,
moves the `## [Unreleased]` section of [`CHANGELOG.md`](CHANGELOG.md), tags,
builds the multi-arch image to `ghcr.io/guim31/gladys-meteo-lt` and publishes
the GitHub Release.

> A hand-pushed tag (`git tag v1.0.0 && git push --tags`) triggers the same
> build and Release but touches no file: bump `version` in `package.json` and
> in `gladys-assistant-integration.json` (with the `docker_image` tag) and
> commit **before** tagging.

## Credits

- Observations and forecasts: Lithuanian Hydrometeorological Service under
  the Ministry of Environment (LHMT, [meteo.lt](https://www.meteo.lt/)),
  through the [Meteo.lt API](https://api.meteo.lt/), under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The real
  answers in `test/fixtures/` are LHMT data under the same licence.
- The conditions are mapped to MET Norway's symbols: the legend comes from
  [metno/weathericons](https://github.com/metno/weathericons) (MIT, © Yr),
  copied in `test/fixtures/weathericons-legend.csv`. The forecast, cache and
  scene code comes from the sister integrations
  [FMI for Gladys](https://github.com/guim31/gladys-fmi) and
  [Met Éireann for Gladys](https://github.com/guim31/gladys-met-eireann).
- The idea comes from the Home Assistant
  [`meteo_lt`](https://github.com/home-assistant/core/tree/dev/homeassistant/components/meteo_lt)
  integration (Apache-2.0) and its
  [`meteo_lt-pkg`](https://github.com/Brunas/meteo_lt-pkg) library (MIT).
- Cover: the official logo of LHMT (the state coat of arms, the wave mark
  and the name), from [meteo.lt](https://www.meteo.lt/), in white on its brand
  blue (#1E88E5).
- Built from the official
  [Gladys integration template](https://github.com/GladysAssistant/integration-template-js).

## License

Apache-2.0
