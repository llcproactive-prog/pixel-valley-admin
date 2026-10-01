import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { PixelMark, PixelStrip } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getAdmin();
  if (!user) redirect("/login");
  if (!isAdmin) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="card max-w-sm text-center">
          <h1 className="text-lg font-semibold">No access</h1>
          <p className="mt-2 text-sm text-stone-600">{user.email} isn&apos;t on the Pixel Valley admin list.</p>
          <form action="/auth/signout" method="post" className="mt-4">
            <button className="btn-secondary">Sign out</button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-coastal-700 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <PixelMark className="h-7 w-7" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="font-heading text-sm font-bold tracking-tight">Pixel Valley</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-mint">Admin</span>
            </span>
          </Link>
          <Nav />
          <form action="/auth/signout" method="post" className="ml-auto shrink-0">
            <button className="text-sm text-coastal-100/80 hover:text-white">Sign out</button>
          </form>
        </div>
        <PixelStrip />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
