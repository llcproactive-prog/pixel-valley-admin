import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/server";
import { loadSettings, ruleContext } from "@/lib/settings";
import { checkContent, type Channel } from "@/lib/content-rules";
import { StatusPill, fmtDate } from "@/components/status";
import { JobForm } from "@/components/job-form";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotoGrid } from "@/components/photo-grid";
import { GeneratePanel } from "@/components/generate-panel";
import { ReelBuilder } from "@/components/reel-builder";
import { ContentCard, type ContentView } from "@/components/content-card";
import { archiveJob, updateJob } from "../actions";

export const maxDuration = 300;

const ORDER = ["gbp_post", "case_study", "instagram", "facebook", "review_request"];

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: job }, { data: photos }, { data: items }, { data: lastRun }, settings] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).maybeSingle(),
    supabase.from("job_photos").select("*").eq("job_id", id).order("sort_order").order("created_at"),
    supabase.from("content_items").select("*").eq("job_id", id).neq("status", "rejected").order("version", { ascending: false }),
    supabase
      .from("agent_runs")
      .select("output,created_at,status,error,model")
      .eq("job_id", id)
      .eq("agent", "marketing")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadSettings(supabase),
  ]);
  if (!job) notFound();

  const paths = (photos ?? []).map((p) => p.storage_path);
  const signed = paths.length ? (await supabase.storage.from("job-photos").createSignedUrls(paths, 3600)).data ?? [] : [];
  const photoViews = (photos ?? []).map((p, i) => ({ ...p, url: signed[i]?.signedUrl ?? null }));
  const approvedCount = photoViews.filter((p) => p.marketing_approved).length;

  // Latest non-rejected item per channel.
  const latest = new Map<string, ContentView>();
  for (const it of items ?? []) if (!latest.has(it.channel)) latest.set(it.channel, it as ContentView);
  const reviewLink = settings.review_link?.trim();
  const content = ORDER.filter((c) => latest.has(c)).map((c) => {
    const it = { ...latest.get(c)! };
    if (reviewLink && it.channel === "review_request") {
      it.body = it.body.replaceAll("{{review_link}}", reviewLink);
      it.data = { ...it.data, sms: String(it.data.sms ?? "").replaceAll("{{review_link}}", reviewLink) };
    }
    return it;
  });

  const ctx = ruleContext(settings, job);
  const missing: string[] = (lastRun?.status === "ok" && (lastRun.output as { missing_info?: string[] })?.missing_info) || [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/jobs" className="text-sm text-coastal-700 hover:underline">← Marketing</Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{job.title}</h1>
            <p className="text-sm text-stone-500">
              {job.service_type} · {[job.neighborhood, job.city].filter(Boolean).join(", ")} · Completed {fmtDate(job.completed_on)}
            </p>
          </div>
          <StatusPill status={job.status} />
        </div>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Job details</summary>
        <div className="mt-4">
          <JobForm action={updateJob.bind(null, job.id)} job={job} cities={settings.service_cities} submitLabel="Save changes" />
          <form action={archiveJob.bind(null, job.id)} className="mt-3 flex justify-end">
            <button className="text-sm text-stone-500 hover:text-red-700">Archive job</button>
          </form>
        </div>
      </details>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Photos</h2>
        <PhotoUploader jobId={job.id} />
        <PhotoGrid photos={photoViews} />
      </section>

      <GeneratePanel jobId={job.id} hasDrafts={content.length > 0} approvedPhotos={approvedCount} />

      <ReelBuilder
        photos={photoViews.filter((p) => p.marketing_approved).map((p) => ({ id: String(p.id), url: p.url }))}
        title={job.title}
        service={job.service_type ?? "Painting"}
        location={[job.neighborhood, job.city].filter(Boolean).join(", ")}
      />

      {lastRun?.status === "error" && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Last agent run failed: {lastRun.error}</div>
      )}

      {missing.length > 0 && (
        <div className="card border-amber-300 bg-amber-50">
          <h2 className="font-semibold text-amber-900">The agent wrote around these gaps</h2>
          <p className="text-sm text-amber-900/80">Add the answers to Job details and redraft for stronger content.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {content.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Content package</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {content.map((it) => {
              const text =
                it.channel === "case_study" || it.channel === "review_request"
                  ? [it.title, it.body, it.data.sms].filter(Boolean).join("\n")
                  : it.body;
              const flags = checkContent(it.channel as Channel, text, ctx);
              return (
                <div key={it.id} className={it.channel === "case_study" ? "lg:col-span-2" : ""}>
                  <ContentCard item={it} flags={flags} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
