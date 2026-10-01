const styles: Record<string, string> = {
  intake: "bg-stone-100 text-stone-700",
  generated: "bg-sky-100 text-sky-800",
  in_review: "bg-amber-100 text-amber-800",
  published: "bg-coastal-100 text-coastal-800",
  archived: "bg-stone-100 text-stone-500",
  draft: "bg-stone-100 text-stone-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-sky-100 text-sky-800",
  rejected: "bg-red-100 text-red-700",
  ok: "bg-coastal-100 text-coastal-800",
  error: "bg-red-100 text-red-700",
};
const labels: Record<string, string> = {
  intake: "Needs content",
  in_review: "In review",
  pending_approval: "Pending approval",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${styles[status] ?? "bg-stone-100"}`}>{labels[status] ?? status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</span>;
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = d.length === 10 ? new Date(`${d}T12:00:00`) : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" });
}
