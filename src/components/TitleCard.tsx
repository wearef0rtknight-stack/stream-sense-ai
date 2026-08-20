import { useState } from "react";
import { BadgeCheck, ChevronDown, Clock, IndianRupee, TrendingUp } from "lucide-react";
import type { HindiStatus, Title } from "@/data/catalog";
import { cn } from "@/lib/utils";

const HINDI: Record<HindiStatus, { dot: string; label: string; chip: string }> = {
  verified: {
    dot: "🟢",
    label: "Verified",
    chip: "bg-neon/15 text-neon border-neon/40",
  },
  user: {
    dot: "🟡",
    label: "User Confirmed",
    chip: "bg-warn/15 text-warn border-warn/40",
  },
  none: {
    dot: "⚪",
    label: "Unverified (Subtitles Only)",
    chip: "bg-inert/10 text-inert border-inert/30",
  },
};

export function TitleCard({ title, onOpen }: { title: Title; onOpen: (t: Title) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hindi = HINDI[title.hindiStatus];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card lift">
      <button
        type="button"
        onClick={() => onOpen(title)}
        className="flex w-full gap-3 p-3 text-left"
      >
        <img
          src={title.poster}
          alt={`${title.name} poster`}
          loading="lazy"
          className="h-[7.5rem] w-[5rem] shrink-0 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-base font-semibold text-foreground">
              {title.name}
            </h3>
            <span className="shrink-0 rounded-md bg-tomato/15 px-1.5 py-0.5 text-[0.7rem] font-bold text-tomato">
              🍅 {title.tomato}%
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.7rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-medium text-foreground">
              <BadgeCheck className="size-3 text-neon" />
              {title.platform}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {title.runtime}
            </span>
            <span>{title.year}</span>
          </div>

          <div className="mt-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold",
                hindi.chip,
              )}
            >
              {hindi.dot} Hindi Audio: {hindi.label}
              {title.verifiedOn ? ` · ${title.verifiedOn}` : ""}
            </span>
          </div>

          <p className="mt-2 truncate text-[0.7rem] text-muted-foreground/80">
            {title.genres.join(" · ")}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between border-t border-border px-4 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
      >
        Box office & analysis
        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-border bg-surface px-4 py-3.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-surface-2 p-2.5">
              <p className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                <IndianRupee className="size-3" /> Budget
              </p>
              <p className="mt-1 font-display text-sm font-semibold text-foreground">
                {title.budget}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-2.5">
              <p className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="size-3" /> Worldwide
              </p>
              <p className="mt-1 font-display text-sm font-semibold text-neon">
                {title.boxOffice}
              </p>
            </div>
          </div>
          <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
            Financial data sourced from Wikipedia
          </p>
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">
              Entertainment Value Analysis
            </h4>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-muted-foreground">
              {title.analysis}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
