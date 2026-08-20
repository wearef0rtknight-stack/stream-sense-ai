import { useCallback, useEffect, useState } from "react";

const KEY = "dubbed.taste.v1";

export type TasteState = {
  categories: Record<string, number>;
  genres: Record<string, number>;
  platforms: Record<string, number>;
  searches: string[];
};

const empty: TasteState = { categories: {}, genres: {}, platforms: {}, searches: [] };

function read(): TasteState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as TasteState) };
  } catch {
    return empty;
  }
}

/** Local-only behaviour tracker: past searches + clicked content drive ranking. */
export function useTaste() {
  const [taste, setTaste] = useState<TasteState>(empty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTaste(read());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: TasteState) => {
    setTaste(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const bump = useCallback(
    (patch: {
      category?: string;
      genres?: string[];
      platform?: string;
      search?: string;
      weight?: number;
    }) => {
      const w = patch.weight ?? 1;
      const next = read();
      const add = (map: Record<string, number>, k?: string) => {
        if (!k) return;
        map[k] = (map[k] ?? 0) + w;
      };
      add(next.categories, patch.category);
      add(next.platforms, patch.platform);
      patch.genres?.forEach((g) => add(next.genres, g));
      if (patch.search) {
        next.searches = [patch.search, ...next.searches.filter((s) => s !== patch.search)].slice(
          0,
          8,
        );
      }
      persist(next);
    },
    [persist],
  );

  const reset = useCallback(() => persist({ ...empty }), [persist]);

  const topCategories = Object.entries(taste.categories)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const topGenres = Object.entries(taste.genres)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const score = useCallback(
    (category: string, genres: string[], platform: string) => {
      let s = (taste.categories[category] ?? 0) * 3 + (taste.platforms[platform] ?? 0) * 1.5;
      genres.forEach((g) => (s += (taste.genres[g] ?? 0) * 2));
      taste.searches.forEach((q, i) => {
        const hay = `${category} ${genres.join(" ")}`.toLowerCase();
        if (q && hay.includes(q.toLowerCase())) s += 4 - i * 0.3;
      });
      return s;
    },
    [taste],
  );

  const interactions = Object.values(taste.categories).reduce((a, b) => a + b, 0);

  return { taste, hydrated, bump, reset, topCategories, topGenres, score, interactions };
}
