import assert from "node:assert/strict";
import test from "node:test";
import { describeWeatherCode, parseWeatherForecast, parseWeatherLocations } from "../lib/weather.ts";

test("weather location parser accepts valid geocoding results and drops malformed entries", () => {
  const locations = parseWeatherLocations({ results: [
    { id: 123, name: "Bucharest", admin1: "Bucharest", country: "Romania", country_code: "RO", latitude: 44.43, longitude: 26.1, timezone: "Europe/Bucharest" },
    { id: "bad", name: "Invalid", latitude: 100, longitude: 0, country: "", country_code: "", timezone: "" },
  ] });
  assert.equal(locations?.length, 1);
  assert.equal(locations?.[0].countryCode, "RO");
  assert.equal(locations?.[0].admin1, "Bucharest");
  assert.equal(parseWeatherLocations({ results: "invalid" }), null);
});

test("weather forecast parser keeps forecast values distinct and derives growing risks", () => {
  const forecast = parseWeatherForecast({
    timezone: "Europe/Bucharest",
    current: { time: "2026-10-30T14:00", temperature_2m: 21.4, apparent_temperature: 20.8, relative_humidity_2m: 54, precipitation: 0, wind_speed_10m: 8, weather_code: 2 },
    daily: {
      time: ["2026-10-30", "2026-10-31", "2026-11-01"],
      weather_code: [2, 71, 95],
      temperature_2m_min: [9, -2, 22],
      temperature_2m_max: [21, 8, 36],
      precipitation_probability_max: [20, 85, 40],
      precipitation_sum: [0, 18, 1],
      uv_index_max: [4, 5, 9],
    },
  }, "2026-10-30T12:00:00.000Z");

  assert.ok(forecast);
  assert.equal(forecast.current.temperatureC, 21.4);
  assert.equal(forecast.daily.length, 3);
  assert.equal(describeWeatherCode(95), "Thunderstorm");
  assert.ok(forecast.risks.some((risk) => risk.id === "frost-2026-10-31"));
  assert.ok(forecast.risks.some((risk) => risk.id === "rain-2026-10-31"));
  assert.ok(forecast.risks.some((risk) => risk.id === "heat-2026-11-01"));
  assert.ok(forecast.risks.some((risk) => risk.id === "uv-2026-11-01"));
  assert.equal(parseWeatherForecast({ timezone: "UTC", current: {}, daily: {} }), null);
});
