import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ResolvedTitle } from "./ott.server";


const searchInput = z.object({
  query: z.string().min(2).max(200),
  platform: z.string().max(40).default(""),
  language: z.string().max(60).default(""),
});

const tasteInput = z.object({
  subjectKey: z.string().min(6).max(120),
  events: z
    .array(
      z.object({
        type: z.enum(["click", "save", "search"]),
        value: z.string().min(1).max(120),
        weight: z.number().min(0).max(5).optional(),
      }),
    )
    .min(1)
    .max(50),
});

/** Cache-first search: DB hit answers instantly, miss runs Gemini -> Google -> Wikipedia. */
export const searchOtt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchInput.parse(data))
  .handler(async ({ data }) => {
    const started = Date.now();
    const ott = await import("./ott.server");
    const queryNorm = ott.normalizeQuery(data.query);

    const cached = await ott.readCache(queryNorm, data.platform, data.language);
    if (cached) {
      return {
        source: "cache" as const,
        ms: Date.now() - started,
        analysis: cached.analysis ?? "",
        results: (cached.results ?? []) as ResolvedTitle[],
      };
    }

    try {
      const parsed = await ott.parseQueryWithGemini(data.query, {
        platform: data.platform,
        language: data.language,
      });

      if (!parsed.titles.length) {
        return { source: "live" as const, ms: Date.now() - started, analysis: parsed.analysis, results: [] };
      }

      const results = await Promise.all(
        parsed.titles.map((name) =>
          ott.resolveTitle(name, parsed, { platform: data.platform, language: data.language }),
        ),
      );

      const filtered = data.language.includes("Hindi")
        ? results.filter((r) => r.hindiStatus !== "none")
        : results;

      await ott.persistTitles(filtered);
      await ott.writeCache({
        queryNorm,
        rawQuery: data.query,
        platform: data.platform,
        language: data.language,
        results: filtered,
        analysis: parsed.analysis,
      });

      return {
        source: "live" as const,
        ms: Date.now() - started,
        analysis: parsed.analysis,
        results: filtered,
      };
    } catch (error) {
      const status = (error as { status?: number }).status;
      console.error("searchOtt failed", error);
      const message =
        status === 429
          ? "Search is busy right now — try again in a moment."
          : status === 402 || status === 403
            ? "AI search is temporarily unavailable for this workspace."
            : "Could not complete the live search. Please try again.";
      return { source: "error" as const, ms: Date.now() - started, analysis: "", results: [], error: message };
    }
  });

/** Taste analytics: absorbs interaction history and returns personalised picks. */
export const trackTaste = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tasteInput.parse(data))
  .handler(async ({ data }) => {
    const ott = await import("./ott.server");
    const profile = await ott.applyTasteEvents(data.subjectKey, data.events);
    const recommendations = await ott.recommendForTaste(profile.topKeys);
    return {
      interactions: profile.interactions,
      topKeys: profile.topKeys,
      searches: profile.searches,
      recommendations,
    };
  });
