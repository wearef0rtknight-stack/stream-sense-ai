/** Filter vocabulary only — all title data now comes from the live waterfall backend. */

export const CATEGORIES = [
  "Movies",
  "Web Series",
  "Anime",
  "Documentary",
  "Cartoon",
  "Short Drama",
] as const;

export const PLATFORMS = [
  "Netflix",
  "Prime Video",
  "JioCinema",
  "Disney+ Hotstar",
  "Zee5",
  "SonyLIV",
] as const;

export const AUDIO = ["Only Hindi Dubbed", "Original English", "Regional Languages"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Audio = (typeof AUDIO)[number];
export type HindiStatus = "verified" | "user" | "none";

export const SUGGESTED_TAGS = [
  "prison se bhagne wale group",
  "bank loot",
  "talwar wale ninja",
  "real story",
  "bachchon ke liye",
  "love story",
];
