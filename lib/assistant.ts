export type AssistantMessage = { role: "user" | "assistant"; content: string };

export type AssistantContext = {
  plants: Array<{ name: string; species: string; stage: string; growthProgress: number }>;
  readings: Array<{ name: string; value: number; unit: string; targetMin: number; targetMax: number; status: "normal" | "watch" }>;
  alerts: Array<{ title: string; detail: string; tone: "warning" | "info" }>;
  events: Array<{ time: string; event: string; detail: string }>;
};

export type AssistantRequest = { message: string; history: AssistantMessage[]; context: AssistantContext };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength) : null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseContext(value: unknown): AssistantContext | null {
  if (!isRecord(value) || !Array.isArray(value.plants) || value.plants.length > 30
    || !Array.isArray(value.readings) || value.readings.length > 40
    || !Array.isArray(value.alerts) || value.alerts.length > 30
    || !Array.isArray(value.events) || value.events.length > 30) return null;

  const plants = value.plants.map((item) => {
    if (!isRecord(item)) return null;
    const name = cleanText(item.name, 80);
    const species = cleanText(item.species, 80);
    const stage = cleanText(item.stage, 40);
    if (!name || !species || !stage || !finite(item.growthProgress) || item.growthProgress < 0 || item.growthProgress > 100) return null;
    return { name, species, stage, growthProgress: item.growthProgress };
  });
  const readings = value.readings.map((item) => {
    if (!isRecord(item)) return null;
    const name = cleanText(item.name, 80);
    const unit = cleanText(item.unit, 30);
    if (!name || !unit || !finite(item.value) || !finite(item.targetMin) || !finite(item.targetMax)
      || item.targetMin > item.targetMax || (item.status !== "normal" && item.status !== "watch")) return null;
    return { name, value: item.value, unit, targetMin: item.targetMin, targetMax: item.targetMax, status: item.status };
  });
  const alerts = value.alerts.map((item) => {
    if (!isRecord(item)) return null;
    const title = cleanText(item.title, 100);
    const detail = cleanText(item.detail, 240);
    if (!title || !detail || (item.tone !== "warning" && item.tone !== "info")) return null;
    return { title, detail, tone: item.tone };
  });
  const events = value.events.map((item) => {
    if (!isRecord(item)) return null;
    const time = cleanText(item.time, 40);
    const event = cleanText(item.event, 100);
    const detail = cleanText(item.detail, 240);
    if (!time || !event || !detail) return null;
    return { time, event, detail };
  });
  if (plants.some((item) => item === null) || readings.some((item) => item === null)
    || alerts.some((item) => item === null) || events.some((item) => item === null)) return null;
  return { plants, readings, alerts, events } as AssistantContext;
}

export function parseAssistantRequest(value: unknown): AssistantRequest | null {
  if (!isRecord(value)) return null;
  const message = cleanText(value.message, 1200);
  if (!message || message.length < 2 || !Array.isArray(value.history) || value.history.length > 12) return null;
  const history = value.history.map((item) => {
    if (!isRecord(item) || (item.role !== "user" && item.role !== "assistant")) return null;
    const content = cleanText(item.content, 1200);
    return content ? { role: item.role, content } as AssistantMessage : null;
  });
  const context = parseContext(value.context);
  if (!context || history.some((item) => item === null)) return null;
  return { message, history: history as AssistantMessage[], context };
}

export function getAssistantContextCharacterCount(context: AssistantContext) {
  return JSON.stringify(context).length;
}
