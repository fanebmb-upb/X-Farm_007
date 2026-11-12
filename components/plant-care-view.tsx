"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Plant, SensorReading } from "@/lib/mock-data";
import { buildPlantCareGuide, type CareIndicator, type CareStatus } from "@/lib/plant-care";
import { useI18n } from "@/components/i18n-provider";

const statusLabels: Record<CareStatus, string> = {
  ok: "In range",
  low: "Below target",
  high: "Above target",
  "lights-off": "Lights off",
  "no-reading": "No reading",
};

function IndicatorCard({ indicator }: { indicator: CareIndicator }) {
  const { t } = useI18n();
  const { title, unit, value, range, rangeSource, status, priority, why, checkEvery, ifLow, ifHigh } = indicator;
  const suffix = unit === "pH" ? "" : unit === "%" ? "%" : ` ${unit}`;
  const action = status === "low" ? ifLow : status === "high" ? ifHigh : null;
  return <article className={`care-card${action ? " care-card-alert" : ""}`}>
    <div className="care-card-heading"><h3>{t(title)}</h3><span className={`care-status care-status-${status}`}>{t(statusLabels[status])}</span></div>
    <p className="care-value"><strong>{value === null ? "—" : `${value}${suffix}`}</strong><span>{t("Target {range}", { range: `${range.min}–${range.max}${suffix}` })}</span></p>
    {priority && <p className="care-priority">{t("Priority at this stage")}</p>}
    {action && <p className="care-action"><b>{t("What to do:")}</b> {t(action)}</p>}
    <p>{t(why)}</p>
    <p><b>{t("Check:")}</b> {t(checkEvery)}</p>
    {!action && <details><summary>{t("If it leaves the range")}</summary><p><b>{t("Too low:")}</b> {t(ifLow)}</p><p><b>{t("Too high:")}</b> {t(ifHigh)}</p></details>}
    <p className="care-source">{rangeSource === "profile" ? t("Target from this plant’s profile") : t("Typical range; varies with the growing medium")}</p>
  </article>;
}

export function PlantCareView({ plants, readings, currentTime }: { plants: Plant[]; readings: SensorReading[]; currentTime: string }) {
  const { t, locale } = useI18n();
  const [selectedId, setSelectedId] = useState(plants[0]?.id ?? "");
  const plant = plants.find((item) => item.id === selectedId) ?? plants[0];

  if (!plant) return <section className="full-section care-page"><div className="section-heading"><Icon name="clipboard" size={19} /><h2>{t("Plant Care Guide")}</h2></div><p className="care-note">{t("Add a plant to see which indicators to watch.")}</p></section>;

  const guide = buildPlantCareGuide(plant, readings, currentTime);
  const { watering } = guide;
  return <section className="full-section care-page" aria-labelledby="care-heading">
    <div className="analytics-toolbar">
      <div className="section-heading"><Icon name="clipboard" size={19} /><h2 id="care-heading">{t("Plant Care Guide")}</h2></div>
      <label className="form-field care-plant-select">{t("Plant")}<select value={plant.id} onChange={(event) => setSelectedId(event.target.value)}>{plants.map((item) => <option key={item.id} value={item.id}>{item.name}{item.variety ? ` · ${item.variety}` : ""}</option>)}</select></label>
    </div>

    <div className="automation-summary care-summary">
      <div><span>{t("Growth stage")}</span><strong>{t(plant.stage)}</strong></div>
      <div><span>{t("Estimated growth")}</span><strong>{plant.growthProgress.toFixed(0)}%</strong></div>
      <div><span>{t("Indicators out of range")}</span><strong className={guide.outOfRangeCount ? "care-warning" : undefined}>{guide.outOfRangeCount} of {guide.indicators.length}</strong></div>
      <div><span>{t("Last watered")}</span><strong className={watering.overdue ? "care-warning" : undefined}>{t("{hours} h ago", { hours: watering.hoursSince })}</strong><small>{watering.overdue ? t("Past its {hours} h interval; check the soil", { hours: watering.intervalHours }) : t("Next check in {hours} h", { hours: watering.hoursUntilDue })}</small></div>
    </div>

    <div className="care-focus">
      <h3>{t("Focus at the {stage} stage", { stage: t(plant.stage).toLowerCase() })}</h3>
      <p>{t(guide.stageSummary)}</p>
      <p>{guide.speciesTip[locale]}</p>
    </div>

    <h3 className="care-subheading">{t("Indicators to watch")}</h3>
    <div className="care-grid">{guide.indicators.map((indicator) => <IndicatorCard key={indicator.metric} indicator={indicator} />)}</div>

    <h3 className="care-subheading">{t("Signs to look for on the plant")}</h3>
    <p className="care-note">{t("Sensors can’t see everything, so check the plant itself too. These are possible causes, not a diagnosis.")}</p>
    <div className="finance-table-wrap"><table className="finance-table care-table">
      <thead><tr><th scope="col">{t("What you see")}</th><th scope="col">{t("Possible cause")}</th><th scope="col">{t("What to do")}</th></tr></thead>
      <tbody>{guide.symptoms.map((symptom) => <tr key={symptom.sign.en}><th scope="row">{symptom.sign[locale]}</th><td>{symptom.cause[locale]}</td><td>{symptom.action[locale]}</td></tr>)}</tbody>
    </table></div>

    <p className="care-note care-footnote">{t("Values come from simulated sensors shared across this growing zone. Guidance is general horticultural information, so confirm it against local advice for your variety and growing medium before relying on it.")}</p>
  </section>;
}
