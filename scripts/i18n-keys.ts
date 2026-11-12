// Lists every English interface string that needs a Romanian translation.
// Used by tests/i18n.test.ts; run directly to print missing keys:
//   node scripts/i18n-keys.ts
import { readdirSync, readFileSync } from "node:fs";
import { navigationItems, sensorDefinitions } from "../lib/mock-data.ts";
import { describeWeatherCode } from "../lib/weather.ts";
import { ro } from "../lib/i18n/ro.ts";

const WEATHER_CODES = [0, 1, 2, 3, 45, 51, 56, 61, 66, 71, 80, 85, 95, 96, 4];
const NOT_TRANSLATED = new Set(["X_Farm", "X_Farm V0.1", "Open-Meteo", "FAO EcoCrop", "V0.1"]);

function stringsIn(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].map((match) => match[1].replace(/\\"/g, '"'));
}

export function collectKeys() {
  const keys = new Set<string>();
  const add = (values: string[]) => values.forEach((value) => keys.add(value));
  for (const file of readdirSync("components").filter((name) => name.endsWith(".tsx"))) {
    const source = readFileSync(`components/${file}`, "utf8");
    add(stringsIn(source, /(?<![\w.])t\("((?:[^"\\]|\\.)*)"/g));
    // English tables declared above the first component are translated where they are used.
    const header = source.slice(0, Math.max(0, source.search(/\n(export )?function /)));
    add(stringsIn(header, /"([A-Z][^"\n]*[a-z][^"\n]*)"/g));
  }
  add(stringsIn(readFileSync("components/farm-dashboard.tsx", "utf8"), /(?:day|week|month): "([A-Z]\w+)"/g));
  add(navigationItems.map((item) => item.label));
  add(sensorDefinitions.map((sensor) => sensor.name));
  add(WEATHER_CODES.map(describeWeatherCode));
  add(stringsIn(readFileSync("lib/weather.ts", "utf8"), /title: "([^"]+)"/g));
  add(stringsIn(readFileSync("lib/plant-care.ts", "utf8"), /(?:title|why|checkEvery|ifLow|ifHigh|summary): "([^"]+)"/g));
  for (const file of ["lib/simulation.ts", "lib/finance.ts", "lib/supabase/password.ts", "app/api/assistant/route.ts", "app/api/simulation/sync/route.ts", "app/api/weather/forecast/route.ts", "app/api/weather/locations/route.ts"]) {
    add(stringsIn(readFileSync(file, "utf8"), /(?:Error\(|error: |badRequest\()"([A-Z][^"\n]*)"/g));
  }
  add(["Seedling", "Vegetative", "Flowering", "Fruiting", "Harvest", "Healthy", "Needs attention", "Ventilation", "Grow lights"]);
  return [...keys].filter((key) => !NOT_TRANSLATED.has(key)).sort();
}

export function missingKeys() {
  return collectKeys().filter((key) => !(key in ro));
}

if (process.argv[1]?.endsWith("i18n-keys.ts")) {
  const missing = missingKeys();
  console.log(JSON.stringify(missing, null, 1));
  console.error(`${missing.length} missing of ${collectKeys().length}`);
}
