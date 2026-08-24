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

export async function searchDuckDuckGo(query: string, limit: number): Promise<WebResult[]> {
  const html = await fetchText("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: { ...scrapeHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ q: query, kl: "in-en" }).toString(),
  });
  if (!html) return [];

  const results: WebResult[] = [];
  const blockRe = /<div class="result[^"]*"[\s\S]*?(?=<div class="result[^"]*"|<\/body>)/g;
  const blocks = html.match(blockRe) ?? [html];

  for (const block of blocks) {
    const anchor = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(
      block,
    );
    if (!anchor?.[1]) continue;
    const link = normalizeLink(decodeEntities(anchor[1]));
    if (!link) continue;
    const snippetMatch = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    results.push({
      title: decodeEntities(anchor[2] ?? ""),
      link,
      snippet: snippetMatch?.[1] ? decodeEntities(snippetMatch[1]) : "",
      engine: "duckduckgo",
    });
    if (results.length >= limit * 2) break;
  }

  return dedupe(results, limit);
}

/* ---------------- Layer 2 — Google web scraper ---------------- */

export async function searchGoogleScrape(query: string, limit: number): Promise<WebResult[]> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${Math.min(
    20,
    limit * 3,
  )}&hl=en&gl=in&pws=0`;
  const html = await fetchText(url, { headers: scrapeHeaders() });
  if (!html) return [];

  const results: WebResult[] = [];
  const anchorRe = /<a href="(\/url\?q=[^"]+|https?:\/\/[^"]+)"[^>]*>([\s\S]{0,400}?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const link = normalizeLink(decodeEntities(match[1] ?? ""));
    if (!link) continue;
    const heading = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(match[2] ?? "");
    const title = decodeEntities(heading?.[1] ?? match[2] ?? "");
    if (!title || title.length < 3) continue;
    // Snippet: the nearest following text block
    const after = html.slice(anchorRe.lastIndex, anchorRe.lastIndex + 1200);
    const snip = /<div[^>]*>([^<]{60,300})<\/div>/.exec(after);
    results.push({
      title,
      link,
      snippet: snip?.[1] ? decodeEntities(snip[1]) : "",
      engine: "google",
    });
    if (results.length >= limit * 2) break;
  }

  return dedupe(results, limit);
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

/**
 * Sequential waterfall. Each layer runs only after the previous one returned
 * nothing usable — never in parallel.
 */
export async function webSearch(query: string, limit = 5): Promise<WebResult[]> {
  for (const layer of WATERFALL_LAYERS) {
    const results = await layer.run(query, limit);
    if (results.length) return results;
  }
  return [];
}
