import assert from "node:assert/strict";
import test from "node:test";
import { describeWeatherCode } from "../lib/weather.ts";
import { parseLocale, translate, translateDynamic } from "../lib/i18n/index.ts";
import { ro } from "../lib/i18n/ro.ts";
import { collectKeys, missingKeys } from "../scripts/i18n-keys.ts";

test("every interface string has a Romanian translation", () => {
  assert.deepEqual(missingKeys(), [], "run: node scripts/i18n-keys.ts");
  assert.ok(collectKeys().length > 500);
});

test("Romanian translations keep every placeholder", () => {
  for (const [english, romanian] of Object.entries(ro)) {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(placeholders(romanian), placeholders(english), english);
  }
});

test("translation falls back to English and fills placeholders", () => {
  assert.equal(translate("ro", "Add Plant"), "Adaugă plantă");
  assert.equal(translate("en", "Add Plant"), "Add Plant");
  assert.equal(translate("ro", "{count} plants", { count: 3 }), "3 plante");
  assert.equal(translate("ro", "Not in the dictionary"), "Not in the dictionary");
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("fr"), "ro");
  assert.equal(translate("ro", describeWeatherCode(0)), "Cer senin");
});

test("runtime event text is translated by pattern", () => {
  assert.equal(translateDynamic("ro", "Soil moisture reached 55% · 3 L estimated · simulated"), "Umiditatea solului a ajuns la 55% · ~3 L estimat · simulat");
  assert.equal(translateDynamic("ro", "Tomato growth"), "Creștere Tomato");
  assert.equal(translateDynamic("ro", "Ventilation activated"), "Ventilație pornită");
  assert.equal(translateDynamic("ro", "Grow lights manually deactivated"), "Lămpi de creștere oprite manual");
  assert.equal(translateDynamic("ro", "Grow lights turned on"), "Lămpi de creștere pornite");
  assert.equal(translateDynamic("ro", "An unknown note"), "An unknown note");
  assert.equal(translateDynamic("ro", "2026-11-14, up to 80% chance, 12 mm forecast. Check soil conditions before watering."), "2026-11-14, probabilitate de până la 80%, 12 mm prognozați. Verificați solul înainte de udare.");
  assert.equal(translateDynamic("ro", "2026-11-14: forecast low -2 °C may affect exposed plants."), "2026-11-14: minima prognozată de -2 °C poate afecta plantele neprotejate.");
  assert.equal(translateDynamic("en", "Soil moisture reached 55% · 3 L estimated · simulated"), "Soil moisture reached 55% · 3 L estimated · simulated");
});
