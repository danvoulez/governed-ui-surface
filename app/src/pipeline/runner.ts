import { applyGovernedEdit, parseCanonicalArtifacts, rollbackGovernedEdit, runGovernedPipeline } from "../../../shared/pipeline-core.mjs";
import { canonicalArtifacts } from "./artifacts";
import type { PipelineResult } from "./types";

const snapshot = parseCanonicalArtifacts(canonicalArtifacts);

export const promptPresets = Object.keys({
  "isso precisa ficar um pouco mais abaixo": true,
  "isso está apertado demais": true,
  "deixa isso mais arejado": true,
  "quero um visual mais denso": true
});

export function runPipeline(input: string): PipelineResult {
  return runGovernedPipeline(input, snapshot) as PipelineResult;
}

export function applyPipeline(result: PipelineResult): PipelineResult {
  return applyGovernedEdit(result) as PipelineResult;
}

export function rollbackPipeline(appliedResult: PipelineResult): PipelineResult {
  return rollbackGovernedEdit(appliedResult, snapshot) as PipelineResult;
}

export function getArtifactSnapshot() {
  return snapshot;
}

export const canonicalAxes = ["density", "surface", "header_body_gap"] as const;
export const projectedAxes = ["density", "surface", "headerBodyGap"] as const;
