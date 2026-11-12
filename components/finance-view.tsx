"use client";

import { useEffect, useState } from "react";
import { createAssistantContext } from "@/components/assistant-view";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { NumberInput } from "@/components/ui/number-input";
import type { AssistantFinance } from "@/lib/assistant";
import { calculateFinance, financeCurrencies, financePeriodProblem, FINANCE_STORAGE_KEY, parseFinanceSettings, periodForPreset, type FinanceCurrency, type FinancePreset, type FinanceSettings, type FinanceSummary, type SpeciesEconomics } from "@/lib/finance";
import { cropCatalog } from "@/lib/crops";
import { type FarmAlert, type PlantSpeciesId, type SimulationState } from "@/lib/mock-data";
import { useI18n } from "@/components/i18n-provider";

type AiStatus = "checking" | "ready" | "setup" | "sign-in";

const presets: Array<{ id: FinancePreset; label: string }> = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "custom", label: "Custom" },
];

const ANALYSIS_REQUEST = "Analyse my estimated spending, production, and potential profit for the period in the finance summary. Name the largest cost, say whether the period looks profitable, and suggest up to three practical ways to improve the result.";

function loadSettings() {
  try {
    return parseFinanceSettings(window.localStorage.getItem(FINANCE_STORAGE_KEY));
  } catch {
    return parseFinanceSettings(null);
  }
}

function roundTo(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function toAssistantFinance(summary: FinanceSummary, from: string, to: string, currency: FinanceCurrency): AssistantFinance {
  return {
    period: { from, to, days: summary.days },
    currency,
    recordedDays: roundTo(summary.recordedDays),
    projectedDays: roundTo(summary.projectedDays),
    waterLiters: roundTo(summary.waterLiters),
    energyKwh: roundTo(summary.energyKwh),
    costs: { energy: roundTo(summary.costs.energy), water: roundTo(summary.costs.water), other: roundTo(summary.costs.other), total: roundTo(summary.costs.total) },
    production: summary.production.slice(0, 30).map(({ name, kilograms, revenue }) => ({ name, kilograms: roundTo(kilograms, 3), revenue: roundTo(revenue) })),
    totalKilograms: roundTo(summary.totalKilograms, 3),
    revenue: roundTo(summary.revenue),
    profit: roundTo(summary.profit),
  };
}

export function FinanceView({ simulation, alerts }: { simulation: SimulationState; alerts: FarmAlert[] }) {
  const { t, locale } = useI18n();
  const currentDate = simulation.currentTime.slice(0, 10);
  const [preset, setPreset] = useState<FinancePreset>("month");
  const [custom, setCustom] = useState(() => periodForPreset("month", currentDate));
  const [settings, setSettings] = useState<FinanceSettings>(loadSettings);
  const [aiStatus, setAiStatus] = useState<AiStatus>("checking");
  const [analysis, setAnalysis] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage can be blocked; the figures still work for this visit.
    }
  }, [settings]);

  useEffect(() => {
    let active = true;
    void fetch("/api/assistant").then(async (response) => {
      if (!active) return;
      if (response.status === 401) { setAiStatus("sign-in"); return; }
      const result: unknown = await response.json();
      if (active) setAiStatus(typeof result === "object" && result !== null && "configured" in result && result.configured === true ? "ready" : "setup");
    }).catch(() => { if (active) setAiStatus("setup"); });
    return () => { active = false; };
  }, []);

  const period = preset === "custom" ? custom : periodForPreset(preset, currentDate);
  const periodProblem = financePeriodProblem(period);
  const summary = periodProblem ? null : calculateFinance(period, simulation.dailyResources, simulation.plants, settings);
  const usedSpecies = [...new Set(simulation.plants.map((plant) => plant.speciesId))];
  const money = new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { style: "currency", currency: settings.currency });

  function clearAnalysis() {
    setAnalysis("");
    setAnalysisError("");
  }

  function updateSettings(change: Partial<FinanceSettings>) {
    setSettings((current) => ({ ...current, ...change }));
    clearAnalysis();
  }

  function updateSpecies(id: PlantSpeciesId, change: Partial<SpeciesEconomics>) {
    setSettings((current) => ({ ...current, species: { ...current.species, [id]: { ...current.species[id], ...change } } }));
    clearAnalysis();
  }

  async function analyse() {
    if (!summary || analysing) return;
    setAnalysing(true);
    clearAnalysis();
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: t(ANALYSIS_REQUEST),
          locale,
          history: [],
          context: { ...createAssistantContext(simulation.plants, simulation.readings, alerts, simulation.events), finance: toAssistantFinance(summary, period.from, period.to, settings.currency) },
        }),
      });
      const result: unknown = await response.json();
      if (typeof result === "object" && result !== null && "answer" in result && typeof result.answer === "string") setAnalysis(result.answer);
      else setAnalysisError(typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : t("The analysis could not be generated. Please try again."));
    } catch {
      setAnalysisError(t("The analysis could not be generated. Check your connection and try again."));
    } finally {
      setAnalysing(false);
    }
  }

  return <section className="full-section finance-page" aria-labelledby="finance-heading">
    <div className="analytics-toolbar">
      <div className="section-heading"><Icon name="coins" size={19} /><h2 id="finance-heading">{t("Spending, Production & Profit")}</h2></div>
      <div className="period-switch" role="group" aria-label={t("Timeframe")}>
        {presets.map((item) => <button key={item.id} type="button" className={preset === item.id ? "period-active" : undefined} aria-pressed={preset === item.id} onClick={() => { setPreset(item.id); clearAnalysis(); }}>{t(item.label)}</button>)}
      </div>
    </div>

    {preset === "custom" && <div className="finance-dates">
      <label className="form-field">{t("From")}<input type="date" value={custom.from} onChange={(event) => { setCustom((current) => ({ ...current, from: event.target.value })); clearAnalysis(); }} /></label>
      <label className="form-field">{t("To")}<input type="date" value={custom.to} onChange={(event) => { setCustom((current) => ({ ...current, to: event.target.value })); clearAnalysis(); }} /></label>
    </div>}

    {periodProblem || !summary ? <p className="form-error" role="alert">{periodProblem}</p> : <>
      <p className="finance-note">{t(summary.days === 1 ? "{start} to {end} · 1 day · {recorded} recorded, {projected} projected from the average so far." : "{start} to {end} · {days} days · {recorded} recorded, {projected} projected from the average so far.", { start: period.from, end: period.to, days: summary.days, recorded: summary.recordedDays.toFixed(1), projected: summary.projectedDays.toFixed(1) })}{summary.activeDays < summary.days ? t(" Costs are only counted from the first planting ({days} of these days).", { days: summary.activeDays }) : ""} {t("All figures are estimates from a simulation and the assumptions below, not real results.")}</p>
      {simulation.dailyResources === undefined || Object.keys(simulation.dailyResources).length === 0 ? <p className="finance-note finance-note-strong">{t("No usage is recorded yet, so energy and water show as zero. Start the simulation to record it.")}</p> : null}

      <div className="automation-summary">
        <div><span>{t("Total spending")}</span><strong>{money.format(summary.costs.total)}</strong></div>
        <div><span>{t("Estimated products")}</span><strong>{summary.totalKilograms.toFixed(2)} kg</strong></div>
        <div><span>{t("Potential revenue")}</span><strong>{money.format(summary.revenue)}</strong></div>
        <div><span>{t("Potential profit")}</span><strong className={summary.profit < 0 ? "finance-loss" : undefined}>{money.format(summary.profit)}</strong></div>
      </div>

      <div className="finance-grid">
        <div className="finance-table-wrap"><h3>{t("Spending")}</h3><table className="finance-table">
          <thead><tr><th scope="col">{t("Item")}</th><th scope="col">{t("Usage")}</th><th scope="col">{t("Cost")}</th></tr></thead>
          <tbody>
            <tr><th scope="row">{t("Energy")}</th><td>{summary.energyKwh.toFixed(2)} kWh</td><td>{money.format(summary.costs.energy)}</td></tr>
            <tr><th scope="row">{t("Water")}</th><td>{summary.waterLiters.toFixed(1)} L</td><td>{money.format(summary.costs.water)}</td></tr>
            <tr><th scope="row">{t("Other costs")}</th><td>—</td><td>{money.format(summary.costs.other)}</td></tr>
          </tbody>
        </table></div>
        <div className="finance-table-wrap"><h3>{t("Products")}</h3>{summary.production.length === 0 ? <p className="finance-note">{t("Add a plant to estimate production.")}</p> : <table className="finance-table">
          <thead><tr><th scope="col">{t("Plant")}</th><th scope="col">{t("Amount")}</th><th scope="col">{t("Value")}</th></tr></thead>
          <tbody>{summary.production.map((item) => <tr key={item.plantId}><th scope="row">{item.name}</th><td>{item.kilograms.toFixed(2)} kg</td><td>{money.format(item.revenue)}</td></tr>)}</tbody>
        </table>}</div>
      </div>

      <div className="finance-ai">
        <div className="panel-heading"><div className="section-heading"><Icon name="sparkles" size={17} /><h3>{t("AI analysis")}</h3></div>{aiStatus === "ready" && <Button onClick={() => void analyse()} disabled={analysing}>{analysing ? t("Analysing…") : t("Analyse with AI")}</Button>}</div>
        {aiStatus === "sign-in" && <p className="finance-note">{t("Sign in to use the AI analysis. The figures above work without an account.")}</p>}
        {aiStatus === "setup" && <p className="finance-note">{t("The AI analysis isn’t connected yet because the server has no AI API key. The figures above work without it.")}</p>}
        {analysisError && <p className="form-error" role="alert">{analysisError}</p>}
        {analysis ? <p className="finance-analysis">{analysis}</p> : aiStatus === "ready" && !analysing && !analysisError ? <p className="finance-note">{t("Get a written review of these figures for the selected period. The AI explains the numbers; it doesn’t change them.")}</p> : null}
      </div>
    </>}

    <fieldset className="targets-fieldset finance-assumptions"><legend>{t("Your assumptions")}</legend>
      <div className="finance-inputs">
        <label className="form-field">{t("Currency")}<select value={settings.currency} onChange={(event) => updateSettings({ currency: event.target.value as FinanceCurrency })}>{financeCurrencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
        <label className="form-field">{t("Electricity price per kWh")}<NumberInput min="0" step="any" value={settings.energyPricePerKwh} onValueChange={(value) => { if (value >= 0) updateSettings({ energyPricePerKwh: value }); }} /></label>
        <label className="form-field">{t("Water price per litre")}<NumberInput min="0" step="any" value={settings.waterPricePerLiter} onValueChange={(value) => { if (value >= 0) updateSettings({ waterPricePerLiter: value }); }} /></label>
        <label className="form-field">{t("Other costs per month")}<NumberInput min="0" step="any" value={settings.otherCostsPerMonth} onValueChange={(value) => { if (value >= 0) updateSettings({ otherCostsPerMonth: value }); }} /></label>
      </div>
      {usedSpecies.map((id) => <div className="finance-inputs" key={id}>
        <strong className="finance-species">{cropCatalog[id].name[locale]}</strong>
        <label className="form-field">{t("Yield per plant per cycle (kg)")}<NumberInput min="0" step="any" value={settings.species[id].yieldKgPerCycle} onValueChange={(value) => { if (value >= 0) updateSpecies(id, { yieldKgPerCycle: value }); }} /></label>
        <label className="form-field">{t("Cycle length (days)")}<NumberInput min="1" step="1" value={settings.species[id].cycleDays} onValueChange={(value) => { if (value >= 1) updateSpecies(id, { cycleDays: value }); }} /></label>
        <label className="form-field">{t("Selling price per kg")}<NumberInput min="0" step="any" value={settings.species[id].pricePerKg} onValueChange={(value) => { if (value >= 0) updateSpecies(id, { pricePerKg: value }); }} /></label>
      </div>)}
      <p className="finance-note">{t("The starting values are examples, so replace them with your own prices and yields. They’re saved in this browser, and changing the currency only changes the label, not the amounts.")}</p>
    </fieldset>
  </section>;
}
