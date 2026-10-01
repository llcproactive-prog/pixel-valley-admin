"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(admin)/jobs/actions";

type Job = Partial<{
  title: string; city: string; neighborhood: string | null; service_type: string; surfaces: string | null;
  starting_condition: string | null; prep_work: string | null; products: string | null; colors: string | null;
  method: string | null; repairs: string | null; duration_days: number | null; completed_on: string | null;
  customer_first_name: string | null; customer_name_ok: boolean; homeowner_questions: string | null; notes: string | null;
}>;

const SERVICES = ["Interior painting", "Exterior painting", "Cabinet refinishing", "Deck / fence staining", "Drywall repair & paint", "Commercial painting", "Wallpaper removal"];

export function JobForm({
  action,
  job = {},
  cities,
  submitLabel,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  job?: Job;
  cities: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = (k: keyof Job) => (job[k] ?? "") as string;

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="card grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Basics</legend>
        <Field label="Job title" hint="Short and specific — e.g. “Willow Glen craftsman exterior”" className="sm:col-span-2">
          <input name="title" required defaultValue={v("title")} className="input" />
        </Field>
        <Field label="Service">
          <input name="service_type" required list="services" defaultValue={v("service_type")} className="input" />
          <datalist id="services">{SERVICES.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="City">
          <input name="city" required list="cities" defaultValue={v("city")} className="input" />
          <datalist id="cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Neighborhood" hint="Optional">
          <input name="neighborhood" defaultValue={v("neighborhood")} className="input" />
        </Field>
        <Field label="Completed on">
          <input name="completed_on" type="date" defaultValue={v("completed_on")} className="input" />
        </Field>
      </fieldset>

      <fieldset className="card grid gap-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-stone-800">The work — the agent only uses what you write here</legend>
        <Field label="Surfaces" hint="Walls, trim, ceilings, siding, doors…">
          <textarea name="surfaces" rows={2} defaultValue={v("surfaces")} className="input" />
        </Field>
        <Field label="Starting condition" hint="Peeling, water stains, dated color…">
          <textarea name="starting_condition" rows={2} defaultValue={v("starting_condition")} className="input" />
        </Field>
        <Field label="Prep work" hint="Your differentiator — be specific">
          <textarea name="prep_work" rows={3} defaultValue={v("prep_work")} className="input" />
        </Field>
        <Field label="Repairs" hint="Wood rot, drywall, caulk…">
          <textarea name="repairs" rows={3} defaultValue={v("repairs")} className="input" />
        </Field>
        <Field label="Products & sheen" hint="e.g. Benjamin Moore Aura, satin">
          <input name="products" defaultValue={v("products")} className="input" />
        </Field>
        <Field label="Colors" hint="Names/codes, if the homeowner is OK sharing">
          <input name="colors" defaultValue={v("colors")} className="input" />
        </Field>
        <Field label="Method" hint="Spray / brush / roll, number of coats">
          <input name="method" defaultValue={v("method")} className="input" />
        </Field>
        <Field label="Duration (days)">
          <input name="duration_days" inputMode="decimal" defaultValue={job.duration_days ?? ""} className="input" />
        </Field>
      </fieldset>

      <fieldset className="card grid gap-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-stone-800">Homeowner</legend>
        <Field label="Customer first name" hint="Used only for the review request unless you allow it below">
          <input name="customer_first_name" defaultValue={v("customer_first_name")} className="input" />
        </Field>
        <label className="flex items-start gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="customer_name_ok" defaultChecked={!!job.customer_name_ok} className="mt-0.5 size-4 accent-coastal-700" />
          <span>Customer OK’d using their first name in public content</span>
        </label>
        <Field label="Questions they asked" hint="Becomes real FAQs on the project page" className="sm:col-span-2">
          <textarea name="homeowner_questions" rows={2} defaultValue={v("homeowner_questions")} className="input" />
        </Field>
        <Field label="Anything else" className="sm:col-span-2">
          <textarea name="notes" rows={2} defaultValue={v("notes")} className="input" />
        </Field>
      </fieldset>

      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="label">
        {label}
        {hint && <span className="ml-1 font-normal text-stone-400">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
