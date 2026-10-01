import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component — middleware refreshes the session instead
          }
        },
      },
    },
  );
}

/** Returns the signed-in admin's email, or null when not signed in / not on the allowlist. */
export async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { supabase, user: null, isAdmin: false } as const;
  const { data } = await supabase.from("admin_users").select("email").maybeSingle();
  return { supabase, user, isAdmin: !!data } as const;
}

export async function requireAdmin() {
  const ctx = await getAdmin();
  if (!ctx.user || !ctx.isAdmin) throw new Error("Not authorized");
  return { supabase: ctx.supabase, email: ctx.user.email! };
}
