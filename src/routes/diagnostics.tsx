import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Activity, CheckCircle2, KeyRound, RefreshCw, XCircle } from "lucide-react";
import { checkCseStatus } from "@/lib/diagnostics.functions";

const TITLE = "Diagnostics — Custom Search Connection Status | Dubbed";
const DESC =
  "Live status of the Google Custom Search API key and engine ID (CX) powering Hindi dubbed availability checks, with 403/400 error detail.";

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
  const run = useServerFn(checkCseStatus);
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
        Custom Search <span className="text-gradient-neon">connection</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Runs a real query against Google and shows the exact status code and reason.
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
              data.ok
                ? "flex items-center gap-2 rounded-2xl border border-neon/40 bg-neon/10 p-3 text-sm text-neon"
                : "flex items-center gap-2 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn"
            }
          >
            {data.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {data.ok ? "Connection healthy" : `Failing${data.httpStatus ? ` (${data.httpStatus})` : ""}`}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-2 inline-flex items-center gap-2 font-display text-sm font-semibold">
              <KeyRound className="size-4 text-primary" />
              Credentials
            </h2>
            <Row label="API key" value={data.keyPresent ? (data.keyHint ?? "set") : "missing"} />
            <Row label="Engine ID (CX)" value={data.cxPresent ? (data.cxHint ?? "set") : "missing"} />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-2 inline-flex items-center gap-2 font-display text-sm font-semibold">
              <Activity className="size-4 text-primary" />
              Live response
            </h2>
            <Row label="HTTP status" value={data.httpStatus ? String(data.httpStatus) : "no response"} />
            <Row label="Reason" value={data.reason ?? "—"} />
            <Row label="Results returned" value={data.itemCount === null ? "—" : String(data.itemCount)} />
            <Row label="Google message" value={data.message ?? "—"} />
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-surface-2 p-4">
            <h2 className="font-display text-sm font-semibold">What to do</h2>
            <p className="mt-1 text-[0.78rem] leading-relaxed text-muted-foreground">{data.hint}</p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
