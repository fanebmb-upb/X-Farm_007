import assert from "node:assert/strict";
import test from "node:test";
import { getAssistantContextCharacterCount, parseAssistantRequest } from "../lib/assistant.ts";

const validContext = {
  plants: [{ name: "Tomato A", species: "tomato", stage: "Flowering", growthProgress: 42 }],
  readings: [{ name: "Soil Moisture", value: 28, unit: "%", targetMin: 30, targetMax: 70, status: "watch" }],
  alerts: [{ title: "Low soil moisture", detail: "Soil is below the target range.", tone: "warning" }],
  events: [{ time: "2026-10-30T10:00:00Z", event: "Irrigation", detail: "Virtual irrigation was triggered." }],
};

test("assistant request parser accepts a bounded chat history and farm snapshot", () => {
  const request = parseAssistantRequest({ message: "What should I review?", history: [{ role: "user", content: "Hello" }], context: validContext });
  assert.ok(request);
  assert.equal(request.message, "What should I review?");
  assert.equal(request.context.readings[0].value, 28);
  assert.equal(getAssistantContextCharacterCount(request.context) > 0, true);
});

test("assistant request parser rejects malformed, oversized, and invalid context", () => {
  assert.equal(parseAssistantRequest({ message: "x", history: [], context: validContext }), null);
  assert.equal(parseAssistantRequest({ message: "A valid question", history: Array.from({ length: 13 }, () => ({ role: "user", content: "Hi" })), context: validContext }), null);
  assert.equal(parseAssistantRequest({ message: "A valid question", history: [], context: { ...validContext, readings: [{ ...validContext.readings[0], value: Infinity }] } }), null);
  assert.equal(parseAssistantRequest({ message: "A valid question", history: [], context: { ...validContext, plants: [{ ...validContext.plants[0], growthProgress: 110 }] } }), null);
});
