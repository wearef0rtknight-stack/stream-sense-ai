import { useState } from "react";
import { BadgeCheck, ChevronDown, ExternalLink, IndianRupee, TrendingUp } from "lucide-react";
import type { ResolvedTitle } from "@/lib/ott.server";
import { cn } from "@/lib/utils";

const HINDI = {
  verified: { dot: "bg-neon", label: "Verified", chip: "bg-neon/15 text-neon border-neon/40" },
  user: { dot: "bg-warn", label: "User Confirmed", chip: "bg-warn/15 text-warn border-warn/40" },
  none: {
    dot: "bg-inert",
    label: "Unverified (Subtitles Only)",
    chip: "bg-inert/10 text-inert border-inert/30",
  },
} as const;

export function LiveResultCard({ title, onOpen }: { title: ResolvedTitle; onOpen: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hindi = HINDI[title.hindiStatus] ?? HINDI.none;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card lift">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-semibold text-foreground">
              {title.name}
              {title.year ? <span className="text-muted-foreground"> · {title.year}</span> : null}
            </h3>
            <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
              {[title.platform, title.category].filter(Boolean).join(" · ") || "Availability pending"}
            </p>
          </div>
          {title.ratingRt !== null ? (
            <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[0.65rem] font-semibold text-foreground">
              {title.ratingRt}%
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
              hindi.chip,
            )}
          >
            <span className={cn("size-1.5 rounded-full", hindi.dot)} />
            {hindi.label}
            {title.hindiVerifiedOn ? ` · ${title.hindiVerifiedOn.slice(0, 10)}` : ""}
          </span>
          {title.platform ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[0.65rem] text-muted-foreground">
              <BadgeCheck className="size-3 text-primary" />
              {title.platform}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-3">
          {title.streamUrl ? (
            <a
              href={title.streamUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onOpen}
              className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-primary"
            >
              <ExternalLink className="size-3" />
              Watch page
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground"
          >
            Details
            <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>

        {expanded ? (
          <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface p-3">
            <p className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
              <IndianRupee className="size-3 text-neon" />
              Budget: <span className="text-foreground">{title.budget ?? "Not listed"}</span>
            </p>
            <p className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
              <TrendingUp className="size-3 text-neon" />
              Box office: <span className="text-foreground">{title.boxOffice ?? "Not listed"}</span>
            </p>
            {title.analysis ? (
              <p className="text-[0.72rem] leading-relaxed text-muted-foreground">{title.analysis}</p>
            ) : null}
            {title.availability.length > 1 ? (
              <p className="text-[0.68rem] text-muted-foreground">
                Also on: {title.availability.map((a) => a.platform).join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
