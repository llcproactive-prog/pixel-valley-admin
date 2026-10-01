"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { AGENT_NAME, generatePackage, type JobInput } from "@/lib/agents/marketing";
import { slugify } from "@/lib/content-rules";

type Supa = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function log(
  supabase: Supa,
  entry: {
    agent: string;
    action: string;
    job_id?: string | null;
    actor_email: string;
    model?: string;
    input?: unknown;
    output?: unknown;
    records_changed?: unknown[];
    status?: "ok" | "error";
    error?: string;
    input_tokens?: number;
    output_tokens?: number;
  },
) {
  const { data } = await supabase.from("agent_runs").insert(entry).select("id").single();
  return data?.id as string | undefined;
}

// ---------- Jobs ----------------------------------------------------------

const text = z.string().trim().transform((v) => (v === "" ? null : v)).nullable();

const jobSchema = z.object({
  title: z.string().trim().min(3, "Give the job a short title"),
  city: z.string().trim().min(2, "City is required"),
  neighborhood: text,
  service_type: z.string().trim().min(2, "Service type is required"),
  surfaces: text,
  starting_condition: text,
  prep_work: text,
  products: text,
  colors: text,
  method: text,
  repairs: text,
  duration_days: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 365), "Days must be a number")
    .nullable(),
  completed_on: text,
  customer_first_name: text,
  customer_name_ok: z.boolean(),
  homeowner_questions: text,
  notes: text,
});

function parseJob(fd: FormData) {
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(jobSchema.shape)) raw[key] = (fd.get(key) as string | null) ?? "";
  raw.customer_name_ok = fd.get("customer_name_ok") === "on";
  return jobSchema.safeParse(raw);
}

export type FormState = { error?: string } | undefined;

export async function createJob(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, email } = await requireAdmin();
  const parsed = parseJob(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const { data, error } = await supabase.from("jobs").insert(parsed.data).select("id").single();
  if (error) return { error: error.message };
  await log(supabase, { agent: "owner", action: "job.create", job_id: data.id, actor_email: email, records_changed: [{ table: "jobs", id: data.id }] });
  redirect(`/jobs/${data.id}`);
}

export async function updateJob(id: string, _: FormState, fd: FormData): Promise<FormState> {
  const { supabase, email } = await requireAdmin();
  const parsed = parseJob(fd);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const { error } = await supabase.from("jobs").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  await log(supabase, { agent: "owner", action: "job.update", job_id: id, actor_email: email, records_changed: [{ table: "jobs", id }] });
  revalidatePath(`/jobs/${id}`);
  return {};
}

export async function archiveJob(id: string) {
  const { supabase, email } = await requireAdmin();
  await supabase.from("jobs").update({ status: "archived" }).eq("id", id);
  await log(supabase, { agent: "owner", action: "job.archive", job_id: id, actor_email: email, records_changed: [{ table: "jobs", id }] });
  redirect("/jobs");
}

// ---------- Photos --------------------------------------------------------

const stageSchema = z.enum(["before", "during", "after"]);

export async function registerPhotos(jobId: string, photos: { path: string; stage: string; room?: string }[]) {
  const { supabase } = await requireAdmin();
  const rows = photos.map((p, i) => ({
    job_id: jobId,
    storage_path: p.path,
    stage: stageSchema.parse(p.stage),
    room: p.room?.trim() || null,
    sort_order: i,
  }));
  const { error } = await supabase.from("job_photos").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${jobId}`);
}

export async function updatePhoto(photoId: string, patch: { stage?: string; room?: string; caption?: string; alt_text?: string }) {
  const { supabase } = await requireAdmin();
  const clean: Record<string, string | null> = {};
  if (patch.stage) clean.stage = stageSchema.parse(patch.stage);
  for (const k of ["room", "caption", "alt_text"] as const) if (k in patch) clean[k] = patch[k]?.trim() || null;
  const { data, error } = await supabase.from("job_photos").update(clean).eq("id", photoId).select("job_id").single();
  if (error) throw new Error(error.message);
  revalidatePath(`/jobs/${data.job_id}`);
}

/** Approving a photo copies it into the public bucket so the website can show it. */
export async function setPhotoApproved(photoId: string, approved: boolean) {
  const { supabase, email } = await requireAdmin();
  const { data: photo, error } = await supabase.from("job_photos").select("*").eq("id", photoId).single();
  if (error || !photo) throw new Error(error?.message ?? "Photo not found");

  let public_url: string | null = null;
  if (approved) {
    const dl = await supabase.storage.from("job-photos").download(photo.storage_path);
    if (dl.error) throw new Error(dl.error.message);
    const up = await supabase.storage
      .from("published-media")
      .upload(photo.storage_path, dl.data, { upsert: true, contentType: dl.data.type || "image/jpeg" });
    if (up.error) throw new Error(up.error.message);
    public_url = supabase.storage.from("published-media").getPublicUrl(photo.storage_path).data.publicUrl;
  } else {
    await supabase.storage.from("published-media").remove([photo.storage_path]);
  }
  await supabase.from("job_photos").update({ marketing_approved: approved, public_url }).eq("id", photoId);
  await log(supabase, {
    agent: "owner",
    action: approved ? "photo.approve" : "photo.unapprove",
    job_id: photo.job_id,
    actor_email: email,
    records_changed: [{ table: "job_photos", id: photoId }],
  });
  revalidatePath(`/jobs/${photo.job_id}`);
}

export async function deletePhoto(photoId: string) {
  const { supabase, email } = await requireAdmin();
  const { data: photo } = await supabase.from("job_photos").select("*").eq("id", photoId).single();
  if (!photo) return;
  await supabase.storage.from("job-photos").remove([photo.storage_path]);
  await supabase.storage.from("published-media").remove([photo.storage_path]);
  await supabase.from("job_photos").delete().eq("id", photoId);
  await log(supabase, { agent: "owner", action: "photo.delete", job_id: photo.job_id, actor_email: email, records_changed: [{ table: "job_photos", id: photoId }] });
  revalidatePath(`/jobs/${photo.job_id}`);
}

// ---------- Marketing Agent ----------------------------------------------

export async function generateContent(jobId: string, instructions: string): Promise<{ error?: string }> {
  const { supabase, email } = await requireAdmin();
  const [{ data: job }, { data: photos }, settings] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).single(),
    supabase.from("job_photos").select("*").eq("job_id", jobId).eq("marketing_approved", true).order("sort_order"),
    loadSettings(supabase),
  ]);
  if (!job) return { error: "Job not found" };

  // Signed URLs so the model can look at private photos for 10 minutes.
  const paths = (photos ?? []).map((p) => p.storage_path);
  const signed = paths.length ? (await supabase.storage.from("job-photos").createSignedUrls(paths, 600)).data ?? [] : [];
  const photoInputs = (photos ?? []).map((p, i) => ({
    id: p.id as string,
    stage: p.stage as string,
    room: p.room as string | null,
    caption: p.caption as string | null,
    url: signed[i]?.signedUrl ?? "",
  })).filter((p) => p.url);

  const input = { job_id: jobId, photo_ids: photoInputs.map((p) => p.id), instructions: instructions || null };

  let result;
  try {
    result = await generatePackage({ settings, job: job as JobInput, photos: photoInputs, instructions: instructions || undefined });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await log(supabase, { agent: AGENT_NAME, action: "content.generate", job_id: jobId, actor_email: email, input, status: "error", error: message });
    return { error: `The agent couldn't finish: ${message}` };
  }
  const { pkg, usage, modelLabel } = result;

  // Supersede earlier unapproved drafts (soft — they stay in the database).
  const { data: existing } = await supabase.from("content_items").select("id,version,status").eq("job_id", jobId);
  const nextVersion = Math.max(0, ...(existing ?? []).map((r) => r.version as number)) + 1;
  const stale = (existing ?? []).filter((r) => r.status === "draft" || r.status === "pending_approval").map((r) => r.id);
  if (stale.length) {
    await supabase.from("content_items").update({ status: "rejected" }).in("id", stale);
  }

  const runId = await log(supabase, {
    agent: AGENT_NAME,
    action: "content.generate",
    job_id: jobId,
    actor_email: email,
    model: modelLabel,
    input,
    output: pkg,
    input_tokens: usage?.inputTokens,
    output_tokens: usage?.outputTokens,
  });

  const base = { job_id: jobId, version: nextVersion, status: "pending_approval", agent_run_id: runId ?? null };
  const rows = [
    { ...base, channel: "gbp_post", title: "Google Business Profile post", body: pkg.gbp_post.body, data: { cta: pkg.gbp_post.cta } },
    {
      ...base,
      channel: "case_study",
      title: pkg.case_study.title,
      body: pkg.case_study.body_markdown,
      data: {
        slug: slugify(pkg.case_study.slug || pkg.case_study.title),
        seo_title: pkg.case_study.seo_title,
        meta_description: pkg.case_study.meta_description,
        faq: pkg.case_study.faq,
      },
    },
    { ...base, channel: "instagram", title: "Instagram caption", body: pkg.instagram.caption, data: { hashtags: pkg.instagram.hashtags } },
    { ...base, channel: "facebook", title: "Facebook post", body: pkg.facebook.post, data: {} },
    { ...base, channel: "review_request", title: pkg.review_request.email_subject, body: pkg.review_request.email_body, data: { sms: pkg.review_request.sms } },
  ];
  const { data: inserted, error } = await supabase.from("content_items").insert(rows).select("id");
  if (error) return { error: error.message };

  // Fill alt text/captions only where the owner hasn't written their own.
  const ids = new Set(photoInputs.map((p) => p.id));
  for (const pt of pkg.photo_text) {
    if (!ids.has(pt.photo_id)) continue;
    const current = photos?.find((p) => p.id === pt.photo_id);
    await supabase
      .from("job_photos")
      .update({ alt_text: current?.alt_text || pt.alt_text, caption: current?.caption || pt.caption })
      .eq("id", pt.photo_id);
  }

  await supabase.from("jobs").update({ status: "in_review" }).eq("id", jobId);
  void inserted;
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/");
  return {};
}

// ---------- Review & approval --------------------------------------------

export async function saveContent(id: string, patch: { body?: string; title?: string; data?: Record<string, unknown> }) {
  const { supabase, email } = await requireAdmin();
  const { data: item } = await supabase.from("content_items").select("*").eq("id", id).single();
  if (!item) throw new Error("Draft not found");
  if (item.status === "published") throw new Error("Unpublish before editing.");
  const update: Record<string, unknown> = { status: "pending_approval", approved_at: null };
  if (patch.body !== undefined) update.body = patch.body;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.data) update.data = { ...(item.data ?? {}), ...patch.data };
  if (update.data && "slug" in (update.data as object)) {
    (update.data as Record<string, unknown>).slug = slugify(String((update.data as Record<string, unknown>).slug ?? ""));
  }
  await supabase.from("content_items").update(update).eq("id", id);
  await log(supabase, {
    agent: "owner",
    action: "content.edit",
    job_id: item.job_id,
    actor_email: email,
    input: { before: { title: item.title, body: item.body }, after: patch },
    records_changed: [{ table: "content_items", id }],
  });
  revalidatePath(`/jobs/${item.job_id}`);
}

const statusSchema = z.enum(["approved", "rejected", "published", "pending_approval"]);

export async function setContentStatus(id: string, status: string) {
  const { supabase, email } = await requireAdmin();
  const s = statusSchema.parse(status);
  const { data: item } = await supabase.from("content_items").select("*").eq("id", id).single();
  if (!item) throw new Error("Draft not found");
  if (s === "published" && item.channel === "case_study") throw new Error("Use Publish to website for case studies.");
  if (s === "published" && item.status !== "approved") throw new Error("Approve it first.");
  const patch: Record<string, unknown> = { status: s };
  if (s === "approved") patch.approved_at = new Date().toISOString();
  if (s === "published") patch.published_at = new Date().toISOString();
  if (s === "pending_approval") patch.approved_at = null;
  await supabase.from("content_items").update(patch).eq("id", id);
  await log(supabase, {
    agent: "owner",
    action: `content.${s}`,
    job_id: item.job_id,
    actor_email: email,
    input: { channel: item.channel, from: item.status, to: s },
    records_changed: [{ table: "content_items", id }],
  });
  revalidatePath(`/jobs/${item.job_id}`);
  revalidatePath("/");
}

export async function publishCaseStudy(id: string): Promise<{ error?: string; url?: string }> {
  const { supabase, email } = await requireAdmin();
  const { data: item } = await supabase.from("content_items").select("*").eq("id", id).single();
  if (!item || item.channel !== "case_study") return { error: "Not a case study" };
  if (item.status !== "approved") return { error: "Approve the case study before publishing." };
  const { data: job } = await supabase.from("jobs").select("*").eq("id", item.job_id).single();
  if (!job) return { error: "Job not found" };

  const { data: photos } = await supabase
    .from("job_photos")
    .select("public_url,alt_text,caption,stage,sort_order")
    .eq("job_id", job.id)
    .eq("marketing_approved", true)
    .not("public_url", "is", null)
    .order("sort_order");
  if (!photos?.length) return { error: "Approve at least one photo for marketing before publishing to the website." };

  // Unique slug across published projects.
  let slug = slugify(item.data?.slug || item.title || job.title);
  const { data: clash } = await supabase.from("published_projects").select("job_id").eq("slug", slug).maybeSingle();
  if (clash && clash.job_id !== job.id) slug = `${slug}-${job.id.slice(0, 6)}`;

  const now = new Date().toISOString();
  await supabase.from("published_projects").delete().eq("job_id", job.id);
  const { error } = await supabase.from("published_projects").insert({
    slug,
    job_id: job.id,
    content_item_id: item.id,
    title: item.title,
    city: job.city,
    neighborhood: job.neighborhood,
    service_type: job.service_type,
    completed_on: job.completed_on,
    body_markdown: item.body,
    seo_title: item.data?.seo_title ?? null,
    meta_description: item.data?.meta_description ?? null,
    faq: item.data?.faq ?? [],
    photos: photos.map((p) => ({ url: p.public_url, alt: p.alt_text, caption: p.caption, stage: p.stage })),
    published_at: now,
  });
  if (error) return { error: error.message };

  await supabase.from("content_items").update({ status: "published", published_at: now, data: { ...item.data, slug } }).eq("id", id);
  await supabase.from("jobs").update({ status: "published", slug }).eq("id", job.id);
  await log(supabase, {
    agent: "owner",
    action: "case_study.publish",
    job_id: job.id,
    actor_email: email,
    input: { slug },
    records_changed: [{ table: "published_projects", id: slug }, { table: "content_items", id }],
  });
  revalidatePath(`/jobs/${job.id}`);
  return { url: `https://www.pixelvalleypainting.com/projects/${slug}` };
}

export async function unpublishCaseStudy(id: string) {
  const { supabase, email } = await requireAdmin();
  const { data: item } = await supabase.from("content_items").select("*").eq("id", id).single();
  if (!item) throw new Error("Not found");
  await supabase.from("published_projects").delete().eq("job_id", item.job_id);
  await supabase.from("content_items").update({ status: "approved", published_at: null }).eq("id", id);
  await supabase.from("jobs").update({ status: "in_review" }).eq("id", item.job_id);
  await log(supabase, {
    agent: "owner",
    action: "case_study.unpublish",
    job_id: item.job_id,
    actor_email: email,
    records_changed: [{ table: "published_projects", id: item.data?.slug }, { table: "content_items", id }],
  });
  revalidatePath(`/jobs/${item.job_id}`);
}
