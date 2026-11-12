"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { NumberInput } from "@/components/ui/number-input";
import { useI18n } from "@/components/i18n-provider";
import { cropCatalog, cropIds } from "@/lib/crops";
import { estimateIrrigationInterval } from "@/lib/irrigation";
import { speciesProfiles, type GrowthStage, type Plant, type PlantDraft, type PlantSpeciesId, type PlantTargetMetric, type PlantTargets, type Range, type SensorReading } from "@/lib/mock-data";

const stageOptions: GrowthStage[] = ["Seedling", "Vegetative", "Flowering", "Fruiting", "Harvest"];
const targetFields: Array<{ metric: PlantTargetMetric; title: string; unit: string; min: number; max: number; step: number }> = [
  { metric: "soil-moisture", title: "Soil moisture", unit: "%", min: 0, max: 100, step: 1 },
  { metric: "air-temperature", title: "Air temperature", unit: "°C", min: -10, max: 60, step: 1 },
  { metric: "humidity", title: "Relative humidity", unit: "%", min: 0, max: 100, step: 1 },
  { metric: "light", title: "Light intensity", unit: "µmol/m²/s", min: 0, max: 1600, step: 10 },
];

export function PlantProfileDialog({ plant, initialSpeciesId = "tomato", currentDate, readings, onClose, onSave }: { plant: Plant | null; initialSpeciesId?: PlantSpeciesId; currentDate: string; readings: SensorReading[]; onClose: () => void; onSave: (draft: PlantDraft) => void }) {
  const { t, locale } = useI18n();
  const [speciesId, setSpeciesId] = useState<PlantSpeciesId>(plant?.speciesId ?? initialSpeciesId);
  const [name, setName] = useState(plant?.name ?? cropCatalog[initialSpeciesId].name[locale]);
  const [scientificName, setScientificName] = useState(plant?.scientificName ?? cropCatalog[initialSpeciesId].scientificName);
  const [variety, setVariety] = useState(plant?.variety ?? "");
  const [plantingDate, setPlantingDate] = useState(plant?.plantingDate ?? currentDate.slice(0, 10));
  const [stage, setStage] = useState<GrowthStage>(plant?.stage ?? "Seedling");
  const [irrigationMode, setIrrigationMode] = useState<"auto" | "manual">(plant?.irrigationMode === "manual" ? "manual" : "auto");
  const [irrigationIntervalHours, setIrrigationIntervalHours] = useState(plant?.irrigationIntervalHours ?? cropCatalog[initialSpeciesId].irrigationBaseHours);
  const [targets, setTargets] = useState<PlantTargets>(() => structuredClone(plant?.targetConditions ?? speciesProfiles[initialSpeciesId].targets));
  const [error, setError] = useState("");

  const reading = (metric: string) => readings.find((item) => item.metric === metric)?.value ?? null;
  const estimate = estimateIrrigationInterval({ speciesId, stage }, reading("air-temperature"), reading("humidity"));
  const sortedCrops = cropIds.filter((id) => id !== "custom").sort((a, b) => cropCatalog[a].name[locale].localeCompare(cropCatalog[b].name[locale], locale));
  const example = cropCatalog[speciesId].typeExample[locale] || "Cherry";

  function changeSpecies(value: PlantSpeciesId) {
    const crop = cropCatalog[value];
    setSpeciesId(value);
    setScientificName(crop.scientificName);
    setTargets(structuredClone(speciesProfiles[value].targets));
    if (!name.trim() || cropIds.some((id) => cropCatalog[id].name.ro === name || cropCatalog[id].name.en === name)) setName(crop.name[locale]);
  }

  function updateTarget(metric: PlantTargetMetric, side: keyof Range, value: number) {
    setTargets((current) => ({ ...current, [metric]: { ...current[metric], [side]: value } }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const hours = irrigationMode === "manual" ? irrigationIntervalHours : estimate.hours;
      onSave({ id: plant?.id, name, speciesId, scientificName, variety, plantingDate, stage, irrigationMode, irrigationIntervalHours: hours, targetConditions: targets });
    } catch (caught) {
      setError(caught instanceof Error ? t(caught.message) : t("Could not save this plant profile."));
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="plant-modal plant-profile-modal" role="dialog" aria-modal="true" aria-labelledby="plant-profile-heading">
        <div className="modal-heading"><div><span className="modal-kicker">{plant ? t("Plant profile") : t("New virtual plant")}</span><h2 id="plant-profile-heading">{plant ? t("Edit plant") : t("Add a plant")}</h2></div><button className="icon-button" onClick={onClose} aria-label={t("Close dialog")}><Icon name="close" size={19} /></button></div>
        {plant && <div className="profile-progress"><div><span>{t("Estimated growth")}</span><strong>{plant.growthProgress.toFixed(0)}%</strong></div><div className="progress-track"><span style={{ width: `${plant.growthProgress}%` }} /></div></div>}
        <form onSubmit={submit}>
          <div className="plant-form-grid">
            <label className="form-field">{t("Plant name")}<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("e.g. Balcony tomatoes")} /></label>
            <label className="form-field">{t("Species")}<select value={speciesId} onChange={(event) => changeSpecies(event.target.value as PlantSpeciesId)}>{sortedCrops.map((id) => <option key={id} value={id}>{cropCatalog[id].name[locale]}</option>)}<option value="custom">{cropCatalog.custom.name[locale]}</option></select></label>
            <label className="form-field">{t("Type (cultivar)")}<input maxLength={80} value={variety} onChange={(event) => setVariety(event.target.value)} placeholder={t("e.g. {example}", { example })} /><span className="field-hint">{t("The named type you planted, as on the seed packet")}</span></label>
            <label className="form-field">{t("Scientific name")}<input maxLength={150} value={scientificName} onChange={(event) => setScientificName(event.target.value)} /></label>
            <label className="form-field">{t("Planting date")}<input type="date" required max={currentDate.slice(0, 10)} value={plantingDate} onChange={(event) => setPlantingDate(event.target.value)} /></label>
            <label className="form-field">{t("Growth stage")}<select value={stage} onChange={(event) => setStage(event.target.value as GrowthStage)}>{stageOptions.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select></label>
          </div>
          <fieldset className="targets-fieldset irrigation-fieldset"><legend>{t("Watering")}</legend>
            <p className="irrigation-estimate"><strong>{t("Every {hours} h", { hours: irrigationMode === "manual" ? irrigationIntervalHours : estimate.hours })}</strong>{irrigationMode === "auto" ? t("Calculated by X_Farm from the species, growth stage, and current air temperature and humidity. It updates as conditions change.") : t("Your own interval. X_Farm would suggest every {hours} h right now.", { hours: estimate.hours })}</p>
            <label className="rule-enabled"><input type="checkbox" checked={irrigationMode === "manual"} onChange={(event) => { setIrrigationMode(event.target.checked ? "manual" : "auto"); if (event.target.checked) setIrrigationIntervalHours(estimate.hours); }} />{t("Set my own interval (for example, for sandy soil that dries faster)")}</label>
            {irrigationMode === "manual" && <label className="form-field irrigation-manual">{t("Hours between watering")}<NumberInput min="1" max="168" required value={irrigationIntervalHours} onValueChange={setIrrigationIntervalHours} /></label>}
          </fieldset>
          <fieldset className="targets-fieldset"><legend>{t("Preferred growing conditions")}</legend><div className="target-editor-grid">{targetFields.map((field) => <div className="target-editor" key={field.metric}><span>{t(field.title)}</span><div className="target-range-fields"><label><span className="sr-only">{t("{metric} minimum", { metric: t(field.title) })}</span><NumberInput required min={field.min} max={field.max} step={field.step} value={targets[field.metric].min} onValueChange={(value) => updateTarget(field.metric, "min", value)} /></label><small>–</small><label><span className="sr-only">{t("{metric} maximum", { metric: t(field.title) })}</span><NumberInput required min={field.min} max={field.max} step={field.step} value={targets[field.metric].max} onValueChange={(value) => updateTarget(field.metric, "max", value)} /></label><em>{field.unit}</em></div></div>)}</div></fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><Button variant="secondary" onClick={onClose}>{t("Cancel")}</Button><Button type="submit"><Icon name="check" size={17} />{plant ? t("Save profile") : t("Create plant")}</Button></div>
        </form>
      </section>
    </div>
  );
}
