"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, newPasswordProblem } from "@/lib/supabase/password";

export function PasswordUpdateForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const problem = newPasswordProblem(password, String(formData.get("confirmation") ?? ""));
    if (problem) { setError(problem); return; }
    setPending(true);
    try {
      const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice("Password updated. Taking you to your dashboard…");
      setTimeout(() => router.push("/"), 1200);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The password could not be updated. Please try again.");
      setPending(false);
    }
  }

  return <main className="auth-page">
    <Link className="auth-brand" href="/">X_Farm</Link>
    <section className="auth-card" aria-labelledby="password-heading">
      <span className="simulated-label"><span className="sim-dot" />VIRTUAL AGRICULTURE</span>
      <h1 id="password-heading">Set a new password</h1>
      <p className="auth-intro">Choose a new password for your X_Farm account.</p>
      <form className="auth-fields" onSubmit={submit}>
        <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} /></label>
        <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} /></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
      </form>
      <Link className="auth-back" href="/">Return to the dashboard</Link>
    </section>
  </main>;
}
