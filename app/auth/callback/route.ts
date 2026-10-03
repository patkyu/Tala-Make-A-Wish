import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The magic link lands here with ?code=..., which we swap for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/edit";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/edit"; // no open redirects

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
