"use client";

import { useTransition, useState } from "react";
import { setPhotoApproved, updatePhoto, deletePhoto } from "@/app/(admin)/jobs/actions";

export type PhotoView = {
  id: string; url: string | null; stage: string; room: string | null; caption: string | null; alt_text: string | null; marketing_approved: boolean;
};

export function PhotoGrid({ photos }: { photos: PhotoView[] }) {
  if (!photos.length) return <p className="text-sm text-stone-500">No photos yet. Before/after pairs perform best.</p>;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((p) => <PhotoCard key={p.id} photo={p} />)}
    </ul>
  );
}

function PhotoCard({ photo }: { photo: PhotoView }) {
  const [pending, start] = useTransition();
  const [alt, setAlt] = useState(photo.alt_text ?? "");
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => start(async () => {
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  });

  return (
    <li className={`overflow-hidden rounded-xl border bg-white ${photo.marketing_approved ? "border-coastal-600 ring-1 ring-coastal-600" : "border-stone-200"}`}>
      <div className="relative aspect-[4/3] bg-stone-100">
        {photo.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={photo.alt_text ?? ""} className="h-full w-full object-cover" loading="lazy" />
        )}
        <span className="pill absolute left-2 top-2 bg-black/60 capitalize text-white">{photo.stage}{photo.room ? ` · ${photo.room}` : ""}</span>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <select
            defaultValue={photo.stage}
            disabled={pending}
            onChange={(e) => run(() => updatePhoto(photo.id, { stage: e.target.value }))}
            className="input w-auto py-1"
          >
            <option value="before">Before</option>
            <option value="during">During</option>
            <option value="after">After</option>
          </select>
          <button
            disabled={pending}
            onClick={() => run(() => setPhotoApproved(photo.id, !photo.marketing_approved))}
            className={photo.marketing_approved ? "btn-primary flex-1 py-1" : "btn-secondary flex-1 py-1"}
          >
            {photo.marketing_approved ? "✓ OK for marketing" : "Approve for marketing"}
          </button>
        </div>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => alt !== (photo.alt_text ?? "") && run(() => updatePhoto(photo.id, { alt_text: alt }))}
          placeholder="Alt text (the agent fills this in)"
          className="input py-1 text-xs"
        />
        <div className="flex justify-end">
          <button
            disabled={pending}
            onClick={() => confirm("Delete this photo?") && run(() => deletePhoto(photo.id))}
            className="text-xs text-red-700 hover:underline"
          >
            Delete
          </button>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </li>
  );
}
