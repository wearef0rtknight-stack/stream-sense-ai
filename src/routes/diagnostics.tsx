import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { CheckCircle2, Layers, RefreshCw, XCircle } from "lucide-react";
import { checkSearchWaterfall } from "@/lib/diagnostics.functions";

const TITLE = "Diagnostics — Waterfall Search Engine Status | Dubbed";
const DESC =
  "Live health of the four-layer search waterfall: DuckDuckGo scraper, Google scraper, SerpApi and Serper.dev powering Hindi dubbed availability checks.";

export const Route = createFileRoute("/diagnostics")({
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
  component: Diagnostics,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="max-w-[60%] break-words text-right text-xs text-foreground">{value}</span>
    </div>
  );
}

function Diagnostics() {
  const run = useServerFn(checkSearchWaterfall);
  const { mutate, data, isPending, error } = useMutation({ mutationFn: () => run({}) });

  useEffect(() => {
    mutate();
  }, [mutate]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-9">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary">
        System check
      </p>
      <h1 className="mt-2 font-display text-[1.75rem] font-bold leading-tight">
        Waterfall <span className="text-gradient-neon">search engine</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Probes each layer in priority order and reports which one answers first.
      </p>

      <button
        type="button"
        onClick={() => mutate()}
        disabled={isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-neon px-4 py-2 text-xs font-semibold text-neon-foreground disabled:opacity-60"
      >
        <RefreshCw className={isPending ? "size-3.5 animate-spin" : "size-3.5"} />
        {isPending ? "Testing…" : "Re-run test"}
      </button>

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {(error as Error).message}
        </p>
      ) : null}

      {data ? (
        <section className="mt-5 space-y-4">
          <div
            className={
              data.winner
                ? "flex items-center gap-2 rounded-2xl border border-neon/40 bg-neon/10 p-3 text-sm text-neon"
                : "flex items-center gap-2 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn"
            }
          >
            {data.winner ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {data.winner ? `Active layer: ${data.winner}` : "No layer returned results"}
          </div>

          <p className="text-[0.7rem] text-muted-foreground">
            Probe query: <span className="text-foreground">{data.query}</span>
          </p>

          {data.layers.map((layer, i) => (
            <div key={layer.name} className="rounded-2xl border border-border bg-surface p-4">
              <h2 className="mb-2 inline-flex items-center gap-2 font-display text-sm font-semibold">
                <Layers className="size-4 text-primary" />
                {i + 1}. {layer.label}
              </h2>
              <Row label="Configured" value={layer.configured ? "yes" : "no (key missing)"} />
              <Row label="Status" value={layer.ok ? "healthy" : "no results"} />
              <Row label="Results" value={String(layer.count)} />
              <Row label="Latency" value={`${layer.ms}ms`} />
              <Row label="Sample" value={layer.sample ?? "—"} />
              <p className="mt-2 text-[0.72rem] leading-relaxed text-muted-foreground">
                {layer.note}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
