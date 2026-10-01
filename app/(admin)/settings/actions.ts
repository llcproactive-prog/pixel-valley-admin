"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";

const list = (s: string) => s.split(/\n|,/).map((x) => x.trim()).filter(Boolean);

const schema = z.object({
  business_name: z.string().trim().min(2),
  license: z.string().trim().min(3),
  phone: z.string().trim(),
  website: z.string().trim().url(),
  service_cities: z.string(),
  gbp_name: z.string().trim(),
  instagram: z.string().trim(),
  facebook: z.string().trim(),
  brand_notes: z.string().trim(),
  tone: z.string().trim(),
  avoid: z.string(),
  pillars: z.string(),
  review_link: z.string().trim(),
});

export async function saveSettings(_: { error?: string; ok?: boolean } | undefined, fd: FormData) {
  const { supabase, email } = await requireAdmin();
  const raw = Object.fromEntries(Object.keys(schema.shape).map((k) => [k, String(fd.get(k) ?? "")]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  const v = parsed.data;
  const current = await loadSettings(supabase);

  const rows = [
    { key: "business", value: { ...current.business, name: v.business_name, license: v.license, phone: v.phone, website: v.website } },
    { key: "service_cities", value: list(v.service_cities) },
    {
      key: "brand_state",
      value: { gbp_name: v.gbp_name, gbp_rename_done: fd.get("gbp_rename_done") === "on", instagram: v.instagram, facebook: v.facebook, notes: v.brand_notes },
    },
    { key: "voice", value: { tone: v.tone, avoid: list(v.avoid), pillars: list(v.pillars) } },
    { key: "review_link", value: v.review_link },
  ];
  const { error } = await supabase.from("brand_settings").upsert(rows);
  if (error) return { error: error.message };
  await supabase.from("agent_runs").insert({
    agent: "owner",
    action: "settings.update",
    actor_email: email,
    input: { before: current, after: Object.fromEntries(rows.map((r) => [r.key, r.value])) },
    records_changed: rows.map((r) => ({ table: "brand_settings", id: r.key })),
  });
  revalidatePath("/settings");
  return { ok: true };
}
