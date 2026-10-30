import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "./env";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseCredentials();
  return createBrowserClient<Database>(url, publishableKey);
}
