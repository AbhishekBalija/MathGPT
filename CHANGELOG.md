# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Backend moved from Motia to Express 5, run with Bun in development. All
  API paths and response shapes are unchanged.
- Background work (emails, analytics, error logging) runs as plain functions
  after the response instead of Motia events. Saving a solution is now awaited
  so it cannot be lost.
- Package manager for the backend is now Bun (`bun.lock`).

### Fixed

- Admin error filters (`GET /admin/errors?errorCode=...`) and
  `PATCH /admin/errors/:id/resolve` now read query and path params correctly.

### Security

- Removed hardcoded JWT secret fallbacks. The server now refuses to start
  without `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- CORS now only allows the listed frontend origins. Motia's default left
  other origins on a wildcard.

### Removed

- Motia packages, config, Workbench files and Motia-specific agent docs.
- Unused Python example project and Python runtime files.
