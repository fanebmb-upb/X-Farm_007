import assert from "node:assert/strict";
import test from "node:test";
import { isPublicRoute, parseEmailOtpType, safeNextPath } from "../lib/supabase/auth-redirect.ts";

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

test("isPublicRoute opens the demo dashboard but keeps sync and the assistant private", () => {
  for (const path of ["/", "/login", "/auth/confirm", "/auth/callback", "/api/weather/forecast"]) assert.equal(isPublicRoute(path), true, path);
  for (const path of ["/api/assistant", "/api/simulation/sync", "/settings", "/loginx"]) assert.equal(isPublicRoute(path), false, path);
});
