import { NextResponse } from "next/server";
import { bundledLibrary, parseCropRow, type CropLibrary } from "@/lib/crop-source";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Serves the crop knowledge base from Supabase, falling back to the copy bundled
// with the app when the database is unreachable or not yet migrated.
export async function GET() {
  let library: CropLibrary = bundledLibrary();
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.from("crop_profiles").select("id,profile").order("id");
      const crops = (data ?? []).map(parseCropRow).filter((crop) => crop !== null);
      if (!error && crops.length > 0) library = { source: "database", crops };
    } catch {
      // Keep the bundled copy.
    }
  }
  return NextResponse.json(library, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
