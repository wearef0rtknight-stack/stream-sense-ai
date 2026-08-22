import { createFileRoute } from "@tanstack/react-router";

import type { HindiStatus } from "@/lib/ott.server";

/**
 * Daily maintenance job (GitHub Actions cron or pg_cron).
 * Re-checks the oldest stored titles: verifies the streaming URL still resolves
 * and re-runs the Google Search availability loop to catch language changes.
 */

const BATCH_SIZE = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/hooks/refresh-availability")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["LOVABLE_CRON_SECRET"];
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || provided !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        let limit = BATCH_SIZE;
        try {
          const body = (await request.json()) as { limit?: unknown };
          if (typeof body.limit === "number" && body.limit > 0) {
            limit = Math.min(Math.floor(body.limit), BATCH_SIZE);
          }
        } catch {
          /* empty body is fine */
        }

        const ott = await import("@/lib/ott.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: rows, error } = await supabaseAdmin
          .from("titles")
          .select("id, name, platform, stream_url, hindi_status")
          .order("last_checked_at", { ascending: true })
          .limit(limit);

        if (error) {
          console.error("refresh-availability read failed", error);
          return json({ error: "Could not read titles" }, 500);
        }

        let checked = 0;
        let broken = 0;
        let languageChanged = 0;
        const now = new Date().toISOString();

        for (const row of rows ?? []) {
          checked += 1;
          let live = row.stream_url ? await ott.isUrlLive(row.stream_url) : false;
          let platform = row.platform;
          let streamUrl = row.stream_url;
          let hindiStatus = row.hindi_status as HindiStatus;

          if (!live) {
            const availability = await ott.findAvailability(row.name, platform ?? "");
            const chosen = availability.find((a) => a.hindi) ?? availability[0] ?? null;
            if (chosen) {
              platform = chosen.platform;
              streamUrl = chosen.url;
              live = Boolean(chosen.url);
            }
            const nextStatus: HindiStatus = chosen?.hindi
              ? "verified"
              : availability.some((a) => a.hindi)
                ? "user"
                : "none";
            if (nextStatus !== hindiStatus) languageChanged += 1;
            hindiStatus = nextStatus;
          }

          if (!live) broken += 1;

          const { error: updateError } = await supabaseAdmin
            .from("titles")
            .update({
              platform,
              stream_url: streamUrl,
              hindi_status: hindiStatus,
              hindi_verified_on: hindiStatus === "verified" ? now : null,
              availability_ok: live,
              last_checked_at: now,
            })
            .eq("id", row.id);
          if (updateError) console.error("refresh-availability update failed", updateError);
        }

        return json({ ok: true, checked, broken, languageChanged, ranAt: now });
      },
    },
  },
});
