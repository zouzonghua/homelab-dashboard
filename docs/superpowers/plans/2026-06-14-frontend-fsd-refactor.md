# Frontend Minimal FSD Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the single-page frontend to minimal FSD `app/pages/shared` boundaries while preserving dashboard behavior and styling.

**Architecture:** Application startup, providers, theme, and global styles move to `app`. Dashboard-only models, React Query orchestration, forms, and UI move to one `pages/dashboard` slice with a single public API. HTTP transport, endpoint CRUD, and generated contracts move to `shared/api`; no speculative `features`, `entities`, or `widgets` layers are created.

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query, Vitest, Testing Library, Playwright, DnD Kit.

---

### Task 1: Add dashboard model characterization tests

**Files:**
- Create: `web/src/pages/dashboard/model/dashboard.test.ts`
- Create: `web/src/pages/dashboard/model/dashboard.ts`

- [ ] **Step 1: Write failing tests for dashboard resource mapping and immutable updates**

Create tests that import `buildDashboardViewModel`, `updateService`, and `reorderCategories` from `./dashboard`. Assert that resources are sorted by order, services are grouped by `categoryId`, updates preserve the input object, and reordered categories become the returned `items` array.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd web && npm test -- src/pages/dashboard/model/dashboard.test.ts`

Expected: FAIL because `./dashboard` or the named exports do not exist.

- [ ] **Step 3: Implement the minimal page model**

Define dashboard-local `ServiceFormData`, `ServiceViewModel`, `CategoryWithServices`, `DashboardViewModel`, `ServiceStatusMap`, and `SaveConfigOptions`. Implement pure resource mapping and immutable update helpers without React, network requests, timers, or notifications.

- [ ] **Step 4: Run focused and existing unit tests**

Run: `cd web && npm test -- src/pages/dashboard/model/dashboard.test.ts src/components/ServiceItem.test.tsx`

Expected: both test files PASS.

- [ ] **Step 5: Commit**

Commit message: `test: 补充仪表盘模型重构保护`

### Task 2: Move transport and CRUD to shared API

**Files:**
- Move: `web/src/api/http.ts` to `web/src/shared/api/http.ts`
- Move: `web/src/api/contract/` to `web/src/shared/api/contract/`
- Create: `web/src/shared/api/dashboard.ts`
- Create: `web/src/shared/api/index.ts`
- Modify: `web/package.json`
- Modify: `web/src/pages/dashboard/model/dashboard.ts`
- Modify consumers under `web/src/`
- Delete obsolete: `web/src/api/`, `web/src/types.ts`

- [ ] **Step 1: Add a failing contract-generation path check**

Change `api:types` and `api:types:check` to target `src/shared/api/contract`, then run the check before moving files.

Run: `cd web && npm run api:types:check`

Expected: FAIL because generated output differs from the current tracked location.

- [ ] **Step 2: Move generated contracts and HTTP transport**

Relocate files with history-preserving filesystem moves. Keep `HttpClient`, `ApiError`, and generated contract behavior unchanged.

- [ ] **Step 3: Separate endpoint CRUD from page mapping**

Create `shared/api/dashboard.ts` containing `dashboardApi`, `subscribeStatus`, and endpoint payload conversion only. Keep `buildDashboardViewModel` and `SaveConfigOptions` in the dashboard page model.

- [ ] **Step 4: Update all imports through segment and slice public APIs**

Use `@/shared/api` outside Shared. Dashboard page internals may import their own model relatively. Remove the root `types.ts` after every type has an explicit owner.

- [ ] **Step 5: Verify generated contracts, unit tests, and types**

Run: `cd web && npm run api:types:check && npm test && npm run typecheck`

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

Commit message: `refactor: 迁移共享 API 基础设施`

### Task 3: Establish the app layer

**Files:**
- Create: `web/src/app/main.tsx`
- Create: `web/src/app/providers/AppProviders.tsx`
- Create: `web/src/app/providers/theme.tsx`
- Create: `web/src/app/ui/ThemeToggle.tsx`
- Move: `web/src/index.css` to `web/src/app/styles/index.css`
- Modify: `web/index.html`
- Delete obsolete: `web/src/main.tsx`, `web/src/contexts/ThemeContext.tsx`, `web/src/components/ThemeToggle.tsx`

- [ ] **Step 1: Add a failing provider composition test**

Create `web/src/app/providers/AppProviders.test.tsx`. Render a child that calls `useTheme` and assert it receives a valid theme value inside `AppProviders`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd web && npm test -- src/app/providers/AppProviders.test.tsx`

Expected: FAIL because `AppProviders` does not exist.

- [ ] **Step 3: Move providers, theme UI, entrypoint, and styles**

`AppProviders` composes `QueryClientProvider` and `ThemeProvider`. `app/main.tsx` imports `DashboardPage` only from `@/pages/dashboard`, imports global CSS, and mounts the app. Update `index.html` to load `/src/app/main.tsx`.

- [ ] **Step 4: Verify app boundary**

Run: `cd web && npm test && npm run typecheck && npm run build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

Commit message: `refactor: 建立前端应用层边界`

### Task 4: Move dashboard UI behind a page public API

**Files:**
- Create: `web/src/pages/dashboard/index.ts`
- Move dashboard components from `web/src/components/` to `web/src/pages/dashboard/ui/`
- Create: `web/src/pages/dashboard/ui/DashboardPage.tsx`
- Create: `web/src/pages/dashboard/ui/DashboardModals.tsx`
- Move: `web/src/icons/categoryIcons.ts` to `web/src/pages/dashboard/ui/category-icons.ts`
- Move: `web/src/services/configService.ts` to `web/src/pages/dashboard/lib/config-file.ts`
- Move: `web/src/App.tsx` into the dashboard page during extraction
- Delete obsolete root component, icon, and service directories when empty

- [ ] **Step 1: Move the existing ServiceItem test before its implementation**

Move `ServiceItem.test.tsx` beside `ServiceItem.tsx`, update imports to the dashboard model, and run it before moving the implementation.

Run: `cd web && npm test -- src/pages/dashboard/ui/ServiceItem.test.tsx`

Expected: FAIL because the implementation has not moved yet.

- [ ] **Step 2: Move dashboard UI and restore GREEN**

Move all single-use dashboard UI into `pages/dashboard/ui`. Keep behavior and class names unchanged. Internal imports remain relative; app-level consumers import only `DashboardPage` from `@/pages/dashboard`.

- [ ] **Step 3: Extract modal composition**

Move the four modal/panel rendering branches into `DashboardModals.tsx` with explicit state and callback props. Do not introduce a generic modal framework.

- [ ] **Step 4: Verify UI migration**

Run: `cd web && npm test && npm run typecheck && npm run build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

Commit message: `refactor: 收拢仪表盘页面 UI`

### Task 5: Extract dashboard orchestration and consolidate forms

**Files:**
- Create: `web/src/pages/dashboard/model/use-dashboard.ts`
- Modify: `web/src/pages/dashboard/model/dashboard.ts`
- Create: `web/src/pages/dashboard/ui/ServiceForm.tsx`
- Create: `web/src/pages/dashboard/ui/ServiceForm.test.tsx`
- Create: `web/src/pages/dashboard/ui/CategoryForm.tsx`
- Create: `web/src/pages/dashboard/ui/CategoryForm.test.tsx`
- Modify: `web/src/pages/dashboard/ui/DashboardPage.tsx`
- Modify: `web/src/pages/dashboard/ui/DashboardModals.tsx`
- Delete obsolete add/edit form files

- [ ] **Step 1: Write failing tests for the consolidated forms**

For `ServiceForm`, assert initial edit values are rendered and disabling monitoring clears `monitorUrl` on submit. For `CategoryForm`, assert initial values render and submit returns the selected name and icon.

- [ ] **Step 2: Run focused form tests and verify RED**

Run: `cd web && npm test -- src/pages/dashboard/ui/ServiceForm.test.tsx src/pages/dashboard/ui/CategoryForm.test.tsx`

Expected: FAIL because the consolidated forms do not exist.

- [ ] **Step 3: Implement the minimal shared forms**

Use explicit props for initial values, submit label, cancel, and optional delete. Preserve existing labels, input names, button text, validation, and CSS classes needed by E2E tests.

- [ ] **Step 4: Extract useDashboard**

Move query keys, config/status/audit queries, SSE subscription, title effect, mutations, cache updates, CRUD handlers, import/export actions, and modal/edit state from `DashboardPage` into `use-dashboard.ts`. Return a typed object consumed by page composition and modals.

- [ ] **Step 5: Remove obsolete forms and verify focused tests**

Run: `cd web && npm test -- src/pages/dashboard`

Expected: all dashboard tests PASS.

- [ ] **Step 6: Run complete frontend verification**

Run: `cd web && npm run api:types:check && npm test && npm run typecheck && npm run build && npm run test:e2e`

Expected: generated contracts unchanged, all unit tests pass, typecheck and build exit 0, and the dashboard Playwright scenario passes.

- [ ] **Step 7: Validate architecture and working tree**

Run: `rg -n "from ['\"]@/(app|pages)" web/src/shared || true`, `find web/src -maxdepth 3 -type d | sort`, and `git diff --check`.

Expected: Shared has no upward imports; only `app`, `pages`, and `shared` FSD layers exist; no whitespace errors.

- [ ] **Step 8: Commit**

Commit message: `refactor: 拆分仪表盘编排并复用表单`
