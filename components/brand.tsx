import { MARK_COLORS, MARK_GRID, MARK_OUTLINE, STRIP } from "@/lib/brand";

export function PixelMark({ className = "h-8 w-8", outline = "#0d3b66" }: { className?: string; outline?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Pixel Valley Painting">
      <path d={MARK_OUTLINE} fill="none" stroke={outline} strokeWidth="3.5" strokeLinejoin="round" />
      <g transform="translate(16 30)">
        {MARK_GRID.map((row, r) =>
          row.map((c, i) =>
            c === 0 ? null : (
              <rect key={`${r}-${i}`} x={i * 5.2} y={r * 4.4} width={4.4} height={3.6} rx={0.6} fill={MARK_COLORS[c]} />
            ),
          ),
        )}
      </g>
    </svg>
  );
}

export function PixelStrip({ className = "" }: { className?: string }) {
  const cells = Array.from({ length: 72 }, (_, i) => STRIP[i % STRIP.length]);
  return (
    <div aria-hidden className={`flex h-1.5 w-full ${className}`}>
      {cells.map((c, i) => (
        <span key={i} className="h-full flex-1" style={{ background: MARK_COLORS[c] }} />
      ))}
    </div>
  );
}
