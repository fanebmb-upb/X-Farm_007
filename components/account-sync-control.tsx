"use client";

import { useEffect, useState } from "react";
import type { SimulationState } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseSimulationState } from "@/lib/simulation";

type SyncStatus = "checking" | "signed-out" | "ready" | "pending" | "saved" | "error" | "unconfigured";

export function AccountSyncControl({ simulation, onLoad }: { simulation: SimulationState; onLoad: (simulation: SimulationState) => void }) {
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
        body: JSON.stringify({ currentTime: simulation.currentTime, plants: simulation.plants, readings: simulation.readings }),
      });
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !("savedPlants" in result) || typeof result.savedPlants !== "number" || !Number.isSafeInteger(result.savedPlants) || !("savedReadings" in result) || typeof result.savedReadings !== "number" || !Number.isSafeInteger(result.savedReadings)) {
        const error = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "The current simulation could not be saved.";
        throw new Error(error);
      }
      setMessage(`${result.savedPlants} plants and ${result.savedReadings} current readings saved to your account.`);
      setStatus("saved");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not save the current simulation.");
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
      if (!response.ok || !remote) {
        const error = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "The saved account snapshot could not be loaded.";
        throw new Error(error);
      }
      onLoad(remote);
      setMessage(`${remote.plants.length} plants and ${remote.readings.length} latest readings loaded from your account.`);
      setStatus("saved");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not load the account snapshot.");
      setStatus("error");
    }
  }

  return <div className="account-sync-control">
    {status === "unconfigured" ? <p>Connect a Supabase project to save plant profiles and readings to an account.</p> : status === "signed-out" ? <p><a href="/login">Sign in</a> to save this simulation to your account.</p> : <>
      <p>Save plant profiles and the current simulated readings to your authenticated farm.</p>
      <div className="account-sync-actions"><button className="secondary-button" type="button" disabled={status === "checking" || status === "pending"} onClick={sync}>{status === "checking" ? "Checking account…" : status === "pending" ? "Saving…" : "Save current snapshot"}</button><button className="secondary-button" type="button" disabled={status === "checking" || status === "pending"} onClick={load}>{status === "pending" ? "Working…" : "Load account snapshot"}</button></div>
      {message && <p className={status === "error" ? "account-sync-error" : "account-sync-success"} role={status === "error" ? "alert" : "status"}>{message}</p>}
    </>}
  </div>;
}
