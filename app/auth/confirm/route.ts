import { NextResponse, type NextRequest } from "next/server";
import { parseEmailOtpType, safeNextPath } from "@/lib/supabase/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Token-hash email links verify on the server, so they work in any browser or
// device, unlike PKCE code links that need the verifier cookie from sign-up.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = parseEmailOtpType(request.nextUrl.searchParams.get("type"));
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(nextPath, request.url));
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "confirmation");
  return NextResponse.redirect(loginUrl);
}
