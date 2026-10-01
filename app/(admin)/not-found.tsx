import Link from "next/link";
export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md text-center">
      <p>That page doesn&apos;t exist.</p>
      <Link href="/" className="mt-3 inline-block text-coastal-700 hover:underline">Back to dashboard</Link>
    </div>
  );
}
