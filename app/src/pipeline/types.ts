export type GapState = "compact" | "cozy" | "relaxed";

export type CanonicalEdit = {
  target: "place_card.header_body_gap";
  from: GapState;
  to: GapState;
  semanticStepDelta: -1 | 0 | 1;
  reason: string;
};

export type PipelineStage = {
  id: string;
  label: string;
  artifact: string;
};

export type PipelineResult = {
  input: string;
  interpretedIntent: string;
  canonicalEdit: CanonicalEdit;
  resolvedTokenBefore: number;
  resolvedTokenAfter: number;
  verificationPassed: boolean;
  stages: PipelineStage[];
  eventLog: string[];
  evidence: string[];
  rollbackPlan: string[];
};
