import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/server";
import { StatusPill, fmtDate } from "@/components/status";

export const metadata = { title: "Marketing" };

const filters = [
  { key: "", label: "All active" },
  { key: "intake", label: "Needs content" },
  { key: "in_review", label: "In review" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
];

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "", q = "" } = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("jobs")
    .select("id,title,city,neighborhood,service_type,completed_on,status,updated_at,job_photos(count)")
    .order("completed_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  query = status ? query.eq("status", status) : query.neq("status", "archived");
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, "")}%,city.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data: jobs } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Marketing Agent</h1>
          <p className="text-sm text-stone-500">Finished jobs → GBP post, project page, social, review request.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">+ Log a finished job</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/jobs?status=${f.key}` : "/jobs"}
            className={`rounded-full border px-3 py-1 text-sm ${status === f.key ? "border-coastal-700 bg-coastal-700 text-white" : "border-stone-300 bg-white text-stone-700"}`}
          >
            {f.label}
          </Link>
        ))}
        <form className="ml-auto w-full sm:w-64">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search title or city" className="input" />
        </form>
      </div>

      {jobs?.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {jobs.map((j) => {
            const photoCount = (j.job_photos as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="card block transition hover:border-coastal-600">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{j.title}</div>
                      <div className="truncate text-sm text-stone-500">
                        {j.service_type} · {[j.neighborhood, j.city].filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <StatusPill status={j.status} />
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-stone-500">
                    <span>Completed {fmtDate(j.completed_on)}</span>
                    <span>{photoCount} photo{photoCount === 1 ? "" : "s"}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card text-center">
          <p className="text-stone-600">No jobs here yet.</p>
          <p className="mt-1 text-sm text-stone-500">Log a finished job with photos and the agent drafts everything for your review.</p>
        </div>
      )}
    </div>
  );
}
