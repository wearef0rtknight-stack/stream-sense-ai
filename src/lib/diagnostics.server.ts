import type { CseDiagnostic } from "./diagnostics.functions";

function mask(value: string | undefined, keep = 6): string | null {
  if (!value) return null;
  if (value.length <= keep) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, keep)}…${value.slice(-2)} (${value.length} chars)`;
}

function explain(status: number | null, reason: string | null, message: string | null): string {
  if (status === null) return "Could not reach Google. Network or DNS issue from the server.";
  if (status === 200) return "Connection healthy — key and engine id (CX) both work.";
  if (status === 403) {
    if ((message ?? "").toLowerCase().includes("does not have the access")) {
      return "The Custom Search JSON API is not enabled in the SAME Google Cloud project that owns this API key. Enable it in that exact project, or create a new key inside the project where it is already enabled.";
    }
    if (reason === "dailyLimitExceeded" || (message ?? "").includes("Quota")) {
      return "Daily free quota (100 queries/day) exhausted. It resets at midnight Pacific time.";
    }
    return "Key rejected. Check API restrictions on the key (must allow Custom Search API) and any HTTP referrer restriction — server calls send no referrer.";
  }
  if (status === 400) {
    if ((message ?? "").toLowerCase().includes("cx")) {
      return "The engine id (CX) is invalid. Copy it from programmablesearchengine.google.com → your engine → Search engine ID.";
    }
    return "Bad request — usually a malformed key or engine id.";
  }
  if (status === 429) return "Rate limited by Google. Retry shortly.";
  return "Unexpected response from Google Custom Search.";
}

export async function runCseDiagnostic(): Promise<CseDiagnostic> {
  const key = process.env["GOOGLE_CSE_API_KEY"];
  const cx = process.env["GOOGLE_CSE_CX"];

  const base: CseDiagnostic = {
    keyPresent: Boolean(key),
    cxPresent: Boolean(cx),
    keyHint: mask(key),
    cxHint: mask(cx, 10),
    httpStatus: null,
    reason: null,
    message: null,
    itemCount: null,
    ok: false,
    hint: "",
  };

  if (!key || !cx) {
    return {
      ...base,
      hint: "Missing credentials. Add GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX in project settings.",
    };
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", 'site:netflix.com "Hindi"');
  url.searchParams.set("num", "1");

  try {
    const res = await fetch(url);
    const text = await res.text();
    let reason: string | null = null;
    let message: string | null = null;
    let itemCount: number | null = null;

    try {
      const body = JSON.parse(text) as {
        error?: { message?: string; status?: string; errors?: { reason?: string }[] };
        items?: unknown[];
      };
      reason = body.error?.errors?.[0]?.reason ?? body.error?.status ?? null;
      message = body.error?.message ?? null;
      itemCount = Array.isArray(body.items) ? body.items.length : null;
    } catch {
      message = text.slice(0, 200);
    }

    return {
      ...base,
      httpStatus: res.status,
      reason,
      message,
      itemCount,
      ok: res.ok,
      hint: explain(res.status, reason, message),
    };
  } catch (error) {
    return {
      ...base,
      message: error instanceof Error ? error.message : String(error),
      hint: explain(null, null, null),
    };
  }
}
