import assert from "node:assert/strict";
import test from "node:test";
import { speciesProfiles, type GrowthStage, type Plant, type PlantSpeciesId, type SensorReading } from "../lib/mock-data.ts";
import { buildPlantCareGuide } from "../lib/plant-care.ts";

const now = "2026-11-01T12:00:00.000Z";

function plant(speciesId: PlantSpeciesId = "tomato", stage: GrowthStage = "Flowering"): Plant {
  return { id: "p1", name: "Test", speciesId, scientificName: "", variety: "", plantingDate: "2026-09-01", stage, growthProgress: 10, irrigationIntervalHours: 24, targetConditions: speciesProfiles[speciesId].targets, lastWateredAt: "2026-11-01T02:00:00.000Z" };
}

function readings(values: Partial<Record<SensorReading["metric"], number>>) {
  return Object.entries(values).map(([metric, value]) => ({ metric, value }) as SensorReading);
}

function indicator(guide: ReturnType<typeof buildPlantCareGuide>, metric: string) {
  const found = guide.indicators.find((item) => item.metric === metric);
  assert.ok(found, metric);
  return found;
}

test("readings are compared with the plant's own targets", () => {
  const custom = plant();
  custom.targetConditions = { ...custom.targetConditions, "soil-moisture": { min: 50, max: 60 } };
  const low = buildPlantCareGuide(custom, readings({ "soil-moisture": 49.9 }), now);
  assert.equal(indicator(low, "soil-moisture").status, "low");
  assert.equal(indicator(low, "soil-moisture").rangeSource, "profile");
  assert.equal(indicator(buildPlantCareGuide(custom, readings({ "soil-moisture": 50 }), now), "soil-moisture").status, "ok");
  assert.equal(indicator(buildPlantCareGuide(custom, readings({ "soil-moisture": 61 }), now), "soil-moisture").status, "high");
});

test("metrics without a plant target use typical species ranges", () => {
  const guide = buildPlantCareGuide(plant("basil"), readings({ "soil-ec": 2.5 }), now);
  assert.equal(indicator(guide, "soil-ec").rangeSource, "typical");
  assert.equal(indicator(guide, "soil-ec").status, "high");
});

test("darkness is not low light, and missing sensors are not problems", () => {
  const guide = buildPlantCareGuide(plant(), readings({ light: 0 }), now);
  assert.equal(indicator(guide, "light").status, "lights-off");
  assert.equal(indicator(guide, "humidity").status, "no-reading");
  assert.equal(indicator(guide, "humidity").value, null);
  assert.equal(guide.outOfRangeCount, 0);
});

test("problems come first, then what matters at this growth stage", () => {
  const guide = buildPlantCareGuide(plant("tomato", "Flowering"), readings({ "soil-ph": 8 }), now);
  assert.equal(guide.outOfRangeCount, 1);
  assert.equal(guide.indicators[0].metric, "soil-ph");
  assert.deepEqual(guide.indicators.filter((item) => item.priority).map((item) => item.metric).sort(), ["air-temperature", "humidity", "soil-moisture"]);
  assert.equal(guide.indicators[1].priority, true);
});

test("watering status follows the plant's interval", () => {
  assert.deepEqual(buildPlantCareGuide(plant(), [], now).watering, { hoursSince: 10, intervalHours: 24, hoursUntilDue: 14, overdue: false });
  const overdue = buildPlantCareGuide(plant(), [], "2026-11-02T02:00:00.000Z").watering;
  assert.equal(overdue.overdue, true);
  assert.equal(overdue.hoursUntilDue, 0);
});

test("every species and stage has guidance", () => {
  for (const speciesId of Object.keys(speciesProfiles) as PlantSpeciesId[]) {
    for (const stage of ["Seedling", "Vegetative", "Flowering", "Fruiting", "Harvest"] as GrowthStage[]) {
      const guide = buildPlantCareGuide(plant(speciesId, stage), [], now);
      assert.equal(guide.indicators.length, 7);
      assert.equal(guide.indicators.filter((item) => item.priority).length, 3);
      assert.ok(guide.stageSummary && guide.speciesTip && guide.symptoms.length > 0);
      for (const item of guide.indicators) assert.ok(item.range.min < item.range.max, item.metric);
    }
  }
});
