/** Colors sampled from the official Pixel Valley Painting logo. */
export const BRAND = {
  coastal: "#0a2f5a",
  coastalDeep: "#071f3d",
  aqua: "#0e9b9d",
  coral: "#f6721e",
  mint: "#9fdcdc",
  cloud: "#e6e9ec",
  white: "#ffffff",
} as const;

export const LOGO = {
  full: { src: "/brand/logo-full.png", width: 1042, height: 741 },
  mark: { src: "/brand/logo-mark.png", width: 929, height: 493 },
  horizontal: { src: "/brand/logo-horizontal.png", width: 1464, height: 240 },
} as const;

/** Pixel strip follows the logo left to right: teal houses, navy center, orange right. */
export const STRIP_COLORS = [BRAND.aqua, BRAND.coastal, BRAND.coral] as const;
