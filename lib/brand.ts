export const BRAND = {
  coastal: "#0d3b66",
  coastalDeep: "#082541",
  aqua: "#00b6b1",
  coral: "#ff6b5e",
  mint: "#a8e6cf",
  cloud: "#e6e9ec",
  white: "#ffffff",
} as const;

/** Same mark as the public site's PixelMark: 0 empty, 1 coastal, 2 aqua, 3 mint, 4 cloud, 5 coral. */
export const MARK_GRID = [
  [0, 0, 1, 2, 0, 0],
  [0, 1, 4, 3, 2, 0],
  [1, 2, 1, 4, 3, 5],
  [4, 3, 2, 1, 4, 2],
  [1, 4, 3, 2, 1, 3],
  [2, 1, 4, 3, 2, 1],
];

export const MARK_COLORS: Record<number, string> = {
  1: BRAND.coastal,
  2: BRAND.aqua,
  3: BRAND.mint,
  4: BRAND.cloud,
  5: BRAND.coral,
};

export const MARK_OUTLINE = "M32 4 L60 24 L60 30 L54 30 L54 58 L10 58 L10 30 L4 30 L4 24 Z";

export const STRIP = [1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 1, 2, 3, 5, 1, 2, 4, 3, 1, 2, 1, 4, 3];
