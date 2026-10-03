"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      if (!data.session) {
        // Supabase still has "Confirm email" turned on, so no session yet.
        setNotice("Account created, but Supabase is waiting for email confirmation. Turn off Confirm email in Supabase, then sign in.");
        setBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    }

    router.push("/edit");
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <h1>{isSignup ? "Create account" : "Sign in"}</h1>
      <p>{isSignup ? "Pick a password to start your constellation." : "Welcome back. Your sky is waiting."}</p>
      <input
        className="text-field"
        type="email"
        required
        autoComplete="email"
        placeholder="you@email.com"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="text-field"
        style={{ marginTop: 10 }}
        type="password"
        required
        minLength={8}
        autoComplete={isSignup ? "new-password" : "current-password"}
        placeholder="Password (8+ characters)"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "One moment…" : isSignup ? "Create account" : "Sign in"}
      </button>
      <button
        className="btn"
        type="button"
        onClick={() => { setMode(isSignup ? "signin" : "signup"); setError(""); setNotice(""); }}
      >
        {isSignup ? "I already have an account" : "Create a new account"}
      </button>
      {error && <div className="err">{error}</div>}
      {notice && <div className="hint">{notice}</div>}
    </form>
  );
}
