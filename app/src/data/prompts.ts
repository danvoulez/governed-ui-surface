import { PROMPT_PRESETS } from "../../../shared/pipeline-core.mjs";
import type { GapState } from "../pipeline/types";

export const promptMap = PROMPT_PRESETS as Record<string, GapState>;
export const baselineGap: GapState = "cozy";
