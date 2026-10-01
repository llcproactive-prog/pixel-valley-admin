import type { SupabaseClient } from "@supabase/supabase-js";
import type { RuleContext } from "./content-rules";

export type BrandSettings = {
  business: { name: string; license: string; phone: string; website: string; founded: number; owner: string };
  service_cities: string[];
  brand_state: { gbp_name: string; gbp_rename_done: boolean; instagram: string; facebook: string; notes: string };
  voice: { tone: string; avoid: string[]; pillars: string[] };
  review_link: string;
};

const DEFAULTS: BrandSettings = {
  business: {
    name: "Pixel Valley Painting",
    license: "CSLB #1155142 (C-33)",
    phone: "408-516-7750",
    website: "https://www.pixelvalleypainting.com",
    founded: 2018,
    owner: "Raymond Gil",
  },
  service_cities: ["San Jose", "Willow Glen", "Almaden", "Cupertino", "Saratoga", "Los Gatos", "Campbell"],
  brand_state: { gbp_name: "Proactive Painting", gbp_rename_done: false, instagram: "", facebook: "", notes: "" },
  voice: { tone: "Calm, precise, plain English.", avoid: [], pillars: [] },
  review_link: "",
};

export async function loadSettings(supabase: SupabaseClient): Promise<BrandSettings> {
  const { data } = await supabase.from("brand_settings").select("key,value");
  const out: Record<string, unknown> = { ...DEFAULTS };
  for (const row of data ?? []) out[row.key] = row.value;
  return out as BrandSettings;
}

export function ruleContext(
  s: BrandSettings,
  job: { city: string; customer_first_name: string | null; customer_name_ok: boolean },
): RuleContext {
  return {
    license: s.business.license,
    allowedCities: s.service_cities,
    bannedPhrases: s.voice.avoid ?? [],
    jobCity: job.city,
    customerFirstName: job.customer_first_name,
    customerNameOk: job.customer_name_ok,
  };
}
