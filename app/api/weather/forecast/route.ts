import { NextRequest, NextResponse } from "next/server";
import { parseWeatherForecast } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("latitude"));
  const longitude = Number(request.nextUrl.searchParams.get("longitude"));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Choose a valid location before loading its forecast." }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");

  try {
    const upstream = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 900 }, signal: AbortSignal.timeout(8_000) });
    if (!upstream.ok) return NextResponse.json({ error: "The weather forecast is temporarily unavailable." }, { status: 502 });
    const forecast = parseWeatherForecast(await upstream.json());
    if (!forecast) return NextResponse.json({ error: "The weather provider returned an unreadable forecast." }, { status: 502 });
    return NextResponse.json({ forecast }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "The weather forecast is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
