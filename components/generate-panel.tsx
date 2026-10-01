"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateContent } from "@/app/(admin)/jobs/actions";

export function GeneratePanel({ jobId, hasDrafts, approvedPhotos }: { jobId: string; hasDrafts: boolean; approvedPhotos: number }) {
  const router = useRouter();
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function go() {
    setError(null);
    start(async () => {
      const res = await generateContent(jobId, instructions);
      if (res?.error) setError(res.error);
      else {
        setInstructions("");
        router.refresh();
      }
    });
  }

  return (
    <div className="card border-coastal-600/40 bg-coastal-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-coastal-900">{hasDrafts ? "Redraft with the agent" : "Draft the content package"}</h2>
          <p className="text-sm text-coastal-800/80">
            GBP post, project page, Instagram, Facebook and a review request. {approvedPhotos} photo{approvedPhotos === 1 ? "" : "s"} approved for the agent to look at.
            {hasDrafts && " Unapproved drafts get replaced; approved and published items stay."}
          </p>
        </div>
      </div>
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={2}
        placeholder={hasDrafts ? "What should change? e.g. “Lead with the wood-rot repair, shorter GBP post”" : "Optional notes for the agent"}
        className="input mt-3"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={go} disabled={pending} className="btn-primary">
          {pending ? "Drafting… (30–90 seconds)" : hasDrafts ? "Redraft" : "Draft content"}
        </button>
        {approvedPhotos === 0 && !pending && <span className="text-sm text-amber-800">Tip: approve a few photos first so the agent can write alt text and you can publish the project page.</span>}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
