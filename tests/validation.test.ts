import assert from "node:assert/strict";
import test from "node:test";
import { cleanFreeText, cleanText, isSafeLabel, isValidEmail } from "../lib/validation.ts";

test("safe labels accept real plant, variety, and place names", () => {
  for (const name of ["Roșie cherry", "Inimă de bou", "Solanum lycopersicum", "Fragaria × ananassa", "Ardei kapia #2", "São Paulo", "Bell pepper (red)", "O’Neill"]) {
    assert.equal(isSafeLabel(name, { min: 1, max: 80 }), true, name);
  }
});

test("safe labels reject markup, script, and SQL-like input", () => {
  for (const attack of ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "tomato\"; DROP TABLE plants;--", "{{constructor}}", "a=`b`", "x\\y", "[link](javascript:alert(1))"]) {
    assert.equal(isSafeLabel(attack, { min: 1, max: 200 }), false, attack);
  }
});

test("labels enforce length after cleaning", () => {
  assert.equal(isSafeLabel("   ", { min: 1, max: 10 }), false);
  assert.equal(isSafeLabel("x".repeat(11), { max: 10 }), false);
  assert.equal(cleanText("  Roșie​  de\n\tgrădină  "), "Roșie de grădină");
});

test("emails are checked for shape and length", () => {
  assert.equal(isValidEmail("farmer@example.ro"), true);
  for (const bad of ["no-at-sign", "a@b", "<x>@evil.com", "a@b.c", `${"a".repeat(250)}@example.com`]) assert.equal(isValidEmail(bad), false, bad);
});

test("free text keeps punctuation but drops control characters", () => {
  assert.equal(cleanFreeText("Is <25 °C ok?\u0000", 100), "Is <25 °C ok?");
  assert.equal(cleanFreeText("abcdef", 3), "abc");
});
