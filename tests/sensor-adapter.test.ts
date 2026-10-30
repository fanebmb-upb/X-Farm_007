import assert from "node:assert/strict";
import test from "node:test";
import { createInitialSimulationState } from "../lib/simulation.ts";
import { validateSensorObservations } from "../lib/sensors/adapter.ts";
import { VirtualSensorAdapter } from "../lib/sensors/virtual-adapter.ts";

test("virtual sensor adapter exposes normalized timestamped observations for its zone", async () => {
  const simulation = createInitialSimulationState("2026-10-30T12:00:00Z");
  const adapter = new VirtualSensorAdapter(() => simulation);
  const observations = await adapter.readCurrent(simulation.zoneId);
  assert.equal(adapter.kind, "virtual");
  assert.equal(observations.length, simulation.readings.length);
  assert.ok(observations.every((reading) => reading.zoneId === simulation.zoneId && Number.isFinite(Date.parse(reading.timestamp))));
  assert.deepEqual(await adapter.readCurrent("another-zone"), []);
});

test("sensor observation validator accepts well-formed batches and rejects malformed or cross-zone data", () => {
  const valid = [{ sensorId: "device-1", metric: "soil-moisture", timestamp: "2026-10-30T12:00:00Z", value: 42, unit: "%", zoneId: "greenhouse-a", plantId: null }];
  assert.deepEqual(validateSensorObservations(valid, "greenhouse-a"), valid);
  assert.equal(validateSensorObservations([{ ...valid[0], value: Number.NaN }], "greenhouse-a"), null);
  assert.equal(validateSensorObservations([{ ...valid[0], metric: "unknown-measurement" }], "greenhouse-a"), null);
  assert.equal(validateSensorObservations([{ ...valid[0], zoneId: "other-zone" }], "greenhouse-a"), null);
  assert.equal(validateSensorObservations(valid, ""), null);
});
