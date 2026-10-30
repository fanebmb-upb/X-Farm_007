"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthForm({ confirmationError = false }: { confirmationError?: boolean }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(confirmationError ? "The confirmation link could not be verified. Request a new link and try again." : "");
  const [notice, setNotice] = useState("");
  const configured = isSupabaseConfigured();
  const router = useRouter();

  function getReturnPath() {
    const value = new URLSearchParams(window.location.search).get("next");
    return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "sign-up") {
        const callback = new URL("/auth/callback", window.location.origin);
        callback.searchParams.set("next", getReturnPath());
        const response = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback.toString() } });
        if (response.error) throw response.error;
        if (response.data.session) router.push("/");
        else setNotice("Check your email for a confirmation link to finish creating your account.");
      } else {
        const response = await supabase.auth.signInWithPassword({ email, password });
        if (response.error) throw response.error;
        router.push(getReturnPath());
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page">
    <Link className="auth-brand" href="/">X_Farm</Link>
    <section className="auth-card" aria-labelledby="auth-heading">
      <span className="simulated-label"><span className="sim-dot" />VIRTUAL AGRICULTURE</span>
      <h1 id="auth-heading">{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
      {!configured ? <div className="auth-setup" role="status"><b>Supabase isn’t configured yet.</b><p>Copy <code>.env.example</code> to <code>.env.local</code> and add your Supabase project URL and publishable key to enable accounts. The local demo stays available until then.</p></div> : <>
        <p className="auth-intro">Sign in to keep your farm data connected to your account.</p>
        <form className="auth-fields" onSubmit={submit}>
          <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} maxLength={128} /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={pending}>{pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="auth-switch">{mode === "sign-in" ? "New to X_Farm?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setNotice(""); }}>{mode === "sign-in" ? "Create an account" : "Sign in"}</button></p>
      </>}
      <Link className="auth-back" href="/">Return to the local dashboard</Link>
    </section>
    <p className="auth-footnote">Your account data is protected by per-user database policies.</p>
  </main>;
}
