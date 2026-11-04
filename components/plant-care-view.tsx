"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Plant, SensorReading } from "@/lib/mock-data";
import { buildPlantCareGuide, type CareIndicator, type CareStatus } from "@/lib/plant-care";

const statusLabels: Record<CareStatus, string> = {
  ok: "In range",
  low: "Below target",
  high: "Above target",
  "lights-off": "Lights off",
  "no-reading": "No reading",
};

function IndicatorCard({ indicator }: { indicator: CareIndicator }) {
  const { title, unit, value, range, rangeSource, status, priority, why, checkEvery, ifLow, ifHigh } = indicator;
  const suffix = unit === "pH" ? "" : unit === "%" ? "%" : ` ${unit}`;
  const action = status === "low" ? ifLow : status === "high" ? ifHigh : null;
  return <article className={`care-card${action ? " care-card-alert" : ""}`}>
    <div className="care-card-heading"><h3>{title}</h3><span className={`care-status care-status-${status}`}>{statusLabels[status]}</span></div>
    <p className="care-value"><strong>{value === null ? "—" : `${value}${suffix}`}</strong><span>Target {range.min}–{range.max}{suffix}</span></p>
    {priority && <p className="care-priority">Priority at this stage</p>}
    {action && <p className="care-action"><b>What to do:</b> {action}</p>}
    <p>{why}</p>
    <p><b>Check:</b> {checkEvery}</p>
    {!action && <details><summary>If it leaves the range</summary><p><b>Too low:</b> {ifLow}</p><p><b>Too high:</b> {ifHigh}</p></details>}
    <p className="care-source">{rangeSource === "profile" ? "Target from this plant’s profile" : "Typical range; varies with the growing medium"}</p>
  </article>;
}

export function PlantCareView({ plants, readings, currentTime }: { plants: Plant[]; readings: SensorReading[]; currentTime: string }) {
  const [selectedId, setSelectedId] = useState(plants[0]?.id ?? "");
  const plant = plants.find((item) => item.id === selectedId) ?? plants[0];

  if (!plant) return <section className="full-section care-page"><div className="section-heading"><Icon name="clipboard" size={19} /><h2>Plant Care Guide</h2></div><p className="care-note">Add a plant to see which indicators to watch.</p></section>;

  const guide = buildPlantCareGuide(plant, readings, currentTime);
  const { watering } = guide;
  return <section className="full-section care-page" aria-labelledby="care-heading">
    <div className="analytics-toolbar">
      <div className="section-heading"><Icon name="clipboard" size={19} /><h2 id="care-heading">Plant Care Guide</h2></div>
      <label className="form-field care-plant-select">Plant<select value={plant.id} onChange={(event) => setSelectedId(event.target.value)}>{plants.map((item) => <option key={item.id} value={item.id}>{item.name}{item.variety ? ` · ${item.variety}` : ""}</option>)}</select></label>
    </div>

    <div className="automation-summary care-summary">
      <div><span>Growth stage</span><strong>{plant.stage}</strong></div>
      <div><span>Estimated growth</span><strong>{plant.growthProgress.toFixed(0)}%</strong></div>
      <div><span>Indicators out of range</span><strong className={guide.outOfRangeCount ? "care-warning" : undefined}>{guide.outOfRangeCount} of {guide.indicators.length}</strong></div>
      <div><span>Last watered</span><strong className={watering.overdue ? "care-warning" : undefined}>{watering.hoursSince} h ago</strong><small>{watering.overdue ? `Past its ${watering.intervalHours} h interval; check the soil` : `Next check in ${watering.hoursUntilDue} h`}</small></div>
    </div>

    <div className="care-focus">
      <h3>Focus at the {plant.stage.toLowerCase()} stage</h3>
      <p>{guide.stageSummary}</p>
      <p>{guide.speciesTip}</p>
    </div>

    <h3 className="care-subheading">Indicators to watch</h3>
    <div className="care-grid">{guide.indicators.map((indicator) => <IndicatorCard key={indicator.metric} indicator={indicator} />)}</div>

    <h3 className="care-subheading">Signs to look for on the plant</h3>
    <p className="care-note">Sensors can’t see everything, so check the plant itself too. These are possible causes, not a diagnosis.</p>
    <div className="finance-table-wrap"><table className="finance-table care-table">
      <thead><tr><th scope="col">What you see</th><th scope="col">Possible cause</th><th scope="col">What to do</th></tr></thead>
      <tbody>{guide.symptoms.map((symptom) => <tr key={symptom.sign}><th scope="row">{symptom.sign}</th><td>{symptom.cause}</td><td>{symptom.action}</td></tr>)}</tbody>
    </table></div>

    <p className="care-note care-footnote">Values come from simulated sensors shared across this growing zone. Guidance is general horticultural information, so confirm it against local advice for your variety and growing medium before relying on it.</p>
  </section>;
}
