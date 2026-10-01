"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <p className="font-medium">Something went wrong.</p>
      <p className="mt-1 text-sm text-stone-500">{error.message}</p>
      <button onClick={reset} className="btn-secondary mt-3">Try again</button>
    </div>
  );
}
