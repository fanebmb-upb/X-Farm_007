"use client";

import { useEffect, useState } from "react";
import type { SimulationState } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAlerts, parseSimulationState } from "@/lib/simulation";
import { useI18n } from "@/components/i18n-provider";

type SyncStatus = "checking" | "signed-out" | "ready" | "pending" | "saved" | "error" | "unconfigured";

export function AccountSyncControl({ simulation, onLoad }: { simulation: SimulationState; onLoad: (simulation: SimulationState) => void }) {
  const { t } = useI18n();
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<SyncStatus>(configured ? "checking" : "unconfigured");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!configured) return;
    let active = true;
    void Promise.resolve().then(() => createSupabaseBrowserClient().auth.getUser()).then(({ data, error }) => {
      if (!active) return;
      setStatus(!error && data.user ? "ready" : "signed-out");
    }).catch(() => { if (active) setStatus("signed-out"); });
    return () => { active = false; };
  }, [configured]);

  async function sync() {
    setStatus("pending");
    setMessage("");
    try {
      const response = await fetch("/api/simulation/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentTime: simulation.currentTime, plants: simulation.plants, readings: simulation.readings, automation: simulation.automation, events: simulation.events, alerts: getAlerts(simulation) }),
      });
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !("savedPlants" in result) || typeof result.savedPlants !== "number" || !Number.isSafeInteger(result.savedPlants) || !("savedReadings" in result) || typeof result.savedReadings !== "number" || !Number.isSafeInteger(result.savedReadings) || !("savedRules" in result) || typeof result.savedRules !== "number" || !Number.isSafeInteger(result.savedRules) || !("savedEvents" in result) || typeof result.savedEvents !== "number" || !Number.isSafeInteger(result.savedEvents) || !("savedAlerts" in result) || typeof result.savedAlerts !== "number" || !Number.isSafeInteger(result.savedAlerts)) {
        const error = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : t("The current simulation could not be saved.");
        throw new Error(error);
      }
      setMessage(t("{plants} plants, {readings} readings, {rules} rules, {events} events, and {alerts} active alerts saved to your account.", { plants: result.savedPlants, readings: result.savedReadings, rules: result.savedRules, events: result.savedEvents, alerts: result.savedAlerts }));
      setStatus("saved");
    } catch (reason) {
      setMessage(reason instanceof Error ? t(reason.message) : t("Could not save the current simulation."));
      setStatus("error");
    }
  }

  async function load() {
    setStatus("pending");
    setMessage("");
    try {
      const response = await fetch("/api/simulation/sync");
      const result: unknown = await response.json();
      const remote = typeof result === "object" && result !== null && "simulation" in result ? parseSimulationState(JSON.stringify(result.simulation)) : null;
      const activeAlerts = typeof result === "object" && result !== null && "activeAlerts" in result && typeof result.activeAlerts === "number" && Number.isSafeInteger(result.activeAlerts) ? result.activeAlerts : null;
      const automationRules = typeof result === "object" && result !== null && "automationRules" in result && typeof result.automationRules === "number" && Number.isSafeInteger(result.automationRules) ? result.automationRules : null;
      if (!response.ok || !remote || activeAlerts === null || automationRules === null) {
        const error = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : t("The saved account snapshot could not be loaded.");
        throw new Error(error);
      }
      onLoad(remote);
      setMessage(t("{plants} plants, {readings} latest readings, {rules} rules, {events} events, and {alerts} active alerts loaded from your account.", { plants: remote.plants.length, readings: remote.readings.length, rules: automationRules, events: remote.events.length, alerts: activeAlerts }));
      setStatus("saved");
    } catch (reason) {
      setMessage(reason instanceof Error ? t(reason.message) : t("Could not load the account snapshot."));
      setStatus("error");
    }
  }

  return <div className="account-sync-control">
    {status === "unconfigured" ? <p>{t("Connect a Supabase project to save plant profiles and readings to an account.")}</p> : status === "signed-out" ? <p><a href="/login">{t("Sign in")}</a> {t("to save this simulation to your account.")}</p> : <>
      <p>{t("Save plant profiles, simulated readings, automation settings, event history, and active alerts to your authenticated farm.")}</p>
      <div className="account-sync-actions"><button className="secondary-button" type="button" disabled={status === "checking" || status === "pending"} onClick={sync}>{status === "checking" ? t("Checking account…") : status === "pending" ? t("Saving…") : t("Save current snapshot")}</button><button className="secondary-button" type="button" disabled={status === "checking" || status === "pending"} onClick={load}>{status === "pending" ? t("Working…") : t("Load account snapshot")}</button></div>
      {message && <p className={status === "error" ? "account-sync-error" : "account-sync-success"} role={status === "error" ? "alert" : "status"}>{message}</p>}
    </>}
  </div>;
}
