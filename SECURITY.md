# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

The integration stores nothing on disk: `/data` stays empty, and the lists of
places and stations, the forecasts and the observations live in memory only.
It holds no secret (Meteo.lt needs no key) and makes only HTTPS requests to
`api.meteo.lt`: the lists of places and stations, then the forecast of a place
and the readings of a station, by their public codes. The coordinates of the
houses of Gladys, read through the Gladys host API (`location: true`), never
leave the container: the nearest place and station are picked locally. It
opens no port. An answer of Meteo.lt is parsed as JSON data only (no
evaluation), its codes are checked before they go into a request path, and
the core bounds the weather payload again.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and the Meteo.lt service.
