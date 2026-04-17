export type GapState = "compact" | "cozy" | "relaxed";

export type StageFact = {
  key: string;
  value: string;
};

export type StageKind = "reference" | "verification" | "rollback";

export type StageView = {
  id: string;
  label: string;
  kind: StageKind;
  status: string;
  artifactPath: string;
  structuredFacts: StageFact[];
  rawSource: string;
  rawExcerpt?: string;
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

export type RollbackTraceStep = {
  event: "rollback_requested" | "rollback_applied" | "post_rollback_verification_completed";
  status: "pending" | "done";
  ts?: string;
  ref?: string;
};

export type VerificationCheck = {
  id: string;
  status: string;
  detail: string;
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
    forbiddenChanges: string[];
    expectedSideEffects: string[];
  };
  tokens: {
    before: { alias: string; resolved: { value: number; unit: string } };
    after: { alias: string; resolved: { value: number; unit: string } };
  };
  verification: {
    status: "pass" | "fail";
    checks: VerificationCheck[];
    unchanged: string[];
    visualExpected: string[];
  };
  evidence: {
    diffSummary: string[];
    semanticDiffPath: string;
    reportPath: string;
  };
  rollbackPlan: {
    id: string;
    targetEditId: string;
    successState: GapState;
    successPx: number;
    steps: string[];
    stepFiles: string[][];
  };
  rollbackTrace: RollbackTraceStep[];
  stages: StageView[];
  ledger: LedgerEvent[];
  productFraming: {
    changed: string;
    unchanged: string[];
    whyAllowed: string;
    whySafer: string;
  };
  rollbackVerification?: {
    status: "pass" | "fail";
    expectedPx: number;
    actualPx: number;
    restoredState: GapState;
    restoredAlias: string;
  };
};
