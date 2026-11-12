import assert from "node:assert/strict";
import test from "node:test";
import { describeAlert, getAlerts, hourlyTrend } from "../lib/alerts.ts";
import { cropCatalog, cropIds, isCropId } from "../lib/crops.ts";
import { estimateIrrigationInterval, effectiveIrrigationInterval } from "../lib/irrigation.ts";
import type { Plant, SensorReading, SimulationState } from "../lib/mock-data.ts";
import { createInitialSimulationState } from "../lib/simulation.ts";

const noon = "2026-11-01T12:00:00.000Z";

function plant(speciesId: Plant["speciesId"], overrides: Partial<Plant> = {}): Plant {
  const crop = cropCatalog[speciesId];
  return { id: `${speciesId}-1`, name: crop.name.en, speciesId, scientificName: crop.scientificName, variety: "", plantingDate: "2026-09-01", stage: "Vegetative", growthProgress: 30, irrigationIntervalHours: 24, targetConditions: { "soil-moisture": crop.soilMoisture, "air-temperature": crop.airTemperature, humidity: crop.humidity, light: crop.light }, lastWateredAt: noon, ...overrides };
}

function reading(metric: SensorReading["metric"], value: number, sensorId = `virtual-${metric}`): SensorReading {
  return { metric, value, sensorId, name: metric, unit: "", targetRange: { min: 0, max: 100 }, timestamp: noon, zoneId: "greenhouse-a", plantId: null, status: "normal" };
}

function state(plants: Plant[], readings: SensorReading[], history: SimulationState["history"] = {}, currentTime = noon): SimulationState {
  return { ...createInitialSimulationState(currentTime), currentTime, plants, readings, history };
}

test("every crop has consistent, sourced ranges and both languages", () => {
  assert.equal(cropIds.length, 16);
  for (const id of cropIds) {
    const crop = cropCatalog[id];
    for (const range of [crop.soilMoisture, crop.airTemperature, crop.humidity, crop.light, crop.soilTemperature, crop.soilPh, crop.soilEc]) assert.ok(range.min < range.max, id);
    for (const text of [crop.name, crop.tip, crop.learn.start, crop.learn.care, crop.learn.harvest, ...crop.symptoms.flatMap((item) => [item.sign, item.cause, item.action])]) assert.ok(text.ro && text.en, id);
    if (crop.ecocrop) {
      assert.ok(crop.ecocrop.tempAbsolute.min <= crop.ecocrop.tempOptimal.min && crop.ecocrop.tempOptimal.max <= crop.ecocrop.tempAbsolute.max, id);
      assert.deepEqual(crop.soilPh, crop.ecocrop.phOptimal, `${id} pH comes from EcoCrop`);
    }
  }
  assert.equal(isCropId("cucumber"), true);
  assert.equal(isCropId("toString"), false);
});

test("out-of-range readings warn, survival limits are critical, and light is ignored at night", () => {
  const lettuce = plant("lettuce");
  const hot = getAlerts(state([lettuce], [reading("air-temperature", 31)]));
  assert.equal(hot[0].tone, "critical");
  assert.equal(hot[0].code, "survival-limit");
  const warm = getAlerts(state([lettuce], [reading("air-temperature", 24)]));
  assert.equal(warm[0].tone, "warning");
  assert.equal(warm[0].id, "lettuce-1-air-temperature-high");
  assert.deepEqual(getAlerts(state([lettuce], [reading("light", 10)], {}, "2026-11-01T22:00:00.000Z")), []);
});

test("early warnings fire when the trend will leave the range within six hours", () => {
  const tomato = plant("tomato");
  const series = [55, 53, 51, 49, 47, 45].map((value) => reading("soil-moisture", value, "virtual-soil-moisture-01"));
  assert.equal(hourlyTrend(series), -2);
  const alerts = getAlerts(state([tomato], [reading("soil-moisture", 45)], { "virtual-soil-moisture-01": series }));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].code, "drifting");
  assert.equal(alerts[0].params?.hours, 2);
  const steady = [50, 50, 50, 50, 50].map((value) => reading("soil-moisture", value, "virtual-soil-moisture-01"));
  assert.deepEqual(getAlerts(state([tomato], [reading("soil-moisture", 50)], { "virtual-soil-moisture-01": steady })), []);
  assert.equal(hourlyTrend(series.slice(0, 3)), null);
});

test("alerts read naturally in Romanian and English", () => {
  const params = { plant: "Roșie", metric: "soil-moisture" as const, value: 35.9, min: 42, max: 68, direction: "low" as const };
  assert.deepEqual(describeAlert({ code: "out-of-range", params }, "ro"), { title: "Roșie: umiditatea solului sub țintă", detail: "35.9% · țintă 42–68%" });
  assert.deepEqual(describeAlert({ code: "out-of-range", params }, "en"), { title: "Roșie: soil moisture below target", detail: "35.9% · target 42–68%" });
  assert.match(describeAlert({ code: "drifting", params: { ...params, metric: "air-temperature", value: 26, min: 20, max: 27, hours: 3 } }, "ro").detail, /20–27 °C în ~3 h/);
  assert.deepEqual(describeAlert({ title: "Old alert", detail: "kept" }, "ro"), { title: "Old alert", detail: "kept" });
});

test("watering intervals are estimated from crop, stage, and conditions, unless set by hand", () => {
  assert.equal(estimateIrrigationInterval(plant("tomato"), 23.5, 60).hours, 24);
  assert.ok(estimateIrrigationInterval(plant("tomato", { stage: "Seedling" }), 23.5, 60).hours < 24);
  assert.ok(estimateIrrigationInterval(plant("tomato"), 31, 60).hours < estimateIrrigationInterval(plant("tomato"), 20, 60).hours);
  assert.ok(estimateIrrigationInterval(plant("tomato"), 23.5, 30).hours < estimateIrrigationInterval(plant("tomato"), 23.5, 90).hours);
  assert.equal(estimateIrrigationInterval(plant("dill", { stage: "Harvest" }), -20, 95).hours, 91);
  assert.equal(effectiveIrrigationInterval(plant("tomato", { irrigationMode: "manual", irrigationIntervalHours: 50 }), []), 50);
  assert.equal(effectiveIrrigationInterval(plant("tomato", { irrigationIntervalHours: 50 }), [reading("air-temperature", 23.5), reading("humidity", 60)]), 24);
});
