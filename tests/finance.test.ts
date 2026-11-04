import assert from "node:assert/strict";
import test from "node:test";
import { parseAssistantRequest } from "../lib/assistant.ts";
import { calculateFinance, defaultFinanceSettings, financePeriodProblem, parseDailyResourceLog, parseFinanceSettings, periodForPreset, recordDailyResources } from "../lib/finance.ts";
import type { Plant } from "../lib/mock-data.ts";
import { advanceSimulation, createInitialSimulationState, irrigateSimulation, parseSimulationState, serializeSimulationState } from "../lib/simulation.ts";

const tomato = { id: "t1", name: "Tomato", speciesId: "tomato", plantingDate: "2026-01-01" } as Plant;
const settings = { ...defaultFinanceSettings, energyPricePerKwh: 2, waterPricePerLiter: 0.5, otherCostsPerMonth: 30 };

test("presets end on the simulated day and count it", () => {
  assert.deepEqual(periodForPreset("day", "2026-11-04"), { from: "2026-11-04", to: "2026-11-04" });
  assert.deepEqual(periodForPreset("week", "2026-11-04"), { from: "2026-10-29", to: "2026-11-04" });
});

test("fully recorded periods use recorded usage with nothing projected", () => {
  const log = { "2026-11-01": { hours: 24, waterLiters: 6, energyKwh: 4 } };
  const result = calculateFinance({ from: "2026-11-01", to: "2026-11-01" }, log, [tomato], settings);
  assert.equal(result.projectedDays, 0);
  assert.equal(result.costs.energy, 8);
  assert.equal(result.costs.water, 3);
  assert.equal(result.costs.other, 1);
  assert.equal(result.costs.total, 12);
  assert.equal(result.totalKilograms, 5 / 120);
  assert.equal(result.profit, result.revenue - 12);
});

test("days without history are projected from the recorded hourly rate", () => {
  const log = { "2026-11-01": { hours: 12, waterLiters: 3, energyKwh: 1 } };
  const result = calculateFinance({ from: "2026-11-01", to: "2026-11-02" }, log, [tomato], settings);
  assert.equal(result.recordedDays, 0.5);
  assert.equal(result.projectedDays, 1.5);
  assert.equal(result.waterLiters, 3 + 6 * 1.5);
  assert.equal(result.energyKwh, 1 + 2 * 1.5);
});

test("no history means no invented usage, and plants only produce after planting", () => {
  const result = calculateFinance({ from: "2025-12-31", to: "2026-01-01" }, {}, [tomato], { ...settings, otherCostsPerMonth: 0 });
  assert.equal(result.projectedDays, 0);
  assert.equal(result.costs.total, 0);
  assert.equal(result.totalKilograms, 5 / 120);
});

test("projected usage and fixed costs do not start before the first planting", () => {
  const log = { "2026-01-01": { hours: 24, waterLiters: 2, energyKwh: 1 } };
  const result = calculateFinance({ from: "2025-12-01", to: "2026-01-02" }, log, [tomato], settings);
  assert.equal(result.days, 33);
  assert.equal(result.activeDays, 2);
  assert.equal(result.projectedDays, 1);
  assert.equal(result.energyKwh, 2);
  assert.equal(result.costs.other, 2);
  assert.equal(calculateFinance({ from: "2026-01-01", to: "2026-01-02" }, log, [], settings).projectedDays, 0);
});

test("recordDailyResources accumulates per day and tolerates a missing log", () => {
  const first = recordDailyResources(undefined, "2026-11-01T10:00:00.000Z", { hours: 1, energyKwh: 0.35 });
  const second = recordDailyResources(first, "2026-11-01T11:00:00.000Z", { hours: 1, waterLiters: 3, energyKwh: 0.15 });
  assert.deepEqual(second["2026-11-01"], { hours: 2, waterLiters: 3, energyKwh: 0.5 });
  assert.equal(first["2026-11-01"].hours, 1);
});

test("invalid periods and stored data are rejected safely", () => {
  assert.match(financePeriodProblem({ from: "2026-11-02", to: "2026-11-01" }) ?? "", /start date/);
  assert.match(financePeriodProblem({ from: "", to: "2026-11-01" }) ?? "", /both/);
  assert.match(financePeriodProblem({ from: "2000-01-01", to: "2026-11-01" }) ?? "", /10 years/);
  assert.equal(financePeriodProblem({ from: "2026-11-01", to: "2026-11-01" }), null);
  assert.deepEqual(parseFinanceSettings("not json"), defaultFinanceSettings);
  assert.deepEqual(parseFinanceSettings(JSON.stringify({ ...defaultFinanceSettings, energyPricePerKwh: -1 })), defaultFinanceSettings);
  assert.deepEqual(parseDailyResourceLog({ bad: { hours: 1, waterLiters: 0, energyKwh: 0 }, "2026-11-01": { hours: -1, waterLiters: 0, energyKwh: 0 } }), {});
});

test("the simulation logs hourly usage and old saves without a log still load", () => {
  const start = createInitialSimulationState();
  const advanced = irrigateSimulation(advanceSimulation(start));
  const date = advanced.currentTime.slice(0, 10);
  assert.equal(advanced.dailyResources?.[date].hours, 1);
  assert.ok((advanced.dailyResources?.[date].waterLiters ?? 0) >= 3);
  const restored = parseSimulationState(serializeSimulationState(advanced));
  assert.deepEqual(restored?.dailyResources, advanced.dailyResources);
  assert.deepEqual(parseSimulationState(JSON.stringify({ ...advanced, dailyResources: undefined }))?.dailyResources, {});
});

test("the assistant accepts a valid finance summary and rejects a malformed one", () => {
  const finance = { period: { from: "2026-11-01", to: "2026-11-07", days: 7 }, currency: "RON", recordedDays: 3, projectedDays: 4, waterLiters: 6, energyKwh: 2, costs: { energy: 2.6, water: 0.07, other: 0, total: 2.67 }, production: [{ name: "Tomato", kilograms: 0.29, revenue: 3.5 }], totalKilograms: 0.29, revenue: 3.5, profit: 0.83 };
  const request = { message: "Analyse this", history: [], context: { plants: [], readings: [], alerts: [], events: [], finance } };
  assert.deepEqual(parseAssistantRequest(request)?.context.finance, finance);
  assert.equal(parseAssistantRequest({ ...request, context: { ...request.context, finance: { ...finance, profit: "lots" } } }), null);
  assert.equal(parseAssistantRequest({ ...request, context: { plants: [], readings: [], alerts: [], events: [] } })?.context.finance, undefined);
});
