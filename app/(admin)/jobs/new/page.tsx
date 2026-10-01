import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { JobForm } from "@/components/job-form";
import { createJob } from "../actions";

export const metadata = { title: "Log a finished job" };

export default async function NewJobPage() {
  const { supabase } = await requireAdmin();
  const settings = await loadSettings(supabase);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/jobs" className="text-sm text-coastal-700 hover:underline">← Marketing</Link>
      <div>
        <h1 className="text-2xl font-semibold">Log a finished job</h1>
        <p className="text-sm text-stone-500">Two minutes from your phone. Add photos on the next screen.</p>
      </div>
      <JobForm action={createJob} cities={settings.service_cities} submitLabel="Save & add photos" />
    </div>
  );
}
