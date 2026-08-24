import { createServerFn } from "@tanstack/react-start";

export type LayerDiagnostic = {
  name: string;
  label: string;
  configured: boolean;
  ok: boolean;
  count: number;
  ms: number;
  sample: string | null;
  note: string;
};

export type WaterfallDiagnostic = {
  query: string;
  winner: string | null;
  layers: LayerDiagnostic[];
};

/** Probes every waterfall layer independently so failures are visible per layer. */
export const checkSearchWaterfall = createServerFn({ method: "POST" }).handler(
  async (): Promise<WaterfallDiagnostic> => {
    const diag = await import("./diagnostics.server");
    return diag.runWaterfallDiagnostic();
  },
);
