import {
  HISTORY_HOURS,
  ZONE_ID,
  defaultAutomationState,
  initialPlants,
  sensorDefinitions,
  speciesProfiles,
  type FarmAlert,
  type FarmEvent,
  type AutomationRules,
  type Plant,
  type PlantDraft,
  type PlantHealth,
  type PlantTargetMetric,
  type Range,
  type SensorMetricId,
  type SensorReading,
  type SimulationState,
} from "./mock-data.ts";

const HOUR_MS = 60 * 60 * 1000;
const INITIAL_TIME = "2026-10-30T00:00:00.000Z";
const HISTORY_PERIOD_HOURS = { day: 24, week: 24 * 7, month: HISTORY_HOURS } as const;
const plantTargetMetrics: PlantTargetMetric[] = ["soil-moisture", "air-temperature", "humidity", "light"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dailyWave(date: Date) {
  return Math.sin(((date.getUTCHours() - 6) / 24) * Math.PI * 2);
}

function daylight(date: Date) {
  return Math.max(0, Math.sin(((date.getUTCHours() - 6) / 12) * Math.PI));
}

function seededSoilMoisture(date: Date) {
  const hour = date.getUTCHours();
  if (hour < 12) return round(clamp(38.5 - hour * 1.1, 24, 75));
  return round(clamp(72 - (hour - 12) * 2.8, 24, 75));
}

function makeReading(
  sensorId: string,
  metric: SensorReading["metric"],
  name: string,
  value: number,
  unit: string,
  targetRange: Range,
  timestamp: string,
  plantId: string | null = null,
): SensorReading {
  return {
    sensorId,
    metric,
    name,
    value,
    unit,
    targetRange,
    timestamp,
    zoneId: ZONE_ID,
    plantId,
    status: value < targetRange.min || value > targetRange.max ? "watch" : "normal",
  };
}

export function generateReadingsAt(
  timestamp: string,
  plants: Plant[],
  overrides: { soilMoisture?: number; reservoir?: number; referenceTime?: string } = {},
): SensorReading[] {
  const time = new Date(timestamp);
  const hours = time.getTime() / HOUR_MS;
  const wave = dailyWave(time);
  const sun = daylight(time);
  const moisture = overrides.soilMoisture ?? seededSoilMoisture(time);
  const reservoir = overrides.reservoir ?? round(clamp(78 - ((hours % 24) * 0.025), 40, 100));
  const values: Record<SensorMetricId, number> = {
    "soil-moisture": moisture,
    "soil-temperature": round(20 + 2 * wave),
    "air-temperature": round(24 + 3 * wave),
    humidity: round(58 - 8 * wave),
    co2: Math.round(430 + 75 * (1 - sun)),
    oxygen: round(20.9 - 0.05 * sun, 2),
    light: Math.round(650 * sun),
    uva: round(3.25 * sun, 2),
    uvb: round(0.2 * sun, 3),
    "soil-ph": round(6.25 + 0.08 * Math.sin((hours / 24) * (Math.PI / 4)), 2),
    "soil-ec": round(1.4 - 0.12 * sun, 2),
    reservoir,
  };

  const readings = sensorDefinitions.map((definition) => makeReading(
    definition.sensorId,
    definition.metric,
    definition.name,
    values[definition.metric],
    definition.unit,
    definition.targetRange,
    timestamp,
  ));

  const referenceTime = Date.parse(overrides.referenceTime ?? timestamp);
  for (const plant of plants) {
    const hoursBeforeReference = Math.max(0, (referenceTime - time.getTime()) / HOUR_MS);
    const progress = round(clamp(plant.growthProgress - hoursBeforeReference * 0.05, 0, 100), 2);
    readings.push(makeReading(
      `virtual-growth-${plant.id}`,
      "growth-progress",
      `${plant.name} Growth Progress`,
      progress,
      "%",
      { min: 0, max: 100 },
      timestamp,
      plant.id,
    ));
  }
  return readings;
}

function buildSeedHistory(currentTime: string, plants: Plant[]) {
  const history: Record<string, SensorReading[]> = {};
  const referenceTime = Date.parse(currentTime);
  for (let offset = HISTORY_HOURS; offset >= 0; offset -= 1) {
    const timestamp = new Date(referenceTime - offset * HOUR_MS).toISOString();
    const readings = generateReadingsAt(timestamp, plants, { referenceTime: currentTime });
    for (const reading of readings) (history[reading.sensorId] ??= []).push(reading);
  }
  return history;
}

export function createInitialSimulationState(currentTime = INITIAL_TIME): SimulationState {
  const plants = initialPlants.map((plant) => ({ ...plant, targetConditions: structuredClone(plant.targetConditions) }));
  const history = buildSeedHistory(currentTime, plants);
  const readings = Object.values(history).map((series) => series[series.length - 1]);
  const previousNoon = new Date(Date.parse(currentTime) - 12 * HOUR_MS).toISOString();
  const events: FarmEvent[] = [
    { id: "seed-water-1", time: previousNoon, event: "Simulated irrigation completed", detail: "Greenhouse A · virtual history", kind: "water" },
    { id: "seed-light-1", time: new Date(Date.parse(currentTime) - 15 * HOUR_MS).toISOString(), event: "Grow lights turned on", detail: "Simulated daily schedule", kind: "light" },
    { id: "seed-air-1", time: new Date(Date.parse(currentTime) - 17 * HOUR_MS).toISOString(), event: "Ventilation activated", detail: "Simulated temperature rule", kind: "air" },
  ];
  return { version: 2, zoneId: ZONE_ID, currentTime, plants, readings, history, events, automation: structuredClone(defaultAutomationState) };
}

function appendSnapshot(history: Record<string, SensorReading[]>, readings: SensorReading[]) {
  const next = { ...history };
  for (const reading of readings) {
    const series = next[reading.sensorId] ?? [];
    const last = series[series.length - 1];
    next[reading.sensorId] = last?.timestamp === reading.timestamp
      ? [...series.slice(0, -1), reading]
      : [...series, reading].slice(-(HISTORY_HOURS + 1));
  }
  return next;
}

export function advanceSimulation(state: SimulationState): SimulationState {
  const currentSoil = state.readings.find((reading) => reading.metric === "soil-moisture")?.value ?? 38;
  const currentReservoir = state.readings.find((reading) => reading.metric === "reservoir")?.value ?? 78;
  const currentLight = state.readings.find((reading) => reading.metric === "light")?.value ?? 0;
  const currentTime = new Date(Date.parse(state.currentTime) + HOUR_MS).toISOString();
  const soilMoisture = round(Math.max(18, currentSoil - 0.35 - currentLight / 650 * 0.2));
  const reservoir = round(Math.max(20, currentReservoir - 0.015), 2);
  const plants = state.plants.map((plant) => ({ ...plant, growthProgress: round(clamp(plant.growthProgress + 0.05, 0, 100), 2) }));
  const readings = generateReadingsAt(currentTime, plants, { soilMoisture, reservoir });
  const automation = { ...state.automation, actuators: { ...state.automation.actuators }, resources: { ...state.automation.resources } };
  const events = [...state.events];
  let nextPlants = plants;
  let nextReadings = readings;

  if (automation.rules.irrigation.enabled && plants.length > 0 && soilMoisture <= automation.rules.irrigation.thresholdPercent && reservoir > 4) {
    const lowerTarget = Math.max(...plants.map((plant) => plant.targetConditions["soil-moisture"].min));
    const upperTarget = Math.min(...plants.map((plant) => plant.targetConditions["soil-moisture"].max));
    const target = round(lowerTarget <= upperTarget ? (lowerTarget + upperTarget) / 2 : lowerTarget);
    const remaining = round(Math.max(0, reservoir - 4));
    nextPlants = plants.map((plant) => ({ ...plant, lastWateredAt: currentTime }));
    nextReadings = generateReadingsAt(currentTime, nextPlants, { soilMoisture: target, reservoir: remaining });
    automation.resources.waterLiters = round(automation.resources.waterLiters + 3, 2);
    events.unshift(makeAutomationEvent(currentTime, events.length, "Automatic irrigation completed", `Soil moisture reached ${target}% · 3 L estimated · simulated`, "water"));
  }

  const temperature = nextReadings.find((reading) => reading.metric === "air-temperature")?.value ?? 0;
  const ventilation = automation.overrides.ventilation ?? (automation.rules.ventilation.enabled && temperature > automation.rules.ventilation.maximumTemperatureC);
  const light = nextReadings.find((reading) => reading.metric === "light")?.value ?? 0;
  const hour = new Date(currentTime).getUTCHours();
  const lightsScheduled = hour >= 6 && hour < 19;
  const growLights = automation.overrides.growLights ?? (automation.rules.lighting.enabled && lightsScheduled && light < automation.rules.lighting.targetPpfd);
  if (ventilation !== automation.actuators.ventilation) {
    events.unshift(makeAutomationEvent(currentTime, events.length, ventilation ? "Ventilation activated" : "Ventilation deactivated", ventilation ? `${temperature} °C exceeded the ${automation.rules.ventilation.maximumTemperatureC} °C threshold · simulated` : "Temperature is back within the configured range · simulated", "air"));
  }
  if (growLights !== automation.actuators.growLights) {
    events.unshift(makeAutomationEvent(currentTime, events.length, growLights ? "Grow lights turned on" : "Grow lights turned off", growLights ? `Light is below ${automation.rules.lighting.targetPpfd} µmol/m²/s · simulated` : "Light target or schedule is satisfied · simulated", "light"));
  }
  automation.actuators = { ventilation, growLights };
  automation.resources.energyKwh = round(automation.resources.energyKwh + (ventilation ? 0.15 : 0) + (growLights ? 0.35 : 0), 3);
  const history = appendSnapshot(state.history, nextReadings);
  return { ...state, currentTime, plants: nextPlants, readings: nextReadings, history, events: events.slice(0, 100), automation };
}

export function irrigateSimulation(state: SimulationState): SimulationState {
  const currentReservoir = state.readings.find((reading) => reading.metric === "reservoir")?.value ?? 78;
  const lowerTarget = state.plants.length ? Math.max(...state.plants.map((plant) => plant.targetConditions["soil-moisture"].min)) : 35;
  const upperTarget = state.plants.length ? Math.min(...state.plants.map((plant) => plant.targetConditions["soil-moisture"].max)) : 65;
  const soilTarget = round(lowerTarget <= upperTarget ? (lowerTarget + upperTarget) / 2 : lowerTarget);
  const readings = generateReadingsAt(state.currentTime, state.plants, {
    soilMoisture: soilTarget,
    reservoir: round(Math.max(0, currentReservoir - 4)),
  });
  const plants = state.plants.map((plant) => ({ ...plant, lastWateredAt: state.currentTime }));
  const event: FarmEvent = {
    id: `event-water-${Date.parse(state.currentTime)}-${state.events.length}`,
    time: state.currentTime,
    event: "Manual virtual irrigation",
    detail: `Greenhouse A · ${plants.length} plants · 3 L estimated · simulated`,
    kind: "water",
  };
  return { ...state, plants, readings, history: appendSnapshot(state.history, readings), events: [event, ...state.events].slice(0, 100), automation: { ...state.automation, resources: { ...state.automation.resources, waterLiters: round(state.automation.resources.waterLiters + 3, 2) } } };
}

export function updateAutomationRules(state: SimulationState, rules: AutomationRules): SimulationState {
  validateAutomationRules(rules);
  const nextRules = structuredClone(rules);
  const event = makeAutomationEvent(state.currentTime, state.events.length, "Automation rules updated", "Configured thresholds and enabled rules saved · simulated", "growth");
  return { ...state, automation: { ...state.automation, rules: nextRules }, events: [event, ...state.events].slice(0, 100) };
}

export function validateAutomationRules(rules: AutomationRules) {
  const { irrigation, ventilation, lighting } = rules;
  if (typeof irrigation.enabled !== "boolean" || !Number.isFinite(irrigation.thresholdPercent) || irrigation.thresholdPercent < 5 || irrigation.thresholdPercent > 80) throw new Error("Irrigation threshold must be between 5% and 80%.");
  if (typeof ventilation.enabled !== "boolean" || !Number.isFinite(ventilation.maximumTemperatureC) || ventilation.maximumTemperatureC < 10 || ventilation.maximumTemperatureC > 45) throw new Error("Ventilation threshold must be between 10°C and 45°C.");
  if (typeof lighting.enabled !== "boolean" || !Number.isFinite(lighting.targetPpfd) || lighting.targetPpfd < 50 || lighting.targetPpfd > 1600) throw new Error("Lighting target must be between 50 and 1600 µmol/m²/s.");
}

export function setActuatorOverride(state: SimulationState, actuator: "ventilation" | "growLights", value: boolean | null): SimulationState {
  const label = actuator === "ventilation" ? "Ventilation" : "Grow lights";
  let resumedState = state.automation.actuators[actuator];
  if (value === null) {
    if (actuator === "ventilation") {
      const temperature = state.readings.find((reading) => reading.metric === "air-temperature")?.value ?? 0;
      resumedState = state.automation.rules.ventilation.enabled && temperature > state.automation.rules.ventilation.maximumTemperatureC;
    } else {
      const light = state.readings.find((reading) => reading.metric === "light")?.value ?? 0;
      const hour = new Date(state.currentTime).getUTCHours();
      resumedState = state.automation.rules.lighting.enabled && hour >= 6 && hour < 19 && light < state.automation.rules.lighting.targetPpfd;
    }
  }
  const nextState = value ?? resumedState;
  const actuators = { ...state.automation.actuators, [actuator]: nextState };
  const overrides = { ...state.automation.overrides, [actuator]: value };
  const event = makeAutomationEvent(state.currentTime, state.events.length, value === null ? `${label} returned to automatic control` : `${label} manually ${value ? "activated" : "deactivated"}`, `${value === null ? "Rule control resumed" : "Manual override applied"} · simulated`, actuator === "ventilation" ? "air" : "light");
  const events = [event, ...state.events];
  if (value === null && nextState !== state.automation.actuators[actuator]) {
    events.unshift(makeAutomationEvent(state.currentTime, events.length, `${label} ${nextState ? "activated" : "deactivated"}`, "Current conditions evaluated after automatic control resumed · simulated", actuator === "ventilation" ? "air" : "light"));
  }
  return { ...state, automation: { ...state.automation, actuators, overrides }, events: events.slice(0, 100) };
}

function makeAutomationEvent(time: string, index: number, event: string, detail: string, kind: FarmEvent["kind"]): FarmEvent {
  return { id: `event-${Date.parse(time)}-${index}-${kind}`, time, event, detail, kind };
}

export function savePlantProfile(state: SimulationState, draft: PlantDraft): SimulationState {
  validatePlantDraft(draft, state.currentTime);
  const species = speciesProfiles[draft.speciesId];
  const existing = state.plants.find((plant) => plant.id === draft.id);
  const plant: Plant = {
    ...draft,
    id: existing?.id ?? draft.id ?? `plant-${Date.parse(state.currentTime)}-${state.plants.length}`,
    scientificName: draft.scientificName?.trim() || species.scientificName,
    growthProgress: existing?.growthProgress ?? 8,
    lastWateredAt: existing?.lastWateredAt ?? state.currentTime,
    targetConditions: structuredClone(draft.targetConditions),
  };
  const plants = existing
    ? state.plants.map((item) => item.id === existing.id ? plant : item)
    : [...state.plants, plant];
  const readings = generateReadingsAt(state.currentTime, plants, {
    soilMoisture: state.readings.find((reading) => reading.metric === "soil-moisture")?.value,
    reservoir: state.readings.find((reading) => reading.metric === "reservoir")?.value,
  });
  const history = appendSnapshot(state.history, readings);
  if (!existing) {
    const growthReading = readings.find((reading) => reading.plantId === plant.id);
    if (growthReading) history[growthReading.sensorId] = buildSeedHistory(state.currentTime, [plant])[growthReading.sensorId];
  }
  return { ...state, plants, readings, history };
}

export function validatePlantDraft(draft: PlantDraft, currentTime = INITIAL_TIME) {
  if (!draft.name.trim() || draft.name.trim().length > 60) throw new Error("Enter a plant name between 1 and 60 characters.");
  if (draft.variety.trim().length > 80) throw new Error("Variety must be 80 characters or fewer.");
  const planted = Date.parse(`${draft.plantingDate}T00:00:00.000Z`);
  if (!Number.isFinite(planted) || planted > Date.parse(currentTime)) throw new Error("Planting date must be a valid date no later than the simulation date.");
  if (!Number.isFinite(draft.irrigationIntervalHours) || draft.irrigationIntervalHours < 1 || draft.irrigationIntervalHours > 168) throw new Error("Irrigation interval must be between 1 and 168 hours.");
  const limits: Record<PlantTargetMetric, Range> = {
    "soil-moisture": { min: 0, max: 100 },
    "air-temperature": { min: -10, max: 60 },
    humidity: { min: 0, max: 100 },
    light: { min: 0, max: 1600 },
  };
  for (const metric of plantTargetMetrics) {
    const range = draft.targetConditions[metric];
    if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min >= range.max || range.min < limits[metric].min || range.max > limits[metric].max) {
      throw new Error(`Enter a valid ${metric} target range.`);
    }
  }
}

export function getPlantHealth(plant: Plant, readings: SensorReading[]): PlantHealth {
  const soil = readings.find((reading) => reading.metric === "soil-moisture")?.value;
  const air = readings.find((reading) => reading.metric === "air-temperature")?.value;
  const humidity = readings.find((reading) => reading.metric === "humidity")?.value;
  const light = readings.find((reading) => reading.metric === "light")?.value;
  const conditions: Partial<Record<PlantTargetMetric, number | undefined>> = {
    "soil-moisture": soil,
    "air-temperature": air,
    humidity,
    light,
  };
  const inRange = plantTargetMetrics.every((metric) => {
    const value = conditions[metric];
    if (value === undefined) return true;
    if (metric === "light" && value === 0) return true;
    const range = plant.targetConditions[metric];
    return value >= range.min && value <= range.max;
  });
  return inRange ? "Healthy" : "Needs attention";
}

export function getAlerts(state: SimulationState): FarmAlert[] {
  const soil = state.readings.find((reading) => reading.metric === "soil-moisture")?.value;
  const hour = new Date(state.currentTime).getUTCHours();
  const alerts: FarmAlert[] = [];
  for (const plant of state.plants) {
    const soilRange = plant.targetConditions["soil-moisture"];
    if (soil !== undefined && soil < soilRange.min) {
      alerts.push({ id: `${plant.id}-soil-low`, plantId: plant.id, title: `${plant.name} soil moisture is below target`, detail: `${round(soil)}% · preferred ${soilRange.min}–${soilRange.max}%`, tone: "warning" });
    } else if (soil !== undefined && soil > soilRange.max) {
      alerts.push({ id: `${plant.id}-soil-high`, plantId: plant.id, title: `${plant.name} soil moisture is above target`, detail: `${round(soil)}% · preferred ${soilRange.min}–${soilRange.max}%`, tone: "info" });
    }
    if (hour >= 7 && hour <= 18) {
      const light = state.readings.find((reading) => reading.metric === "light")?.value;
      const lightRange = plant.targetConditions.light;
      if (light !== undefined && light < lightRange.min) alerts.push({ id: `${plant.id}-light-low`, plantId: plant.id, title: `${plant.name} light is below target`, detail: `${light} µmol/m²/s · preferred ${lightRange.min}–${lightRange.max}`, tone: "warning" });
    }
  }
  const reservoir = state.readings.find((reading) => reading.metric === "reservoir")?.value;
  if (reservoir !== undefined && reservoir < 25) alerts.push({ id: "reservoir-low", plantId: null, title: "Water reservoir is running low", detail: `${round(reservoir)}% remaining · simulated`, tone: "warning" });
  return alerts;
}

export function getPeriodSamples(state: SimulationState, sensorId: string, period: keyof typeof HISTORY_PERIOD_HOURS) {
  const count = HISTORY_PERIOD_HOURS[period] + 1;
  return (state.history[sensorId] ?? []).slice(-count);
}

export function parseSimulationState(raw: string | null): SimulationState | null {
  if (!raw || raw.length > 8_000_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 2 || value.zoneId !== ZONE_ID || !isTimestamp(value.currentTime)) return null;
    if (!Array.isArray(value.plants) || value.plants.length > 100 || !value.plants.every(isPersistablePlant)) return null;
    if (!Array.isArray(value.readings) || value.readings.length > 120 || !value.readings.every(isPersistableReading)) return null;
    if (!Array.isArray(value.events) || value.events.length > 100 || !value.events.every(isEvent)) return null;
    if (!isRecord(value.history) || Object.keys(value.history).length > 120) return null;
    const history: Record<string, SensorReading[]> = {};
    for (const [sensorId, series] of Object.entries(value.history)) {
      if (!Array.isArray(series) || series.length > HISTORY_HOURS + 1 || !series.every((reading) => isPersistableReading(reading) && reading.sensorId === sensorId)) return null;
      history[sensorId] = series;
    }
    const automation = value.automation === undefined ? structuredClone(defaultAutomationState) : value.automation;
    if (!isPersistableAutomationState(automation)) return null;
    return { version: 2, zoneId: ZONE_ID, currentTime: value.currentTime, plants: value.plants as Plant[], readings: value.readings as SensorReading[], history, events: value.events as FarmEvent[], automation };
  } catch {
    return null;
  }
}

export function serializeSimulationState(state: SimulationState) {
  return JSON.stringify(state);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isRange(value: unknown): value is Range {
  return isRecord(value) && typeof value.min === "number" && Number.isFinite(value.min) && typeof value.max === "number" && Number.isFinite(value.max) && value.min < value.max;
}

export function isPersistablePlant(value: unknown): value is Plant {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length < 1 || value.id.length > 100 || typeof value.name !== "string" || value.name.length < 1 || value.name.length > 60 || typeof value.speciesId !== "string" || !(value.speciesId in speciesProfiles)) return false;
  if (typeof value.scientificName !== "string" || value.scientificName.length > 150 || typeof value.variety !== "string" || value.variety.length > 100 || typeof value.stage !== "string" || !["Seedling", "Vegetative", "Flowering", "Fruiting", "Harvest"].includes(value.stage) || typeof value.plantingDate !== "string" || !Number.isFinite(Date.parse(value.plantingDate))) return false;
  if (typeof value.growthProgress !== "number" || !Number.isFinite(value.growthProgress) || value.growthProgress < 0 || value.growthProgress > 100) return false;
  if (typeof value.irrigationIntervalHours !== "number" || !Number.isFinite(value.irrigationIntervalHours) || !isTimestamp(value.lastWateredAt)) return false;
  if (!isRecord(value.targetConditions)) return false;
  const conditions = value.targetConditions;
  return plantTargetMetrics.every((metric) => isRange(conditions[metric]));
}

export function isPersistableReading(value: unknown): value is SensorReading {
  if (!isRecord(value) || typeof value.sensorId !== "string" || value.sensorId.length < 1 || value.sensorId.length > 100 || typeof value.metric !== "string" || typeof value.name !== "string" || value.name.length > 100 || typeof value.unit !== "string" || value.unit.length > 32) return false;
  if (typeof value.value !== "number" || !Number.isFinite(value.value) || !isRange(value.targetRange) || !isTimestamp(value.timestamp)) return false;
  if (value.zoneId !== ZONE_ID || !(value.plantId === null || (typeof value.plantId === "string" && value.plantId.length <= 100))) return false;
  return value.status === "normal" || value.status === "watch";
}

function isEvent(value: unknown): value is FarmEvent {
  return isRecord(value)
    && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 120
    && isTimestamp(value.time)
    && typeof value.event === "string" && value.event.length > 0 && value.event.length <= 120
    && typeof value.detail === "string" && value.detail.length <= 500
    && ["water", "light", "air", "growth"].includes(String(value.kind));
}

export function isPersistableAutomationState(value: unknown): value is SimulationState["automation"] {
  if (!isRecord(value) || !isRecord(value.rules) || !isRecord(value.actuators) || !isRecord(value.overrides) || !isRecord(value.resources)) return false;
  const { irrigation, ventilation, lighting } = value.rules;
  if (!isRecord(irrigation) || !isRecord(ventilation) || !isRecord(lighting)) return false;
  if (typeof irrigation.enabled !== "boolean" || typeof irrigation.thresholdPercent !== "number" || !Number.isFinite(irrigation.thresholdPercent) || irrigation.thresholdPercent < 5 || irrigation.thresholdPercent > 80) return false;
  if (typeof ventilation.enabled !== "boolean" || typeof ventilation.maximumTemperatureC !== "number" || !Number.isFinite(ventilation.maximumTemperatureC) || ventilation.maximumTemperatureC < 10 || ventilation.maximumTemperatureC > 45) return false;
  if (typeof lighting.enabled !== "boolean" || typeof lighting.targetPpfd !== "number" || !Number.isFinite(lighting.targetPpfd) || lighting.targetPpfd < 50 || lighting.targetPpfd > 1600) return false;
  if (typeof value.actuators.ventilation !== "boolean" || typeof value.actuators.growLights !== "boolean") return false;
  if (!(value.overrides.ventilation === null || typeof value.overrides.ventilation === "boolean") || !(value.overrides.growLights === null || typeof value.overrides.growLights === "boolean")) return false;
  return typeof value.resources.waterLiters === "number" && Number.isFinite(value.resources.waterLiters) && value.resources.waterLiters >= 0 && typeof value.resources.energyKwh === "number" && Number.isFinite(value.resources.energyKwh) && value.resources.energyKwh >= 0;
}
