import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bundledLibrary, parseCropRow } from "../lib/crop-source.ts";
import { cropCatalog } from "../lib/crops.ts";
import { buildCropMigration, CROP_MIGRATION } from "../scripts/generate-crop-migration.ts";

test("the committed crop migration matches lib/crops.ts", () => {
  assert.equal(readFileSync(CROP_MIGRATION, "utf8").replace(/\r\n/g, "\n"), buildCropMigration(), "run: node scripts/generate-crop-migration.ts");
});

test("database rows are accepted only with the full crop shape", () => {
  const tomato = JSON.parse(JSON.stringify(cropCatalog.tomato));
  assert.deepEqual(parseCropRow({ id: "tomato", profile: tomato }), tomato);
  assert.equal(parseCropRow({ id: "tomato", profile: { ...tomato, id: "pepper" } }), null);
  assert.equal(parseCropRow({ id: "unknown", profile: tomato }), null);
  assert.equal(parseCropRow({ id: "tomato", profile: { ...tomato, soilPh: { min: 7, max: 6 } } }), null);
  assert.equal(bundledLibrary().crops.length, 16);
});
