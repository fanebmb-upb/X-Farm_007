# X_Farm — Project Framework & Codex Instructions

## 1. Project Overview

**Project Name:** X_Farm  
**Type:** AI-powered agricultural monitoring and automation platform  
**Current Stage:** Software MVP — Virtual Simulation  
**Long-term Vision:** Intelligent agriculture through IoT, artificial intelligence, machine learning, and autonomous systems.

### Mission

X_Farm aims to make agriculture more accessible, efficient, sustainable, and productive through intelligent technology.

The platform is designed for three categories of users:

1. **Home:** Beginners growing individual plants.
2. **Garden:** Users managing gardens or small greenhouses.
3. **Enterprise:** Farmers managing large agricultural operations.

The software must be scalable, modular, and designed to support real hardware integration in the future.

## 2. Current Development Scope

**IMPORTANT: X_Farm is currently a software-only project.**

No physical sensors, embedded devices, or hardware connections will be implemented during the initial development phase.

Instead, the application will simulate agricultural environments using virtual sensors that generate realistic, time-dependent data.

The first objective is to create a functional web application demonstrating how X_Farm would operate with real agricultural data.

## 3. How X_Farm Works

The system follows this architecture:

**Virtual Sensors → Data Processing → Database → Analytics → AI Assistant → Recommendations → Simulated Automation**

### Virtual Sensor System

Simulate the following measurements:

- Soil moisture (%)
- Soil temperature (°C)
- Air temperature (°C)
- Relative humidity (%)
- CO₂ concentration (ppm)
- Oxygen concentration (%)
- Light intensity (lux or PPFD, with appropriate sensor modeling)
- UV radiation (UVA/UVB)
- Soil pH
- Soil electrical conductivity (EC)
- Water reservoir level (%)
- Plant growth indicators

Each sensor reading should contain a timestamp, sensor identifier, measurement value, unit, and associated plant or growing zone.

Simulated values must follow plausible agricultural patterns rather than being generated as unrelated random numbers.

For example, soil moisture should decrease gradually through evaporation and plant water uptake, then increase after simulated irrigation.

### Plant Profiles

Users can create virtual plants with information such as:

- Plant species and variety
- Planting date
- Current growth stage
- Preferred environmental conditions
- Irrigation requirements
- Historical measurements
- Estimated growth progress

Different species should have different configurable environmental targets.

### Data Analytics

The application must display:

- Real-time simulated sensor readings
- Interactive historical charts
- Daily, weekly, and monthly statistics
- Environmental trends
- Plant growth indicators
- Resource consumption estimates
- Alerts and anomalies

All simulated measurements must be clearly identified as simulated data.

## 4. AI Agricultural Assistant

Integrate an AI assistant using an OpenAI or Anthropic API.

The assistant should:

- Explain sensor measurements.
- Analyze plant conditions using available data.
- Identify potential environmental problems.
- Suggest corrective actions.
- Answer agricultural questions.
- Generate daily, weekly, monthly, and yearly reports.
- Explain changes in environmental conditions.
- Recommend irrigation and lighting adjustments.

The AI must distinguish measured or simulated facts from predictions and hypotheses.

AI-generated recommendations must not directly execute automation without validation.

## 5. Simulated Automation

Develop a rule-based automation engine capable of controlling virtual agricultural systems.

Examples:

- Automatic irrigation when soil moisture falls below a configured threshold.
- Simulated ventilation when temperature exceeds a limit.
- Lighting adjustments based on daily light exposure.
- Water reservoir warnings.
- Alerts for abnormal environmental conditions.

Users should be able to inspect automation decisions, change thresholds, and manually override simulated actions.

All automation events must be logged.

## 6. Weather and Satellite Integration

The platform should eventually integrate:

- **NASA POWER:** Solar radiation and historical meteorological information.
- **NASA Earthdata:** Satellite-based environmental observations.
- **Open-Meteo:** Weather forecasts.

Weather information should be used to identify potential environmental risks and support agricultural recommendations.

The first version can use simulated weather data, followed by real API integration.

## 7. Recommended Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Backend | Next.js server routes |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Hosting | Vercel |
| AI | OpenAI API or Anthropic API |
| Simulation | TypeScript |
| Future ML | Python + scikit-learn / PyTorch |

Prefer TypeScript across the initial application to minimize unnecessary complexity.

## 8. Application Interface

The application should have a modern agricultural technology aesthetic.

Use a clean interface with natural green accents, neutral backgrounds, readable typography, and responsive layouts.

### Main Sections

**Dashboard**
- Overall plant health indicators
- Environmental measurements
- Active alerts
- Recent automation events
- Summary statistics

**My Plants**
- Plant management
- Individual plant profiles
- Environmental requirements
- Growth history

**Sensor Analytics**
- Interactive graphs
- Historical measurements
- Comparisons between periods
- Environmental trends

**AI Assistant**
- Agricultural chatbot
- Data-driven explanations
- Recommended actions
- Report generation

**Automation**
- Virtual irrigation
- Lighting and ventilation controls
- Automation rules
- Manual overrides

**Weather**
- Weather forecasts
- Environmental warnings
- Satellite information where available

**Settings**
- Account settings
- Sensor configurations
- Notification preferences
- Simulation controls

## 9. Database Structure

Suggested initial tables:

- `users` / Supabase Auth identities
- `farms`
- `growing_zones`
- `plants`
- `sensors`
- `sensor_readings`
- `simulation_scenarios`
- `automation_rules`
- `automation_events`
- `alerts`
- `ai_reports`

Each farm must belong to a user or organization, with appropriate access controls.

Enable Row Level Security for user-owned data.

Design the sensor data schema to support future real hardware without major restructuring.

## 10. Development Rules for Codex

1. Inspect the existing repository before modifying files.
2. Preserve existing functionality unless a change is necessary.
3. Use modular, maintainable, strongly typed code.
4. Prefer reusable components over duplicated implementations.
5. Separate simulation logic from the user interface.
6. Never expose API keys or database secrets in client-side code.
7. Validate external inputs and protect database operations.
8. Implement loading, error, and empty states.
9. Write tests for simulation and automation logic.
10. Do not present simulated data as real sensor measurements.
11. Do not introduce unnecessary dependencies or infrastructure.
12. Keep the application deployable on Vercel.
13. Document important architectural decisions.
14. Run available checks and report failures before completing a task.

## 11. Development Roadmap

### Phase 1 — Foundation

- Inspect and organize the repository.
- Initialize the Next.js application if necessary.
- Configure Tailwind CSS and the component library.
- Build the navigation and main dashboard layout.
- Create reusable UI components.

### Phase 2 — Agricultural Simulation

- Create plant profiles.
- Implement virtual sensors.
- Generate realistic time-dependent readings.
- Implement simulation controls.
- Display live and historical charts.

### Phase 3 — Database and Authentication

- Configure Supabase.
- Implement database migrations.
- Store plant profiles and sensor readings.
- Add user authentication.
- Implement secure data access.

### Phase 4 — Intelligent Automation

- Build configurable automation rules.
- Simulate irrigation and environmental controls.
- Generate alerts.
- Record automation decisions and outcomes.

### Phase 5 — AI Integration

- Connect an AI provider through the backend.
- Implement the agricultural chatbot.
- Provide contextual sensor data to the assistant.
- Generate reports and recommendations.

### Phase 6 — External Data and Expansion

- Integrate weather APIs.
- Add NASA environmental data.
- Introduce predictive models when sufficient data exists.
- Prepare interfaces for future physical sensors.

## 12. Definition of Success — X_Farm V0.1

The first release is successful when a user can:

1. Open a deployed X_Farm web application.
2. Create a virtual plant.
3. Start a simulation.
4. Observe changing environmental measurements.
5. Inspect historical charts.
6. Receive alerts about simulated problems.
7. Trigger or configure virtual irrigation.
8. View the results of automation actions.

The AI chatbot, real weather integrations, and machine learning are subsequent milestones, not blockers for the first functional release.

**Core Development Principle:** Build a reliable agricultural simulation platform first. Add intelligence, external integrations, and advanced automation incrementally.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
