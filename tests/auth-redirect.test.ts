import assert from "node:assert/strict";
import test from "node:test";
import { parseEmailOtpType, safeNextPath } from "../lib/supabase/auth-redirect.ts";

test("safeNextPath keeps same-origin paths and rejects off-site redirects", () => {
  assert.equal(safeNextPath("/plants?id=1"), "/plants?id=1");
  assert.equal(safeNextPath(null), "/");
  assert.equal(safeNextPath("https://evil.example"), "/");
  assert.equal(safeNextPath("//evil.example"), "/");
  assert.equal(safeNextPath("/\\evil.example"), "/");
});

test("parseEmailOtpType accepts Supabase email link types only", () => {
  assert.equal(parseEmailOtpType("email"), "email");
  assert.equal(parseEmailOtpType("recovery"), "recovery");
  assert.equal(parseEmailOtpType("sms"), null);
  assert.equal(parseEmailOtpType(null), null);
});
