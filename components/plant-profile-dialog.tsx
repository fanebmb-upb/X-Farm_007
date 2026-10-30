"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { speciesProfiles, type GrowthStage, type Plant, type PlantDraft, type PlantSpeciesId, type PlantTargetMetric, type PlantTargets, type Range } from "@/lib/mock-data";

const stageOptions: GrowthStage[] = ["Seedling", "Vegetative", "Flowering", "Fruiting", "Harvest"];
const targetFields: Array<{ metric: PlantTargetMetric; title: string; unit: string; min: number; max: number; step: number }> = [
  { metric: "soil-moisture", title: "Soil moisture", unit: "%", min: 0, max: 100, step: 1 },
  { metric: "air-temperature", title: "Air temperature", unit: "°C", min: -10, max: 60, step: 1 },
  { metric: "humidity", title: "Relative humidity", unit: "%", min: 0, max: 100, step: 1 },
  { metric: "light", title: "Light intensity", unit: "µmol/m²/s", min: 0, max: 1600, step: 10 },
];

export function PlantProfileDialog({ plant, currentDate, onClose, onSave }: { plant: Plant | null; currentDate: string; onClose: () => void; onSave: (draft: PlantDraft) => void }) {
  const [name, setName] = useState(plant?.name ?? "");
  const [speciesId, setSpeciesId] = useState<PlantSpeciesId>(plant?.speciesId ?? "tomato");
  const [scientificName, setScientificName] = useState(plant?.scientificName ?? speciesProfiles.tomato.scientificName);
  const [variety, setVariety] = useState(plant?.variety ?? speciesProfiles.tomato.defaultVariety);
  const [plantingDate, setPlantingDate] = useState(plant?.plantingDate ?? currentDate.slice(0, 10));
  const [stage, setStage] = useState<GrowthStage>(plant?.stage ?? "Seedling");
  const [irrigationIntervalHours, setIrrigationIntervalHours] = useState(plant?.irrigationIntervalHours ?? speciesProfiles.tomato.irrigationIntervalHours);
  const [targets, setTargets] = useState<PlantTargets>(() => structuredClone(plant?.targetConditions ?? speciesProfiles.tomato.targets));
  const [error, setError] = useState("");

  function changeSpecies(value: PlantSpeciesId) {
    const profile = speciesProfiles[value];
    setSpeciesId(value);
    setScientificName(profile.scientificName);
    setVariety(profile.defaultVariety);
    setIrrigationIntervalHours(profile.irrigationIntervalHours);
    setTargets(structuredClone(profile.targets));
    if (!name.trim() || Object.values(speciesProfiles).some((item) => item.name === name)) setName(profile.name);
  }

  function updateTarget(metric: PlantTargetMetric, side: keyof Range, value: number) {
    setTargets((current) => ({ ...current, [metric]: { ...current[metric], [side]: value } }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      onSave({ id: plant?.id, name, speciesId, scientificName, variety, plantingDate, stage, irrigationIntervalHours, targetConditions: targets });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this plant profile.");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="plant-modal plant-profile-modal" role="dialog" aria-modal="true" aria-labelledby="plant-profile-heading">
        <div className="modal-heading"><div><span className="modal-kicker">{plant ? "Plant profile" : "New virtual plant"}</span><h2 id="plant-profile-heading">{plant ? "Edit plant" : "Add a plant"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" size={19} /></button></div>
        {plant && <div className="profile-progress"><div><span>Estimated growth</span><strong>{plant.growthProgress.toFixed(0)}%</strong></div><div className="progress-track"><span style={{ width: `${plant.growthProgress}%` }} /></div></div>}
        <form onSubmit={submit}>
          <div className="plant-form-grid">
            <label className="form-field">Plant name<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cherry tomato" /></label>
            <label className="form-field">Species<select value={speciesId} onChange={(event) => changeSpecies(event.target.value as PlantSpeciesId)}>{Object.entries(speciesProfiles).map(([id, profile]) => <option key={id} value={id}>{profile.name}</option>)}</select></label>
            <label className="form-field">Variety<input maxLength={80} value={variety} onChange={(event) => setVariety(event.target.value)} placeholder="e.g. Roma" /></label>
            <label className="form-field">Scientific name<input value={scientificName} onChange={(event) => setScientificName(event.target.value)} /></label>
            <label className="form-field">Planting date<input type="date" required max={currentDate.slice(0, 10)} value={plantingDate} onChange={(event) => setPlantingDate(event.target.value)} /></label>
            <label className="form-field">Growth stage<select value={stage} onChange={(event) => setStage(event.target.value as GrowthStage)}>{stageOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="form-field">Irrigation interval<input type="number" min="1" max="168" required value={irrigationIntervalHours} onChange={(event) => setIrrigationIntervalHours(Number(event.target.value))} /><span className="field-hint">Hours between expected watering</span></label>
          </div>
          <fieldset className="targets-fieldset"><legend>Preferred growing conditions</legend><div className="target-editor-grid">{targetFields.map((field) => <div className="target-editor" key={field.metric}><span>{field.title}</span><div className="target-range-fields"><label><span className="sr-only">{field.title} minimum</span><input type="number" min={field.min} max={field.max} step={field.step} value={targets[field.metric].min} onChange={(event) => updateTarget(field.metric, "min", Number(event.target.value))} /></label><small>to</small><label><span className="sr-only">{field.title} maximum</span><input type="number" min={field.min} max={field.max} step={field.step} value={targets[field.metric].max} onChange={(event) => updateTarget(field.metric, "max", Number(event.target.value))} /></label><em>{field.unit}</em></div></div>)}</div></fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit"><Icon name="check" size={17} />{plant ? "Save profile" : "Create plant"}</Button></div>
        </form>
      </section>
    </div>
  );
}
