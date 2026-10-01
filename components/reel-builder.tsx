"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND, LOGO, STRIP_COLORS } from "@/lib/brand";

type ReelPhoto = { id: string; url: string | null };
type Format = "story" | "square" | "wide";

const FORMATS: Record<Format, { label: string; w: number; h: number }> = {
  story: { label: "9:16 Reel / Story", w: 1080, h: 1920 },
  square: { label: "1:1 Feed", w: 1080, h: 1080 },
  wide: { label: "16:9 YouTube", w: 1920, h: 1080 },
};

const INTRO = 1.8;
const OUTRO = 2.6;
const FADE = 0.45;

function fontVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function pickMime() {
  const options = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

type Logos = { full: HTMLImageElement; mark: HTMLImageElement };

function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, cx: number, cy: number, width: number) {
  if (!img) return 0;
  const height = (img.height / img.width) * width;
  ctx.drawImage(img, cx - width / 2, cy - height / 2, width, height);
  return height;
}

function drawStrip(ctx: CanvasRenderingContext2D, y: number, w: number, h: number) {
  const cells = 48;
  const cw = w / cells;
  for (let i = 0; i < cells; i++) {
    const band = Math.min(Math.floor((i / cells) * 3), 2);
    const scatter = (i * 7) % 11 === 0 && band > 0 ? band - 1 : band;
    ctx.fillStyle = STRIP_COLORS[scatter];
    ctx.fillRect(i * cw, y, Math.ceil(cw), h);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function ReelBuilder({
  photos,
  title,
  location,
  service,
}: {
  photos: ReelPhoto[];
  title: string;
  location: string;
  service: string;
}) {
  const usable = useMemo(() => photos.filter((p): p is { id: string; url: string } => !!p.url), [photos]);
  const [selected, setSelected] = useState<string[]>(() => usable.slice(0, 8).map((p) => p.id));
  const [format, setFormat] = useState<Format>("story");
  const [perPhoto, setPerPhoto] = useState(2.4);
  const [headline, setHeadline] = useState(title);
  const [cta, setCta] = useState("Free quotes · pixelvalleypainting.com");
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "recording" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [download, setDownload] = useState<{ url: string; ext: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const logosRef = useRef<Partial<Logos>>({});
  const rafRef = useRef<number | null>(null);

  const order = useMemo(() => usable.filter((p) => selected.includes(p.id)).sort((a, b) => selected.indexOf(a.id) - selected.indexOf(b.id)), [usable, selected]);
  const duration = INTRO + order.length * perPhoto + OUTRO;
  const { w, h } = FORMATS[format];

  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const ensureImages = useCallback(async () => {
    const missing = order.filter((p) => !imagesRef.current.has(p.id));
    if (!logosRef.current.full || !logosRef.current.mark) {
      const [full, mark] = await Promise.all([loadImage(LOGO.full.src), loadImage(LOGO.mark.src)]);
      logosRef.current = { full, mark };
    }
    await Promise.all(
      missing.map(async (p) => {
        imagesRef.current.set(p.id, await loadImage(p.url));
      }),
    );
    await document.fonts.ready;
  }, [order]);

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, t: number) => {
      const heading = fontVar("--font-montserrat", "sans-serif");
      const body = fontVar("--font-inter", "sans-serif");
      const unit = Math.min(w, h) / 1080;
      const pad = 72 * unit;
      const logos = logosRef.current;

      ctx.fillStyle = BRAND.white;
      ctx.fillRect(0, 0, w, h);

      const photoStart = INTRO;
      const photoEnd = INTRO + order.length * perPhoto;

      if (t >= photoStart - FADE && t <= photoEnd + FADE && order.length) {
        const local = Math.min(Math.max(t - photoStart, 0), order.length * perPhoto - 0.001);
        const idx = Math.floor(local / perPhoto);
        const drawPhoto = (i: number, alpha: number) => {
          const img = imagesRef.current.get(order[i]?.id ?? "");
          if (!img || alpha <= 0) return;
          const p = Math.min(Math.max((t - photoStart - i * perPhoto) / perPhoto, 0), 1);
          const zoom = 1.04 + 0.08 * (i % 2 === 0 ? p : 1 - p);
          const scale = Math.max(w / img.width, h / img.height) * zoom;
          const dw = img.width * scale;
          const dh = img.height * scale;
          const drift = (i % 2 === 0 ? 1 : -1) * (p - 0.5) * 40 * unit;
          ctx.globalAlpha = alpha;
          ctx.drawImage(img, (w - dw) / 2 + drift, (h - dh) / 2, dw, dh);
          ctx.globalAlpha = 1;
        };
        const into = local - idx * perPhoto;
        drawPhoto(idx, 1);
        if (into < FADE && idx > 0) drawPhoto(idx - 1, 1 - into / FADE);
        const edgeIn = Math.min((t - photoStart + FADE) / FADE, 1);
        const edgeOut = Math.min((photoEnd + FADE - t) / FADE, 1);
        if (edgeIn < 1 || edgeOut < 1) {
          ctx.fillStyle = BRAND.white;
          ctx.globalAlpha = 1 - Math.min(edgeIn, edgeOut);
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
        }

        const grad = ctx.createLinearGradient(0, h * 0.62, 0, h);
        grad.addColorStop(0, "rgba(7,31,61,0)");
        grad.addColorStop(1, "rgba(7,31,61,0.82)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, h * 0.6, w, h * 0.4);

        const badgeW = 220 * unit;
        const badgeH = 130 * unit;
        ctx.fillStyle = BRAND.white;
        ctx.beginPath();
        ctx.roundRect(pad, pad, badgeW, badgeH, 20 * unit);
        ctx.fill();
        drawLogo(ctx, logos.mark, pad + badgeW / 2, pad + badgeH / 2, badgeW - 36 * unit);

        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = BRAND.mint;
        ctx.font = `600 ${30 * unit}px ${body}`;
        ctx.fillText(location.toUpperCase(), pad, h - pad - 70 * unit);
        ctx.fillStyle = BRAND.white;
        ctx.font = `700 ${50 * unit}px ${heading}`;
        ctx.fillText(service, pad, h - pad - 10 * unit);
      }

      if (t < INTRO + FADE) {
        const a = t < INTRO ? 1 : 1 - (t - INTRO) / FADE;
        ctx.globalAlpha = a;
        ctx.fillStyle = BRAND.white;
        ctx.fillRect(0, 0, w, h);
        const k = ease(t / 0.7);
        drawLogo(ctx, logos.mark, w / 2, h / 2 - 170 * unit, 420 * unit * (0.9 + 0.1 * k));
        ctx.textAlign = "center";
        ctx.fillStyle = BRAND.coastal;
        ctx.font = `800 ${72 * unit}px ${heading}`;
        const lines = wrap(ctx, headline || title, w - pad * 2);
        lines.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 + 60 * unit + i * 84 * unit + (1 - k) * 30 * unit));
        ctx.fillStyle = BRAND.aqua;
        ctx.font = `600 ${32 * unit}px ${body}`;
        ctx.fillText(location.toUpperCase(), w / 2, h / 2 + 90 * unit + lines.length * 84 * unit);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }

      if (t > photoEnd) {
        const a = ease((t - photoEnd) / FADE);
        ctx.globalAlpha = a;
        ctx.fillStyle = BRAND.white;
        ctx.fillRect(0, 0, w, h);
        const logoH = drawLogo(ctx, logos.full, w / 2, h / 2 - 110 * unit, 620 * unit);
        ctx.textAlign = "center";
        ctx.fillStyle = BRAND.coastal;
        ctx.font = `600 ${36 * unit}px ${body}`;
        wrap(ctx, cta, w - pad * 2).forEach((line, i) => ctx.fillText(line, w / 2, h / 2 - 110 * unit + logoH / 2 + 90 * unit + i * 50 * unit));
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }

      drawStrip(ctx, h - 14 * unit, w, 14 * unit);
    },
    [order, perPhoto, w, h, headline, title, location, service, cta],
  );

  useEffect(() => {
    if (status !== "idle") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    ensureImages()
      .then(() => { if (!cancelled) drawFrame(ctx, INTRO + Math.min(perPhoto * 0.5, order.length * perPhoto)); })
      .catch(() => { if (!cancelled) drawFrame(ctx, 0.9); });
    return () => { cancelled = true; };
  }, [status, drawFrame, ensureImages, perPhoto, order.length]);

  const run = useCallback(
    async (record: boolean) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !order.length) return;
      setError(null);
      setStatus("loading");
      try {
        await ensureImages();
      } catch {
        setStatus("error");
        setError("Couldn't load one of the photos. Refresh the page and try again.");
        return;
      }

      let recorder: MediaRecorder | null = null;
      const chunks: Blob[] = [];
      const mime = pickMime();
      if (record) {
        if (!mime) {
          setStatus("error");
          setError("This browser can't record video. Try Chrome or Safari on a computer.");
          return;
        }
        if (download) URL.revokeObjectURL(download.url);
        setDownload(null);
        const stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime.split(";")[0] });
          setDownload({ url: URL.createObjectURL(blob), ext: mime.startsWith("video/mp4") ? "mp4" : "webm" });
          setStatus("idle");
        };
        recorder.start(250);
      }

      setStatus(record ? "recording" : "playing");
      const start = performance.now();
      const tick = (now: number) => {
        const t = (now - start) / 1000;
        drawFrame(ctx, Math.min(t, duration));
        setProgress(Math.min(t / duration, 1));
        if (t < duration) {
          rafRef.current = requestAnimationFrame(tick);
        } else if (recorder) {
          recorder.stop();
        } else {
          setStatus("idle");
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [order.length, ensureImages, drawFrame, duration, download],
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 15 ? s : [...s, id]));

  const busy = status === "loading" || status === "playing" || status === "recording";
  const fileName = `pixel-valley-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${format}`;

  if (!usable.length) {
    return (
      <section className="card flex flex-col gap-1">
        <h2 className="font-semibold">Video reel</h2>
        <p className="text-sm leading-relaxed text-stone-500">Mark at least one photo as approved for marketing to build a reel.</p>
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-5" aria-labelledby="reel-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="reel-heading" className="font-semibold">Video reel</h2>
          <p className="text-sm leading-relaxed text-stone-500">Branded slideshow of this job&apos;s approved photos, ready for Instagram, Facebook or YouTube.</p>
        </div>
        <span className="pill bg-aqua-50 text-coastal-700">{duration.toFixed(0)}s · {order.length} photos</span>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-3 lg:w-72">
          <div className="relative w-full overflow-hidden rounded-xl bg-coastal-900" style={{ aspectRatio: `${w} / ${h}`, maxHeight: 512 }}>
            <canvas ref={canvasRef} width={w} height={h} className="h-full w-full object-contain" aria-label="Reel preview" />
            {busy && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <div className="h-full bg-aqua transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            )}
          </div>
          <div className="flex w-full gap-2">
            <button type="button" onClick={() => run(false)} disabled={busy || !order.length} className="btn-secondary flex-1">
              {status === "playing" ? "Playing…" : "Preview"}
            </button>
            <button type="button" onClick={() => run(true)} disabled={busy || !order.length} className="btn-primary flex-1">
              {status === "recording" ? `Rendering ${Math.round(progress * 100)}%` : status === "loading" ? "Loading…" : "Create video"}
            </button>
          </div>
          {download && (
            <a href={download.url} download={`${fileName}.${download.ext}`} className="btn w-full bg-aqua font-semibold text-white hover:opacity-90">
              Download .{download.ext}
            </a>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <fieldset className="flex flex-col gap-2" disabled={busy}>
            <legend className="label">Format</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FORMATS) as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  aria-pressed={format === f}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${format === f ? "border-coastal-700 bg-coastal-700 text-white" : "border-stone-300 bg-white text-coastal-800 hover:bg-coastal-50"}`}
                >
                  {FORMATS[f].label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reel-headline" className="label">Opening headline</label>
              <input id="reel-headline" className="input" value={headline} maxLength={60} onChange={(e) => setHeadline(e.target.value)} disabled={busy} />
            </div>
            <div>
              <label htmlFor="reel-cta" className="label">Closing line</label>
              <input id="reel-cta" className="input" value={cta} maxLength={60} onChange={(e) => setCta(e.target.value)} disabled={busy} />
            </div>
          </div>

          <div>
            <label htmlFor="reel-pace" className="label">Seconds per photo: {perPhoto.toFixed(1)}</label>
            <input id="reel-pace" type="range" min={1.5} max={4} step={0.1} value={perPhoto} onChange={(e) => setPerPhoto(Number(e.target.value))} disabled={busy} className="w-full accent-coastal-700" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="label">Photos, in play order. Tap to add or remove (max 15).</p>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {usable.map((p) => {
                const pos = selected.indexOf(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      disabled={busy}
                      aria-pressed={pos >= 0}
                      aria-label={pos >= 0 ? `Remove photo ${pos + 1} from reel` : "Add photo to reel"}
                      className={`relative block aspect-square w-full overflow-hidden rounded-lg ring-2 transition ${pos >= 0 ? "ring-aqua" : "opacity-50 ring-transparent hover:opacity-80"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      {pos >= 0 && (
                        <span className="absolute top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded bg-coastal-700 px-1 text-[11px] font-bold text-white">
                          {pos + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-xs leading-relaxed text-stone-500">
            Rendered on this device in real time, so keep the tab open until it finishes. Safari exports MP4; Chrome exports WebM, which Instagram, Facebook and YouTube all accept.
          </p>
        </div>
      </div>
    </section>
  );
}
