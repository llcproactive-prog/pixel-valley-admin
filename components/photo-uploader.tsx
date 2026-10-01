"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerPhotos } from "@/app/(admin)/jobs/actions";

const MAX_EDGE = 2000;

async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file; // e.g. HEIC on desktop Chrome — upload the original
  }
}

export function PhotoUploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState("after");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const supabase = createClient();
    const done: { path: string; stage: string; room?: string }[] = [];
    try {
      let i = 0;
      for (const file of Array.from(files)) {
        i++;
        setBusy(`Uploading ${i} of ${files.length}…`);
        const blob = await downscale(file);
        const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${jobId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("job-photos").upload(path, blob, { contentType: blob.type || file.type });
        if (error) throw error;
        done.push({ path, stage, room });
      }
      await registerPhotos(jobId, done);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      if (done.length) await registerPhotos(jobId, done).catch(() => {});
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Stage</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="input w-auto">
            <option value="before">Before</option>
            <option value="during">During</option>
            <option value="after">After</option>
          </select>
        </div>
        <div className="min-w-40 flex-1">
          <label className="label">Room / area <span className="font-normal text-stone-400">— optional</span></label>
          <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Kitchen, front elevation…" className="input" />
        </div>
        <label className="btn-primary cursor-pointer">
          {busy ?? "Add photos"}
          <input ref={input} type="file" accept="image/*" multiple className="hidden" disabled={!!busy} onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
