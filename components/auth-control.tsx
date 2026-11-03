"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthControl() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(isSupabaseConfigured());
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();
  const router = useRouter();

  useEffect(() => {
    if (!configured) return;
    const supabase = createSupabaseBrowserClient();
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setEmail(session?.user.email ?? null);
        setChecking(false);
      }
    });
    void supabase.auth.getUser().then(({ data, error }) => {
      if (active && !error) setEmail(data.user?.email ?? null);
      if (active) setChecking(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [configured, router]);

  async function signOut() {
    setPending(true);
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (!error) router.push("/login");
    else setPending(false);
  }

  if (!configured || (!checking && !email)) return <Link className="account-link" href="/login">Sign in</Link>;
  if (checking) return <span className="account-status" aria-live="polite">Checking account…</span>;
  return <div className="account-control"><span className="account-email" title={email ?? undefined}>{email}</span><Link className="account-link" href="/reset-password">Change password</Link><button className="account-link" type="button" onClick={signOut} disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button></div>;
}
