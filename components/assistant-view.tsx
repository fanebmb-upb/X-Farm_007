"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { AssistantContext, AssistantMessage } from "@/lib/assistant";
import type { FarmAlert, FarmEvent, Plant, SensorReading } from "@/lib/mock-data";
import { useI18n } from "@/components/i18n-provider";

type ChatMessage = AssistantMessage & { id: number };

function apiError(value: unknown) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : "The assistant could not answer. Please try again.";
}

export function createAssistantContext(plants: Plant[], readings: SensorReading[], alerts: FarmAlert[], events: FarmEvent[]): AssistantContext {
  return {
    plants: plants.map(({ name, speciesId, stage, growthProgress }) => ({ name, species: speciesId, stage, growthProgress })),
    readings: readings.map(({ name, value, unit, targetRange, status }) => ({ name, value, unit, targetMin: targetRange.min, targetMax: targetRange.max, status })),
    alerts: alerts.slice(0, 12).map(({ title, detail, tone }) => ({ title, detail, tone })),
    events: events.slice(0, 8).map(({ time, event, detail }) => ({ time, event, detail })),
  };
}

const suggestions = [
  "What should I pay attention to right now?",
  "Explain the soil moisture reading and target range.",
  "What could be causing the current alerts?",
];

export function AssistantView({ plants, readings, alerts, events }: {
  plants: Plant[];
  readings: SensorReading[];
  alerts: FarmAlert[];
  events: FarmEvent[];
}) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    let active = true;
    void fetch("/api/assistant").then(async (response) => {
      if (response.status === 401) {
        if (active) { setSignInRequired(true); setConfigured(false); }
        return;
      }
      const result: unknown = await response.json();
      if (active && typeof result === "object" && result !== null && "configured" in result && typeof result.configured === "boolean") setConfigured(result.configured);
    }).catch(() => { if (active) setConfigured(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (message.length < 2 || sending) return;
    setDraft("");
    setError("");
    const userMessage: ChatMessage = { role: "user", content: message, id: nextId.current++ };
    const priorMessages = messages.slice(-10);
    setMessages((current) => [...current, userMessage]);
    setSending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          locale,
          history: priorMessages.map(({ role, content }) => ({ role, content })),
          context: createAssistantContext(plants, readings, alerts, events),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !("answer" in result) || typeof result.answer !== "string") throw new Error(apiError(result));
      setMessages((current) => [...current, { role: "assistant", content: result.answer as string, id: nextId.current++ }]);
    } catch (reason) {
      setError(reason instanceof Error ? t(reason.message) : t("The assistant could not answer. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return <section className="full-section assistant-page" aria-labelledby="assistant-heading">
    <div className="assistant-header">
      <div><span className="assistant-kicker"><Icon name="sparkles" size={14} /> {t("AI AGRICULTURAL ASSISTANT")}</span><h2 id="assistant-heading">{t("Ask about your growing conditions")}</h2><p>{t("Answers use the current farm snapshot and identify it as simulated data.")}</p></div>
      <div className={`assistant-status${configured === false ? " assistant-status-offline" : ""}`}><span />{configured === null ? t("Checking assistant") : configured ? t("AI assistant ready") : signInRequired ? t("Sign in required") : t("Setup required")}</div>
    </div>

    {signInRequired && <div className="assistant-setup" role="status"><b>{t("Sign in to use the AI assistant.")}</b><p>{t("The rest of the dashboard works without an account.")}</p></div>}

    {configured === false && !signInRequired && <div className="assistant-setup" role="status"><b>{t("Connect an OpenAI API key to enable chat.")}</b><p>{t("Add")} <code>OPENAI_API_KEY</code> {t("to the server environment, then restart the app. The key stays on the server and is never sent to the browser. Provider API usage may incur charges.")}</p></div>}

    <div className="assistant-chat" aria-label={t("Assistant conversation")}>
      <div className="assistant-transcript" ref={scrollRef} aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? <div className="assistant-welcome"><span className="assistant-avatar"><Icon name="sparkles" size={18} /></span><div><b>{t("How can I help with your farm?")}</b><p>{t("I can explain readings, discuss active alerts, or suggest actions for you to review. Readings and events below are simulated.")}</p></div></div> : messages.map(({ role, content, id }) => <article className={`assistant-message assistant-message-${role}`} key={id}><span className="assistant-message-label">{role === "user" ? t("You") : t("X_Farm assistant")}</span><p>{content}</p></article>)}
        {sending && <div className="assistant-thinking" role="status"><span className="assistant-spinner" />{t("Thinking about your farm snapshot…")}</div>}
      </div>
      {error && <p className="assistant-error" role="alert">{error}</p>}
      {messages.length === 0 && configured !== false && <div className="assistant-suggestions" aria-label={t("Suggested questions")}>{suggestions.map((suggestion) => <button type="button" key={suggestion} disabled={configured === null || sending} onClick={() => setDraft(t(suggestion))}>{t(suggestion)}</button>)}</div>}
      <form className="assistant-composer" onSubmit={(event) => void submit(event)}><label className="sr-only" htmlFor="assistant-question">{t("Your question")}</label><textarea id="assistant-question" rows={2} maxLength={1200} placeholder={signInRequired ? t("Sign in to start chatting") : configured === false ? t("Configure the server API key to start chatting") : t("Ask about readings, alerts, or plant care…")} value={draft} disabled={configured !== true || sending} onChange={(event) => setDraft(event.target.value)} /><Button type="submit" disabled={configured !== true || sending || draft.trim().length < 2}><Icon name="sparkles" size={15} />{sending ? t("Sending") : t("Send")}</Button></form>
    </div>

    <p className="assistant-disclaimer">{t("AI explanations may be inaccurate. Simulated readings are facts about this virtual scenario; causal explanations and future outcomes are hypotheses. Review recommendations before taking action. The assistant cannot control virtual actuators.")}</p>
  </section>;
}
