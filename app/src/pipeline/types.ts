export type GapState = "compact" | "cozy" | "relaxed";

export type StageView = {
  id: string;
  label: string;
  status: string;
  artifactPath: string;
  excerpt: string;
};

export type LedgerEvent = {
  ts: string;
  event: string;
  ref?: string;
  status?: string;
  confidence?: number;
  reason?: string;
  to?: string;
};

export type PipelineResult = {
  mode: "proposed" | "applied" | "rolled_back";
  input: string;
  promptRecognized: boolean;
  interpretedIntent: string;
  canonicalEdit: {
    target: string;
    from: GapState;
    to: GapState;
    semanticStepDelta: number;
    policyClass: string;
  };
  tokens: {
    before: { alias: string; resolved: { value: number; unit: string } };
    after: { alias: string; resolved: { value: number; unit: string } };
  };
  verification: {
    status: "pass" | "fail";
    checks: string[];
    unchanged: string[];
  };
  evidence: {
    diffSummary: string[];
    semanticDiffPath: string;
    reportPath: string;
  };
  rollbackPlan: {
    id: string;
    successState: GapState;
    successPx: number;
    steps: string[];
  };
  stages: StageView[];
  ledger: LedgerEvent[];
  productFraming: {
    changed: string;
    unchanged: string[];
    whyLowRisk: string;
    whySafer: string;
  };
  rollbackVerification?: {
    status: "pass" | "fail";
    expectedPx: number;
    actualPx: number;
  };
};
