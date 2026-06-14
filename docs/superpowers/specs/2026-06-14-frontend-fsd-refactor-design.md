# Frontend Minimal FSD Refactor Design

## Background

The frontend is a single-page Vite and React application. Most UI modules are
used only by the dashboard, while `src/App.tsx` currently owns page rendering,
React Query calls, status streaming, optimistic cache updates, CRUD
orchestration, modal state, notifications, and import/export actions.

The refactor should reduce that concentration without introducing speculative
layers or changing user-visible behavior.

## Goals

- Establish the minimal FSD layers: `app`, `pages`, and `shared`.
- Make the dashboard an explicit page slice with a public API.
- Keep dashboard-only UI and behavior inside the dashboard page slice.
- Keep transport concerns and generated API contracts in `shared/api`.
- Separate page data orchestration from page rendering.
- Preserve all current behavior, API contracts, styling, and test coverage.

## Non-goals

- Do not add routing.
- Do not create `widgets`, `features`, or `entities` layers.
- Do not redesign the UI or rewrite the CSS.
- Do not change backend endpoints or generated OpenAPI types.
- Do not replace React Query, DnD Kit, or the existing HTTP client.
- Do not combine unrelated cleanup with the structural migration.

## Target Structure

```text
web/src/
  app/
    main.tsx
    providers/
      AppProviders.tsx
    styles/
      index.css
  pages/
    dashboard/
      index.ts
      model/
        dashboard.ts
        use-dashboard.ts
      ui/
        DashboardPage.tsx
        DashboardModals.tsx
        Header.tsx
        ServiceGrid.tsx
        ServiceCategory.tsx
        ServiceItem.tsx
        ServiceForm.tsx
        CategoryForm.tsx
        AuditLogPanel.tsx
        ConfigTools.tsx
        IconPicker.tsx
  shared/
    api/
      index.ts
      dashboard.ts
      http.ts
      contract/
```

`ThemeContext` and `ThemeToggle` are application-wide presentation concerns.
They will move under `app/providers` and `app/ui` respectively, rather than
being exposed from the dashboard page.

## Boundaries

### App

The app layer owns application startup, global providers, global styles, and
the root composition. It may import `DashboardPage` only through
`@/pages/dashboard`.

### Dashboard Page

The dashboard page owns all single-page business behavior and UI. Its public
API exports only `DashboardPage`. Internal UI modules import each other using
relative paths and are not exposed outside the slice.

`use-dashboard.ts` owns React Query integration, status streaming, cache
updates, mutations, and user-action handlers. `DashboardPage.tsx` composes the
returned state and actions into UI.

`dashboard.ts` owns dashboard-specific view models, query keys, immutable
configuration transformations, and page-level operation types.

### Shared API

`shared/api` owns the HTTP client, generated OpenAPI contracts, endpoint calls,
and transport-level mapping. It contains no React state, modal behavior,
notifications, or page workflow orchestration.

## Data Flow

1. `DashboardPage` calls `useDashboard`.
2. `useDashboard` loads dashboard resources through `shared/api`.
3. API resources are mapped into the dashboard view model.
4. UI actions call page-level handlers returned by `useDashboard`.
5. Handlers update React Query cache and invoke the corresponding shared API
   operation.
6. Successful writes invalidate config, status, and audit queries as needed.
7. SSE status updates replace status query data; polling remains the fallback.

## Forms

The add/edit service forms share the same fields and state transitions. They
will become one dashboard-local `ServiceForm` configured by initial data,
submit label, and optional delete action.

The category forms will follow the same pattern through a dashboard-local
`CategoryForm`. This consolidation is limited to proven duplication and does
not introduce a generic form framework.

## Migration Strategy

The migration is incremental:

1. Add characterization tests around pure dashboard transformations and the
   existing dashboard entry behavior.
2. Move API infrastructure to `shared/api` and update imports without changing
   behavior.
3. Move global startup, providers, theme, and styles to `app`.
4. Move dashboard-only UI into `pages/dashboard/ui` with a public `index.ts`.
5. Extract dashboard models and the `useDashboard` orchestration hook.
6. Consolidate duplicated service and category forms.
7. Remove obsolete root-level modules after all consumers are migrated.

Relocation and behavior-preserving extraction should remain separate from form
consolidation so failures can be isolated.

## Error Handling

Existing behavior is preserved:

- Initial configuration failure renders the current error state.
- Mutation failures show the current error toast.
- Import/export failures retain their current messages.
- SSE failures close the stream and leave React Query polling active.
- Missing server IDs continue to prevent invalid create operations.

No new retry policy or global error abstraction is introduced.

## Testing

- Add unit tests for dashboard view-model construction and immutable update
  helpers before extraction.
- Keep and relocate the existing `ServiceItem` tests.
- Add focused tests for the consolidated forms.
- Run `npm test`, `npm run typecheck`, and `npm run build` after each structural
  stage where practical.
- Run the existing dashboard Playwright test after the migration is complete.

## Acceptance Criteria

- `web/src` contains clear `app`, `pages`, and `shared` boundaries.
- The app layer imports the dashboard through its public API.
- No `features`, `entities`, or `widgets` directories are added.
- `DashboardPage.tsx` is primarily composition and does not contain endpoint
  implementations.
- Dashboard query and mutation orchestration is testable outside the page JSX.
- Shared API modules contain no page UI state or toast behavior.
- Existing unit tests, type checking, production build, and dashboard E2E test
  pass.
- The dashboard has no intentional user-visible behavior or styling changes.
