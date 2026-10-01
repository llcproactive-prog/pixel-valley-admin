import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/server";
import { StatusPill, fmtDate } from "@/components/status";
import { PixelMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Dashboard" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Los_Angeles" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const QUALITY: Record<string, { label: string; className: string }> = {
  review: { label: "Review", className: "bg-amber-50 text-amber-800" },
  out_of_area: { label: "Out of area", className: "bg-stone-100 text-stone-600" },
  spam: { label: "Spam", className: "bg-red-50 text-red-700" },
};

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const [jobs, pending, approved, published, leads, runs] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "intake"),
    supabase.from("content_items").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabase.from("content_items").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("published_projects").select("slug", { count: "exact", head: true }),
    supabase.from("quote_leads").select("id,created_at,name,city,project_type,lead_quality").order("created_at", { ascending: false }).limit(6),
    supabase.from("agent_runs").select("id,created_at,agent,action,status,job_id").order("created_at", { ascending: false }).limit(6),
  ]);

  const tiles = [
    { label: "Jobs needing content", value: jobs.count ?? 0, href: "/jobs?status=intake", color: BRAND.coral },
    { label: "Drafts awaiting approval", value: pending.count ?? 0, href: "/jobs?status=in_review", color: BRAND.aqua },
    { label: "Approved, not yet posted", value: approved.count ?? 0, href: "/jobs?status=in_review", color: BRAND.mint },
    { label: "Project pages live", value: published.count ?? 0, href: "/jobs?status=published", color: BRAND.coastal },
  ];
  const needsYou = (jobs.count ?? 0) + (pending.count ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl bg-coastal-700 px-5 py-6 text-white sm:px-8 sm:py-8">
        <PixelMark className="pointer-events-none absolute -right-6 -bottom-8 h-48 w-48 opacity-15" outline="#ffffff" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint">Pixel Valley Painting</p>
            <h1 className="text-2xl font-bold text-balance sm:text-3xl">{greeting()}, Raymond.</h1>
            <p className="text-sm leading-relaxed text-coastal-100">
              {needsYou ? `${needsYou} ${needsYou === 1 ? "thing needs" : "things need"} you today.` : "You're all caught up."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/jobs/new" className="btn bg-white font-semibold text-coastal-700 hover:bg-coastal-50">
              + Log a finished job
            </Link>
            <Link href="/jobs?status=published" className="btn border border-white/30 text-white hover:bg-white/10">
              Make a reel
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card group flex flex-col gap-3 transition hover:-translate-y-0.5 hover:border-coastal-100">
            <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t.color }} />
            <div className="flex flex-col gap-0.5">
              <div className="font-heading text-3xl font-bold tabular-nums text-coastal-700">{t.value}</div>
              <div className="text-sm text-stone-600">{t.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Newest quote requests</h2>
            <Link href="/leads" className="text-sm font-medium text-aqua hover:underline">All leads</Link>
          </div>
          {leads.data?.length ? (
            <ul className="divide-y divide-cloud">
              {leads.data.map((l) => {
                const q = l.lead_quality ? QUALITY[l.lead_quality as string] : undefined;
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coastal-50 font-heading text-xs font-bold text-coastal-700">
                        {(l.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{l.name || "Unnamed"}</span>
                          {q && <span className={`pill ${q.className}`}>{q.label}</span>}
                        </div>
                        <div className="truncate text-stone-500">{[l.project_type, l.city].filter(Boolean).join(" · ") || "—"}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-stone-500">{fmtDate(l.created_at)}</div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">No leads yet.</p>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/activity" className="text-sm font-medium text-aqua hover:underline">Full log</Link>
          </div>
          {runs.data?.length ? (
            <ul className="divide-y divide-cloud">
              {runs.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0 truncate">
                    <span className="font-medium capitalize">{r.agent}</span> <span className="text-stone-600">{r.action}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.status === "error" && <StatusPill status="error" />}
                    <span className="text-stone-500">{fmtDate(r.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Nothing yet. Log your first finished job to start.</p>
          )}
        </section>
      </div>
    </div>
  );
}
