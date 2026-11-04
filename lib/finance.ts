import type { DailyResourceLog, Plant, PlantSpeciesId } from "./mock-data";

export const financeCurrencies = ["RON", "EUR", "USD"] as const;
export type FinanceCurrency = (typeof financeCurrencies)[number];
export type SpeciesEconomics = { yieldKgPerCycle: number; cycleDays: number; pricePerKg: number };
export type FinanceSettings = {
  currency: FinanceCurrency;
  energyPricePerKwh: number;
  waterPricePerLiter: number;
  otherCostsPerMonth: number;
  species: Record<PlantSpeciesId, SpeciesEconomics>;
};

export type FinancePreset = "day" | "week" | "month" | "year" | "custom";
export type FinancePeriod = { from: string; to: string };

export type FinanceSummary = {
  days: number;
  activeDays: number;
  recordedDays: number;
  projectedDays: number;
  waterLiters: number;
  energyKwh: number;
  costs: { energy: number; water: number; other: number; total: number };
  production: Array<{ plantId: string; name: string; speciesId: PlantSpeciesId; kilograms: number; revenue: number }>;
  totalKilograms: number;
  revenue: number;
  profit: number;
};

export const FINANCE_STORAGE_KEY = "x-farm-finance-v1";
export const MAX_FINANCE_DAYS = 3660;
const DAY_MS = 86_400_000;
const DAYS_PER_MONTH = 30;
const MAX_LOG_DAYS = 800;
const presetDays: Record<Exclude<FinancePreset, "custom">, number> = { day: 1, week: 7, month: DAYS_PER_MONTH, year: 365 };

// Illustrative starting values: every one of them can be edited in the app.
export const defaultFinanceSettings: FinanceSettings = {
  currency: "RON",
  energyPricePerKwh: 1.3,
  waterPricePerLiter: 0.012,
  otherCostsPerMonth: 0,
  species: {
    tomato: { yieldKgPerCycle: 5, cycleDays: 120, pricePerKg: 12 },
    basil: { yieldKgPerCycle: 0.5, cycleDays: 60, pricePerKg: 40 },
    pepper: { yieldKgPerCycle: 3, cycleDays: 120, pricePerKg: 15 },
    custom: { yieldKgPerCycle: 1, cycleDays: 90, pricePerKg: 10 },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function dayNumber(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

function isoDate(day: number) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function parseFinanceSettings(raw: string | null): FinanceSettings {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!isRecord(value) || !financeCurrencies.includes(value.currency as FinanceCurrency) || !nonNegative(value.energyPricePerKwh) || !nonNegative(value.waterPricePerLiter) || !nonNegative(value.otherCostsPerMonth) || !isRecord(value.species)) return structuredClone(defaultFinanceSettings);
    const species = structuredClone(defaultFinanceSettings.species);
    for (const id of Object.keys(species) as PlantSpeciesId[]) {
      const item = value.species[id];
      if (isRecord(item) && nonNegative(item.yieldKgPerCycle) && nonNegative(item.pricePerKg) && nonNegative(item.cycleDays) && item.cycleDays >= 1) species[id] = { yieldKgPerCycle: item.yieldKgPerCycle, cycleDays: item.cycleDays, pricePerKg: item.pricePerKg };
    }
    return { currency: value.currency as FinanceCurrency, energyPricePerKwh: value.energyPricePerKwh, waterPricePerLiter: value.waterPricePerLiter, otherCostsPerMonth: value.otherCostsPerMonth, species };
  } catch {
    return structuredClone(defaultFinanceSettings);
  }
}

/** Adds resource use to a simulated day, keeping the log to a bounded size for browser storage. */
export function recordDailyResources(log: DailyResourceLog | undefined, timestamp: string, usage: { hours?: number; waterLiters?: number; energyKwh?: number }): DailyResourceLog {
  const date = timestamp.slice(0, 10);
  const day = log?.[date] ?? { hours: 0, waterLiters: 0, energyKwh: 0 };
  const next: DailyResourceLog = { ...log, [date]: {
    hours: day.hours + (usage.hours ?? 0),
    waterLiters: Math.round((day.waterLiters + (usage.waterLiters ?? 0)) * 100) / 100,
    energyKwh: Math.round((day.energyKwh + (usage.energyKwh ?? 0)) * 1000) / 1000,
  } };
  const dates = Object.keys(next);
  if (dates.length > MAX_LOG_DAYS) for (const old of dates.sort().slice(0, dates.length - MAX_LOG_DAYS)) delete next[old];
  return next;
}

export function parseDailyResourceLog(value: unknown): DailyResourceLog {
  if (!isRecord(value)) return {};
  const log: DailyResourceLog = {};
  for (const [date, day] of Object.entries(value).slice(-MAX_LOG_DAYS)) {
    if (isIsoDate(date) && isRecord(day) && nonNegative(day.hours) && nonNegative(day.waterLiters) && nonNegative(day.energyKwh)) log[date] = { hours: day.hours, waterLiters: day.waterLiters, energyKwh: day.energyKwh };
  }
  return log;
}

/** A preset period ends on the simulated current day and includes it. */
export function periodForPreset(preset: Exclude<FinancePreset, "custom">, currentDate: string): FinancePeriod {
  return { from: isoDate(dayNumber(currentDate) - presetDays[preset] + 1), to: currentDate };
}

export function financePeriodProblem({ from, to }: FinancePeriod) {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Choose both a start and an end date.";
  if (from > to) return "The start date must be on or before the end date.";
  if (dayNumber(to) - dayNumber(from) + 1 > MAX_FINANCE_DAYS) return "Choose a period of 10 years or less.";
  return null;
}

/**
 * Days with simulation history use their recorded usage. Remaining days, including
 * future ones, are projected from the average rate across all recorded hours.
 * Projected usage and fixed costs start at the first planting, when the farm exists.
 * Production spreads each species' yield evenly over its cycle from the planting date.
 */
export function calculateFinance(period: FinancePeriod, log: DailyResourceLog | undefined, plants: Plant[], settings: FinanceSettings): FinanceSummary {
  const days = dayNumber(period.to) - dayNumber(period.from) + 1;
  const entries = Object.entries(log ?? {});
  const sum = (items: typeof entries) => items.reduce((total, [, day]) => ({ hours: total.hours + day.hours, water: total.water + day.waterLiters, energy: total.energy + day.energyKwh }), { hours: 0, water: 0, energy: 0 });
  const totals = sum(entries);
  const recorded = sum(entries.filter(([date]) => date >= period.from && date <= period.to));
  const recordedDays = Math.min(days, recorded.hours / 24);
  const firstPlanting = plants.length ? Math.min(...plants.map((plant) => dayNumber(plant.plantingDate))) : null;
  const activeDays = firstPlanting === null ? 0 : Math.max(0, dayNumber(period.to) - Math.max(dayNumber(period.from), firstPlanting) + 1);
  const projectedDays = totals.hours > 0 ? Math.max(0, activeDays - recordedDays) : 0;
  const waterLiters = recorded.water + (totals.hours > 0 ? totals.water / totals.hours * 24 * projectedDays : 0);
  const energyKwh = recorded.energy + (totals.hours > 0 ? totals.energy / totals.hours * 24 * projectedDays : 0);

  const production = plants.map((plant) => {
    const economics = settings.species[plant.speciesId];
    const activeDays = Math.max(0, dayNumber(period.to) - Math.max(dayNumber(period.from), dayNumber(plant.plantingDate)) + 1);
    const kilograms = economics.yieldKgPerCycle / Math.max(1, economics.cycleDays) * activeDays;
    return { plantId: plant.id, name: plant.name, speciesId: plant.speciesId, kilograms, revenue: kilograms * economics.pricePerKg };
  });
  const revenue = production.reduce((total, item) => total + item.revenue, 0);
  const energy = energyKwh * settings.energyPricePerKwh;
  const water = waterLiters * settings.waterPricePerLiter;
  const other = settings.otherCostsPerMonth / DAYS_PER_MONTH * activeDays;
  const total = energy + water + other;
  return { days, activeDays, recordedDays, projectedDays, waterLiters, energyKwh, costs: { energy, water, other, total }, production, totalKilograms: production.reduce((kilograms, item) => kilograms + item.kilograms, 0), revenue, profit: revenue - total };
}
