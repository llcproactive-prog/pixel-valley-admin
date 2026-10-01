import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/server";
import { StatusPill } from "@/components/status";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const { supabase } = await requireAdmin();
  const { data: runs } = await supabase
    .from("agent_runs")
    .select("id,created_at,agent,action,job_id,actor_email,model,status,error,input_tokens,output_tokens,records_changed")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-stone-500">Every agent run and every approval, newest first. This log can&apos;t be edited.</p>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Result</th>
              <th className="px-4 py-2">Job</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(runs ?? []).map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-2 text-stone-500">
                  {new Date(r.created_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </td>
                <td className="px-4 py-2 capitalize">{r.agent === "owner" ? "You" : `${r.agent} agent`}</td>
                <td className="px-4 py-2">
                  <div>{r.action}</div>
                  {r.model && <div className="text-xs text-stone-400">{r.model}{r.output_tokens ? ` · ${r.input_tokens}→${r.output_tokens} tokens` : ""}</div>}
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={r.status} />
                  {r.error && <div className="mt-1 max-w-xs text-xs text-red-700">{r.error}</div>}
                </td>
                <td className="px-4 py-2">{r.job_id ? <Link href={`/jobs/${r.job_id}`} className="text-coastal-700 hover:underline">Open</Link> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!runs?.length && <p className="p-4 text-sm text-stone-500">No activity yet.</p>}
      </div>
    </div>
  );
}
