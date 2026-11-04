"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnalyticsChart } from "@/components/analytics-chart";
import { SensorChart } from "@/components/sensor-chart";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { NumberInput } from "@/components/ui/number-input";
import { PlantProfileDialog } from "@/components/plant-profile-dialog";
import { AuthControl } from "@/components/auth-control";
import { AccountSyncControl } from "@/components/account-sync-control";
import { WeatherView } from "@/components/weather-view";
import { AssistantView } from "@/components/assistant-view";
import { HowItWorksView } from "@/components/how-it-works-view";
import { FinanceView } from "@/components/finance-view";
import { navigationItems, sensorDefinitions, SIMULATION_STORAGE_KEY, type AutomationRules, type AutomationState, type FarmAlert, type FarmEvent, type NavigationId, type Plant, type PlantDraft, type SensorReading, type SimulationState } from "@/lib/mock-data";
import { advanceSimulation, createInitialSimulationState, getAlerts, getPeriodSamples, getPlantHealth, irrigateSimulation, parseSimulationState, savePlantProfile, serializeSimulationState, setActuatorOverride, updateAutomationRules, validateAutomationRules } from "@/lib/simulation";

type AnalyticsPeriod = "day" | "week" | "month";
type ProfileDialogState = "closed" | "new" | Plant;
type PersistenceState = "loading" | "saved" | "unavailable" | "reset";

const dashboardMetricIds = ["soil-moisture", "air-temperature", "humidity", "light"];
const sectionDescriptions: Record<NavigationId, string> = {
  dashboard: "Monitor your plants, sensors, and automation in one place.",
  plants: "Manage plant profiles, growth stages, and preferred conditions.",
  analytics: "Review simulated sensor trends and compare time periods.",
  assistant: "Ask questions grounded in your simulated farm conditions.",
  finance: "Estimate spending, production, and potential profit for any period.",
  automation: "Configure virtual rules, review controls, and inspect estimated resource use.",
  weather: "Review local weather forecasts and potential growing risks.",
  settings: "Control the virtual clock and local simulation data.",
  "how-it-works": "A plain-language guide to the X_Farm simulation, its data, and how to use it.",
};

function formatTimestamp(timestamp: string, options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false }) {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "Europe/Bucharest" }).format(new Date(timestamp));
}

function displayValue(reading: SensorReading) {
  const value = Number.isInteger(reading.value) ? String(reading.value) : reading.value.toFixed(1);
  return reading.unit === "%" || reading.unit === "pH" ? `${value}${reading.unit}` : `${value} ${reading.unit}`;
}

function displayRange(reading: SensorReading) {
  const { min, max } = reading.targetRange;
  const suffix = reading.unit === "%" ? "%" : reading.unit === "pH" ? "" : ` ${reading.unit}`;
  return `Target range: ${min}–${max}${suffix}`;
}

function plantIcon(speciesId: Plant["speciesId"]) {
  if (speciesId === "tomato") return "🍅";
  if (speciesId === "pepper") return "🫑";
  if (speciesId === "basil") return "🌿";
  return "🌱";
}

function getIrrigationIndex(readings: SensorReading[], events: FarmEvent[]) {
  if (readings.length < 2) return -1;
  const firstTime = Date.parse(readings[0].timestamp);
  const lastTime = Date.parse(readings[readings.length - 1].timestamp);
  const event = events.find((item) => item.kind === "water" && Date.parse(item.time) >= firstTime && Date.parse(item.time) <= lastTime);
  return event ? Math.max(0, Math.min(readings.length - 1, Math.round((Date.parse(event.time) - firstTime) / 3_600_000))) : -1;
}

export function FarmDashboard() {
  const [activeSection, setActiveSection] = useState<NavigationId>("dashboard");
  const [simulation, setSimulation] = useState<SimulationState>(createInitialSimulationState);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [profileDialog, setProfileDialog] = useState<ProfileDialogState>("closed");
  const [selectedSensorId, setSelectedSensorId] = useState("virtual-soil-moisture-01");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("day");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [persistenceState, setPersistenceState] = useState<PersistenceState>("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let nextPersistence: PersistenceState = "saved";
      try {
        const saved = window.localStorage.getItem(SIMULATION_STORAGE_KEY);
        const restored = parseSimulationState(saved);
        if (restored) setSimulation(restored);
        else if (saved) nextPersistence = "reset";
      } catch {
        nextPersistence = "unavailable";
      }
      setPersistenceState(nextPersistence);
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady || persistenceState === "unavailable") return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(SIMULATION_STORAGE_KEY, serializeSimulationState(simulation));
        setPersistenceState((current) => current === "reset" ? "saved" : current);
      } catch {
        setPersistenceState("unavailable");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [simulation, storageReady, persistenceState]);

  useEffect(() => {
    if (!simulationRunning || !storageReady) return;
    const timer = window.setInterval(() => setSimulation(advanceSimulation), 3000);
    return () => window.clearInterval(timer);
  }, [simulationRunning, storageReady]);

  const alerts = getAlerts(simulation);
  const displayedPlants = simulation.plants.map((plant) => ({ ...plant, health: getPlantHealth(plant, simulation.readings) }));
  const healthyCount = displayedPlants.filter((plant) => plant.health === "Healthy").length;
  const attentionCount = displayedPlants.length - healthyCount;
  const soilReading = simulation.readings.find((reading) => reading.metric === "soil-moisture");
  const soilHistory = getPeriodSamples(simulation, "virtual-soil-moisture-01", "day");
  const irrigationIndex = getIrrigationIndex(soilHistory, simulation.events);
  const sensorOptions = [
    ...sensorDefinitions.map((sensor) => ({ sensorId: sensor.sensorId, name: sensor.name, unit: sensor.unit })),
    ...simulation.readings.filter((reading) => reading.metric === "growth-progress").map((reading) => ({ sensorId: reading.sensorId, name: reading.name, unit: reading.unit })),
  ];
  const selectedSensor = sensorOptions.find((sensor) => sensor.sensorId === selectedSensorId) ?? sensorOptions[0];
  const selectedReading = simulation.readings.find((reading) => reading.sensorId === selectedSensor?.sensorId);
  const selectedHistory = selectedSensor ? getPeriodSamples(simulation, selectedSensor.sensorId, analyticsPeriod) : [];
  const average = selectedHistory.length ? selectedHistory.reduce((sum, reading) => sum + reading.value, 0) / selectedHistory.length : 0;
  const minimum = selectedHistory.length ? Math.min(...selectedHistory.map((reading) => reading.value)) : 0;
  const maximum = selectedHistory.length ? Math.max(...selectedHistory.map((reading) => reading.value)) : 0;
  const pageTitle = navigationItems.find((item) => item.id === activeSection)?.label ?? "Dashboard";

  function selectSection(section: NavigationId) {
    setActiveSection(section);
    setMobileNavOpen(false);
  }

  function saveProfile(draft: PlantDraft) {
    setSimulation(savePlantProfile(simulation, draft));
    setProfileDialog("closed");
    setActiveSection("plants");
  }

  function irrigate() {
    setSimulation(irrigateSimulation(simulation));
  }

  function clearSavedSimulation() {
    window.localStorage.removeItem(SIMULATION_STORAGE_KEY);
    setSimulation(createInitialSimulationState());
    setSimulationRunning(false);
    setPersistenceState("saved");
  }

  const profilePlant = typeof profileDialog === "object" ? profileDialog : null;
  const showProfileDialog = profileDialog !== "closed";
  const currentDashboardReadings = simulation.readings.filter((reading) => dashboardMetricIds.includes(reading.metric));
  const currentDate = simulation.currentTime;

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar${mobileNavOpen ? " sidebar-open" : ""}`}>
        <a className="brand" href="#dashboard" onClick={() => selectSection("dashboard")} aria-label="X Farm home"><span className="brand-mark"><Icon name="sprout" size={25} /></span><span>X_Farm</span></a>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigationItems.map((item) => <button key={item.id} onClick={() => selectSection(item.id)} className={`nav-item${activeSection === item.id ? " nav-item-active" : ""}`} aria-current={activeSection === item.id ? "page" : undefined}><Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={20} /><span>{item.label}</span></button>)}
        </nav>
        <div className="sidebar-footer"><span className="sim-dot" />Virtual environment <span className="sidebar-version">V0.1</span></div>
      </aside>

      <main className="main-area" id="dashboard">
        <header className="mobile-header"><button className="icon-button menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><span className="menu-lines" /></button><a className="mobile-brand" href="#dashboard" onClick={() => selectSection("dashboard")}><Icon name="sprout" size={21} />X_Farm</a><span className="mobile-sim-dot" title="Simulated data" /></header>
        <div className="content-wrap">
          <header className="page-header">
            <div className="page-heading"><div className="title-line"><h1>{pageTitle}</h1><span className="simulated-label"><span className="sim-dot" />SIMULATED DATA</span></div><p>{sectionDescriptions[activeSection]}</p></div>
            <div className="page-actions"><AuthControl /><label className="zone-select-wrap"><span className="sr-only">Growing zone</span><Icon name="sprout" size={19} /><select value={simulation.zoneId} disabled aria-label="Growing zone"><option value="greenhouse-a">Greenhouse A</option></select><Icon name="chevron" size={16} className="select-chevron" /></label><Button onClick={() => setProfileDialog("new")}><Icon name="plus" size={18} /><span>Add Plant</span></Button></div>
          </header>

          {activeSection === "dashboard" ? (
            <>
              <section className="health-section" aria-labelledby="health-heading"><div className="section-heading"><Icon name="leaf" size={20} /><h2 id="health-heading">Plant Health Summary</h2></div><div className="health-summary">
                <div className="health-stat"><strong>{simulation.plants.length}</strong><div><b>Plants</b><span>All plants are being monitored</span></div></div>
                <div className="health-stat"><strong className="green-number">{healthyCount}</strong><div><b>Healthy</b><span>{simulation.plants.length ? Math.round((healthyCount / simulation.plants.length) * 100) : 0}% of plants</span></div></div>
                <div className="health-stat"><strong className={attentionCount ? "attention-number" : "green-number"}>{attentionCount}</strong><div><b>Needs attention</b><span>{simulation.plants.length ? Math.round((attentionCount / simulation.plants.length) * 100) : 0}% of plants</span></div></div>
              </div></section>

              <section className="readings-section" aria-labelledby="readings-heading"><div className="section-heading"><Icon name="chart" size={20} /><h2 id="readings-heading">Current Environmental Readings</h2><span className={`live-state${simulationRunning ? " live-state-running" : ""}`}><span />{simulationRunning ? "Simulation running" : "Paused"}</span></div><div className="reading-grid">{currentDashboardReadings.map((reading) => <ReadingItem key={reading.sensorId} reading={reading} />)}</div><p className="sensor-count-note">{sensorDefinitions.length} virtual sensor types · plus one growth indicator per plant</p></section>

              <div className="middle-grid">
                <section className="chart-section" aria-labelledby="moisture-heading"><div className="panel-heading"><div className="section-heading"><Icon name="chart" size={19} /><h2 id="moisture-heading">Soil Moisture <span>(24 Hours)</span></h2></div><Button variant="outline" onClick={irrigate} disabled={!storageReady}><Icon name="droplet" size={16} />Irrigate</Button></div><SensorChart values={soilHistory.map((reading) => reading.value)} irrigationIndex={irrigationIndex} /><div className="chart-legend"><span className="legend-line" />Soil moisture <span className="legend-current">Current {soilReading ? displayValue(soilReading) : "—"}</span></div></section>
                <section className="alerts-section" aria-labelledby="alerts-heading"><div className="panel-heading"><div className="section-heading"><Icon name="bell" size={19} /><h2 id="alerts-heading">Active Alerts</h2></div><span className="count-label">{alerts.length}</span></div>{alerts.length ? alerts.slice(0, 4).map((alert) => <AlertRow key={alert.id} alert={alert} />) : <div className="clear-alerts"><Icon name="check" size={18} />No active alerts</div>}</section>
              </div>

              <div className="bottom-grid"><section className="plants-section" aria-labelledby="plants-heading"><div className="panel-heading"><div className="section-heading"><Icon name="leaf" size={19} /><h2 id="plants-heading">My Plants</h2></div><button className="text-link" onClick={() => selectSection("plants")}>View all <Icon name="chevron" size={14} /></button></div><PlantTable plants={displayedPlants.slice(0, 4)} onSelect={setProfileDialog} /></section><section className="events-section" aria-labelledby="events-heading"><div className="panel-heading"><div className="section-heading"><Icon name="settings" size={19} /><h2 id="events-heading">Recent Automation Events</h2></div><button className="text-link" onClick={() => selectSection("automation")}>View all <Icon name="chevron" size={14} /></button></div><EventList events={simulation.events.slice(0, 4)} /></section></div>
              <div className="dashboard-controls"><span><Icon name="clock" size={15} />Virtual time · {formatTimestamp(simulation.currentTime, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</span><span className="tick-note">One simulated hour every 3 seconds</span><Button variant="soft" disabled={!storageReady} onClick={() => setSimulationRunning((current) => !current)}><Icon name={simulationRunning ? "pause" : "play"} size={15} />{simulationRunning ? "Pause simulation" : "Start simulation"}</Button></div>
            </>
          ) : activeSection === "plants" ? (
            <section className="full-section"><div className="panel-heading"><div className="section-heading"><Icon name="leaf" size={19} /><h2>Plant Profiles</h2></div><span className="muted-count">{simulation.plants.length} plants</span></div><PlantTable plants={displayedPlants} onSelect={setProfileDialog} /><p className="section-note">Plant profiles and simulation history are saved in this browser.</p></section>
          ) : activeSection === "analytics" ? (
            <AnalyticsView sensors={sensorOptions} selectedSensor={selectedSensor} selectedReading={selectedReading} selectedSensorId={selectedSensorId} onSensorChange={setSelectedSensorId} period={analyticsPeriod} onPeriodChange={setAnalyticsPeriod} readings={selectedHistory} average={average} minimum={minimum} maximum={maximum} />
          ) : activeSection === "automation" ? (
            <AutomationView automation={simulation.automation} events={simulation.events} storageReady={storageReady} onSaveRules={(rules) => setSimulation((current) => updateAutomationRules(current, rules))} onOverride={(actuator, value) => setSimulation((current) => setActuatorOverride(current, actuator, value))} onIrrigate={() => setSimulation((current) => irrigateSimulation(current))} />
          ) : activeSection === "settings" ? (
            <section className="full-section settings-page"><div className="section-heading"><Icon name="sliders" size={19} /><h2>Simulation Controls</h2></div><p>The virtual clock advances one hour for every three seconds while the simulation is running.</p><div className="settings-action"><span><b>{simulationRunning ? "Simulation running" : "Simulation paused"}</b><small>{formatTimestamp(simulation.currentTime, { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Bucharest" })}</small></span><Button variant="soft" onClick={() => setSimulationRunning((current) => !current)}><Icon name={simulationRunning ? "pause" : "play"} size={15} />{simulationRunning ? "Pause simulation" : "Start simulation"}</Button></div><div className="settings-action"><span><b>Browser storage</b><small>{persistenceState === "unavailable" ? "Local storage is unavailable; changes reset when this tab closes." : "Plant profiles and the last 30 days of virtual readings are saved on this device."}</small></span><Button variant="secondary" onClick={clearSavedSimulation}>Reset simulation</Button></div><div className="settings-action account-sync-row"><span><b>Supabase account</b><small>Account sync stores plant profiles and a reading snapshot in your private farm.</small></span><AccountSyncControl simulation={simulation} onLoad={(saved) => { setSimulation(saved); setSimulationRunning(false); }} /></div></section>
          ) : activeSection === "weather" ? (
            <WeatherView />
          ) : activeSection === "assistant" ? (
            <AssistantView plants={simulation.plants} readings={simulation.readings} alerts={alerts} events={simulation.events} />
          ) : activeSection === "finance" ? (
            <FinanceView simulation={simulation} alerts={alerts} />
          ) : activeSection === "how-it-works" ? (
            <HowItWorksView />
          ) : (
            <section className="coming-soon-panel" aria-live="polite"><div className="coming-icon"><Icon name="sparkles" size={26} /></div><h2>Section unavailable</h2><p>This section is not available yet.</p><button className="text-button" onClick={() => selectSection("dashboard")}>Return to dashboard <Icon name="chevron" size={15} /></button></section>
          )}

          <footer className="page-footer">X_Farm V0.1 <span>Sensor readings and virtual actions are simulated; weather data is forecast-based.</span><span className="save-state">{persistenceState === "unavailable" ? "Not saved" : persistenceState === "loading" ? "Loading saved simulation…" : "Saved in this browser"}</span></footer>
        </div>
      </main>

      {showProfileDialog && <PlantProfileDialog key={profilePlant?.id ?? "new-plant"} plant={profilePlant} currentDate={currentDate} onClose={() => setProfileDialog("closed")} onSave={saveProfile} />}
    </div>
  );
}

function ReadingItem({ reading }: { reading: SensorReading }) {
  const icon = reading.metric === "soil-moisture" || reading.metric === "humidity" ? "droplet" : reading.metric === "air-temperature" ? "thermometer" : "sun";
  return <div className="reading-item"><Icon name={icon} size={26} className={reading.status === "watch" ? "reading-icon reading-icon-watch" : "reading-icon"} /><div className="reading-copy"><span className="reading-name">{reading.name}</span><strong>{displayValue(reading)}</strong><span className="reading-target">{displayRange(reading)}</span></div>{reading.status === "watch" && <span className="reading-indicator" aria-label="Outside target range" />}</div>;
}

function AlertRow({ alert }: { alert: FarmAlert }) {
  return <div className="alert-row"><span className={`alert-icon alert-icon-${alert.tone}`}><Icon name={alert.tone === "warning" ? "alert" : "chart"} size={16} /></span><div className="alert-copy"><b>{alert.title}</b><span>{alert.detail} · simulated</span></div><Icon name="chevron" size={17} className="row-chevron" /></div>;
}

function PlantTable({ plants, onSelect }: { plants: Array<Plant & { health: string }>; onSelect: (plant: Plant) => void }) {
  if (plants.length === 0) return <div className="empty-state"><Icon name="sprout" size={22} /><span>No plants in this zone yet. Add a virtual plant to get started.</span></div>;
  return <div className="table-scroll"><table className="data-table plant-table"><thead><tr><th>Plant</th><th>Growth Stage</th><th>Growth</th><th>Health</th><th>Last Watered</th><th><span className="sr-only">Edit profile</span></th></tr></thead><tbody>{plants.map((plant) => <tr key={plant.id}><td><span className="plant-cell"><span className="plant-emoji" aria-hidden="true">{plantIcon(plant.speciesId)}</span><span><b>{plant.name}</b><small>{plant.variety || plant.scientificName}</small></span></span></td><td><span className="stage-cell"><Icon name="sprout" size={16} />{plant.stage}</span></td><td><span className="plant-growth"><span className="progress-track"><span style={{ width: `${plant.growthProgress}%` }} /></span><small>{plant.growthProgress.toFixed(0)}%</small></span></td><td><span className={`health-label${plant.health === "Needs attention" ? " health-label-warning" : ""}`}><span />{plant.health}</span></td><td>{formatTimestamp(plant.lastWateredAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</td><td><button className="row-action" aria-label={`Edit ${plant.name} profile`} onClick={() => onSelect(plant)}><Icon name="chevron" size={16} className="row-chevron" /></button></td></tr>)}</tbody></table></div>;
}

function EventList({ events }: { events: FarmEvent[] }) {
  if (events.length === 0) return <div className="empty-state">No simulated events have been recorded yet.</div>;
  return <div className="event-list">{events.map((event) => <div className="event-row" key={event.id}><span className="event-icon"><Icon name={event.kind === "water" ? "droplet" : event.kind === "light" ? "sun" : event.kind === "growth" ? "sprout" : "cloud"} size={17} /></span><span className="event-time">{formatTimestamp(event.time, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</span><span className="event-name">{event.event}</span><span className="event-detail">{event.detail}</span></div>)}</div>;
}

function AutomationView({ automation, events, storageReady, onSaveRules, onOverride, onIrrigate }: {
  automation: AutomationState;
  events: FarmEvent[];
  storageReady: boolean;
  onSaveRules: (rules: AutomationRules) => void;
  onOverride: (actuator: "ventilation" | "growLights", value: boolean | null) => void;
  onIrrigate: () => void;
}) {
  const [draft, setDraft] = useState(automation.rules);
  const [error, setError] = useState("");

  function saveRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      validateAutomationRules(draft);
      onSaveRules(draft);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Check the rule values and try again.");
    }
  }

  return <>
    <section className="full-section automation-page" aria-labelledby="automation-heading">
      <div className="automation-summary">
        <div><span>Estimated water used</span><strong>{automation.resources.waterLiters.toFixed(1)} L</strong></div>
        <div><span>Estimated energy used</span><strong>{automation.resources.energyKwh.toFixed(2)} kWh</strong></div>
        <div><span>Ventilation</span><strong>{automation.actuators.ventilation ? "Running" : "Off"}</strong></div>
        <div><span>Grow lights</span><strong>{automation.actuators.growLights ? "On" : "Off"}</strong></div>
      </div>
      <form className="automation-rules" onSubmit={saveRules}>
        <div className="panel-heading"><div className="section-heading"><Icon name="settings" size={19} /><h2 id="automation-heading">Automation Rules</h2></div><Button type="submit" disabled={!storageReady}>Save rules</Button></div>
        <p className="automation-note">Rules evaluate once per simulated hour while the simulation is running. All actions and resource estimates are virtual.</p>
        <div className="rule-grid">
          <fieldset className="rule-card">
            <legend>Irrigation</legend>
            <label className="rule-enabled"><input type="checkbox" checked={draft.irrigation.enabled} onChange={(event) => setDraft((current) => ({ ...current, irrigation: { ...current.irrigation, enabled: event.target.checked } }))} />Enable automatic irrigation</label>
            <label className="rule-field">Run when soil moisture falls below<NumberInput aria-label="Irrigation threshold" required min="5" max="80" step="1" value={draft.irrigation.thresholdPercent} onValueChange={(value) => setDraft((current) => ({ ...current, irrigation: { ...current.irrigation, thresholdPercent: value } }))} /><span>%</span></label>
            <Button variant="outline" onClick={onIrrigate} disabled={!storageReady}><Icon name="droplet" size={16} />Run irrigation now</Button>
          </fieldset>
          <fieldset className="rule-card">
            <legend>Ventilation</legend>
            <label className="rule-enabled"><input type="checkbox" checked={draft.ventilation.enabled} onChange={(event) => setDraft((current) => ({ ...current, ventilation: { ...current.ventilation, enabled: event.target.checked } }))} />Enable automatic ventilation</label>
            <label className="rule-field">Maximum air temperature<NumberInput aria-label="Ventilation temperature threshold" required min="10" max="45" step="0.5" value={draft.ventilation.maximumTemperatureC} onValueChange={(value) => setDraft((current) => ({ ...current, ventilation: { ...current.ventilation, maximumTemperatureC: value } }))} /><span>°C</span></label>
            <ActuatorOverride label="Ventilation" active={automation.actuators.ventilation} override={automation.overrides.ventilation} onOverride={(value) => onOverride("ventilation", value)} disabled={!storageReady} />
          </fieldset>
          <fieldset className="rule-card">
            <legend>Lighting</legend>
            <label className="rule-enabled"><input type="checkbox" checked={draft.lighting.enabled} onChange={(event) => setDraft((current) => ({ ...current, lighting: { ...current.lighting, enabled: event.target.checked } }))} />Enable automatic lighting</label>
            <label className="rule-field">Maintain PPFD during 06:00–19:00<NumberInput aria-label="Lighting PPFD target" required min="50" max="1600" step="10" value={draft.lighting.targetPpfd} onValueChange={(value) => setDraft((current) => ({ ...current, lighting: { ...current.lighting, targetPpfd: value } }))} /><span>µmol/m²/s</span></label>
            <ActuatorOverride label="Grow lights" active={automation.actuators.growLights} override={automation.overrides.growLights} onOverride={(value) => onOverride("growLights", value)} disabled={!storageReady} />
          </fieldset>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
    <section className="full-section automation-events"><div className="panel-heading"><div className="section-heading"><Icon name="chart" size={19} /><h2>Automation Event Log</h2></div><span className="muted-count">{events.length} recorded events</span></div><EventList events={events} /></section>
  </>;
}

function ActuatorOverride({ label, active, override, onOverride, disabled }: { label: string; active: boolean; override: boolean | null; onOverride: (value: boolean | null) => void; disabled: boolean }) {
  return <div className="actuator-override"><span className="actuator-state">Current state: <b>{active ? "On" : "Off"}{override !== null ? " · manual override" : " · automatic"}</b></span><div><Button variant="secondary" disabled={disabled} onClick={() => onOverride(!active)}>Override: turn {label.toLowerCase()} {active ? "off" : "on"}</Button>{override !== null && <Button variant="soft" disabled={disabled} onClick={() => onOverride(null)}>Resume automatic</Button>}</div></div>;
}

function AnalyticsView({ sensors, selectedSensor, selectedReading, selectedSensorId, onSensorChange, period, onPeriodChange, readings, average, minimum, maximum }: {
  sensors: Array<{ sensorId: string; name: string; unit: string }>;
  selectedSensor: { sensorId: string; name: string; unit: string } | undefined;
  selectedReading: SensorReading | undefined;
  selectedSensorId: string;
  onSensorChange: (id: string) => void;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  readings: SensorReading[];
  average: number;
  minimum: number;
  maximum: number;
}) {
  const periodLabels: Record<AnalyticsPeriod, string> = { day: "Daily", week: "Weekly", month: "Monthly" };
  const statistic = (value: number) => `${Number(value.toFixed(selectedSensor?.unit === "°C" || selectedSensor?.unit === "pH" || selectedSensor?.unit === "mS/cm" ? 1 : 0))}${selectedSensor?.unit === "%" ? "%" : selectedSensor?.unit === "pH" ? "" : ` ${selectedSensor?.unit ?? ""}`}`;
  return <section className="full-section analytics-page" aria-labelledby="analytics-heading"><div className="analytics-toolbar"><div className="section-heading"><Icon name="chart" size={19} /><h2 id="analytics-heading">Environmental History</h2></div><div className="analytics-filters"><label className="analytics-select-label">Measurement<select aria-label="Measurement" value={selectedSensorId} onChange={(event) => onSensorChange(event.target.value)}>{sensors.map((sensor) => <option key={sensor.sensorId} value={sensor.sensorId}>{sensor.name}</option>)}</select></label><div className="period-switch" aria-label="History period">{(Object.keys(periodLabels) as AnalyticsPeriod[]).map((item) => <button key={item} className={period === item ? "period-active" : ""} aria-pressed={period === item} onClick={() => onPeriodChange(item)}>{periodLabels[item]}</button>)}</div></div></div>
    <div className="analytics-current"><div><span>Current reading</span><strong>{selectedReading ? displayValue(selectedReading) : "—"}</strong></div><div><span>Average</span><strong>{statistic(average)}</strong></div><div><span>Minimum</span><strong>{statistic(minimum)}</strong></div><div><span>Maximum</span><strong>{statistic(maximum)}</strong></div></div>
    <div className="analytics-chart-heading"><h3>{selectedSensor?.name ?? "Sensor"}</h3><span>{periodLabels[period]} view · simulated values</span></div>
    <AnalyticsChart readings={readings} metricName={selectedSensor?.name ?? "Sensor"} unit={selectedSensor?.unit ?? ""} />
    <div className="analytics-footnote">Showing {readings.length} timestamped readings · Stored locally for up to 30 days.</div>
  </section>;
}
