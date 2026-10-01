import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Logo, PixelStrip } from "@/components/brand";

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
      <header className="sticky top-0 z-20 border-b border-cloud bg-white text-coastal-700">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Pixel Valley Painting admin home">
            <Logo variant="mark" className="h-8 w-auto sm:hidden" priority />
            <Logo variant="horizontal" className="hidden h-8 w-auto sm:block" priority />
            <span className="hidden rounded-md bg-coastal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-coastal-700 lg:inline">Admin</span>
          </Link>
          <Nav />
          <form action="/auth/signout" method="post" className="ml-auto shrink-0">
            <button className="text-sm text-stone-500 hover:text-coastal-700">Sign out</button>
          </form>
        </div>
        <PixelStrip />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
