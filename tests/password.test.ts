import assert from "node:assert/strict";
import test from "node:test";
import { newPasswordProblem } from "../lib/supabase/password.ts";

test("newPasswordProblem enforces length and matching confirmation", () => {
  assert.match(newPasswordProblem("short", "short") ?? "", /at least 8/);
  assert.match(newPasswordProblem("x".repeat(129), "x".repeat(129)) ?? "", /at most 128/);
  assert.match(newPasswordProblem("longenough1", "longenough2") ?? "", /don’t match/);
  assert.equal(newPasswordProblem("longenough1", "longenough1"), null);
});
