# DriveSarthi — Development Rules

> These rules apply to every AI agent and every developer working on this project.
> They are enforced above any AI assistant's default preferences.

---

## 1. JavaScript Only — No TypeScript

- All source files must use `.js` or `.jsx` extensions
- Never create `.ts` or `.tsx` files
- Never add `typescript` to dependencies
- Never add `@types/*` packages
- Do not add JSDoc type annotations that replicate TypeScript behaviour (light usage for IDE hints is acceptable)
- `jsconfig.json` is the config file — not `tsconfig.json`

---

## 2. Reuse Existing Code First

- Before writing new code, read the relevant existing files
- Before creating a new component, check `src/components/` for something reusable
- Before creating a new utility, check `src/lib/` and `src/utils/`
- Before writing a data-fetch function, check `src/lib/api.js` and `src/lib/supabase.js`
- Extend existing files rather than creating parallel duplicates

---

## 3. Avoid Unnecessary Dependencies

- Check `package.json` before suggesting an `npm install`
- Do not add a package if the same result can be achieved with already-installed packages or native browser APIs
- Approved packages to add when needed (not preinstalled yet):
  - `@supabase/supabase-js` — Supabase client
  - `@mui/material @emotion/react @emotion/styled` — UI components
  - `recharts` — charts
  - `leaflet react-leaflet` — maps
  - `papaparse` — CSV parsing
- Any other package requires explicit justification

---

## 4. Avoid Unnecessary Refactors

- Do not rewrite working code for stylistic reasons
- Do not convert Tailwind styling to MUI `sx` props (or vice versa) in files you are not otherwise modifying
- Do not reorganise file/folder structure unless the current structure is actively blocking a feature
- Do not change function signatures or component APIs unless required by the task

---

## 5. Inspect Before Modifying

- Read every file before editing it — never make assumptions about its contents
- When editing a component, read its parent page to understand how it is used
- When modifying a database query, read the table schema first
- When adding a route, check the existing route structure in `src/app/`

---

## 6. Keep Prototype Scope

- Build what is in the feature list in PROJECT_CONTEXT.md — nothing more
- Do not add features the user has not requested
- Do not add analytics/monitoring/logging infrastructure
- Do not add internationalisation (i18n)
- Do not add unit/integration tests unless explicitly requested
- Do not add CI/CD pipelines or Docker configuration unless explicitly requested
- Do not add error boundaries or complex loading skeletons unless the feature explicitly needs them
- Simple, functional UI is preferred over polished, complex UI

---

## 7. Do Not Replace Synthetic Data with External APIs

- `drivesarthi_traffic_data.csv` is the sole source of traffic data
- Do not add Google Maps Traffic API, TomTom, HERE, or any other traffic data provider
- Do not fetch real-time traffic from any external service
- The UI must make clear that traffic data is simulated/prototype data — not live measurements
- FastAPI reads the CSV; the frontend reads FastAPI; neither touches an external traffic API

---

## 8. Preserve Existing Functionality

- Do not remove or disable working features while implementing new ones
- Do not change environment variable names after they are set
- Do not change Supabase table names or column names after data has been seeded
- Do not change the CSV filename, location, or column names — other code depends on them
- If a refactor risks breaking existing behaviour, describe the risk before proceeding

---

## 9. Small, Focused Changes

- One task = one focused change
- Do not bundle multiple unrelated changes into one edit session
- If a task requires touching more than 5 files, break it into sub-tasks first
- After each significant change, describe what was done so DEVELOPMENT_STATUS.md can be updated

---

## 10. Documentation Is a Deliverable

- Update `DEVELOPMENT_STATUS.md` when a module is completed or a major decision is made
- If an architectural decision changes, update `ARCHITECTURE.md`
- Do not let documentation become stale — a new Kiro session should be able to resume work using only these files
- Steering files in `.kiro/steering/` must remain accurate

---

## Quick Reference: Key File Locations

| File / Directory | Purpose |
|-----------------|---------|
| `drivesarthi_traffic_data.csv` | Synthetic traffic dataset — DO NOT touch |
| `src/app/` | All Next.js routes (App Router) |
| `src/components/` | Shared React components |
| `src/lib/supabase.js` | Supabase client singleton |
| `src/lib/api.js` | FastAPI fetch helpers |
| `src/lib/csvParser.js` | CSV parsing utility |
| `src/utils/trafficHelpers.js` | Traffic data transform functions |
| `.env.local` | Environment variables (never commit this file) |
| `PROJECT_CONTEXT.md` | Feature list, stack, constraints |
| `ARCHITECTURE.md` | System design, data flows |
| `DEVELOPMENT_STATUS.md` | What is done, what is next |
| `DEVELOPMENT_RULES.md` | This file |
