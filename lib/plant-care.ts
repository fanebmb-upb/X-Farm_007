import type { GrowthStage, Plant, PlantSpeciesId, PlantTargetMetric, Range, SensorMetricId, SensorReading } from "./mock-data";

export type CareMetric = PlantTargetMetric | Extract<SensorMetricId, "soil-temperature" | "soil-ph" | "soil-ec">;
export type CareStatus = "ok" | "low" | "high" | "lights-off" | "no-reading";
type TypicalMetric = Exclude<CareMetric, PlantTargetMetric>;

export type CareIndicator = {
  metric: CareMetric;
  title: string;
  unit: string;
  value: number | null;
  range: Range;
  rangeSource: "profile" | "typical";
  status: CareStatus;
  priority: boolean;
  why: string;
  checkEvery: string;
  ifLow: string;
  ifHigh: string;
};

export type WateringStatus = { hoursSince: number; intervalHours: number; hoursUntilDue: number; overdue: boolean };
export type CareSymptom = { sign: string; cause: string; action: string };

export type PlantCareGuide = {
  indicators: CareIndicator[];
  watering: WateringStatus;
  stageSummary: string;
  speciesTip: string;
  symptoms: CareSymptom[];
  outOfRangeCount: number;
};

const HOUR_MS = 3_600_000;

const metricGuides: Record<CareMetric, Pick<CareIndicator, "title" | "unit" | "why" | "checkEvery" | "ifLow" | "ifHigh">> = {
  "soil-moisture": {
    title: "Soil moisture",
    unit: "%",
    why: "Roots need both water and air. Swinging between dry and soggy stresses the plant more than a steady level does.",
    checkEvery: "Daily, and before every watering",
    ifLow: "Water slowly until the root zone is evenly moist, then check whether the watering interval is too long.",
    ifHigh: "Hold off on watering and check drainage. Lasting wet soil starves roots of oxygen and invites root rot.",
  },
  "soil-temperature": {
    title: "Soil temperature",
    unit: "°C",
    why: "Root temperature controls how quickly water and nutrients are taken up, even when the air feels fine.",
    checkEvery: "Every few days, and after cold or hot spells",
    ifLow: "Move containers off cold floors, insulate them, or use a heat mat. Avoid watering with very cold water.",
    ifHigh: "Shade the pots or use lighter containers, and add mulch to keep the root zone cooler.",
  },
  "air-temperature": {
    title: "Air temperature",
    unit: "°C",
    why: "It drives growth speed, transpiration, and flowering. Extremes are a common cause of dropped flowers.",
    checkEvery: "Daily, including the warmest and coolest hours",
    ifLow: "Close vents, add protection or gentle heating, and move sensitive plants away from cold spots.",
    ifHigh: "Increase ventilation and add shade during the hottest hours.",
  },
  humidity: {
    title: "Relative humidity",
    unit: "%",
    why: "Humidity sets how fast leaves lose water. Too high favours fungal disease; too low stresses leaves.",
    checkEvery: "Daily, especially early morning",
    ifLow: "Reduce strong airflow, group plants together, and water the root zone consistently.",
    ifHigh: "Ventilate, space plants further apart, and water early so foliage can dry during the day.",
  },
  light: {
    title: "Light intensity",
    unit: "µmol/m²/s",
    why: "Light is the plant's energy source. Too little causes weak, stretched growth; too much can scorch leaves.",
    checkEvery: "During daytime, a few times a week",
    ifLow: "Add or lower grow lights, extend the lit period, or remove anything shading the plant.",
    ifHigh: "Raise the lights or add shade netting, especially when temperatures are also high.",
  },
  "soil-ph": {
    title: "Soil pH",
    unit: "pH",
    why: "pH decides which nutrients roots can absorb. Outside the right range, plants can go hungry in well-fed soil.",
    checkEvery: "Every 1–2 weeks",
    ifLow: "Raise it gradually, for example with garden lime, and retest before adding more.",
    ifHigh: "Lower it gradually, for example with elemental sulfur or an acidifying feed, and retest before adding more.",
  },
  "soil-ec": {
    title: "Soil electrical conductivity",
    unit: "mS/cm",
    why: "EC estimates how much dissolved fertiliser is in the root zone, so it shows both underfeeding and salt build-up.",
    checkEvery: "Weekly, and after feeding",
    ifLow: "Feed lightly with a balanced fertiliser, then retest before increasing the dose.",
    ifHigh: "Pause feeding and flush the root zone with plain water to clear excess salts.",
  },
};

const typicalRanges: Record<PlantSpeciesId, Record<TypicalMetric, Range>> = {
  tomato: { "soil-temperature": { min: 18, max: 26 }, "soil-ph": { min: 6, max: 6.8 }, "soil-ec": { min: 1, max: 3 } },
  basil: { "soil-temperature": { min: 18, max: 26 }, "soil-ph": { min: 6, max: 7 }, "soil-ec": { min: 0.8, max: 2 } },
  pepper: { "soil-temperature": { min: 18, max: 27 }, "soil-ph": { min: 6, max: 6.8 }, "soil-ec": { min: 1, max: 2.5 } },
  custom: { "soil-temperature": { min: 16, max: 27 }, "soil-ph": { min: 5.5, max: 7 }, "soil-ec": { min: 0.5, max: 3 } },
};

const stageGuides: Record<GrowthStage, { summary: string; priorities: CareMetric[] }> = {
  Seedling: { summary: "Young roots dry out quickly and seedlings stretch in poor light, so keep the soil evenly moist and the light steady. Feed only lightly.", priorities: ["soil-moisture", "light", "soil-temperature"] },
  Vegetative: { summary: "The plant is building leaves and roots. Good light and steady feeding now set up the later harvest.", priorities: ["light", "soil-ec", "soil-moisture"] },
  Flowering: { summary: "Flowers are sensitive to heat and damp air, and both can reduce fruit set. Keep temperature and humidity in range and watering regular.", priorities: ["air-temperature", "humidity", "soil-moisture"] },
  Fruiting: { summary: "Developing fruit needs consistent water and nutrients. Avoid sudden swings in soil moisture.", priorities: ["soil-moisture", "soil-ec", "air-temperature"] },
  Harvest: { summary: "Keep conditions stable and pick regularly. Watch for disease on older foliage, and avoid overwatering near the end of the crop.", priorities: ["soil-moisture", "humidity", "light"] },
};

const speciesGuides: Record<PlantSpeciesId, { tip: string; symptoms: CareSymptom[] }> = {
  tomato: {
    tip: "Tomatoes respond badly to uneven watering. Consistency matters as much as the amount of water.",
    symptoms: [
      { sign: "Dark, sunken patch at the bottom of the fruit", cause: "Blossom end rot, usually linked to uneven watering limiting calcium uptake", action: "Keep soil moisture steady and check that pH is in range." },
      { sign: "Flowers dropping without setting fruit", cause: "Often temperatures that are too hot or too cold", action: "Check air temperature and improve ventilation during hot hours." },
      { sign: "Lower leaves turning yellow", cause: "Possible nitrogen shortage, though ageing leaves also yellow naturally", action: "Check EC and feed lightly if it is low." },
    ],
  },
  basil: {
    tip: "Basil dislikes cold and damp. Pinch off flower buds and harvest from the top to keep it leafy.",
    symptoms: [
      { sign: "Yellowing leaves with grey-purple fuzz underneath", cause: "Possibly downy mildew, which is favoured by damp air and wet leaves", action: "Lower humidity, improve airflow, avoid wetting leaves, and remove affected growth." },
      { sign: "Tall, thin stems with few leaves", cause: "Too little light", action: "Increase light and pinch back the tips to encourage bushier growth." },
      { sign: "Dark or black patches after a cool night", cause: "Possible cold damage", action: "Keep the plant warmer, especially overnight." },
    ],
  },
  pepper: {
    tip: "Peppers like warmth and grow slowly when cold. Stable warm temperatures help them keep their flowers.",
    symptoms: [
      { sign: "Flowers or small fruit dropping", cause: "Often heat, cold, or water stress", action: "Check air temperature and soil moisture, and keep both steady." },
      { sign: "Pale, papery patches on fruit", cause: "Possible sunscald from intense direct light", action: "Add light shade and keep enough leaf cover over the fruit." },
      { sign: "Dark, sunken patch at the end of the fruit", cause: "Blossom end rot, usually linked to uneven watering", action: "Keep soil moisture steady." },
    ],
  },
  custom: {
    tip: "These are general starting values. Look up your species' needs and adjust the targets in its plant profile.",
    symptoms: [
      { sign: "Wilting while the soil is wet", cause: "Possible root stress from overwatering or poor drainage", action: "Let the soil dry slightly and check drainage." },
      { sign: "Tall, pale, stretched growth", cause: "Too little light", action: "Increase light intensity or the length of the lit period." },
      { sign: "Brown, crispy leaf edges", cause: "Possible dry air, underwatering, or too much fertiliser", action: "Check humidity, soil moisture, and EC." },
    ],
  },
};

const metricOrder: CareMetric[] = ["soil-moisture", "air-temperature", "humidity", "light", "soil-temperature", "soil-ph", "soil-ec"];

function isOutOfRange(status: CareStatus) {
  return status === "low" || status === "high";
}

function careStatus(metric: CareMetric, value: number | null, range: Range): CareStatus {
  if (value === null) return "no-reading";
  if (metric === "light" && value === 0) return "lights-off";
  if (value < range.min) return "low";
  return value > range.max ? "high" : "ok";
}

/** Shared sensors measure the whole growing zone, so each plant compares the same readings with its own targets. */
export function buildPlantCareGuide(plant: Plant, readings: SensorReading[], currentTime: string): PlantCareGuide {
  const stage = stageGuides[plant.stage];
  const species = speciesGuides[plant.speciesId];
  const indicators = metricOrder.map((metric): CareIndicator => {
    const isProfileMetric = metric in plant.targetConditions;
    const range = isProfileMetric ? plant.targetConditions[metric as PlantTargetMetric] : typicalRanges[plant.speciesId][metric as TypicalMetric];
    const value = readings.find((reading) => reading.metric === metric)?.value ?? null;
    return { ...metricGuides[metric], metric, value, range, rangeSource: isProfileMetric ? "profile" : "typical", status: careStatus(metric, value, range), priority: stage.priorities.includes(metric) };
  });
  const rank = (item: CareIndicator) => (isOutOfRange(item.status) ? 0 : item.priority ? 1 : 2);
  indicators.sort((a, b) => rank(a) - rank(b));

  const hoursSince = Math.max(0, Math.floor((Date.parse(currentTime) - Date.parse(plant.lastWateredAt)) / HOUR_MS));
  return {
    indicators,
    watering: { hoursSince, intervalHours: plant.irrigationIntervalHours, hoursUntilDue: Math.max(0, plant.irrigationIntervalHours - hoursSince), overdue: hoursSince >= plant.irrigationIntervalHours },
    stageSummary: stage.summary,
    speciesTip: species.tip,
    symptoms: species.symptoms,
    outOfRangeCount: indicators.filter((item) => isOutOfRange(item.status)).length,
  };
}
