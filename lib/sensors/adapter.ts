import type { SensorMetricId } from "@/lib/mock-data";

const supportedMetrics = new Set<SensorMetricId | "growth-progress">([
  "soil-moisture", "soil-temperature", "air-temperature", "humidity", "co2", "oxygen",
  "light", "uva", "uvb", "soil-ph", "soil-ec", "reservoir", "growth-progress",
]);

/** A normalized observation shared by virtual and future physical sensor providers. */
export type SensorObservation = {
  sensorId: string;
  metric: SensorMetricId | "growth-progress";
  timestamp: string;
  value: number;
  unit: string;
  zoneId: string;
  plantId: string | null;
};

/** Implementations can read a virtual simulation or a future hardware gateway. */
export interface SensorAdapter {
  readonly kind: "virtual" | "hardware";
  readCurrent(zoneId: string): Promise<SensorObservation[]>;
}

export function validateSensorObservations(value: unknown, expectedZoneId: string): SensorObservation[] | null {
  if (!Array.isArray(value) || value.length > 1000 || expectedZoneId.trim().length === 0) return null;
  const observations: SensorObservation[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.sensorId !== "string" || row.sensorId.trim().length === 0 || row.sensorId.length > 120
      || typeof row.metric !== "string" || row.metric.trim().length === 0 || row.metric.length > 80
      || !supportedMetrics.has(row.metric as SensorObservation["metric"])
      || typeof row.timestamp !== "string" || !Number.isFinite(Date.parse(row.timestamp))
      || typeof row.value !== "number" || !Number.isFinite(row.value)
      || typeof row.unit !== "string" || row.unit.length > 30
      || row.zoneId !== expectedZoneId
      || (row.plantId !== null && (typeof row.plantId !== "string" || row.plantId.length > 120))) return null;
    observations.push({
      sensorId: row.sensorId,
      metric: row.metric as SensorObservation["metric"],
      timestamp: row.timestamp,
      value: row.value,
      unit: row.unit,
      zoneId: row.zoneId,
      plantId: row.plantId as string | null,
    });
  }
  return observations;
}
