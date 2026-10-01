"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PixelMark, PixelStrip } from "@/components/brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) {
      setState("error");
      setMessage(`Sign-in link didn't work: ${err}. Request a new one.`);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: true },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-coastal-700">
      <PixelStrip />
      <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <PixelMark className="h-12 w-12" />
          <div>
            <div className="font-heading text-lg font-bold leading-tight text-coastal-700">Pixel Valley</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-aqua">Painting · Admin</div>
          </div>
        </div>
        <div className="mb-2">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-stone-500">We&apos;ll email you a one-time sign-in link.</p>
        </div>
        {state === "sent" ? (
          <div className="rounded-lg bg-coastal-50 p-4 text-sm text-coastal-800">
            Check <strong>{email}</strong> for the sign-in link. Open it on this device.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary w-full" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            {state === "error" && <p className="text-sm text-red-700">{message}</p>}
          </form>
        )}
        </div>
        <PixelStrip />
      </div>
      </div>
    </main>
  );
}
