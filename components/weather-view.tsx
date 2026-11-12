"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { isSafeLabel } from "@/lib/validation";
import { describeWeatherCode, type WeatherForecast, type WeatherLocation } from "@/lib/weather";
import { useI18n } from "@/components/i18n-provider";

type ApiError = { error?: unknown };

function readError(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof (value as ApiError).error === "string"
    ? (value as { error: string }).error
    : fallback;
}

function locationLabel(location: WeatherLocation) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}

function formatDay(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function number(value: number | null, unit: string) {
  return value === null ? "—" : `${Math.round(value)}${unit}`;
}

export function WeatherView() {
  const { t, td, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function searchLocations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    if (!isSafeLabel(search, { min: 2, max: 80 })) {
      setError(t("Enter 2–80 characters using letters, numbers, spaces, and basic punctuation."));
      return;
    }
    setSearching(true);
    setLocations([]);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/weather/locations?q=${encodeURIComponent(search)}&lang=${locale}`);
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !("locations" in result) || !Array.isArray(result.locations)) {
        throw new Error(readError(result, "Location search failed. Please try again."));
      }
      const found = result.locations as WeatherLocation[];
      setLocations(found);
      if (found.length === 0) setNotice(t("No matching locations found. Try adding a region or country."));
    } catch (reason) {
      setError(reason instanceof Error ? t(reason.message) : t("Location search failed. Please try again."));
    } finally {
      setSearching(false);
    }
  }

  async function loadForecast(location: WeatherLocation) {
    setSelectedLocation(location);
    setLocations([]);
    setForecast(null);
    setNotice("");
    setError("");
    setLoadingForecast(true);
    try {
      const params = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude) });
      const response = await fetch(`/api/weather/forecast?${params}`);
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !("forecast" in result)) {
        throw new Error(readError(result, "Forecast could not be loaded. Please try again."));
      }
      setForecast(result.forecast as WeatherForecast);
    } catch (reason) {
      setError(reason instanceof Error ? t(reason.message) : t("Forecast could not be loaded. Please try again."));
    } finally {
      setLoadingForecast(false);
    }
  }

  return <section className="full-section weather-page" aria-labelledby="weather-heading">
    <div className="weather-header">
      <div>
        <span className="weather-kicker"><Icon name="cloud" size={14} /> {t("EXTERNAL FORECAST")}</span>
        <h2 id="weather-heading">{t("Weather outlook")}</h2>
        <p>{t("Search near your growing zone. Forecasts are model estimates, not X_Farm sensor readings.")}</p>
      </div>
      <form className="weather-search" onSubmit={searchLocations}>
        <label htmlFor="weather-location">{t("Location")}</label>
        <div><input id="weather-location" autoComplete="off" maxLength={80} minLength={2} placeholder={t("City, region, or postal code")} value={query} onChange={(event) => setQuery(event.target.value)} /><button className="primary-button" type="submit" disabled={searching || query.trim().length < 2}>{searching ? t("Searching…") : t("Search")}</button></div>
      </form>
    </div>

    {error && <p className="weather-message weather-error" role="alert">{error}</p>}
    {notice && <p className="weather-message" role="status">{notice}</p>}
    {locations.length > 0 && <div className="weather-location-results" role="group" aria-label={t("Matching locations")}>
      <h3>{t("Choose a location")}</h3>
      {locations.map((location) => <button className="weather-location-option" key={location.id} type="button" disabled={loadingForecast} onClick={() => void loadForecast(location)}><span><b>{location.name}</b><small>{[location.admin1, location.country].filter(Boolean).join(", ")}</small></span><Icon name="chevron" size={17} /></button>)}
    </div>}

    {!forecast && !loadingForecast && !error && locations.length === 0 && <div className="weather-empty"><Icon name="cloud" size={25} /><span>{t("Search for a city or region to view its seven-day forecast.")}</span></div>}
    {loadingForecast && <div className="weather-empty" role="status">{t("Loading forecast for {place}…", { place: selectedLocation ? locationLabel(selectedLocation) : t("your location") })}</div>}

    {forecast && selectedLocation && <>
      <div className="weather-location-title"><div><span>{t("Selected location")}</span><h3>{locationLabel(selectedLocation)}</h3></div><button className="text-button" type="button" onClick={() => { setForecast(null); setSelectedLocation(null); setError(""); }}>{t("Choose another")}</button></div>
      <div className="weather-current-card">
        <div className="weather-current-main"><Icon name={forecast.current.weatherCode < 3 ? "sun" : "cloud"} size={28} /><span>{t("Current model estimate · {condition}", { condition: t(describeWeatherCode(forecast.current.weatherCode)) })}</span><strong>{Math.round(forecast.current.temperatureC)}°</strong><small>{t("Feels like {value}°", { value: Math.round(forecast.current.apparentTemperatureC) })}</small></div>
        <div className="weather-current-stat"><span>{t("Humidity")}</span><b>{Math.round(forecast.current.relativeHumidity)}%</b></div>
        <div className="weather-current-stat"><span>{t("Wind")}</span><b>{Math.round(forecast.current.windSpeedKmh)} km/h</b></div>
        <div className="weather-current-stat"><span>{t("Precipitation")}</span><b>{forecast.current.precipitationMm.toFixed(1)} mm</b></div>
      </div>

      <div className="weather-section-heading"><div><h3>{t("Seven-day forecast")}</h3><span>{t("Daily model forecast · °C · mm")}</span></div></div>
      <div className="weather-forecast-grid">{forecast.daily.map((day) => <article className="weather-day-card" key={day.date}>
        <b>{formatDay(day.date, locale === "ro" ? "ro-RO" : "en-GB")}</b>
        <span className="weather-day-condition"><Icon name={day.weatherCode < 3 ? "sun" : "cloud"} size={18} />{t(describeWeatherCode(day.weatherCode))}</span>
        <strong>{number(day.maximumC, "°")} <small>{number(day.minimumC, "°")}</small></strong>
        <span>{t("Rain {value}", { value: number(day.precipitationProbabilityMax, "%") })}</span>
        <span>{t("{amount} total · UV {uv}", { amount: number(day.precipitationMm, " mm"), uv: number(day.uvIndexMax, "") })}</span>
      </article>)}</div>

      <section className="weather-risks" aria-labelledby="weather-risks-heading">
        <div className="weather-section-heading"><div><h3 id="weather-risks-heading">{t("Potential growing risks")}</h3><span>{t("Derived from forecast values; confirm conditions locally.")}</span></div></div>
        {forecast.risks.length > 0 ? <ul>{forecast.risks.map((risk) => <li key={risk.id}><Icon name="alert" size={17} /><span><b>{t(risk.title)}</b><small>{td(risk.detail)}</small></span></li>)}</ul> : <div className="weather-clear"><Icon name="check" size={17} />{t("No threshold-based weather risks in this forecast window.")}</div>}
        <p className="weather-automation-note">{t("Weather forecasts are advisory only. They do not change simulated sensor values or trigger automation.")}</p>
      </section>

      <p className="weather-attribution">{t("Forecast data by")} <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{t("Open-Meteo")}</a>{t("; geocoding data based on GeoNames. Forecast fetched {time}.", { time: new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(forecast.fetchedAt)) })}</p>
    </>}
  </section>;
}
