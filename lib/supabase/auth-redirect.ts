import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/** Only allow same-origin relative paths so auth links cannot redirect off-site. */
export function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export function parseEmailOtpType(value: string | null): EmailOtpType | null {
  return EMAIL_OTP_TYPES.find((type) => type === value) ?? null;
}

// Guests can use the local demo dashboard and free weather lookups; cloud sync
// and the paid AI assistant still require an account.
const PUBLIC_PREFIXES = ["/auth/callback", "/auth/confirm", "/api/weather/"];

export function isPublicRoute(pathname: string) {
  return pathname === "/" || pathname === "/login" || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
