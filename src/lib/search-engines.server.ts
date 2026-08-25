/**
 * Waterfall Search Engine (server-only).
 *
 * Strict, sequential, zero-overlap execution. The first layer that returns
 * usable results wins; the remaining layers are never called.
 *
 *   1. DuckDuckGo HTML scraper   (unlimited, free)
 *   2. Google web scraper        (rotating user-agent / headers)
 *   3. SerpApi                   (SERP_API_KEY, 250 free / month)
 *   4. Serper.dev                (SERPER_API_KEY, absolute fallback)
 *
 * All secrets are read from process.env inside functions — never exported,
 * never referenced from client code.
 */

export type SearchEngineName = "duckduckgo" | "google" | "serpapi" | "serper" | "none";

export type WebResult = {
  title: string;
  link: string;
  snippet: string;
  engine: SearchEngineName;
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
];

const ACCEPT_LANGS = ["en-US,en;q=0.9", "en-IN,en;q=0.9,hi;q=0.8", "en-GB,en;q=0.8"];

let rotation = Math.floor(Math.random() * USER_AGENTS.length);

/** Rotating browser-like headers so scraping layers are not fingerprinted. */
function scrapeHeaders(): Record<string, string> {
  rotation = (rotation + 1) % (USER_AGENTS.length * ACCEPT_LANGS.length);
  const ua = USER_AGENTS[rotation % USER_AGENTS.length]!;
  const lang = ACCEPT_LANGS[rotation % ACCEPT_LANGS.length]!;
  return {
    "User-Agent": ua,
    "Accept-Language": lang,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Cache-Control": "no-cache",
    "Upgrade-Insecure-Requests": "1",
  };
}

function decodeEntities(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;|&apos;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLink(href: string): string | null {
  let url = href;
  // DuckDuckGo wraps targets in /l/?uddg=<encoded>
  const uddg = /[?&]uddg=([^&]+)/.exec(url);
  if (uddg?.[1]) url = decodeURIComponent(uddg[1]);
  // Google wraps in /url?q=<encoded>&sa=...
  const gq = /^\/url\?(?:[^&]*&)*q=([^&]+)/.exec(url);
  if (gq?.[1]) url = decodeURIComponent(gq[1]);
  if (url.startsWith("//")) url = `https:${url}`;
  if (!/^https?:\/\//i.test(url)) return null;
  if (/google\.[a-z.]+\/(search|preferences|advanced_search)/i.test(url)) return null;
  if (/duckduckgo\.com\/y\.js/i.test(url)) return null;
  return url;
}

function dedupe(results: WebResult[], limit: number): WebResult[] {
  const seen = new Set<string>();
  const out: WebResult[] = [];
  for (const r of results) {
    if (!r.link || !r.title) continue;
    if (seen.has(r.link)) continue;
    seen.add(r.link);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchText(url: string, init?: RequestInit): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`[waterfall] ${url.split("?")[0]} -> ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (error) {
    console.error(`[waterfall] request failed ${url.split("?")[0]}`, error);
    return null;
  }
}

/* ---------------- Layer 1 — DuckDuckGo HTML scraper ---------------- */

function isBotChallenge(html: string): boolean {
  return /anomaly|challenge-form|captcha|unusual traffic|enablejs/i.test(html);
}

function parseDuckDuckGo(html: string, limit: number): WebResult[] {
  const results: WebResult[] = [];
  const anchorRe =
    /<a[^>]+class="[^"]*(?:result__a|result-link)[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const link = normalizeLink(decodeEntities(match[1] ?? ""));
    if (!link) continue;
    const after = html.slice(anchorRe.lastIndex, anchorRe.lastIndex + 2500);
    const snippet =
      /class="[^"]*(?:result__snippet|result-snippet)[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/.exec(
        after,
      );
    results.push({
      title: decodeEntities(match[2] ?? ""),
      link,
      snippet: snippet?.[1] ? decodeEntities(snippet[1]) : "",
      engine: "duckduckgo",
    });
    if (results.length >= limit * 2) break;
  }
  return dedupe(results, limit);
}

export async function searchDuckDuckGo(query: string, limit: number): Promise<WebResult[]> {
  // 1a. Lite endpoint (GET), 1b. classic HTML endpoint (POST).
  const lite = await fetchText(
    `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=in-en`,
    { headers: scrapeHeaders() },
  );
  if (lite && !isBotChallenge(lite)) {
    const parsed = parseDuckDuckGo(lite, limit);
    if (parsed.length) return parsed;
  }

  const html = await fetchText("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: { ...scrapeHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ q: query, kl: "in-en" }).toString(),
  });
  if (!html || isBotChallenge(html)) return [];
  return parseDuckDuckGo(html, limit);
}

/* ---------------- Layer 2 — Google web scraper ---------------- */

const GOOGLE_JUNK = /google\.[a-z.]+|gstatic\.com|googleusercontent\.com|schema\.org/i;

export async function searchGoogleScrape(query: string, limit: number): Promise<WebResult[]> {
  const num = Math.min(20, limit * 3);
  const q = encodeURIComponent(query);
  // Rotating routing pattern: basic-HTML endpoints first, then the standard one.
  const endpoints = [
    `https://www.google.com/search?q=${q}&num=${num}&hl=en&gl=in&gbv=1&pws=0`,
    `https://www.google.com/search?q=${q}&num=${num}&hl=en&gl=in&udm=14`,
    `https://www.google.com/search?q=${q}&num=${num}&hl=en&gl=in&pws=0`,
  ];

  for (const url of endpoints) {
    const html = await fetchText(url, { headers: scrapeHeaders() });
    if (!html || isBotChallenge(html)) continue;

    const results: WebResult[] = [];
    const anchorRe = /<a[^>]+href="(\/url\?q=[^"]+|https?:\/\/[^"]+)"[^>]*>([\s\S]{0,600}?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = anchorRe.exec(html)) !== null) {
      const link = normalizeLink(decodeEntities(match[1] ?? ""));
      if (!link || GOOGLE_JUNK.test(link)) continue;
      const heading = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(match[2] ?? "");
      const title = decodeEntities(heading?.[1] ?? match[2] ?? "");
      if (title.length < 4) continue;
      const after = html.slice(anchorRe.lastIndex, anchorRe.lastIndex + 1200);
      const snip = /<(?:div|span)[^>]*>([^<]{60,300})<\/(?:div|span)>/.exec(after);
      results.push({
        title,
        link,
        snippet: snip?.[1] ? decodeEntities(snip[1]) : "",
        engine: "google",
      });
      if (results.length >= limit * 2) break;
    }

    const deduped = dedupe(results, limit);
    if (deduped.length) return deduped;
  }

  return [];
}


/* ---------------- Layer 3 — SerpApi ---------------- */

export async function searchSerpApi(query: string, limit: number): Promise<WebResult[]> {
  const key = process.env["SERP_API_KEY"];
  if (!key) return [];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(20, limit * 2)));
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "in");
  url.searchParams.set("api_key", key);

  const text = await fetchText(url.toString());
  if (!text) return [];
  try {
    const body = JSON.parse(text) as {
      organic_results?: { title?: string; link?: string; snippet?: string }[];
    };
    return dedupe(
      (body.organic_results ?? []).map((r) => ({
        title: r.title ?? "",
        link: r.link ?? "",
        snippet: r.snippet ?? "",
        engine: "serpapi" as const,
      })),
      limit,
    );
  } catch {
    return [];
  }
}

/* ---------------- Layer 4 — Serper.dev ---------------- */

export async function searchSerper(query: string, limit: number): Promise<WebResult[]> {
  const key = process.env["SERPER_API_KEY"];
  if (!key) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: Math.min(20, limit * 2), gl: "in", hl: "en" }),
    });
    if (!res.ok) {
      console.error(`[waterfall] serper -> ${res.status}`);
      return [];
    }
    const body = (await res.json()) as {
      organic?: { title?: string; link?: string; snippet?: string }[];
    };
    return dedupe(
      (body.organic ?? []).map((r) => ({
        title: r.title ?? "",
        link: r.link ?? "",
        snippet: r.snippet ?? "",
        engine: "serper" as const,
      })),
      limit,
    );
  } catch (error) {
    console.error("[waterfall] serper request failed", error);
    return [];
  }
}

/* ---------------- Orchestrator ---------------- */

export const WATERFALL_LAYERS = [
  { name: "duckduckgo" as const, label: "DuckDuckGo HTML scraper", run: searchDuckDuckGo },
  { name: "google" as const, label: "Google web scraper (rotating UA)", run: searchGoogleScrape },
  { name: "serpapi" as const, label: "SerpApi (SERP_API_KEY)", run: searchSerpApi },
  { name: "serper" as const, label: "Serper.dev (SERPER_API_KEY)", run: searchSerper },
];

/** Short-lived cooldown so a blocked layer is not re-probed on every query. */
const COOLDOWN_MS = 5 * 60_000;
const cooldownUntil = new Map<string, number>();

/**
 * Sequential waterfall. Each layer runs only after the previous one returned
 * nothing usable — never in parallel. Layers that just failed are skipped
 * until their cooldown expires, then retried from the top again.
 */
export async function webSearch(query: string, limit = 5): Promise<WebResult[]> {
  const now = Date.now();
  for (const layer of WATERFALL_LAYERS) {
    if ((cooldownUntil.get(layer.name) ?? 0) > now) continue;
    const results = await layer.run(query, limit);
    if (results.length) {
      cooldownUntil.delete(layer.name);
      return results;
    }
    cooldownUntil.set(layer.name, Date.now() + COOLDOWN_MS);
  }
  return [];
}
