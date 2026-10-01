import { requireAdmin } from "@/lib/supabase/server";
import { fmtDate } from "@/components/status";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const { supabase } = await requireAdmin();
  const { data: leads, error } = await supabase
    .from("quote_leads")
    .select("id,created_at,name,email,phone,city,project_type,timeline,budget,ballpark_total,summary")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Website leads</h1>
        <p className="text-sm text-stone-500">Quote requests from pixelvalleypainting.com. Read-only for now — the Sales Agent comes later.</p>
      </div>
      {error && <p className="text-sm text-red-700">{error.message}</p>}
      <ul className="space-y-3">
        {(leads ?? []).map((l) => (
          <li key={l.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{l.name || "Unnamed"}</div>
                <div className="text-sm text-stone-500">{[l.project_type, l.city, l.timeline].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-stone-500">{fmtDate(l.created_at)}</div>
                {l.ballpark_total && <div className="font-medium">Ballpark {l.ballpark_total}</div>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {l.phone && <a href={`tel:${l.phone}`} className="text-coastal-700 hover:underline">{l.phone}</a>}
              {l.email && <a href={`mailto:${l.email}`} className="text-coastal-700 hover:underline">{l.email}</a>}
              {l.budget && <span className="text-stone-500">Budget: {l.budget}</span>}
            </div>
            {l.summary && <p className="mt-2 line-clamp-3 text-sm text-stone-600">{l.summary}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
