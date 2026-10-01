import { requireAdmin } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const s = await loadSettings(supabase);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-stone-500">Business rules the agents follow. Change them here, not in prompts.</p>
      </div>
      <SettingsForm s={s} />
    </div>
  );
}
