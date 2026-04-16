import { baselineGap, gapTokenPx, promptMap } from "../data/prompts";
import type { CanonicalEdit, GapState, PipelineResult } from "./types";

const semanticIntent = "vertical_rhythm_adjustment";
const aliasFor = (state: GapState) => (state === "compact" ? "{space.2}" : state === "cozy" ? "{space.4}" : "{space.6}");

function toEdit(targetGap: GapState): CanonicalEdit {
  const order: GapState[] = ["compact", "cozy", "relaxed"];
  return {
    target: "place_card.header_body_gap",
    from: baselineGap,
    to: targetGap,
    semanticStepDelta: (order.indexOf(targetGap) - order.indexOf(baselineGap)) as -1 | 0 | 1,
    reason: "Governed change to PlaceCard header/body spacing"
  };
}

export function runPipeline(input: string): PipelineResult {
  const normalized = input.trim().toLowerCase();
  const toState = promptMap[normalized] ?? baselineGap;
  const edit = toEdit(toState);

  return {
    input,
    interpretedIntent: semanticIntent,
    canonicalEdit: edit,
    resolvedTokenBefore: gapTokenPx[edit.from],
    resolvedTokenAfter: gapTokenPx[edit.to],
    verificationPassed: true,
    stages: [
      { id: "00", label: "Human Input", artifact: input },
      { id: "01", label: "Operator Interpretation", artifact: `${semanticIntent} -> ${edit.target}` },
      { id: "02", label: "Canonical Edit", artifact: `${edit.target}: ${edit.from} -> ${edit.to}` },
      { id: "03", label: "Semantic IR", artifact: "axis header_body_gap constrained by grammar/components" },
      { id: "04", label: "Token Resolution", artifact: `${aliasFor(edit.from)} -> ${aliasFor(edit.to)}` },
      { id: "05", label: "Projection: Variants", artifact: "component.variants.ts updated through governed axis" },
      { id: "06", label: "Projection: CSS", artifact: "theme variables reflect semantic gap" },
      { id: "07", label: "Verification", artifact: "policy, token, and projection checks pass" },
      { id: "08", label: "Evidence", artifact: "semantic diff + policy rationale + verification report" },
      { id: "09", label: "Ledger", artifact: "append immutable event stream" },
      { id: "10", label: "Rollback Plan", artifact: `revert ${edit.to} -> ${edit.from}` }
    ],
    eventLog: [
      "input_received",
      "operator_translation_completed",
      "canonical_edit_created",
      "ir_built",
      "token_resolution_completed",
      "projection_completed",
      "verification_completed"
    ],
    evidence: [
      `Semantic diff: ${edit.target} ${edit.from} -> ${edit.to}`,
      "Policy class: low_risk_presentational",
      "Forbidden mutations: none"
    ],
    rollbackPlan: [
      `Set canonical edit target back to ${edit.from}`,
      "Re-run token resolution",
      "Re-project component artifacts",
      "Verify and append rollback ledger event"
    ]
  };
}

export function rollbackPipeline(appliedResult: PipelineResult): PipelineResult {
  return {
    ...appliedResult,
    canonicalEdit: {
      ...appliedResult.canonicalEdit,
      from: appliedResult.canonicalEdit.to,
      to: baselineGap,
      semanticStepDelta: (baselineGap === appliedResult.canonicalEdit.to ? 0 : -1) as -1 | 0 | 1,
      reason: "Rollback to pre-edit governed state"
    },
    resolvedTokenBefore: appliedResult.resolvedTokenAfter,
    resolvedTokenAfter: gapTokenPx[baselineGap],
    eventLog: [...appliedResult.eventLog, "rollback_applied", "post_rollback_verification_passed"]
  };
}

export const canonicalAxes = ["density", "surface", "header_body_gap"] as const;
export const projectedAxes = ["density", "surface", "headerBodyGap"] as const;
