import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Flame,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import { searchOtt } from "@/lib/ott.functions";
import { LiveResultCard } from "@/components/LiveResultCard";
import { AUDIO, CATEGORIES, PLATFORMS, SUGGESTED_TAGS } from "@/data/catalog";
import { PillRail } from "@/components/PillRail";
import { SmartSearch } from "@/components/SmartSearch";
import { useTaste } from "@/hooks/useTaste";

const TITLE = "Dubbed — AI OTT & Streaming Language Finder";
const DESC =
  "Find where to stream any movie, series or anime with verified Hindi dubbed audio. Live availability, ratings and box office in seconds.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const { bump, reset, hydrated, topCategories, topGenres, interactions, taste } = useTaste();

  const runSearch = useServerFn(searchOtt);
  const platform = plats[0] ?? "";
  const language = audio.includes("Only Hindi Dubbed") ? "Hindi" : audio.join(", ");
  const liveQuery = useMemo(() => [...tags, ...cats].join(" ").trim(), [tags, cats]);

  const live = useQuery({
    queryKey: ["ott-search", liveQuery, platform, language],
    enabled: liveQuery.length >= 2,
    staleTime: 5 * 60_000,
    queryFn: () => runSearch({ data: { query: liveQuery, platform, language } }),
  });

  const results = live.data?.results ?? [];
  const liveError = live.data && "error" in live.data ? live.data.error : undefined;

  const addTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    bump({ search: tag, weight: 1 });
  };

  const tasteChips = useMemo(() => {
    if (!hydrated || interactions === 0) return [];
    return [...topCategories, ...topGenres, ...taste.searches.slice(0, 3)]
      .filter((v, i, arr) => v && arr.indexOf(v) === i)
      .slice(0, 6);
  }, [hydrated, interactions, topCategories, topGenres, taste.searches]);

  const activeFilters = cats.length + plats.length + audio.length + tags.length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md pb-16">
      <header className="halo relative px-5 pb-6 pt-9">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
          AI Language Finder
        </p>
        <h1 className="mt-2 font-display text-[2rem] font-bold leading-[1.1]">
          Find it in the <span className="text-gradient-neon">language</span> you actually watch in.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verified Hindi dubs, live platform availability, zero guesswork.
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
        {tasteChips.length > 0 ? (
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
              <span className="text-foreground">{taste.searches.length} searches</span> — tap to
              search again.
            </p>
            <div className="rail px-5 pb-2">
              {tasteChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => addTag(chip)}
                  className="lift shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground"
                >
                  {chip}
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

        {/* Live results */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-5">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
              <Flame className="size-4 text-primary" />
              {liveQuery.length >= 2
                ? `${results.length} match${results.length === 1 ? "" : "es"}`
                : "Live results"}
            </h2>
            <span className="inline-flex items-center gap-2 text-[0.68rem] text-muted-foreground">
              {live.isFetching ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Searching…
                </>
              ) : live.data ? (
                <>
                  <Zap className="size-3 text-neon" />
                  {live.data.source === "cache" ? "cached" : live.data.source} · {live.data.ms}ms
                </>
              ) : (
                <>
                  <SlidersHorizontal className="size-3" />
                  {activeFilters} filter{activeFilters === 1 ? "" : "s"}
                </>
              )}
            </span>
          </div>

          {live.data?.analysis ? (
            <p className="px-5 text-[0.75rem] leading-relaxed text-muted-foreground">
              {live.data.analysis}
            </p>
          ) : null}

          <div className="space-y-3 px-5">
            {liveQuery.length < 2 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                <p className="font-display text-sm font-semibold">Describe what you want</p>
                <p className="mt-1 text-[0.75rem] text-muted-foreground">
                  Type a phrase like “prison se bhagne wale group” and pick your filters.
                </p>
              </div>
            ) : null}
            {live.isError ? (
              <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
                Live search failed. Please try again.
              </p>
            ) : null}
            {liveError ? (
              <p className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-xs text-warn">
                {liveError}
              </p>
            ) : null}
            {results.map((r) => (
              <LiveResultCard
                key={r.slug}
                title={r}
                onOpen={() =>
                  bump(
                    r.platform
                      ? { search: r.name, platform: r.platform, weight: 1 }
                      : { search: r.name, weight: 1 },
                  )
                }
              />
            ))}
            {liveQuery.length >= 2 && live.data && !live.isFetching && results.length === 0 && !liveError ? (
              <p className="rounded-2xl border border-dashed border-border bg-surface p-4 text-center text-xs text-muted-foreground">
                No live matches — try a different phrase.
              </p>
            ) : null}
          </div>

          <div className="px-5">
            <Link
              to="/diagnostics"
              className="inline-flex items-center gap-1 text-[0.68rem] text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              <Activity className="size-3" />
              Search engine diagnostics
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
