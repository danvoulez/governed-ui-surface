#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applyGovernedEdit, parseCanonicalArtifacts, rollbackGovernedEdit, runGovernedPipeline } from "../shared/pipeline-core.mjs";

const request = process.argv[2] ?? "isso precisa ficar um pouco mais abaixo";
const mode = process.argv[3] ?? "apply";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const artifacts = {
  humanRequest: read("ui-canon/final-placecard/00-input/human-request.md"),
  operator: read("ui-canon/final-placecard/01-operator/operator-translation.yaml"),
  uiEdit: read("ui-canon/final-placecard/02-canonical-edit/ui-edit.yaml"),
  ir: read("ui-canon/final-placecard/03-ir/ui-ir.yaml"),
  resolvedTokens: read("ui-canon/final-placecard/04-token-resolution/resolved-tokens.json"),
  report: read("ui-canon/final-placecard/08-verification/report.yaml"),
  semanticDiff: read("ui-canon/final-placecard/08-verification/semantic-diff.md"),
  ledger: read("ui-canon/final-placecard/09-ledger/events.jsonl"),
  rollbackPlan: read("ui-canon/final-placecard/10-rollback/rollback-plan.yaml")
};

const snapshot = parseCanonicalArtifacts(artifacts);
const proposed = runGovernedPipeline(request, snapshot);
const applied = applyGovernedEdit(proposed);
const finalResult = mode === "rollback" ? rollbackGovernedEdit(applied, snapshot) : applied;

console.log(JSON.stringify({
  mode: finalResult.mode,
  input: request,
  interpretedIntent: finalResult.interpretedIntent,
  canonical_edit: finalResult.canonicalEdit,
  token_resolution: `${finalResult.tokens.before.resolved.value}px -> ${finalResult.tokens.after.resolved.value}px`,
  verification: finalResult.verification.status,
  stage_artifacts: finalResult.stages.map((stage) => ({ id: stage.id, artifact: stage.artifactPath })),
  ledger_events: finalResult.ledger.map((item) => item.event),
  rollback_plan: finalResult.rollbackPlan.steps
}, null, 2));
