import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flame, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import {
  AUDIO,
  CATEGORIES,
  PLATFORMS,
  SUGGESTED_TAGS,
  TITLES,
  type Title,
} from "@/data/catalog";
import { PillRail } from "@/components/PillRail";
import { SmartSearch } from "@/components/SmartSearch";
import { TitleCard } from "@/components/TitleCard";
import { useTaste } from "@/hooks/useTaste";

const TITLE = "Dubbed — AI OTT & Streaming Language Finder";
const DESC =
  "Find where to stream any movie, series or anime with verified Hindi dubbed audio. Filter by platform, language and taste in seconds.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Home,
});

function toggleIn(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Home() {
  const [cats, setCats] = useState<string[]>([]);
  const [plats, setPlats] = useState<string[]>([]);
  const [audio, setAudio] = useState<string[]>(["Only Hindi Dubbed"]);
  const [tags, setTags] = useState<string[]>([]);
  const { bump, reset, hydrated, topCategories, topGenres, score, interactions, taste } =
    useTaste();

  const results = useMemo(() => {
    return TITLES.filter((t) => {
      if (cats.length && !cats.includes(t.category)) return false;
      if (plats.length && !plats.includes(t.platform)) return false;
      if (audio.length && !audio.some((a) => t.audio.includes(a as never))) return false;
      if (tags.length) {
        const hay = `${t.name} ${t.genres.join(" ")} ${t.tags.join(" ")}`.toLowerCase();
        if (!tags.some((tag) => hay.includes(tag.toLowerCase()))) return false;
      }
      return true;
    });
  }, [cats, plats, audio, tags]);

  const recommended = useMemo(() => {
    if (!hydrated || interactions === 0) return [];
    return [...TITLES]
      .map((t) => ({ t, s: score(t.category, t.genres, t.platform) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map((x) => x.t);
  }, [hydrated, interactions, score]);

  const openTitle = (t: Title) => {
    bump({ category: t.category, genres: t.genres, platform: t.platform, weight: 1 });
  };

  const addTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    bump({ search: tag, weight: 1 });
  };

  const activeFilters = cats.length + plats.length + audio.length + tags.length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md pb-16">
      {/* Header */}
      <header className="halo relative px-5 pb-6 pt-9">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
          AI Language Finder
        </p>
        <h1 className="mt-2 font-display text-[2rem] font-bold leading-[1.1]">
          Find it in the{" "}
          <span className="text-gradient-neon">language</span> you actually watch in.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verified Hindi dubs, real platform availability, zero guesswork.
        </p>
      </header>

      <div className="space-y-6">
        <SmartSearch
          tags={tags}
          onAddTag={addTag}
          onRemoveTag={(t) => setTags((p) => p.filter((x) => x !== t))}
          suggestions={SUGGESTED_TAGS}
        />

        <div className="space-y-5">
          <PillRail
            label="Category"
            options={CATEGORIES}
            selected={cats}
            onToggle={(v) => {
              setCats((p) => toggleIn(p, v));
              bump({ category: v, weight: 0.5 });
            }}
          />
          <PillRail
            label="Platform"
            hint="Top 6 in India"
            options={PLATFORMS}
            selected={plats}
            onToggle={(v) => {
              setPlats((p) => toggleIn(p, v));
              bump({ platform: v, weight: 0.5 });
            }}
          />
          <PillRail
            label="Audio preference"
            hint="Core USP"
            options={AUDIO}
            selected={audio}
            onToggle={(v) => setAudio((p) => toggleIn(p, v))}
            checkable={["Only Hindi Dubbed"]}
          />
        </div>

        {/* Based on your taste */}
        {recommended.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-5">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                <Sparkles className="size-4 text-neon" />
                Based on Your Taste
              </h2>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground transition-colors hover:text-primary"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            </div>
            <p className="px-5 text-[0.72rem] text-muted-foreground">
              Learned locally from{" "}
              <span className="text-foreground">{taste.searches.length} searches</span> and your
              most-opened {topCategories[0] ? `${topCategories[0]} ` : ""}
              {topGenres[0] ? `· ${topGenres[0]}` : "picks"}.
            </p>
            <div className="rail pb-2">
              {recommended.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTitle(t)}
                  className="w-[8.5rem] text-left"
                >
                  <img
                    src={t.poster}
                    alt={`${t.name} poster`}
                    loading="lazy"
                    className="h-[12rem] w-full rounded-xl border border-border object-cover lift"
                  />
                  <p className="mt-1.5 truncate text-xs font-medium text-foreground">{t.name}</p>
                  <p className="truncate text-[0.65rem] text-muted-foreground">
                    {t.platform} · {t.category}
                  </p>
                </button>
              ))}
              <span className="w-1" aria-hidden />
            </div>
          </section>
        ) : (
          <section className="mx-5 rounded-2xl border border-dashed border-border bg-surface p-4">
            <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold">
              <Sparkles className="size-4 text-neon" />
              Recommended For You
            </h2>
            <p className="mt-1 text-[0.75rem] text-muted-foreground">
              Search a phrase or open a title — your taste profile builds itself on this device.
            </p>
          </section>
        )}

        {/* Results */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-5">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
              <Flame className="size-4 text-primary" />
              {results.length} match{results.length === 1 ? "" : "es"}
            </h2>
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground">
              <SlidersHorizontal className="size-3" />
              {activeFilters} filter{activeFilters === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-3 px-5">
            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                <p className="font-display text-sm font-semibold">Nothing matches yet</p>
                <p className="mt-1 text-[0.75rem] text-muted-foreground">
                  Loosen a pill row or drop a keyword tag.
                </p>
              </div>
            ) : (
              results.map((t) => <TitleCard key={t.id} title={t} onOpen={openTitle} />)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
