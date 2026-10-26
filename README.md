# Homelab

[![Docker Pulls](https://img.shields.io/docker/pulls/zouzonghua/homelab-dashboard)](https://hub.docker.com/r/zouzonghua/homelab-dashboard)
[![GitHub release](https://img.shields.io/github/v/release/zouzonghua/homelab-dashboard)](https://github.com/zouzonghua/homelab-dashboard/releases)
[![License](https://img.shields.io/github/license/zouzonghua/homelab-dashboard)](LICENSE)

English | [简体中文](README.zh-CN.md)

A compact dashboard for self-hosted services, built with React, Base UI, and a Go API backed by SQLite.

## Preview

Gruvbox dark · vertical layout

![Gruvbox dark vertical layout](assets/readme/dashboard-dark.png)

Gruvbox light · vertical layout

![Gruvbox light vertical layout](assets/readme/dashboard-light.png)

Gruvbox dark · horizontal layout

![Gruvbox dark horizontal layout](assets/readme/dashboard-horizontal.png)

## Features

- Gruvbox light, dark, and system themes; compact controls and a sticky toolbar.
- Horizontal or vertical groups at widths of 640px and above. Phones use one column while preserving the saved layout preference.
- Service and category editing, drag sorting, JSON import/export, and an activity log.
- Keyboard navigation and actions. Press **`?`** for help; **`Esc`** closes dialogs and **`Ctrl/⌘ + Enter`** saves forms.
- Live health status and automatic service icons.
- Installable PWA with local icons and a standalone window. Use HTTPS or localhost, then install from your browser's menu.

Controls use unstyled [Base UI](https://base-ui.com/react/overview/quick-start) components with plain CSS. Dnd Kit handles sorting; Font Awesome supplies category and toolbar icons.

## Local development

Use Node.js 24 and Go 1.26.10 or later.

```bash
git clone https://github.com/zouzonghua/homelab-dashboard.git
cd homelab-dashboard
npm ci --prefix web
make dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the Go server at `http://127.0.0.1:8080`.

To serve a production build locally:

```bash
npm --prefix web run build
go run ./cmd/server
```

Open `http://localhost:8080`.

## Docker

```bash
docker compose -f deploy/compose.yml up -d --build
```

Open port `8080`. The Compose file persists SQLite and the icon cache in the repository's `data/` directory. Published images are available as `zouzonghua/homelab-dashboard:latest`.

The app has no built-in user accounts. Protect shared or public access with an authenticated reverse proxy such as Authentik.

## Data and configuration

The default JSON at [`internal/config/default-dashboard.json`](internal/config/default-dashboard.json) contains **7 groups and 32 shortcuts**, based on the Authentik snapshot from 2026-10-26. Group order follows the JSON array; numeric prefixes and the dashboard's own shortcut are removed.

An empty database is initialized from this JSON. Changing the seed does **not** overwrite an existing database. Use **Config tools → Import config** to replace saved data, and export a backup first. Authentik changes are not synchronized automatically.

| Environment variable | Default |
| --- | --- |
| `PORT` | `8080` |
| `HOMELAB_DB_PATH` | `data/homelab.db` |
| `HOMELAB_STATIC_DIR` | `web/dist` |
| `HOMELAB_SEED_PATH` | Embedded default JSON; set a path to override it |

API docs: `/api/docs`. The contract is in [`api/openapi.yaml`](api/openapi.yaml); resources use `/api/v1/`.

## Validation and contributions

```bash
npm --prefix web run api:types:check
npm --prefix web test
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web run test:e2e
go test ./api ./cmd/... ./internal/...
npm --prefix web audit
```

E2E tests use an isolated database and fixture, not the configured local dashboard data.

Follow [main-only + GitHub Flow](CONTRIBUTING.md): branch from `main`, open a PR to `main`, and squash after CI passes. Merging to `main` publishes the Docker image; version tags publish versioned images.

## License

[MIT](LICENSE) © zouzonghua
