import { NextResponse, type NextRequest } from "next/server";
import { generatePackage, resolveModel } from "@/lib/agents/marketing";
import type { BrandSettings } from "@/lib/settings";

export const maxDuration = 300;

// Owner-only smoke test for the model connection. Requires AGENT_HEALTH_TOKEN.
// Runs the Marketing Agent on a fictional sample job; writes nothing to the database.
export async function GET(request: NextRequest) {
  const token = process.env.AGENT_HEALTH_TOKEN;
  if (!token || request.nextUrl.searchParams.get("token") !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const settings: BrandSettings = {
    business: { name: "Pixel Valley Painting", license: "CSLB #1155142 (C-33)", phone: "408-516-7750", website: "https://www.pixelvalleypainting.com", founded: 2018, owner: "Raymond Gil" },
    service_cities: ["San Jose", "Willow Glen", "Campbell"],
    brand_state: { gbp_name: "Proactive Painting", gbp_rename_done: false, instagram: "", facebook: "", notes: "" },
    voice: { tone: "Calm, precise, plain English.", avoid: ["best in the Bay Area", "guaranteed"], pillars: ["Prep is the job"] },
    review_link: "",
  };
  const started = Date.now();
  try {
    const { pkg, usage, modelLabel } = await generatePackage({
      settings,
      photos: [],
      job: {
        id: "sample", title: "SAMPLE — Willow Glen bungalow exterior", city: "Willow Glen", neighborhood: null,
        service_type: "Exterior painting", surfaces: "Siding, trim, front door", starting_condition: "Peeling trim on the south side",
        prep_work: "Scraped and sanded failing trim, spot-primed bare wood", products: null, colors: null, method: null,
        repairs: "Replaced one rotted fascia board", duration_days: 4, completed_on: null, customer_first_name: null,
        customer_name_ok: false, homeowner_questions: null, notes: "Fictional sample for a connection test",
      },
    });
    return NextResponse.json({ ok: true, model: modelLabel, ms: Date.now() - started, usage, pkg });
  } catch (e) {
    return NextResponse.json({ ok: false, model: resolveModel().label, ms: Date.now() - started, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
