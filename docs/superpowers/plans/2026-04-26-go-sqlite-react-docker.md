# Go SQLite React Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current static React dashboard into a first-version Go + SQLite + React + Docker application with unit tests and e2e coverage.

**Architecture:** Keep the current React UI as the user-facing shell, but move configuration persistence behind a Go REST API. SQLite stores categories and services, seeded from the existing `web/src/assets/config.json` on first startup. The Go server serves `/api/config` and the built React static files from one Docker image.

**Tech Stack:** Go 1.26, SQLite via `modernc.org/sqlite`, React 18 + Vite, Vitest + Testing Library, Playwright, Docker multi-stage build.

---

## File Structure

- `go.mod`: Go module and backend dependencies.
- `cmd/server/main.go`: server entrypoint.
- `internal/config/model.go`: shared config structs matching the existing JSON shape.
- `internal/store/store.go`: SQLite schema, seed, load, and replace-all persistence.
- `internal/store/store_test.go`: SQLite unit/integration tests with temp DB files.
- `internal/api/server.go`: HTTP routes and static file serving.
- `internal/api/server_test.go`: HTTP tests using `httptest`.
- `web/src/utils/api.js`: browser API client for `/api/config`.
- `web/src/utils/api.test.jsx`: frontend unit tests for config fetch/save behavior.
- `web/src/App.jsx`: save edited config through API while preserving local fallback behavior.
- `web/e2e/dashboard.spec.js`: Playwright smoke and persistence test.
- `web/playwright.config.js`: e2e config.
- `Dockerfile`: build React, build Go, run one final image.
- `deploy/compose.yml`: local app + SQLite volume.

---

## Task 1: Backend Store

**Files:**
- Create: `go.mod`
- Create: `internal/config/model.go`
- Create: `internal/store/store.go`
- Test: `internal/store/store_test.go`

- [ ] **Step 1: Write failing store tests**

Test cases:
- `Open` creates schema.
- First `LoadConfig` seeds from JSON when DB is empty.
- `ReplaceConfig` persists category/service order and values.

Run: `go test ./internal/store`
Expected: FAIL because package does not exist.

- [ ] **Step 2: Implement minimal store**

Use `database/sql`, `modernc.org/sqlite`, and transactions. Keep API small:

```go
func Open(path string, seed config.Config) (*Store, error)
func (s *Store) LoadConfig(ctx context.Context) (config.Config, error)
func (s *Store) ReplaceConfig(ctx context.Context, cfg config.Config) error
func (s *Store) Close() error
```

- [ ] **Step 3: Verify backend store tests**

Run: `go test ./internal/store`
Expected: PASS.

---

## Task 2: Backend HTTP API

**Files:**
- Create: `internal/api/server.go`
- Test: `internal/api/server_test.go`
- Create: `cmd/server/main.go`

- [ ] **Step 1: Write failing API tests**

Test cases:
- `GET /api/config` returns current config.
- `PUT /api/config` saves config and `GET /api/config` returns the update.
- Invalid JSON returns HTTP 400.

Run: `go test ./internal/api`
Expected: FAIL because API package does not exist.

- [ ] **Step 2: Implement minimal API**

Expose:

```txt
GET /api/config
PUT /api/config
GET /* static fallback
```

Use injected `*store.Store` and a static directory path.

- [ ] **Step 3: Verify backend API tests**

Run: `go test ./...`
Expected: PASS.

---

## Task 3: Frontend API Client and Save Path

**Files:**
- Modify: `web/package.json`
- Modify: `package-lock.json`
- Modify: `web/src/utils/api.js`
- Modify: `web/src/App.jsx`
- Test: `web/src/utils/api.test.jsx`

- [ ] **Step 1: Write failing frontend tests**

Test cases:
- `fetchConfig` calls `/api/config`.
- `saveConfig` sends `PUT /api/config` with JSON body.
- `fetchConfig` falls back to bundled config if API is unavailable.

Run: `npm --prefix web test -- src/utils/api.test.jsx`
Expected: FAIL because test runner and `saveConfig` are missing.

- [ ] **Step 2: Implement frontend API client**

Keep exported `fetchConfig`; add exported `saveConfig`. Preserve bundled fallback for static/GitHub Pages usage.

- [ ] **Step 3: Wire App saves through API**

When edits happen, save to API first and keep localStorage as fallback/cache. Avoid UI redesign.

- [ ] **Step 4: Verify frontend unit tests**

Run: `npm --prefix web test -- src/utils/api.test.jsx`
Expected: PASS.

---

## Task 4: Docker and E2E

**Files:**
- Create: `Dockerfile`
- Create: `deploy/compose.yml`
- Create: `web/playwright.config.js`
- Test: `web/e2e/dashboard.spec.js`
- Modify: `web/package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

- [ ] **Step 1: Write failing e2e test**

Test cases:
- Dashboard loads from a running app.
- User enters edit mode, adds a service, reloads, and the service remains.

Run: `npm run test:e2e`
Expected: FAIL before server/Docker wiring is complete.

- [ ] **Step 2: Implement Docker packaging**

Use multi-stage build:
- Node stage runs `npm ci && npm run build`.
- Go stage runs `go test ./... && go build`.
- Runtime stage includes binary, `web/dist`, and `/data`.

- [ ] **Step 3: Verify Docker and e2e**

Run:

```bash
npm run build
go test ./...
npm run test:e2e
docker compose build
```

Expected: all PASS.

---

## First-Version Acceptance Criteria

- Existing dashboard still loads and looks materially the same.
- Config persists in SQLite through `/api/config`.
- Local static fallback still works when backend is unavailable.
- `go test ./...` passes.
- Frontend unit tests pass.
- Playwright e2e covers add-service persistence.
- Docker image can run the full app with persistent `/data/homelab.db`.
