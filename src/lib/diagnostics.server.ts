import type { LayerDiagnostic, WaterfallDiagnostic } from "./diagnostics.functions";
import { WATERFALL_LAYERS } from "./search-engines.server";

const PROBE_QUERY = 'site:netflix.com "Hindi" movie';

function configured(name: string): boolean {
  if (name === "serpapi") return Boolean(process.env["SERP_API_KEY"]);
  if (name === "serper") return Boolean(process.env["SERPER_API_KEY"]);
  return true;
}

function note(name: string, ok: boolean, isConfigured: boolean): string {
  if (!isConfigured) {
    return name === "serpapi"
      ? "SERP_API_KEY not set — layer skipped in the waterfall."
      : "SERPER_API_KEY not set — layer skipped in the waterfall.";
  }
  if (ok) return "Healthy — returning parsable organic results.";
  if (name === "duckduckgo") return "No results parsed. DuckDuckGo may be rate limiting this host.";
  if (name === "google") return "No results parsed. Google likely served a consent/captcha page.";
  return "Key present but the API returned no organic results (quota or invalid key).";
}

export async function runWaterfallDiagnostic(): Promise<WaterfallDiagnostic> {
  const layers: LayerDiagnostic[] = [];
  let winner: string | null = null;

  for (const layer of WATERFALL_LAYERS) {
    const isConfigured = configured(layer.name);
    const started = Date.now();
    let count = 0;
    let sample: string | null = null;

    if (isConfigured) {
      try {
        const results = await layer.run(PROBE_QUERY, 3);
        count = results.length;
        sample = results[0]?.title ?? null;
      } catch (error) {
        console.error(`[diagnostics] ${layer.name} threw`, error);
      }
    }

    const ok = isConfigured && count > 0;
    if (ok && !winner) winner = layer.name;

    layers.push({
      name: layer.name,
      label: layer.label,
      configured: isConfigured,
      ok,
      count,
      ms: Date.now() - started,
      sample,
      note: note(layer.name, ok, isConfigured),
    });
  }

  return { query: PROBE_QUERY, winner, layers };
}
