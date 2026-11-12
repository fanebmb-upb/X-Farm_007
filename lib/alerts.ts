import { cropCatalog, type Localized } from "./crops.ts";
import { sensorDefinitions, type FarmAlert, type Plant, type SensorReading, type SimulationState } from "./mock-data.ts";

export type Locale = "ro" | "en";
export type AlertMetric = "soil-moisture" | "air-temperature" | "humidity" | "light" | "soil-temperature" | "soil-ph" | "soil-ec";
export type AlertCode = "out-of-range" | "drifting" | "survival-limit" | "reservoir-low";
export type AlertParams = { plant?: string; metric?: AlertMetric; value?: number; min?: number; max?: number; direction?: "low" | "high"; hours?: number };

const TREND_POINTS = 6;
const WARNING_HORIZON_HOURS = 6;

export const metricLabels: Record<AlertMetric, Localized> = {
  "soil-moisture": { ro: "Umiditatea solului", en: "Soil moisture" },
  "air-temperature": { ro: "Temperatura aerului", en: "Air temperature" },
  humidity: { ro: "Umiditatea relativă", en: "Relative humidity" },
  light: { ro: "Lumina", en: "Light" },
  "soil-temperature": { ro: "Temperatura solului", en: "Soil temperature" },
  "soil-ph": { ro: "pH-ul solului", en: "Soil pH" },
  "soil-ec": { ro: "Conductivitatea solului (EC)", en: "Soil EC" },
};

const metricUnits: Record<AlertMetric, string> = {
  "soil-moisture": "%", "air-temperature": " °C", humidity: "%", light: " µmol/m²/s", "soil-temperature": " °C", "soil-ph": "", "soil-ec": " mS/cm",
};

const alertMetrics = Object.keys(metricLabels) as AlertMetric[];

export function targetRangeFor(plant: Plant, metric: AlertMetric) {
  if (metric === "soil-moisture" || metric === "air-temperature" || metric === "humidity" || metric === "light") return plant.targetConditions[metric];
  const crop = cropCatalog[plant.speciesId];
  return metric === "soil-temperature" ? crop.soilTemperature : metric === "soil-ph" ? crop.soilPh : crop.soilEc;
}

/** Least-squares slope per hour over the most recent hourly samples, or null when there is too little history. */
export function hourlyTrend(series: SensorReading[]) {
  const points = series.slice(-TREND_POINTS).map((reading) => reading.value);
  if (points.length < 4) return null;
  const n = points.length;
  const meanX = (n - 1) / 2;
  const meanY = points.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  points.forEach((value, index) => { numerator += (index - meanX) * (value - meanY); denominator += (index - meanX) ** 2; });
  return numerator / denominator;
}

function survivalBreach(plant: Plant, metric: AlertMetric, value: number) {
  const eco = cropCatalog[plant.speciesId].ecocrop;
  if (!eco) return null;
  if (metric === "air-temperature") {
    if (value < eco.tempAbsolute.min || (eco.killingTemp !== null && value <= eco.killingTemp)) return { min: eco.tempAbsolute.min, max: eco.tempAbsolute.max, direction: "low" as const };
    if (value > eco.tempAbsolute.max) return { min: eco.tempAbsolute.min, max: eco.tempAbsolute.max, direction: "high" as const };
  }
  if (metric === "soil-ph" && (value < eco.phAbsolute.min || value > eco.phAbsolute.max)) return { min: eco.phAbsolute.min, max: eco.phAbsolute.max, direction: value < eco.phAbsolute.min ? "low" as const : "high" as const };
  return null;
}

function alert(id: string, plantId: string | null, tone: FarmAlert["tone"], code: AlertCode, params: AlertParams): FarmAlert {
  const { title, detail } = describeAlert({ code, params }, "en");
  return { id, plantId, tone, code, params, title, detail };
}

/**
 * Raises an alert per plant when a reading is outside its target, a critical one
 * when it passes the crop's survival limits, and an early warning when the recent
 * trend will take an in-range reading out of range within a few hours.
 */
export function getAlerts(state: SimulationState): FarmAlert[] {
  const alerts: FarmAlert[] = [];
  const hour = new Date(state.currentTime).getUTCHours();
  const daytime = hour >= 7 && hour <= 18;
  for (const plant of state.plants) {
    for (const metric of alertMetrics) {
      if (metric === "light" && !daytime) continue;
      const value = state.readings.find((reading) => reading.metric === metric)?.value;
      if (value === undefined) continue;
      const range = targetRangeFor(plant, metric);
      const base = { plant: plant.name, metric, value: Math.round(value * 100) / 100, min: range.min, max: range.max };
      const breach = survivalBreach(plant, metric, value);
      if (breach) {
        alerts.push(alert(`${plant.id}-${metric}-critical`, plant.id, "critical", "survival-limit", { ...base, min: breach.min, max: breach.max, direction: breach.direction }));
      } else if (value < range.min || value > range.max) {
        alerts.push(alert(`${plant.id}-${metric}-${value < range.min ? "low" : "high"}`, plant.id, "warning", "out-of-range", { ...base, direction: value < range.min ? "low" : "high" }));
      } else if (metric !== "light") {
        const sensor = sensorDefinitions.find((definition) => definition.metric === metric);
        const slope = sensor ? hourlyTrend(state.history[sensor.sensorId] ?? []) : null;
        if (slope === null || Math.abs(slope) < 1e-6) continue;
        const bound = slope > 0 ? range.max : range.min;
        const hours = (bound - value) / slope;
        if (hours > 0 && hours <= WARNING_HORIZON_HOURS) alerts.push(alert(`${plant.id}-${metric}-drift`, plant.id, "info", "drifting", { ...base, direction: slope > 0 ? "high" : "low", hours: Math.max(1, Math.round(hours)) }));
      }
    }
  }
  const reservoir = state.readings.find((reading) => reading.metric === "reservoir")?.value;
  if (reservoir !== undefined && reservoir < 25) alerts.push(alert("reservoir-low", null, "warning", "reservoir-low", { value: Math.round(reservoir) }));
  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.tone] - order[b.tone]);
}

function number(value: number | undefined, metric?: AlertMetric) {
  if (value === undefined) return "";
  return String(Number.isInteger(value) ? value : value.toFixed(metric === "soil-ph" || metric === "soil-ec" ? 2 : 1));
}

function format(value: number | undefined, metric?: AlertMetric) {
  return value === undefined ? "" : `${number(value, metric)}${metric ? metricUnits[metric] : ""}`;
}

/** Title and detail for an alert in the chosen language; legacy alerts without a code keep their stored text. */
export function describeAlert(alertLike: Pick<FarmAlert, "code" | "params"> & Partial<Pick<FarmAlert, "title" | "detail">>, locale: Locale) {
  const { code, params = {} } = alertLike;
  const ro = locale === "ro";
  const metric = params.metric;
  const label = metric ? metricLabels[metric][locale] : "";
  const range = metric ? `${number(params.min, metric)}–${number(params.max, metric)}${metricUnits[metric]}` : "";
  const value = format(params.value, metric);
  const plant = params.plant ?? "";
  switch (code) {
    case "out-of-range":
      return params.direction === "low"
        ? { title: ro ? `${plant}: ${label.toLowerCase()} sub țintă` : `${plant}: ${label.toLowerCase()} below target`, detail: ro ? `${value} · țintă ${range}` : `${value} · target ${range}` }
        : { title: ro ? `${plant}: ${label.toLowerCase()} peste țintă` : `${plant}: ${label.toLowerCase()} above target`, detail: ro ? `${value} · țintă ${range}` : `${value} · target ${range}` };
    case "drifting":
      return {
        title: ro ? `${plant}: ${label.toLowerCase()} se apropie de limită` : `${plant}: ${label.toLowerCase()} is drifting toward its limit`,
        detail: ro
          ? `${value} acum · la tendința actuală iese din ${range} în ~${params.hours} h`
          : `${value} now · at the current trend it leaves ${range} in ~${params.hours} h`,
      };
    case "survival-limit":
      return {
        title: ro ? `${plant}: ${label.toLowerCase()} periculoasă pentru plantă` : `${plant}: ${label.toLowerCase()} is dangerous for the plant`,
        detail: ro ? `${value} · în afara limitelor de supraviețuire ${range} (FAO EcoCrop)` : `${value} · outside the survival limits of ${range} (FAO EcoCrop)`,
      };
    case "reservoir-low":
      return { title: ro ? "Rezervorul de apă e aproape gol" : "Water reservoir is running low", detail: ro ? `${value}% rămas` : `${value}% remaining` };
    default:
      return { title: alertLike.title ?? "", detail: alertLike.detail ?? "" };
  }
}
