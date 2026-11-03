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
