import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/supabase/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(nextPath, request.url));
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "confirmation");
  return NextResponse.redirect(loginUrl);
}
