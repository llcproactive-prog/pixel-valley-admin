"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/(admin)/settings/actions";
import type { BrandSettings } from "@/lib/settings";

export function SettingsForm({ s }: { s: BrandSettings }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="space-y-5">
      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Business facts</h2>
        <F label="Business name"><input name="business_name" defaultValue={s.business.name} className="input" /></F>
        <F label="License line" hint="Required on all advertising"><input name="license" defaultValue={s.business.license} className="input" /></F>
        <F label="Phone"><input name="phone" defaultValue={s.business.phone} className="input" /></F>
        <F label="Website"><input name="website" defaultValue={s.business.website} className="input" /></F>
        <F label="Service cities" hint="One per line. The agent won't name anywhere else." className="sm:col-span-2">
          <textarea name="service_cities" rows={4} defaultValue={s.service_cities.join("\n")} className="input" />
        </F>
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Current brand state</h2>
        <F label="Name currently on Google Business Profile"><input name="gbp_name" defaultValue={s.brand_state.gbp_name} className="input" /></F>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="gbp_rename_done" defaultChecked={s.brand_state.gbp_rename_done} className="size-4 accent-coastal-700" />
          GBP rename to Pixel Valley is complete
        </label>
        <F label="Instagram handle"><input name="instagram" defaultValue={s.brand_state.instagram} className="input" /></F>
        <F label="Facebook page"><input name="facebook" defaultValue={s.brand_state.facebook} className="input" /></F>
        <F label="Notes for the agent" className="sm:col-span-2"><textarea name="brand_notes" rows={2} defaultValue={s.brand_state.notes} className="input" /></F>
        <F label="Google review link" hint="g.page/r/… — fills {{review_link}} in review requests" className="sm:col-span-2">
          <input name="review_link" defaultValue={s.review_link} className="input" />
        </F>
      </section>

      <section className="card grid gap-4">
        <h2 className="font-semibold">Voice</h2>
        <F label="Tone"><textarea name="tone" rows={2} defaultValue={s.voice.tone} className="input" /></F>
        <F label="Never say" hint="One per line"><textarea name="avoid" rows={4} defaultValue={(s.voice.avoid ?? []).join("\n")} className="input" /></F>
        <F label="Brand pillars" hint="One per line"><textarea name="pillars" rows={4} defaultValue={(s.voice.pillars ?? []).join("\n")} className="input" /></F>
      </section>

      <div className="flex items-center justify-end gap-3">
        {state?.error && <span className="text-sm text-red-700">{state.error}</span>}
        {state?.ok && <span className="text-sm text-coastal-700">Saved</span>}
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  );
}

function F({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="label">{label}{hint && <span className="ml-1 font-normal text-stone-400">— {hint}</span>}</label>
      {children}
    </div>
  );
}
