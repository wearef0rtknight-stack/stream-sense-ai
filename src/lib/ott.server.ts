/**
 * Server-only pipeline for the Universal OTT & Audio Finder.
 *
 * Step A  Gemini (Lovable AI Gateway) — natural language -> exact titles + taste analysis
 * Step B  Google Custom Search      — live platform availability + Hindi audio verification + ratings
 * Step C  Wikipedia MediaWiki API   — infobox budget + worldwide box office
 */

export type HindiStatus = "verified" | "user" | "none";

export type ParsedQuery = {
  titles: string[];
  category: string | null;
  analysis: string;
};

export type Availability = {
  platform: string;
  url: string | null;
  hindi: boolean;
};

export type FinancialData = {
  budget: string | null;
  boxOffice: string | null;
  wikiTitle: string | null;
};

export type ResolvedTitle = {
  slug: string;
  name: string;
  year: number | null;
  category: string | null;
  platform: string | null;
  streamUrl: string | null;
  hindiStatus: HindiStatus;
  hindiVerifiedOn: string | null;
  ratingRt: number | null;
  ratingImdb: number | null;
  budget: string | null;
  boxOffice: string | null;
  analysis: string;
  availability: Availability[];
};

export const PLATFORM_DOMAINS: Record<string, string> = {
  Netflix: "netflix.com",
  "Prime Video": "primevideo.com",
  JioCinema: "jiocinema.com",
  "Disney+ Hotstar": "hotstar.com",
  Zee5: "zee5.com",
  SonyLIV: "sonyliv.com",
};

export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  return normalizeQuery(input).replace(/\s/g, "-").slice(0, 80);
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/* ------------------------------------------------------------------ */
/* Step A — Gemini Flash query parsing                                 */
/* ------------------------------------------------------------------ */

const PARSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titles", "category", "analysis"],
  properties: {
    titles: { type: "array", items: { type: "string" }, description: "Up to 6 exact title names" },
    category: {
      type: ["string", "null"],
      enum: ["Movies", "Web Series", "Anime", "Documentary", "Cartoon", "Short Drama", null],
    },
    analysis: { type: "string", description: "2-3 sentence taste & entertainment value analysis" },
  },
} as const;

export async function parseQueryWithGemini(
  rawQuery: string,
  filters: { platform: string; language: string },
): Promise<ParsedQuery> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages: [
        {
          role: "system",
          content:
            "You map Hinglish/Hindi/English streaming descriptions to real, existing OTT titles. " +
            "Return only titles that actually exist. Write the analysis in warm, specific English explaining why the viewer will enjoy them. Reply as json.",
        },
        {
          role: "user",
          content:
            `Query: ${rawQuery}\n` +
            `Platform filter: ${filters.platform || "any"}\n` +
            `Audio/language filter: ${filters.language || "any"}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "parsed_query", strict: true, schema: PARSE_SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const error = new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<ParsedQuery> = {};
  try {
    parsed = JSON.parse(content) as Partial<ParsedQuery>;
  } catch {
    parsed = {};
  }

  return {
    titles: (parsed.titles ?? []).filter((t) => typeof t === "string" && t.trim()).slice(0, 6),
    category: parsed.category ?? null,
    analysis: parsed.analysis ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Step B — Waterfall web search: availability + ratings + verdicts    */
/* ------------------------------------------------------------------ */

type CseItem = { title: string; link: string; snippet?: string };

/** Single entry point into the sequential waterfall (DDG -> Google -> SerpApi -> Serper). */
async function cse(query: string, num = 5): Promise<CseItem[]> {
  const { webSearch } = await import("./search-engines.server");
  const results = await webSearch(query, num);
  return results.map((r) => ({ title: r.title, link: r.link, snippet: r.snippet }));
}

const HINDI_HINTS = ["hindi", "हिन्दी", "हिंदी", "dubbed", "dual audio"];

function looksHindi(item: CseItem): boolean {
  const hay = `${item.title} ${item.snippet ?? ""}`.toLowerCase();
  return HINDI_HINTS.some((hint) => hay.includes(hint));
}

/** site:<domain> "Hindi" "<title>" loop across the top platforms. */
export async function findAvailability(
  name: string,
  platformFilter: string,
): Promise<Availability[]> {
  const platforms = platformFilter
    ? Object.keys(PLATFORM_DOMAINS).filter((p) => p === platformFilter)
    : Object.keys(PLATFORM_DOMAINS);

  const results = await Promise.all(
    platforms.map(async (platform) => {
      const domain = PLATFORM_DOMAINS[platform]!;
      const items = await cse(`site:${domain} "Hindi" "${name}"`, 3);
      const match =
        items.find((i) => i.title.toLowerCase().includes(name.toLowerCase().slice(0, 12))) ??
        items[0];
      if (!match) return null;
      const entry: Availability = { platform, url: match.link, hindi: items.some(looksHindi) };
      return entry;
    }),
  );

  return results.filter((r): r is Availability => r !== null);
}

export async function findRatings(
  name: string,
  year: number | null,
): Promise<{ rt: number | null; imdb: number | null }> {
  const suffix = year ? ` ${year}` : "";
  const [rtItems, imdbItems] = await Promise.all([
    cse(`site:rottentomatoes.com "${name}"${suffix}`, 3),
    cse(`site:imdb.com "${name}"${suffix}`, 3),
  ]);

  const rtHay = rtItems.map((i) => `${i.title} ${i.snippet ?? ""}`).join(" ");
  const imdbHay = imdbItems.map((i) => `${i.title} ${i.snippet ?? ""}`).join(" ");

  const rtMatch = /(\d{1,3})\s*%/.exec(rtHay);
  const imdbMatch = /(\d(?:\.\d)?)\s*\/\s*10/.exec(imdbHay);

  const rt = rtMatch ? Math.min(100, Number(rtMatch[1])) : null;
  const imdb = imdbMatch ? Number(imdbMatch[1]) : null;
  return { rt, imdb };
}

/** Re-check one stored URL — used by the daily maintenance job. */
export async function isUrlLive(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    return res.status < 400;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Step C — Wikipedia MediaWiki infobox financials                     */
/* ------------------------------------------------------------------ */

const WIKI_API = "https://en.wikipedia.org/w/api.php";

function cleanWikitext(value: string): string {
  return value
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/<[^>]+>/g, " ")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractInfoboxField(wikitext: string, field: string): string | null {
  const re = new RegExp(`\\|\\s*${field}\\s*=\\s*([\\s\\S]*?)(?=\\n\\s*\\||\\n\\}\\})`, "i");
  const match = re.exec(wikitext);
  if (!match?.[1]) return null;
  const cleaned = cleanWikitext(match[1]);
  return cleaned.length > 1 ? cleaned.slice(0, 160) : null;
}

export async function fetchFinancials(name: string, year: number | null): Promise<FinancialData> {
  const empty: FinancialData = { budget: null, boxOffice: null, wikiTitle: null };
  try {
    const searchUrl = new URL(WIKI_API);
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("srsearch", year ? `${name} ${year}` : name);
    searchUrl.searchParams.set("srlimit", "1");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return empty;
    const searchData = (await searchRes.json()) as {
      query?: { search?: { title: string }[] };
    };
    const wikiTitle = searchData.query?.search?.[0]?.title;
    if (!wikiTitle) return empty;

    const contentUrl = new URL(WIKI_API);
    contentUrl.searchParams.set("action", "query");
    contentUrl.searchParams.set("prop", "revisions");
    contentUrl.searchParams.set("rvprop", "content");
    contentUrl.searchParams.set("rvslots", "main");
    contentUrl.searchParams.set("titles", wikiTitle);
    contentUrl.searchParams.set("format", "json");
    contentUrl.searchParams.set("formatversion", "2");
    contentUrl.searchParams.set("origin", "*");

    const contentRes = await fetch(contentUrl);
    if (!contentRes.ok) return { ...empty, wikiTitle };
    const contentData = (await contentRes.json()) as {
      query?: {
        pages?: { revisions?: { slots?: { main?: { content?: string } } }[] }[];
      };
    };
    const wikitext = contentData.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? "";
    const infoboxEnd = wikitext.indexOf("\n'''");
    const infobox = wikitext.slice(0, infoboxEnd > 0 ? infoboxEnd : 6000);

    return {
      wikiTitle,
      budget: extractInfoboxField(infobox, "budget"),
      boxOffice:
        extractInfoboxField(infobox, "gross") ?? extractInfoboxField(infobox, "box_office"),
    };
  } catch (error) {
    console.error("Wikipedia lookup failed", error);
    return empty;
  }
}

/* ------------------------------------------------------------------ */
/* Sacnilk box-office verdict (snippet parsing via the waterfall)      */
/* ------------------------------------------------------------------ */

const MONEY_RE =
  /(?:₹|Rs\.?|\$|US\$)\s?[\d,.]+\s?(?:crore|cr|lakh|billion|million|bn|mn)?/i;

/** Normalises any money-ish string into one clean, card-ready label. */
export function normalizeMoney(value: string | null): string | null {
  if (!value) return null;
  const match = MONEY_RE.exec(value.replace(/\s+/g, " "));
  const cleaned = (match?.[0] ?? value).replace(/\s+/g, " ").trim();
  return cleaned.length > 1 ? cleaned.slice(0, 60) : null;
}

export async function fetchSacnilkBoxOffice(
  name: string,
  year: number | null,
): Promise<string | null> {
  const items = await cse(
    `site:sacnilk.com "${name}"${year ? ` ${year}` : ""} box office collection`,
    3,
  );
  for (const item of items) {
    const money = normalizeMoney(`${item.title} ${item.snippet ?? ""}`);
    if (money) return money;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

function pickPlatform(availability: Availability[], platformFilter: string) {
  if (platformFilter) return availability.find((a) => a.platform === platformFilter) ?? null;
  return availability.find((a) => a.hindi) ?? availability[0] ?? null;
}

export async function resolveTitle(
  name: string,
  parsed: ParsedQuery,
  filters: { platform: string; language: string },
): Promise<ResolvedTitle> {
  const yearMatch = /\((\d{4})\)/.exec(name);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const cleanName = name.replace(/\s*\(\d{4}\)\s*/, "").trim();

  const availability = await findAvailability(cleanName, filters.platform);
  const ratings = await findRatings(cleanName, year);
  const financials = await fetchFinancials(cleanName, year);
  const sacnilk = financials.boxOffice ? null : await fetchSacnilkBoxOffice(cleanName, year);


  const chosen = pickPlatform(availability, filters.platform);
  const anyHindi = availability.some((a) => a.hindi);
  const hindiStatus: HindiStatus = chosen?.hindi ? "verified" : anyHindi ? "user" : "none";

  return {
    slug: slugify(`${cleanName} ${year ?? ""}`),
    name: cleanName,
    year,
    category: parsed.category,
    platform: chosen?.platform ?? null,
    streamUrl: chosen?.url ?? null,
    hindiStatus,
    hindiVerifiedOn: hindiStatus === "verified" ? new Date().toISOString() : null,
    ratingRt: ratings.rt,
    ratingImdb: ratings.imdb,
    budget: normalizeMoney(financials.budget),
    boxOffice: normalizeMoney(financials.boxOffice) ?? sacnilk,
    analysis: parsed.analysis,
    availability,
  };
}

export async function persistTitles(titles: ResolvedTitle[]) {
  if (!titles.length) return;
  const admin = await getAdmin();
  const { error } = await admin.from("titles").upsert(
    titles.map((t) => ({
      slug: t.slug,
      name: t.name,
      year: t.year,
      category: t.category,
      platform: t.platform,
      stream_url: t.streamUrl,
      hindi_status: t.hindiStatus,
      hindi_verified_on: t.hindiVerifiedOn,
      rating_rt: t.ratingRt,
      rating_imdb: t.ratingImdb,
      budget: t.budget,
      box_office: t.boxOffice,
      analysis: t.analysis,
      availability_ok: Boolean(t.streamUrl),
      last_checked_at: new Date().toISOString(),
    })),
    { onConflict: "slug" },
  );
  if (error) console.error("persistTitles failed", error);
}

export async function readCache(queryNorm: string, platform: string, language: string) {
  const admin = await getAdmin();
  const { data, error } = await admin.rpc("match_cached_search", {
    _query: queryNorm,
    _platform: platform,
    _language: language,
  });
  if (error) {
    console.error("cache lookup failed", error);
    return null;
  }
  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) return null;
  await admin
    .from("search_cache")
    .update({ hit_count: 1, updated_at: new Date().toISOString() })
    .eq("id", hit.id);
  return hit;
}

export async function writeCache(args: {
  queryNorm: string;
  rawQuery: string;
  platform: string;
  language: string;
  results: ResolvedTitle[];
  analysis: string;
}) {
  const admin = await getAdmin();
  const { error } = await admin.from("search_cache").upsert(
    {
      query_norm: args.queryNorm,
      raw_query: args.rawQuery,
      platform: args.platform,
      language: args.language,
      results: args.results as unknown as never,
      analysis: args.analysis,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "query_norm,platform,language" },
  );
  if (error) console.error("cache write failed", error);
}

/* ------------------------------------------------------------------ */
/* Taste analytics                                                     */
/* ------------------------------------------------------------------ */

export type TasteEvent = {
  type: "click" | "save" | "search";
  value: string;
  weight?: number | undefined;
};

export async function applyTasteEvents(subjectKey: string, events: TasteEvent[]) {
  const admin = await getAdmin();
  const { data: existing } = await admin
    .from("taste_profiles")
    .select("id, weights, searches, interactions")
    .eq("subject_key", subjectKey)
    .maybeSingle();

  const weights: Record<string, number> = { ...((existing?.weights as Record<string, number>) ?? {}) };
  const searches: string[] = Array.isArray(existing?.searches)
    ? (existing.searches as string[])
    : [];

  for (const event of events) {
    const key = normalizeQuery(event.value);
    if (!key) continue;
    const base = event.type === "save" ? 3 : event.type === "click" ? 2 : 1;
    weights[key] = (weights[key] ?? 0) + base * (event.weight ?? 1);
    if (event.type === "search") {
      searches.unshift(key);
    }
  }

  const trimmedSearches = Array.from(new Set(searches)).slice(0, 12);
  const interactions = (existing?.interactions ?? 0) + events.length;

  const { error } = await admin.from("taste_profiles").upsert(
    {
      subject_key: subjectKey,
      weights: weights as unknown as never,
      searches: trimmedSearches as unknown as never,
      interactions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "subject_key" },
  );
  if (error) console.error("taste upsert failed", error);

  const topKeys = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);

  return { weights, searches: trimmedSearches, interactions, topKeys };
}

export async function recommendForTaste(topKeys: string[], limit = 12) {
  const admin = await getAdmin();
  let query = admin
    .from("titles")
    .select("*")
    .eq("availability_ok", true)
    .order("rating_rt", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (topKeys.length) {
    const or = topKeys
      .slice(0, 5)
      .map((k) => `name.ilike.%${k}%,category.ilike.%${k}%,platform.ilike.%${k}%`)
      .join(",");
    query = query.or(or);
  }

  const { data, error } = await query;
  if (error) {
    console.error("recommendation query failed", error);
    return [];
  }
  return data ?? [];
}
