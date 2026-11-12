export type PlantHealth = "Healthy" | "Needs attention";
import { cropCatalog, cropIds, type PlantSpeciesId } from "./crops.ts";

export type { PlantSpeciesId } from "./crops.ts";
export type GrowthStage = "Seedling" | "Vegetative" | "Flowering" | "Fruiting" | "Harvest";
export type Range = { min: number; max: number };
export type PlantTargetMetric = "soil-moisture" | "air-temperature" | "humidity" | "light";

export type PlantTargets = Record<PlantTargetMetric, Range>;

export type Plant = {
  id: string;
  name: string;
  speciesId: PlantSpeciesId;
  scientificName: string;
  variety: string;
  plantingDate: string;
  stage: GrowthStage;
  growthProgress: number;
  /** "auto" (or missing in older saves) means X_Farm estimates the interval; "manual" uses irrigationIntervalHours. */
  irrigationMode?: "auto" | "manual";
  irrigationIntervalHours: number;
  targetConditions: PlantTargets;
  lastWateredAt: string;
};

export type SensorMetricId =
  | "soil-moisture"
  | "soil-temperature"
  | "air-temperature"
  | "humidity"
  | "co2"
  | "oxygen"
  | "light"
  | "uva"
  | "uvb"
  | "soil-ph"
  | "soil-ec"
  | "reservoir";

export type SensorReading = {
  sensorId: string;
  metric: SensorMetricId | "growth-progress";
  name: string;
  value: number;
  unit: string;
  targetRange: Range;
  timestamp: string;
  zoneId: string;
  plantId: string | null;
  status: "normal" | "watch";
};

export type SensorDefinition = {
  metric: SensorMetricId;
  sensorId: string;
  name: string;
  unit: string;
  targetRange: Range;
};

export type FarmEvent = {
  id: string;
  time: string;
  event: string;
  detail: string;
  kind: "water" | "light" | "air" | "growth";
};

export type AutomationRules = {
  irrigation: { enabled: boolean; thresholdPercent: number };
  ventilation: { enabled: boolean; maximumTemperatureC: number };
  lighting: { enabled: boolean; targetPpfd: number };
};

export type AutomationState = {
  rules: AutomationRules;
  actuators: { ventilation: boolean; growLights: boolean };
  overrides: { ventilation: boolean | null; growLights: boolean | null };
  resources: { waterLiters: number; energyKwh: number };
};

export type FarmAlert = {
  id: string;
  plantId: string | null;
  title: string;
  detail: string;
  tone: "critical" | "warning" | "info";
  code?: "out-of-range" | "drifting" | "survival-limit" | "reservoir-low";
  params?: { plant?: string; metric?: "soil-moisture" | "air-temperature" | "humidity" | "light" | "soil-temperature" | "soil-ph" | "soil-ec"; value?: number; min?: number; max?: number; direction?: "low" | "high"; hours?: number };
};

export type DailyResourceLog = Record<string, { hours: number; waterLiters: number; energyKwh: number }>;

export type SimulationState = {
  version: 2;
  zoneId: string;
  currentTime: string;
  plants: Plant[];
  readings: SensorReading[];
  history: Record<string, SensorReading[]>;
  events: FarmEvent[];
  automation: AutomationState;
  dailyResources?: DailyResourceLog;
};

export const defaultAutomationRules: AutomationRules = {
  irrigation: { enabled: true, thresholdPercent: 32 },
  ventilation: { enabled: true, maximumTemperatureC: 26 },
  lighting: { enabled: true, targetPpfd: 350 },
};

export const defaultAutomationState: AutomationState = {
  rules: defaultAutomationRules,
  actuators: { ventilation: false, growLights: false },
  overrides: { ventilation: null, growLights: null },
  resources: { waterLiters: 0, energyKwh: 0 },
};

export type PlantDraft = Omit<Plant, "id" | "growthProgress" | "lastWateredAt" | "scientificName"> & {
  id?: string;
  scientificName?: string;
};

export const ZONE_ID = "greenhouse-a";
export const ZONE_NAME = "Greenhouse A";
export const HISTORY_HOURS = 30 * 24;
export const SIMULATION_STORAGE_KEY = "x-farm-simulation-v2";

export const sensorDefinitions: SensorDefinition[] = [
  { metric: "soil-moisture", sensorId: "virtual-soil-moisture-01", name: "Soil Moisture", unit: "%", targetRange: { min: 20, max: 75 } },
  { metric: "soil-temperature", sensorId: "virtual-soil-temperature-01", name: "Soil Temperature", unit: "°C", targetRange: { min: 16, max: 27 } },
  { metric: "air-temperature", sensorId: "virtual-air-temperature-01", name: "Air Temperature", unit: "°C", targetRange: { min: 18, max: 30 } },
  { metric: "humidity", sensorId: "virtual-humidity-01", name: "Relative Humidity", unit: "%", targetRange: { min: 40, max: 78 } },
  { metric: "co2", sensorId: "virtual-co2-01", name: "CO₂ Concentration", unit: "ppm", targetRange: { min: 350, max: 1200 } },
  { metric: "oxygen", sensorId: "virtual-oxygen-01", name: "Oxygen Concentration", unit: "%", targetRange: { min: 19, max: 23 } },
  { metric: "light", sensorId: "virtual-ppfd-01", name: "Light Intensity (PPFD)", unit: "µmol/m²/s", targetRange: { min: 0, max: 800 } },
  { metric: "uva", sensorId: "virtual-uva-01", name: "UV Radiation (UVA)", unit: "W/m²", targetRange: { min: 0, max: 8 } },
  { metric: "uvb", sensorId: "virtual-uvb-01", name: "UV Radiation (UVB)", unit: "W/m²", targetRange: { min: 0, max: 0.8 } },
  { metric: "soil-ph", sensorId: "virtual-soil-ph-01", name: "Soil pH", unit: "pH", targetRange: { min: 5, max: 7.5 } },
  { metric: "soil-ec", sensorId: "virtual-soil-ec-01", name: "Soil Electrical Conductivity", unit: "mS/cm", targetRange: { min: 0.3, max: 3.5 } },
  { metric: "reservoir", sensorId: "virtual-reservoir-01", name: "Water Reservoir", unit: "%", targetRange: { min: 20, max: 100 } },
];

/** Plant defaults derived from the crop knowledge base in lib/crops.ts. */
export const speciesProfiles = Object.fromEntries(cropIds.map((id) => {
  const crop = cropCatalog[id];
  return [id, {
    name: crop.name.en,
    scientificName: crop.scientificName,
    defaultVariety: crop.typeExample.en,
    irrigationIntervalHours: crop.irrigationBaseHours,
    targets: { "soil-moisture": crop.soilMoisture, "air-temperature": crop.airTemperature, humidity: crop.humidity, light: crop.light } as PlantTargets,
  }];
})) as Record<PlantSpeciesId, { name: string; scientificName: string; defaultVariety: string; irrigationIntervalHours: number; targets: PlantTargets }>;

export const initialPlants: Plant[] = [
  { id: "tomato-01", name: "Tomato", speciesId: "tomato", scientificName: "Solanum lycopersicum", variety: "Roma", plantingDate: "2026-08-12", stage: "Flowering", growthProgress: 67, irrigationIntervalHours: 24, targetConditions: speciesProfiles.tomato.targets, lastWateredAt: "2026-10-29T12:00:00.000Z" },
  { id: "basil-01", name: "Basil", speciesId: "basil", scientificName: "Ocimum basilicum", variety: "Genovese", plantingDate: "2026-09-10", stage: "Vegetative", growthProgress: 54, irrigationIntervalHours: 36, targetConditions: speciesProfiles.basil.targets, lastWateredAt: "2026-10-29T20:32:00.000Z" },
  { id: "pepper-01", name: "Pepper", speciesId: "pepper", scientificName: "Capsicum annuum", variety: "Bell pepper", plantingDate: "2026-09-01", stage: "Vegetative", growthProgress: 58, irrigationIntervalHours: 30, targetConditions: speciesProfiles.pepper.targets, lastWateredAt: "2026-10-29T19:04:00.000Z" },
];

export const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "plants", label: "My Plants", icon: "leaf" },
  { id: "care", label: "Plant Care", icon: "clipboard" },
  { id: "analytics", label: "Sensor Analytics", icon: "chart" },
  { id: "assistant", label: "AI Assistant", icon: "sparkles" },
  { id: "finance", label: "Profit & Costs", icon: "coins" },
  { id: "automation", label: "Automation", icon: "settings" },
  { id: "weather", label: "Weather", icon: "cloud" },
  { id: "settings", label: "Settings", icon: "sliders" },
  { id: "how-it-works", label: "How it works", icon: "sprout" },
] as const;

export type NavigationId = (typeof navigationItems)[number]["id"];
