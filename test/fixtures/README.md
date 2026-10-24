# Test fixtures

## Real Meteo.lt answers

Every `real-*.json` file is the untouched body of a Meteo.lt API request
(`https://api.meteo.lt/v1/…`), recorded on 24 October 2026 at 04:14 UTC with
an identified User-Agent. Public places and the public weather stations of
LHMT only: no private location. Data: LHMT, CC BY-SA 4.0. The tests read
them "now" at 04:15 UTC (`FIXTURE_NOW`). Prettier leaves them as they came
(`.prettierignore`).

| File                                   | Request                                       | Why                                                         |
| -------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `real-places.json`                     | `/places`                                     | The 2,444 places (LT, and towns of LV, EE, PL)              |
| `real-stations.json`                   | `/stations`                                   | The 52 automatic weather stations                           |
| `real-forecast-vilnius.json`           | `/places/vilnius/forecasts/long-term`         | Vilnius: dry, rain on Monday 26                             |
| `real-forecast-kaunas.json`            | `/places/kaunas/forecasts/long-term`          | Kaunas                                                      |
| `real-forecast-klaipeda.json`          | `/places/klaipeda/forecasts/long-term`        | Klaipėda: rain on Sunday 25 afternoon, 3-hour rain          |
| `real-observations-vilniaus-ams.json`  | `/stations/vilniaus-ams/observations/latest`  | 24 hourly readings; fog at 04:00, no cloud cover            |
| `real-observations-kauno-ams.json`     | `/stations/kauno-ams/observations/latest`     | 24 hourly readings                                          |
| `real-observations-klaipedos-ams.json` | `/stations/klaipedos-ams/observations/latest` | 24 hourly readings                                          |
| `real-not-found.json`                  | `/places/nowhere-xyz/forecasts/long-term`     | An unknown code: `404`, `{"error":{"message":"Not Found"}}` |

The forecasts were made at 02:17 UTC and start at 02:00 UTC: 85 steps, 52 of
one hour, 26 of three hours and 6 of six hours, up to 31 October 00:00 UTC.
Showers are staged on the real forecasts by `withHours()`
(`test/helpers/fixtures.js`), which rewrites the precipitation and the
condition of a step.

## Other files

- `gladys-feature-table.json`: the category/type pairs the front of the
  Gladys core can display (kept from the template series; this weather
  provider publishes no device).
- `weathericons-legend.csv`: the official legend of MET Norway's weather
  symbols (https://github.com/metno/weathericons, `weather/legend.csv`, MIT),
  the vocabulary the Meteo.lt conditions are mapped to.
