# X_Farm V0.1 architecture and implementation plan

## Repository assessment

The local checkout was empty when Phase 1 began, so there was no application behavior to preserve. The supplied project brief is retained in [`AGENTS.md`](../AGENTS.md). X_Farm is a software-only, simulation-first product; physical hardware, external AI, and a live database are outside the initial foundation.

The project uses Next.js App Router, TypeScript, Tailwind CSS v4, and small shared UI primitives. The dashboard chart is a native SVG component, which avoids a chart dependency while the prototype remains focused. The simulation and domain types live in `lib/`, separate from the presentation in `components/`. Node's built-in test runner exercises the deterministic simulation domain.

## Application architecture

```text
app/                    Next.js routes, root layout, global design tokens
components/             Dashboard composition and reusable UI
  ui/                   Shared Button and Icon primitives
lib/                    Domain types, mock data, simulation and persistence
tests/                  Deterministic simulation domain tests
docs/                   Architecture, delivery plan, design reference
```

- **Presentation:** Next.js App Router provides the deployable shell. Server-rendered metadata and layout wrap the client dashboard, where local interactions are handled.
- **Domain model:** Plants include species, variety, planting date, growth stage, progress, and configurable environmental targets. Timestamped readings carry sensor and metric IDs, unit, growing-zone ID, and optional plant association.
- **Simulation:** `lib/simulation.ts` generates deterministic day/night conditions, gradual soil dry-down, irrigation recovery, reservoir changes, plant growth, history, derived alerts, and rule-based actuator behavior. UI components schedule and display these state transitions without owning the agricultural rules.
- **History and persistence:** The prototype seeds 30 days of hourly mock readings and stores the current simulation scenario in browser local storage. The storage parser validates restored values. No account or server-side persistence is required.
- **UI reuse:** Shared reading, plant-table, alert, event, profile-dialog, and chart components support a responsive dashboard and analytics view.
- **Future services:** A later data adapter can map the current domain to farms, zones, plants, sensors, readings, scenarios, rules, events, alerts, and reports. Authentication and user ownership belong in the database phase; credentials for AI and other providers must remain server-side.

## Requirements coverage

| Requirement area | Current implementation |
|---|---|
| Dashboard and navigation | Dashboard overview, responsive navigation, plants, analytics, automation, weather, AI, and settings sections |
| Virtual plants | Add and edit profiles, species-specific targets, planting dates, stages, and estimated growth progress |
| Virtual sensors | Twelve timestamped environmental sensor types plus per-plant growth indicators, all labeled simulated |
| Plausible measurements | Deterministic day/night cycles, gradual soil moisture loss, irrigation recovery, and changing environmental readings |
| Analytics | Sensor selector, history chart, and daily, weekly, and monthly summaries over 25, 169, and 721 hourly samples |
| Alerts and actions | Target-derived environmental alerts, simulated irrigation, reservoir change, and timestamped event history |
| Rule-based automation | Configurable irrigation, ventilation, and lighting thresholds; hourly rule evaluation; manual actuator overrides; resume automatic control |
| Resource estimates | Simulated water and energy totals recorded with automation activity |
| Persistence | Plant profiles, simulation clock, readings, events, automation settings, and alerts save locally; optional Supabase account sync stores plant profiles, current readings, automation settings, event history, and active alerts |
| Authentication and data ownership | Optional Supabase Auth routes and a first migration with user-owned farms/zones, explicit grants, and row-level policies |
| Integrations | Weather forecasts use server-mediated Open-Meteo and GeoNames location search; the AI Assistant uses a server-side OpenAI Responses API route when configured; hardware integration remains future work; no hosted Supabase project is configured |

## Prioritized implementation plan

### P0 — Foundation (implemented)

- [x] Inspect the repository and project brief.
- [x] Establish the Next.js + TypeScript App Router project and responsive application shell.
- [x] Add primary navigation, dashboard overview, reusable display components, and simulated-data labeling.
- [x] Configure Tailwind CSS and shared UI primitives.
- [x] Separate domain types and simulation logic from presentation.

### P1 — Virtual growing workflow (implemented)

- [x] Add editable plant profiles, planting dates, growth stages, and per-species environmental targets.
- [x] Implement timestamped virtual readings for all brief-listed measurements and growth indicators.
- [x] Model daily environmental cycles, soil dry-down, and irrigation recovery.
- [x] Seed a 30-day hourly history and add daily, weekly, and monthly analytics.
- [x] Derive alerts from species targets and record virtual irrigation events.
- [x] Persist plants, simulation state, readings, and event history locally.
- [x] Test simulation metadata, time patterns, history windows, growth, alerts, profile validation, irrigation, and persistence.

### P2 — Automation and MVP completeness (implemented)

- [x] Add editable automation thresholds and enable/disable controls for irrigation, ventilation, and lighting.
- [x] Add manual overrides, return-to-automatic controls, and log automation decisions and outcomes.
- [x] Track estimated water and energy use.
- [x] Preserve older browser-saved simulations by supplying default automation state when loading them.
- [x] Add browser-storage loading, unavailable-storage error, and empty-plant/event states for the local prototype.
- [x] Cover create → simulate → alert → irrigate → inspect event history in an integrated workflow test.

### P3 — Database and authentication (local verification complete; hosted setup pending)

- [x] Add optional Supabase email sign-in/sign-up routes and cookie-backed session handling.
- [x] Define a first farm/zone/plant/sensor/reading/automation/alert schema with explicit grants and row-level ownership policies.
- [x] Add an authenticated endpoint for user-triggered plant, reading, automation-rule/state, event, and active-alert snapshot save/load.
- [x] Keep the mock-data dashboard usable when Supabase credentials are absent.
- [x] Start Supabase locally, apply the migration, and lint the schema with no errors.
- [x] Verify local sign-up/sign-in, API authentication, snapshot save/load/retry, malformed-input rejection, and cross-user RLS isolation.
- [ ] Configure a hosted Supabase project and verify authentication/data access only after the project owner supplies/configures it; no live resources have been changed.

### P4 — Future integrations

- [x] Add server-mediated Open-Meteo geocoding and seven-day forecasts with forecast-derived risks clearly separated from simulated sensor readings and automation.
- [x] Add a server-mediated OpenAI Responses API assistant with bounded farm context, explicit simulated-data and uncertainty instructions, and no automation access.
- [ ] Define hardware adapter boundaries for later physical sensor integration.

AI chat, live weather, satellite feeds, machine learning, physical sensors, and production database setup are not blockers for V0.1. No production deployment or live database resource has been changed.

## Design reference

The desktop dashboard concept is kept at [`x-farm-dashboard-concept.png`](./x-farm-dashboard-concept.png). The implementation follows its white canvas, forest-green navigation and actions, open metric bands, moisture chart, alerts, plant list, and automation-event table. The layout reflows to mobile navigation and scrollable tables on narrow screens.
