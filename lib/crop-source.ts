import { cropCatalog, isCropId, type CropProfile } from "./crops.ts";

export type CropLibrary = { source: "database" | "bundled"; crops: CropProfile[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalized(value: unknown) {
  return isRecord(value) && typeof value.ro === "string" && typeof value.en === "string";
}

function isRange(value: unknown) {
  return isRecord(value) && typeof value.min === "number" && typeof value.max === "number" && value.min < value.max;
}

/** Accepts a database row only when it has the full shape the app relies on. */
export function parseCropRow(row: { id: unknown; profile: unknown }): CropProfile | null {
  const profile = row.profile;
  if (!isCropId(row.id) || !isRecord(profile) || profile.id !== row.id) return null;
  if (!isLocalized(profile.name) || !isLocalized(profile.tip) || !isRecord(profile.learn) || !Array.isArray(profile.symptoms)) return null;
  if (!["soilMoisture", "airTemperature", "humidity", "light", "soilTemperature", "soilPh", "soilEc"].every((key) => isRange(profile[key]))) return null;
  return profile as CropProfile;
}

export function bundledLibrary(): CropLibrary {
  return { source: "bundled", crops: Object.values(cropCatalog) };
}
