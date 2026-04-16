declare module "../../../shared/pipeline-core.mjs" {
  export const PROMPT_PRESETS: Record<string, "compact" | "cozy" | "relaxed">;
  export function parseCanonicalArtifacts(artifacts: Record<string, string>): any;
  export function runGovernedPipeline(input: string, snapshot: any): any;
  export function applyGovernedEdit(result: any): any;
  export function rollbackGovernedEdit(appliedResult: any, snapshot: any): any;
}
