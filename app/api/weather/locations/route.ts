import { NextRequest, NextResponse } from "next/server";
import { parseWeatherLocations } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: "Enter a location between 2 and 80 characters." }, { status: 400 });
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  try {
    const upstream = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8_000) });
    if (!upstream.ok) return NextResponse.json({ error: "Location search is temporarily unavailable." }, { status: 502 });
    const locations = parseWeatherLocations(await upstream.json());
    if (!locations) return NextResponse.json({ error: "The weather provider returned an unreadable location response." }, { status: 502 });
    return NextResponse.json({ locations }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=86400, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "Location search is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
