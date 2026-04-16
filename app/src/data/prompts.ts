import type { GapState } from "../pipeline/types";

export const promptMap: Record<string, GapState> = {
  "isso precisa ficar um pouco mais abaixo": "relaxed",
  "isso está apertado demais": "relaxed",
  "deixa isso mais arejado": "relaxed",
  "quero um visual mais denso": "compact"
};

export const baselineGap: GapState = "cozy";

export const gapTokenPx: Record<GapState, number> = {
  compact: 8,
  cozy: 16,
  relaxed: 24
};
