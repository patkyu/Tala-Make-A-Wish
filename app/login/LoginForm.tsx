"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState(
    linkError ? "That sign-in link expired or was already used. Send a new one." : ""
  );

  async function signInWithGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/edit` },
    });
    if (error) setError(error.message);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/edit` },
    });
    if (error) {
      setStatus("idle");
      setError(error.message);
    } else setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="login-card">
        <h1>Check your email</h1>
        <p>We sent a sign-in link to {email}. Open it on this device to start your constellation.</p>
        <button className="btn" onClick={() => setStatus("idle")}>Use a different email</button>
      </div>
    );
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <h1>Sign in</h1>
      <p>Continue with Google, or get a sign-in link by email.</p>

      <button className="btn primary" type="button" onClick={signInWithGoogle}>
        Continue with Google
      </button>

      <input
        className="text-field"
        style={{ marginTop: 16 }}
        type="email"
        required
        autoComplete="email"
        placeholder="you@email.com"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending link…" : "Send sign-in link"}
      </button>
      {error && <div className="err">{error}</div>}
    </form>
  );
}
