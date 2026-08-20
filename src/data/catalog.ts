import poster1 from "@/assets/poster-prison.jpg";
import poster2 from "@/assets/poster-anime.jpg";
import poster3 from "@/assets/poster-heist.jpg";
import poster4 from "@/assets/poster-doc.jpg";
import poster5 from "@/assets/poster-cartoon.jpg";
import poster6 from "@/assets/poster-drama.jpg";

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

export const AUDIO = [
  "Only Hindi Dubbed",
  "Original English",
  "Regional Languages",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Audio = (typeof AUDIO)[number];
export type HindiStatus = "verified" | "user" | "none";

export type Title = {
  id: string;
  name: string;
  year: number;
  poster: string;
  category: Category;
  platform: Platform;
  audio: Audio[];
  hindiStatus: HindiStatus;
  verifiedOn?: string;
  runtime: string;
  tomato: number;
  genres: string[];
  tags: string[];
  budget: string;
  boxOffice: string;
  analysis: string;
};

export const TITLES: Title[] = [
  {
    id: "breakout-block-7",
    name: "Breakout: Block 7",
    year: 2023,
    poster: poster1,
    category: "Web Series",
    platform: "Netflix",
    audio: ["Only Hindi Dubbed", "Original English"],
    hindiStatus: "verified",
    verifiedOn: "12 Aug 2026",
    runtime: "8 eps · 48m",
    tomato: 93,
    genres: ["Thriller", "Prison Break", "Survival"],
    tags: ["prison se bhagne wale group", "escape plan", "tunnel", "brotherhood"],
    budget: "$42 million",
    boxOffice: "$0 (streaming original)",
    analysis:
      "A tightly wound ensemble escape drama that trades gunfire for engineering. Every episode ends on a mechanical cliffhanger, which makes it near-impossible to stop at one. The Hindi dub is unusually strong — slang is localised rather than translated, so the humour lands.",
  },
  {
    id: "kagemori",
    name: "Kagemori Chronicles",
    year: 2024,
    poster: poster2,
    category: "Anime",
    platform: "Prime Video",
    audio: ["Only Hindi Dubbed", "Regional Languages"],
    hindiStatus: "user",
    runtime: "24 eps · 24m",
    tomato: 88,
    genres: ["Shonen", "Fantasy", "Action"],
    tags: ["talwar wale ninja", "swordsman", "revenge arc"],
    budget: "¥1.8 billion",
    boxOffice: "$61 million (theatrical compilation)",
    analysis:
      "Sakuga-heavy fight choreography with a surprisingly restrained emotional core. The Hindi track is crowd-sourced-confirmed rather than studio-verified, so expect a couple of episodes mid-season to fall back to subtitles.",
  },
  {
    id: "the-vault-line",
    name: "The Vault Line",
    year: 2022,
    poster: poster3,
    category: "Movies",
    platform: "Disney+ Hotstar",
    audio: ["Only Hindi Dubbed", "Original English"],
    hindiStatus: "verified",
    verifiedOn: "03 Jul 2026",
    runtime: "2h 11m",
    tomato: 76,
    genres: ["Heist", "Crime", "Thriller"],
    tags: ["bank loot", "heist crew", "double cross"],
    budget: "$95 million",
    boxOffice: "$412 million worldwide",
    analysis:
      "A glossy, clockwork heist picture that knows exactly how long to hold a silence. It is not reinventing the genre, but the third-act reversal is genuinely earned and the dub keeps the crew banter intact.",
  },
  {
    id: "salt-and-signal",
    name: "Salt & Signal",
    year: 2025,
    poster: poster4,
    category: "Documentary",
    platform: "SonyLIV",
    audio: ["Original English", "Regional Languages"],
    hindiStatus: "none",
    runtime: "1h 34m",
    tomato: 95,
    genres: ["Investigative", "Environment"],
    tags: ["samudra", "ocean mystery", "real story"],
    budget: "$3.2 million",
    boxOffice: "$1.1 million (festival run)",
    analysis:
      "Patient, gorgeously shot investigative work about undersea cable sabotage. There is no Hindi audio track at all — subtitles only — so it is a poor pick for background viewing but an excellent one for a focused night.",
  },
  {
    id: "pixel-pals",
    name: "Pixel Pals",
    year: 2021,
    poster: poster5,
    category: "Cartoon",
    platform: "JioCinema",
    audio: ["Only Hindi Dubbed", "Regional Languages"],
    hindiStatus: "verified",
    verifiedOn: "28 Jun 2026",
    runtime: "52 eps · 11m",
    tomato: 82,
    genres: ["Family", "Comedy", "Adventure"],
    tags: ["bachchon ke liye", "funny robots", "kids"],
    budget: "$18 million",
    boxOffice: "$0 (streaming original)",
    analysis:
      "Bright, fast, and mercifully free of screech-humour. Eleven-minute episodes make it ideal for controlled screen time, and the Hindi dub uses the same voice cast across all 52 episodes for consistency.",
  },
  {
    id: "chowk-nights",
    name: "Chowk Nights",
    year: 2026,
    poster: poster6,
    category: "Short Drama",
    platform: "Zee5",
    audio: ["Only Hindi Dubbed", "Regional Languages"],
    hindiStatus: "user",
    runtime: "30 eps · 8m",
    tomato: 71,
    genres: ["Romance", "Slice of Life", "Drama"],
    tags: ["gali mohalla", "vertical drama", "love story"],
    budget: "₹9 crore",
    boxOffice: "₹0 (streaming original)",
    analysis:
      "Vertical-format micro-drama built for commutes. Plotting is broad and the melodrama is loud, but the eight-minute runtime makes it a genuinely efficient guilty pleasure.",
  },
];

export const SUGGESTED_TAGS = [
  "prison se bhagne wale group",
  "bank loot",
  "talwar wale ninja",
  "real story",
  "bachchon ke liye",
  "love story",
];
