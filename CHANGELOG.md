# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Meteo.lt weather for Gladys (Gladys 5.2.0 or later): the current weather
  measured by the nearest LHMT station (the sky it observes included),
  completed by the official forecast of the nearest Meteo.lt place, the next
  24 hours with the precipitation of each hour, and the next days (7 in all),
  for every house of Gladys in or near Lithuania, in metric or US units. Open
  data, no account, no API key; the coordinates of the houses are never sent.
- Scene trigger "Rain or snow expected within the hour".
- Scene actions "Get the precipitation of the next hour" and "Get the
  forecast of the day" (today or tomorrow).
- Settings: units and language of the scene texts. A "Test Meteo.lt" button
  that names the station and the forecast place used.

[Unreleased]: https://github.com/guim31/gladys-meteo-lt/commits/main
