export type WeatherLocation = {
  id: number;
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type DailyForecast = {
  date: string;
  weatherCode: number;
  minimumC: number | null;
  maximumC: number | null;
  precipitationProbabilityMax: number | null;
  precipitationMm: number | null;
  uvIndexMax: number | null;
};

export type WeatherRisk = {
  id: string;
  title: string;
  detail: string;
};

export type WeatherForecast = {
  timezone: string;
  fetchedAt: string;
  current: {
    time: string;
    temperatureC: number;
    apparentTemperatureC: number;
    relativeHumidity: number;
    precipitationMm: number;
    windSpeedKmh: number;
    weatherCode: number;
  };
  daily: DailyForecast[];
  risks: WeatherRisk[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeInteger(value: unknown): value is number {
  return finite(value) && Number.isSafeInteger(value);
}

function optionalNumber(value: unknown): number | null {
  return finite(value) ? value : null;
}

export function parseWeatherLocations(value: unknown): WeatherLocation[] | null {
  if (!isRecord(value) || !Array.isArray(value.results)) return null;
  return value.results.flatMap((entry) => {
    if (!isRecord(entry) || !safeInteger(entry.id)
      || typeof entry.name !== "string" || entry.name.length < 1 || entry.name.length > 100
      || !finite(entry.latitude) || entry.latitude < -90 || entry.latitude > 90
      || !finite(entry.longitude) || entry.longitude < -180 || entry.longitude > 180
      || typeof entry.country !== "string" || entry.country.length > 100
      || typeof entry.country_code !== "string" || entry.country_code.length > 3
      || typeof entry.timezone !== "string" || entry.timezone.length > 80) return [];

    return [{
      id: entry.id,
      name: entry.name,
      admin1: typeof entry.admin1 === "string" && entry.admin1.length <= 100 ? entry.admin1 : null,
      country: entry.country,
      countryCode: entry.country_code,
      latitude: entry.latitude,
      longitude: entry.longitude,
      timezone: entry.timezone,
    }];
  });
}

export function parseWeatherForecast(value: unknown, fetchedAt = new Date().toISOString()): WeatherForecast | null {
  if (!isRecord(value) || !isRecord(value.current) || !isRecord(value.daily)
    || typeof value.timezone !== "string" || value.timezone.length > 80
    || typeof value.current.time !== "string" || !Number.isFinite(Date.parse(value.current.time))) return null;

  const current = value.current;
  const currentTime = current.time;
  const temperatureC = current.temperature_2m;
  const apparentTemperatureC = current.apparent_temperature;
  const relativeHumidity = current.relative_humidity_2m;
  const precipitationMm = current.precipitation;
  const windSpeedKmh = current.wind_speed_10m;
  const weatherCode = current.weather_code;
  if (typeof currentTime !== "string" || !Number.isFinite(Date.parse(currentTime))
    || !finite(temperatureC) || !finite(apparentTemperatureC) || !finite(relativeHumidity)
    || !finite(precipitationMm) || !finite(windSpeedKmh) || !safeInteger(weatherCode)) return null;

  const daily = value.daily;
  const times = daily.time;
  const codes = daily.weather_code;
  const minimums = daily.temperature_2m_min;
  const maximums = daily.temperature_2m_max;
  const rainChances = daily.precipitation_probability_max;
  const precipitation = daily.precipitation_sum;
  const uvIndexes = daily.uv_index_max;
  if (!Array.isArray(times) || !Array.isArray(codes) || !Array.isArray(minimums) || !Array.isArray(maximums)
    || !Array.isArray(rainChances) || !Array.isArray(precipitation) || !Array.isArray(uvIndexes)
    || times.length < 1 || times.length > 16
    || [codes, minimums, maximums, rainChances, precipitation, uvIndexes].some((series) => series.length !== times.length)) return null;

  const days: DailyForecast[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const date = times[index];
    const code = codes[index];
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !safeInteger(code)) return null;
    days.push({
      date,
      weatherCode: code,
      minimumC: optionalNumber(minimums[index]),
      maximumC: optionalNumber(maximums[index]),
      precipitationProbabilityMax: optionalNumber(rainChances[index]),
      precipitationMm: optionalNumber(precipitation[index]),
      uvIndexMax: optionalNumber(uvIndexes[index]),
    });
  }

  const forecast: WeatherForecast = {
    timezone: value.timezone,
    fetchedAt,
    current: {
      time: currentTime,
      temperatureC,
      apparentTemperatureC,
      relativeHumidity,
      precipitationMm,
      windSpeedKmh,
      weatherCode,
    },
    daily: days,
    risks: [],
  };
  forecast.risks = deriveWeatherRisks(forecast.daily);
  return forecast;
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";
  return "Variable conditions";
}

export function deriveWeatherRisks(days: DailyForecast[]): WeatherRisk[] {
  const risks: WeatherRisk[] = [];
  for (const day of days) {
    if (day.minimumC !== null && day.minimumC <= 0) {
      risks.push({ id: `frost-${day.date}`, title: "Possible frost", detail: `${day.date}: forecast low ${day.minimumC} °C may affect exposed plants.` });
    }
    if (day.maximumC !== null && day.maximumC >= 35) {
      risks.push({ id: `heat-${day.date}`, title: "High heat", detail: `${day.date}: forecast high ${day.maximumC} °C may increase plant water stress.` });
    }
    if ((day.precipitationProbabilityMax !== null && day.precipitationProbabilityMax >= 70)
      || (day.precipitationMm !== null && day.precipitationMm >= 15)) {
      const chance = day.precipitationProbabilityMax === null ? "" : `, up to ${day.precipitationProbabilityMax}% chance`;
      const amount = day.precipitationMm === null ? "" : `, ${day.precipitationMm} mm forecast`;
      risks.push({ id: `rain-${day.date}`, title: "Rain may affect irrigation", detail: `${day.date}${chance}${amount}. Check soil conditions before watering.` });
    }
    if (day.uvIndexMax !== null && day.uvIndexMax >= 8) {
      risks.push({ id: `uv-${day.date}`, title: "Very high UV forecast", detail: `${day.date}: maximum UV index ${day.uvIndexMax}; consider shade for sensitive plants.` });
    }
  }
  return risks.slice(0, 8);
}
