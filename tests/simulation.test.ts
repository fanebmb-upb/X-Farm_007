import assert from "node:assert/strict";
import test from "node:test";
import { SIMULATION_STORAGE_KEY, speciesProfiles } from "../lib/mock-data.ts";
import { advanceSimulation, createInitialSimulationState, getAlerts, getPeriodSamples, getPlantHealth, irrigateSimulation, isPersistableAutomationState, isPersistablePlant, isPersistableReading, parseSimulationState, savePlantProfile, serializeSimulationState, setActuatorOverride, updateAutomationRules, validateAutomationRules, validatePlantDraft } from "../lib/simulation.ts";

const start = "2026-10-30T00:00:00.000Z";

test("account persistence validators accept simulation records and reject malformed values", () => {
  const state = createInitialSimulationState(start);
  assert.equal(isPersistablePlant(state.plants[0]), true);
  assert.equal(isPersistableReading(state.readings[0]), true);
  assert.equal(isPersistablePlant({ ...state.plants[0], name: "x".repeat(61) }), false);
  assert.equal(isPersistableReading({ ...state.readings[0], value: Number.NaN }), false);
  assert.equal(isPersistableReading({ ...state.readings[0], timestamp: "not-a-date" }), false);
  assert.equal(isPersistableAutomationState(state.automation), true);
  assert.equal(isPersistableAutomationState({ ...state.automation, rules: { ...state.automation.rules, irrigation: { ...state.automation.rules.irrigation, thresholdPercent: Number.NaN } } }), false);
});

test("initial state creates timestamped virtual readings for the full sensor set", () => {
  const state = createInitialSimulationState(start);
  const requiredMetrics = ["soil-moisture", "soil-temperature", "air-temperature", "humidity", "co2", "oxygen", "light", "uva", "uvb", "soil-ph", "soil-ec", "reservoir", "growth-progress"];
  for (const metric of requiredMetrics) assert.ok(state.readings.some((reading) => reading.metric === metric), `missing ${metric}`);
  for (const reading of state.readings) {
    assert.ok(reading.sensorId.length > 0);
    assert.equal(reading.zoneId, state.zoneId);
    assert.equal(reading.timestamp, state.currentTime);
    assert.ok(Number.isFinite(reading.value));
    if (reading.metric === "growth-progress") assert.ok(reading.plantId);
  }
});

test("virtual light, UVA, and UVB follow a day cycle and remain physically bounded", () => {
  const plants = createInitialSimulationState(start).plants;
  const night = createInitialSimulationState(start).readings;
  const noon = createInitialSimulationState("2026-10-30T12:00:00.000Z");
  const reading = (items: typeof night, metric: string) => items.find((item) => item.metric === metric)?.value ?? -1;
  assert.equal(reading(night, "light"), 0);
  assert.ok(reading(noon.readings, "light") > 600);
  assert.ok(reading(noon.readings, "uva") > reading(night, "uva"));
  assert.ok(reading(noon.readings, "uvb") > reading(night, "uvb"));
  assert.equal(plants.length, 3);
});

test("history contains a full month and its daily, weekly, and monthly windows", () => {
  const state = createInitialSimulationState(start);
  const soilSensorId = "virtual-soil-moisture-01";
  assert.equal(getPeriodSamples(state, soilSensorId, "day").length, 25);
  assert.equal(getPeriodSamples(state, soilSensorId, "week").length, 169);
  assert.equal(getPeriodSamples(state, soilSensorId, "month").length, 721);
  assert.ok(state.history[soilSensorId].every((reading, index, readings) => index === 0 || Date.parse(reading.timestamp) > Date.parse(readings[index - 1].timestamp)));
});

test("simulation advances virtual time and gradually dries soil while growth and environmental readings change", () => {
  const state = createInitialSimulationState(start);
  const next = advanceSimulation(state);
  const oldSoil = state.readings.find((reading) => reading.metric === "soil-moisture")!.value;
  const newSoil = next.readings.find((reading) => reading.metric === "soil-moisture")!.value;
  assert.equal(Date.parse(next.currentTime) - Date.parse(state.currentTime), 3_600_000);
  assert.ok(newSoil < oldSoil);
  assert.ok(next.plants[0].growthProgress > state.plants[0].growthProgress);
  assert.equal(next.history["virtual-soil-moisture-01"].length, 721);
  assert.equal(state.readings.find((reading) => reading.metric === "soil-moisture")?.value, oldSoil, "prior state remains unchanged");
});

test("irrigation restores soil moisture, reduces the reservoir, updates plant watering times, and logs an event", () => {
  const state = createInitialSimulationState(start);
  const irrigated = irrigateSimulation(state);
  assert.equal(irrigated.readings.find((reading) => reading.metric === "soil-moisture")?.value, 51);
  assert.ok((irrigated.readings.find((reading) => reading.metric === "reservoir")?.value ?? 100) < (state.readings.find((reading) => reading.metric === "reservoir")?.value ?? 0));
  assert.ok(irrigated.plants.every((plant) => plant.lastWateredAt === state.currentTime));
  assert.equal(irrigated.events[0].kind, "water");
  assert.equal(irrigated.events[0].time, state.currentTime);
  assert.equal(irrigated.history["virtual-soil-moisture-01"].at(-1)?.value, 51);
  assert.deepEqual(getAlerts(irrigated), []);
});

test("species have distinct editable targets and conditions drive plant health and alerts", () => {
  const state = createInitialSimulationState(start);
  assert.notDeepEqual(speciesProfiles.tomato.targets, speciesProfiles.basil.targets);
  assert.equal(getPlantHealth(state.plants[0], state.readings), "Needs attention");
  assert.equal(getPlantHealth(state.plants[1], state.readings), "Healthy");
  assert.ok(getAlerts(state).some((alert) => alert.id === "tomato-01-soil-low"));
});

test("plant profile creation validates inputs and generates a plant growth sensor", () => {
  const state = createInitialSimulationState(start);
  const draft = {
    id: "mint-01",
    name: "Mint",
    speciesId: "custom" as const,
    scientificName: "Mentha spicata",
    variety: "Spearmint",
    plantingDate: "2026-10-01",
    stage: "Seedling" as const,
    irrigationIntervalHours: 30,
    targetConditions: structuredClone(speciesProfiles.custom.targets),
  };
  const next = savePlantProfile(state, draft);
  assert.equal(next.plants.length, 4);
  assert.ok(next.readings.some((reading) => reading.sensorId === "virtual-growth-mint-01" && reading.plantId === "mint-01"));
  assert.throws(() => validatePlantDraft({ ...draft, targetConditions: { ...draft.targetConditions, "soil-moisture": { min: 80, max: 20 } } }, state.currentTime));
});

test("local simulation state round-trips and rejects malformed or oversized data", () => {
  const state = createInitialSimulationState(start);
  const raw = serializeSimulationState(state);
  const restored = parseSimulationState(raw);
  assert.equal(restored?.plants.length, state.plants.length);
  assert.equal(parseSimulationState("not json"), null);
  assert.equal(parseSimulationState("x".repeat(8_000_001)), null);
  assert.equal(SIMULATION_STORAGE_KEY, "x-farm-simulation-v2");
  const legacy = JSON.parse(raw) as Record<string, unknown>;
  delete legacy.automation;
  assert.ok(parseSimulationState(JSON.stringify(legacy))?.automation, "existing browser data receives default automation rules");
});

test("enabled automation evaluates environmental rules and logs actuator changes with energy estimates", () => {
  let state = createInitialSimulationState(start);
  for (let hour = 0; hour < 13; hour += 1) state = advanceSimulation(state);
  assert.equal(state.automation.actuators.ventilation, true);
  assert.ok(state.events.some((event) => event.event === "Ventilation activated"));
  assert.ok(state.events.some((event) => event.event === "Grow lights turned on"));
  assert.ok(state.automation.resources.energyKwh > 0);
});

test("automatic irrigation runs below its configured threshold and updates water use", () => {
  let state = createInitialSimulationState(start);
  for (let hour = 0; hour < 22; hour += 1) state = advanceSimulation(state);
  assert.ok(state.events.some((event) => event.event === "Automatic irrigation completed"));
  assert.equal(state.automation.resources.waterLiters, 3);
  assert.ok((state.readings.find((reading) => reading.metric === "soil-moisture")?.value ?? 0) > state.automation.rules.irrigation.thresholdPercent);
});

test("manual actuator overrides persist through rule evaluation and can resume automatic control", () => {
  const initial = createInitialSimulationState(start);
  const overridden = setActuatorOverride(initial, "ventilation", true);
  const advanced = advanceSimulation(overridden);
  assert.equal(advanced.automation.actuators.ventilation, true);
  assert.equal(advanced.automation.overrides.ventilation, true);
  const resumed = setActuatorOverride(advanced, "ventilation", null);
  assert.equal(resumed.automation.overrides.ventilation, null);
  assert.ok(resumed.events.some((event) => event.event === "Ventilation returned to automatic control"));
  let warm = createInitialSimulationState("2026-10-30T12:00:00.000Z");
  const rules = structuredClone(warm.automation.rules);
  rules.ventilation.maximumTemperatureC = 19;
  warm = updateAutomationRules(warm, rules);
  warm = setActuatorOverride(warm, "ventilation", false);
  const warmResumed = setActuatorOverride(warm, "ventilation", null);
  assert.equal(warmResumed.automation.actuators.ventilation, true, "automatic control immediately evaluates the current reading");
  assert.ok(warmResumed.events.some((event) => event.event === "Ventilation activated"));
});

test("automation rules are configurable, logged, and validated", () => {
  const state = createInitialSimulationState(start);
  const rules = structuredClone(state.automation.rules);
  rules.irrigation.thresholdPercent = 40;
  rules.ventilation.enabled = false;
  const next = updateAutomationRules(state, rules);
  assert.equal(next.automation.rules.irrigation.thresholdPercent, 40);
  assert.equal(next.events[0].event, "Automation rules updated");
  assert.throws(() => validateAutomationRules({ ...rules, lighting: { ...rules.lighting, targetPpfd: 2_000 } }));
});

test("integrated growing workflow creates a plant, simulates an alert, irrigates, and records the outcome", () => {
  let state = createInitialSimulationState(start);
  const draft = {
    id: "mint-flow-01",
    name: "Workflow Mint",
    speciesId: "custom" as const,
    scientificName: "Mentha spicata",
    variety: "Spearmint",
    plantingDate: "2026-10-01",
    stage: "Seedling" as const,
    irrigationIntervalHours: 30,
    targetConditions: structuredClone(speciesProfiles.custom.targets),
  };

  state = savePlantProfile(state, draft);
  assert.ok(state.plants.some((plant) => plant.id === draft.id));
  const rules = structuredClone(state.automation.rules);
  rules.irrigation.enabled = false;
  state = updateAutomationRules(state, rules);
  state = advanceSimulation(state);
  assert.ok(getAlerts(state).some((alert) => alert.id === "tomato-01-soil-low"), "dry conditions produce the expected simulated alert");

  state = irrigateSimulation(state);
  assert.deepEqual(getAlerts(state), [], "irrigation returns the shared soil reading to plant target ranges");
  assert.equal(state.history["virtual-soil-moisture-01"].at(-1)?.value, 51);
  assert.equal(state.events[0].event, "Manual virtual irrigation");
  assert.match(state.events[0].detail, /4 plants/);
  assert.match(state.events[0].detail, /3 L estimated/);
});
