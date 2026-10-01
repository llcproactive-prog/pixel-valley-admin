"use client";

import { useState, useTransition } from "react";
import { publishCaseStudy, saveContent, setContentStatus, unpublishCaseStudy } from "@/app/(admin)/jobs/actions";
import { StatusPill } from "./status";
import type { Flag } from "@/lib/content-rules";

export type ContentView = {
  id: string;
  channel: string;
  title: string | null;
  body: string;
  data: Record<string, unknown>;
  status: string;
  version: number;
};

const CHANNEL: Record<string, { label: string; where: string }> = {
  gbp_post: { label: "Google Business Profile post", where: "Paste into Google Business Profile → Add update" },
  case_study: { label: "Project page (website)", where: "Publishes to pixelvalleypainting.com/projects" },
  instagram: { label: "Instagram caption", where: "Paste with your after photo" },
  facebook: { label: "Facebook post", where: "Paste on the business page" },
  review_request: { label: "Review request", where: "Send to the homeowner by text or email" },
};

export function ContentCard({ item, flags }: { item: ContentView; flags: Flag[] }) {
  const meta = CHANNEL[item.channel] ?? { label: item.channel, where: "" };
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title ?? "");
  const [body, setBody] = useState(item.body);
  const [extra, setExtra] = useState<Record<string, string>>(() => initialExtra(item));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const blocked = flags.some((f) => f.level === "block");
  const locked = item.status === "published";

  const run = (fn: () => Promise<unknown>, ok?: string) =>
    start(async () => {
      setMsg(null);
      try {
        const res = (await fn()) as { error?: string; url?: string } | undefined;
        if (res?.error) setMsg({ kind: "err", text: res.error });
        else if (res?.url) setMsg({ kind: "ok", text: `Live at ${res.url} (once the website has the /projects page)` });
        else if (ok) setMsg({ kind: "ok", text: ok });
      } catch (e) {
        setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed" });
      }
    });

  function save() {
    const data: Record<string, unknown> = {};
    if (item.channel === "instagram") data.hashtags = extra.hashtags.split(/[\s,]+/).map((h) => h.replace(/^#/, "")).filter(Boolean);
    if (item.channel === "review_request") data.sms = extra.sms;
    if (item.channel === "case_study") {
      data.slug = extra.slug;
      data.seo_title = extra.seo_title;
      data.meta_description = extra.meta_description;
    }
    run(async () => {
      await saveContent(item.id, { title, body, data });
      setEditing(false);
    }, "Saved — re-approve when ready");
  }

  const copyText = buildCopy(item);

  return (
    <article className="card">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{meta.label}</h3>
          <p className="text-xs text-stone-500">{meta.where} · v{item.version}</p>
        </div>
        <StatusPill status={item.status} />
      </header>

      {flags.length > 0 && (
        <ul className="mt-3 space-y-1">
          {flags.map((f, i) => (
            <li key={i} className={`rounded-md px-2.5 py-1.5 text-xs ${f.level === "block" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
              {f.level === "block" ? "Fix before approving: " : "Check: "}
              {f.message}
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <div className="mt-3 space-y-3">
          {(item.channel === "case_study" || item.channel === "review_request") && (
            <div>
              <label className="label">{item.channel === "review_request" ? "Email subject" : "Page title"}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
            </div>
          )}
          {item.channel === "case_study" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">URL slug</label>
                <input value={extra.slug} onChange={(e) => setExtra({ ...extra, slug: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">SEO title <span className="font-normal text-stone-400">({extra.seo_title.length}/60)</span></label>
                <input value={extra.seo_title} onChange={(e) => setExtra({ ...extra, seo_title: e.target.value })} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Meta description <span className="font-normal text-stone-400">({extra.meta_description.length}/155)</span></label>
                <input value={extra.meta_description} onChange={(e) => setExtra({ ...extra, meta_description: e.target.value })} className="input" />
              </div>
            </div>
          )}
          <div>
            <label className="label">
              {item.channel === "review_request" ? "Email body" : "Text"}
              {item.channel === "gbp_post" && <span className="font-normal text-stone-400"> ({body.length}/1500)</span>}
            </label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={item.channel === "case_study" ? 16 : 7} className="input font-mono text-sm" />
          </div>
          {item.channel === "review_request" && (
            <div>
              <label className="label">Text message</label>
              <textarea value={extra.sms} onChange={(e) => setExtra({ ...extra, sms: e.target.value })} rows={3} className="input" />
            </div>
          )}
          {item.channel === "instagram" && (
            <div>
              <label className="label">Hashtags</label>
              <input value={extra.hashtags} onChange={(e) => setExtra({ ...extra, hashtags: e.target.value })} className="input" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={save} disabled={pending} className="btn-primary">Save</button>
            <button onClick={() => setEditing(false)} disabled={pending} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {item.title && (item.channel === "case_study" || item.channel === "review_request") && (
            <div className="text-sm"><span className="text-stone-500">{item.channel === "review_request" ? "Subject: " : "Title: "}</span><strong>{item.title}</strong></div>
          )}
          {item.channel === "case_study" && (
            <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
              <div><span className="text-stone-400">URL:</span> /projects/{String(item.data.slug ?? "")}</div>
              <div><span className="text-stone-400">SEO title:</span> {String(item.data.seo_title ?? "")}</div>
              <div><span className="text-stone-400">Meta:</span> {String(item.data.meta_description ?? "")}</div>
            </div>
          )}
          <div className={`whitespace-pre-wrap rounded-lg border border-stone-100 bg-white p-3 text-sm leading-relaxed ${item.channel === "case_study" ? "max-h-96 overflow-y-auto" : ""}`}>
            {item.body}
          </div>
          {item.channel === "case_study" && Array.isArray(item.data.faq) && item.data.faq.length > 0 && (
            <div className="rounded-lg border border-stone-100 p-3 text-sm">
              <div className="mb-1 font-medium">FAQ</div>
              {(item.data.faq as { q: string; a: string }[]).map((f, i) => (
                <div key={i} className="mt-2"><div className="font-medium">{f.q}</div><div className="text-stone-600">{f.a}</div></div>
              ))}
            </div>
          )}
          {item.channel === "instagram" && Array.isArray(item.data.hashtags) && (
            <p className="text-sm text-sky-800">{(item.data.hashtags as string[]).map((h) => `#${h}`).join(" ")}</p>
          )}
          {item.channel === "review_request" && (
            <div className="rounded-lg border border-stone-100 p-3 text-sm">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Text message</div>
              {String(item.data.sms ?? "")}
            </div>
          )}
        </div>
      )}

      {!editing && (
        <footer className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(copyText).then(() => setMsg({ kind: "ok", text: "Copied" }))}
            className="btn-secondary"
          >
            Copy
          </button>
          {!locked && <button onClick={() => setEditing(true)} disabled={pending} className="btn-secondary">Edit</button>}
          {item.status === "pending_approval" && (
            <>
              <button
                onClick={() => run(() => setContentStatus(item.id, "approved"), "Approved")}
                disabled={pending || blocked}
                title={blocked ? "Fix the red items first" : undefined}
                className="btn-primary"
              >
                Approve
              </button>
              <button onClick={() => run(() => setContentStatus(item.id, "rejected"))} disabled={pending} className="btn-danger">Reject</button>
            </>
          )}
          {item.status === "approved" && item.channel === "case_study" && (
            <button
              onClick={() => confirm("Publish this project page to the public website feed?") && run(() => publishCaseStudy(item.id))}
              disabled={pending}
              className="btn-primary"
            >
              Publish to website
            </button>
          )}
          {item.status === "approved" && item.channel !== "case_study" && (
            <button onClick={() => run(() => setContentStatus(item.id, "published"), "Marked as posted")} disabled={pending} className="btn-primary">
              I posted it
            </button>
          )}
          {item.status === "approved" && (
            <button onClick={() => run(() => setContentStatus(item.id, "pending_approval"))} disabled={pending} className="btn-secondary">Un-approve</button>
          )}
          {item.status === "published" && item.channel === "case_study" && (
            <button onClick={() => confirm("Take this page off the website?") && run(() => unpublishCaseStudy(item.id))} disabled={pending} className="btn-danger">
              Unpublish
            </button>
          )}
        </footer>
      )}
      {msg && <p className={`mt-2 text-sm ${msg.kind === "err" ? "text-red-700" : "text-coastal-700"}`}>{msg.text}</p>}
    </article>
  );
}

function initialExtra(item: ContentView): Record<string, string> {
  return {
    hashtags: Array.isArray(item.data.hashtags) ? (item.data.hashtags as string[]).map((h) => `#${h}`).join(" ") : "",
    sms: String(item.data.sms ?? ""),
    slug: String(item.data.slug ?? ""),
    seo_title: String(item.data.seo_title ?? ""),
    meta_description: String(item.data.meta_description ?? ""),
  };
}

function buildCopy(item: ContentView): string {
  if (item.channel === "instagram" && Array.isArray(item.data.hashtags)) {
    return `${item.body}\n\n${(item.data.hashtags as string[]).map((h) => `#${h}`).join(" ")}`;
  }
  if (item.channel === "review_request") return `Subject: ${item.title}\n\n${item.body}\n\n---\nText:\n${item.data.sms ?? ""}`;
  return item.body;
}
