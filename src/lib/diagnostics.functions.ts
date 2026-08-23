import { createServerFn } from "@tanstack/react-start";

export type CseDiagnostic = {
  keyPresent: boolean;
  cxPresent: boolean;
  keyHint: string | null;
  cxHint: string | null;
  httpStatus: number | null;
  reason: string | null;
  message: string | null;
  itemCount: number | null;
  ok: boolean;
  hint: string;
};

/** Live connection check for the Google Custom Search key + engine id (CX). */
export const checkCseStatus = createServerFn({ method: "POST" }).handler(
  async (): Promise<CseDiagnostic> => {
    const diag = await import("./diagnostics.server");
    return diag.runCseDiagnostic();
  },
);
