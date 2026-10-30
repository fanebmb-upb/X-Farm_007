const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export function isSupabaseConfigured() {
  return Boolean(projectUrl && publishableKey);
}

export function getSupabaseCredentials() {
  if (!isSupabaseConfigured()) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable Supabase.");
  }
  return { url: projectUrl, publishableKey };
}
