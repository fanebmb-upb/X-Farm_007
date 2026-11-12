"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/components/i18n-provider";
import type { CropLibrary } from "@/lib/crop-source";
import type { CropCategory, CropProfile, PlantSpeciesId, ValueRange } from "@/lib/crops";

const categoryLabels: Record<CropCategory, string> = {
  fruiting: "Fruiting vegetable",
  leafy: "Leafy vegetable",
  root: "Root vegetable",
  herb: "Herb",
  legume: "Legume",
  berry: "Berry",
};

function range(value: ValueRange, unit: string) {
  return `${value.min}–${value.max}${unit}`;
}

export function PlantLibraryView({ onAddPlant }: { onAddPlant: (speciesId: PlantSpeciesId) => void }) {
  const { t, locale } = useI18n();
  const [library, setLibrary] = useState<CropLibrary | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("tomato");

  useEffect(() => {
    let active = true;
    void fetch("/api/crops").then(async (response) => {
      if (!response.ok) throw new Error("crops");
      const result = await response.json() as CropLibrary;
      if (active) setLibrary(result);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (failed) return <section className="full-section library-page"><p className="form-error" role="alert">{t("The plant library could not be loaded. Check your connection and try again.")}</p></section>;
  if (!library) return <section className="full-section library-page"><p className="care-note" role="status">{t("Loading the plant library…")}</p></section>;

  const crops = library.crops.filter((crop) => crop.id !== "custom").sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale));
  if (crops.length === 0) return <section className="full-section library-page"><p className="care-note">{t("No plants are in the library yet.")}</p></section>;
  const crop: CropProfile = crops.find((item) => item.id === selectedId) ?? crops[0];
  const eco = crop.ecocrop;

  return <section className="full-section library-page" aria-labelledby="library-heading">
    <div className="analytics-toolbar">
      <div className="section-heading"><Icon name="leaf" size={19} /><h2 id="library-heading">{t("Plant Library")}</h2></div>
      <span className="muted-count">{library.source === "database" ? t("Loaded from the X_Farm database") : t("Built-in copy (database not reachable)")}</span>
    </div>

    <div className="library-layout">
      <nav className="library-list" aria-label={t("Plants in the library")}>
        {crops.map((item) => <button key={item.id} type="button" className={item.id === crop.id ? "library-item library-item-active" : "library-item"} aria-pressed={item.id === crop.id} onClick={() => setSelectedId(item.id)}><span aria-hidden="true">{item.emoji}</span><span><b>{item.name[locale]}</b><small>{t(categoryLabels[item.category])}</small></span></button>)}
      </nav>

      <article className="library-detail">
        <div className="library-detail-heading">
          <div><h3>{crop.emoji} {crop.name[locale]}</h3><p><i>{crop.scientificName}</i> · {t(categoryLabels[crop.category])}</p></div>
          <Button onClick={() => onAddPlant(crop.id as PlantSpeciesId)}><Icon name="plus" size={17} />{t("Add to my plants")}</Button>
        </div>
        <p className="library-tip">{crop.tip[locale]}</p>

        <h4>{t("How to grow it")}</h4>
        <dl className="library-steps">
          <div><dt>{t("Starting")}</dt><dd>{crop.learn.start[locale]}</dd></div>
          <div><dt>{t("Care")}</dt><dd>{crop.learn.care[locale]}</dd></div>
          <div><dt>{t("Harvest")}</dt><dd>{crop.learn.harvest[locale]}</dd></div>
        </dl>

        <h4>{t("Ideal conditions")}</h4>
        <div className="finance-table-wrap"><table className="finance-table library-table">
          <thead><tr><th scope="col">{t("Indicator")}</th><th scope="col">{t("Ideal range")}</th><th scope="col">{t("Source")}</th></tr></thead>
          <tbody>
            <tr><th scope="row">{t("Air temperature")}</th><td>{range(crop.airTemperature, " °C")}</td><td>{eco ? "FAO EcoCrop" : "X_Farm"}</td></tr>
            {eco && <tr><th scope="row">{t("Survival limits (air)")}</th><td>{range(eco.tempAbsolute, " °C")}</td><td>FAO EcoCrop</td></tr>}
            <tr><th scope="row">{t("Soil pH")}</th><td>{range(crop.soilPh, "")}</td><td>{eco ? "FAO EcoCrop" : "X_Farm"}</td></tr>
            {eco && <tr><th scope="row">{t("Growing cycle")}</th><td>{t("{min}–{max} days", { min: eco.cycleDays.min, max: eco.cycleDays.max })}</td><td>FAO EcoCrop</td></tr>}
            <tr><th scope="row">{t("Soil moisture")}</th><td>{range(crop.soilMoisture, "%")}</td><td>X_Farm</td></tr>
            <tr><th scope="row">{t("Relative humidity")}</th><td>{range(crop.humidity, "%")}</td><td>X_Farm</td></tr>
            <tr><th scope="row">{t("Light intensity")}</th><td>{range(crop.light, " µmol/m²/s")}</td><td>X_Farm</td></tr>
            <tr><th scope="row">{t("Soil temperature")}</th><td>{range(crop.soilTemperature, " °C")}</td><td>X_Farm</td></tr>
            <tr><th scope="row">{t("Soil electrical conductivity")}</th><td>{range(crop.soilEc, " mS/cm")}</td><td>X_Farm</td></tr>
            <tr><th scope="row">{t("Typical watering interval")}</th><td>{t("about every {hours} h", { hours: crop.irrigationBaseHours })}</td><td>X_Farm</td></tr>
          </tbody>
        </table></div>

        <h4>{t("Common problems")}</h4>
        <div className="finance-table-wrap"><table className="finance-table care-table">
          <thead><tr><th scope="col">{t("What you see")}</th><th scope="col">{t("Possible cause")}</th><th scope="col">{t("What to do")}</th></tr></thead>
          <tbody>{crop.symptoms.map((symptom) => <tr key={symptom.sign.en}><th scope="row">{symptom.sign[locale]}</th><td>{symptom.cause[locale]}</td><td>{symptom.action[locale]}</td></tr>)}</tbody>
        </table></div>

        <p className="care-note care-footnote">{t("FAO EcoCrop values come from the FAO EcoCrop database (gaez.fao.org). X_Farm values are general guidance for greenhouse and garden growing; check them against local advice for your variety and soil.")}</p>
      </article>
    </div>
  </section>;
}
