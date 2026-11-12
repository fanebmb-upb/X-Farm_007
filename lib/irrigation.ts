import { cropCatalog } from "./crops.ts";
import type { GrowthStage, Plant, SensorReading } from "./mock-data.ts";

export const IRRIGATION_LIMITS = { min: 6, max: 168 } as const;

// Young roots dry out fastest; fruit-filling plants use the most water.
const stageFactors: Record<GrowthStage, number> = { Seedling: 0.75, Vegetative: 1, Flowering: 0.9, Fruiting: 0.85, Harvest: 1.1 };

export type IrrigationEstimate = { hours: number; baseHours: number; stageFactor: number; temperatureFactor: number; humidityFactor: number };

/**
 * X_Farm rule of thumb: start from the crop's typical interval, shorten it for
 * thirsty growth stages, warm air (4% per °C above the crop's ideal midpoint),
 * and dry air; lengthen it for cool or very humid conditions.
 */
export function estimateIrrigationInterval(plant: Pick<Plant, "speciesId" | "stage">, airTemperature: number | null, humidity: number | null): IrrigationEstimate {
  const crop = cropCatalog[plant.speciesId];
  const ideal = (crop.airTemperature.min + crop.airTemperature.max) / 2;
  const temperatureFactor = airTemperature === null ? 1 : Math.min(1.5, Math.max(0.6, 1 - (airTemperature - ideal) * 0.04));
  const humidityFactor = humidity === null ? 1 : humidity < 40 ? 0.85 : humidity > 80 ? 1.15 : 1;
  const stageFactor = stageFactors[plant.stage];
  const raw = crop.irrigationBaseHours * stageFactor * temperatureFactor * humidityFactor;
  const hours = Math.round(Math.min(IRRIGATION_LIMITS.max, Math.max(IRRIGATION_LIMITS.min, raw)));
  return { hours, baseHours: crop.irrigationBaseHours, stageFactor, temperatureFactor, humidityFactor };
}

/** The interval the app works with: the user's own value when they chose one, otherwise the estimate. */
export function effectiveIrrigationInterval(plant: Plant, readings: SensorReading[]) {
  if (plant.irrigationMode === "manual") return plant.irrigationIntervalHours;
  const value = (metric: string) => readings.find((reading) => reading.metric === metric)?.value ?? null;
  return estimateIrrigationInterval(plant, value("air-temperature"), value("humidity")).hours;
}
