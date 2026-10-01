import Image from "next/image";
import { LOGO, STRIP_COLORS } from "@/lib/brand";

type Variant = keyof typeof LOGO;

export function Logo({ variant = "full", className, priority }: { variant?: Variant; className?: string; priority?: boolean }) {
  const l = LOGO[variant];
  return <Image src={l.src} width={l.width} height={l.height} alt="Pixel Valley Painting" className={className} priority={priority} />;
}

export function PixelStrip({ className = "" }: { className?: string }) {
  const cells = 72;
  return (
    <div aria-hidden className={`flex h-1.5 w-full ${className}`}>
      {Array.from({ length: cells }, (_, i) => {
        const band = Math.min(Math.floor((i / cells) * 3), 2);
        const scatter = (i * 7) % 11 === 0 && band > 0 ? band - 1 : band;
        return <span key={i} className="h-full flex-1" style={{ background: STRIP_COLORS[scatter] }} />;
      })}
    </div>
  );
}
