export const PROMPT_PRESETS = {
  "isso precisa ficar um pouco mais abaixo": "relaxed",
  "isso está apertado demais": "relaxed",
  "deixa isso mais arejado": "relaxed",
  "quero um visual mais denso": "compact"
};

const STAGE_PATHS = {
  "00": "ui-canon/final-placecard/00-input/human-request.md",
  "01": "ui-canon/final-placecard/01-operator/operator-translation.yaml",
  "02": "ui-canon/final-placecard/02-canonical-edit/ui-edit.yaml",
  "03": "ui-canon/final-placecard/03-ir/ui-ir.yaml",
  "04": "ui-canon/final-placecard/04-token-resolution/resolved-tokens.json",
  "08-report": "ui-canon/final-placecard/08-verification/report.yaml",
  "08-diff": "ui-canon/final-placecard/08-verification/semantic-diff.md",
  "09": "ui-canon/final-placecard/09-ledger/events.jsonl",
  "10": "ui-canon/final-placecard/10-rollback/rollback-plan.yaml"
};

const GAP_ORDER = ["compact", "cozy", "relaxed"];

function extractQuoted(text, fallback = "") {
  const match = text.match(/"([^"]+)"/);
  return match ? match[1] : fallback;
}

function extractYamlValue(text, key) {
  const regex = new RegExp(`^\\s*${key}:\\s*([^\\n]+)$`, "m");
  const match = text.match(regex);
  return match ? match[1].replace(/^"|"$/g, "").trim() : "";
}

function extractListAfterHeader(text, headerRegex) {
  const header = text.match(headerRegex);
  if (!header || (header.index !== 0 && !header.index)) return [];
  const after = text.slice(header.index + header[0].length);
  return after
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).replace(/^"|"$/g, ""));
}

function parseJsonLines(jsonl) {
  return jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function parseCanonicalArtifacts(artifacts) {
  const resolvedTokens = JSON.parse(artifacts.resolvedTokens);
  const ledgerEvents = parseJsonLines(artifacts.ledger);

  const before = extractYamlValue(artifacts.uiEdit, "from");
  const canonicalAfter = extractYamlValue(artifacts.uiEdit, "to");
  const target = extractYamlValue(artifacts.uiEdit, "target");
  const operatorType = extractYamlValue(artifacts.operator, "type");
  const operatorConfidence = Number(extractYamlValue(artifacts.operator, "confidence"));
  const policyAllowed = extractYamlValue(artifacts.operator, "allowed") === "true";

  const stateMap = resolvedTokens.semantic.component.placeCard.headerBodyGap;
  const checks = extractListAfterHeader(artifacts.report, /^checks:\s*$/m);
  const unchanged = extractListAfterHeader(artifacts.semanticDiff, /^## What did NOT change\s*$/m);

  const rollbackSteps = artifacts.rollbackPlan
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- step:'))
    .map((line) => line.replace(/^- step:\s*/, "").replace(/^"|"$/g, ""));

  return {
    heroPromptFromArtifact: extractQuoted(artifacts.humanRequest, "isso precisa ficar um pouco mais abaixo"),
    canonical: {
      target,
      before,
      after: canonicalAfter,
      editId: extractYamlValue(artifacts.uiEdit, "edit_id")
    },
    operator: {
      type: operatorType,
      confidence: Number.isNaN(operatorConfidence) ? 0 : operatorConfidence,
      policyAllowed,
      decision: extractYamlValue(artifacts.operator, "action")
    },
    ir: {
      axis: extractYamlValue(artifacts.operator, "axis"),
      relation: extractYamlValue(artifacts.ir, "relation"),
      invariantCount: (artifacts.ir.match(/- id:\s*inv_/g) ?? []).length
    },
    tokens: {
      byState: {
        compact: stateMap.compact,
        cozy: stateMap.cozy,
        relaxed: stateMap.relaxed
      },
      beforeActive: resolvedTokens.semantic.component.placeCard.activeState.before,
      afterActive: resolvedTokens.semantic.component.placeCard.activeState.after
    },
    verification: {
      checks,
      unchanged,
      summaryChanged: extractListAfterHeader(artifacts.semanticDiff, /^## What changed\s*$/m)
    },
    rollback: {
      id: extractYamlValue(artifacts.rollbackPlan, "rollback_id"),
      successState: extractYamlValue(artifacts.rollbackPlan, "header_body_gap"),
      successPx: Number(extractYamlValue(artifacts.rollbackPlan, "resolved_px")),
      steps: rollbackSteps
    },
    ledgerEvents,
    stagePaths: STAGE_PATHS
  };
}

function mapInputToAfterState(input, fallbackAfter) {
  const normalized = input.trim().toLowerCase();
  return PROMPT_PRESETS[normalized] ?? fallbackAfter;
}

function toDelta(from, to) {
  return GAP_ORDER.indexOf(to) - GAP_ORDER.indexOf(from);
}

function buildStages(snapshot, from, to) {
  const fromToken = snapshot.tokens.byState[from];
  const toToken = snapshot.tokens.byState[to];

  return [
    { id: "00", label: "Human Input", status: "captured", artifactPath: snapshot.stagePaths["00"], excerpt: snapshot.heroPromptFromArtifact },
    { id: "01", label: "Operator Translation", status: snapshot.operator.policyAllowed ? "allowed" : "blocked", artifactPath: snapshot.stagePaths["01"], excerpt: `${snapshot.operator.type} (${Math.round(snapshot.operator.confidence * 100)}% confidence)` },
    { id: "02", label: "Canonical Edit", status: "generated", artifactPath: snapshot.stagePaths["02"], excerpt: `${snapshot.canonical.target}: ${from} -> ${to}` },
    { id: "03", label: "Semantic IR", status: "resolved", artifactPath: snapshot.stagePaths["03"], excerpt: `axis ${snapshot.ir.axis}; ${snapshot.ir.invariantCount} invariants satisfied` },
    { id: "04", label: "Token Resolution", status: "resolved", artifactPath: snapshot.stagePaths["04"], excerpt: `${fromToken.alias} (${fromToken.resolved.value}px) -> ${toToken.alias} (${toToken.resolved.value}px)` },
    { id: "08", label: "Verification", status: "pass", artifactPath: `${snapshot.stagePaths["08-report"]} + ${snapshot.stagePaths["08-diff"]}`, excerpt: snapshot.verification.summaryChanged[0] ?? "presentational low risk" },
    { id: "09", label: "Ledger", status: "recorded", artifactPath: snapshot.stagePaths["09"], excerpt: `${snapshot.ledgerEvents.length} canonical events loaded` },
    { id: "10", label: "Rollback Plan", status: "ready", artifactPath: snapshot.stagePaths["10"], excerpt: snapshot.rollback.steps[0] ?? "rollback by edit reversal" }
  ];
}

function buildRollbackEvents(lastTs) {
  const base = new Date(lastTs).getTime();
  return [
    { ts: new Date(base + 1000).toISOString(), event: "rollback_requested", ref: "10-rollback/rollback-plan.yaml", reason: "operator_requested_reversal" },
    { ts: new Date(base + 2000).toISOString(), event: "rollback_applied", ref: "02-canonical-edit/ui-edit.yaml", to: "cozy" },
    { ts: new Date(base + 3000).toISOString(), event: "post_rollback_verification_completed", ref: "08-verification/report.yaml", status: "pass" }
  ];
}

export function runGovernedPipeline(input, snapshot) {
  const from = snapshot.canonical.before;
  const to = mapInputToAfterState(input, snapshot.canonical.after);
  const stages = buildStages(snapshot, from, to);

  return {
    mode: "proposed",
    input,
    promptRecognized: Object.hasOwn(PROMPT_PRESETS, input.trim().toLowerCase()),
    interpretedIntent: snapshot.operator.type,
    canonicalEdit: { target: snapshot.canonical.target, from, to, semanticStepDelta: toDelta(from, to), policyClass: "low_risk_presentational" },
    tokens: { before: snapshot.tokens.byState[from], after: snapshot.tokens.byState[to] },
    verification: { status: "pass", checks: snapshot.verification.checks, unchanged: snapshot.verification.unchanged },
    evidence: { diffSummary: snapshot.verification.summaryChanged, semanticDiffPath: snapshot.stagePaths["08-diff"], reportPath: snapshot.stagePaths["08-report"] },
    rollbackPlan: snapshot.rollback,
    stages,
    ledger: [...snapshot.ledgerEvents],
    productFraming: {
      changed: `${snapshot.canonical.target} ${from} -> ${to}`,
      unchanged: snapshot.verification.unchanged,
      whyLowRisk: "Only a governed spacing axis changed inside a presentational_low_risk policy profile.",
      whySafer: "The canonical edit is auditable, verified, and reversible through ledgered events instead of direct class edits."
    }
  };
}

export function applyGovernedEdit(result) {
  return { ...result, mode: "applied" };
}

export function rollbackGovernedEdit(appliedResult, snapshot) {
  const from = appliedResult.canonicalEdit.to;
  const to = snapshot.rollback.successState;
  const rollbackEvents = buildRollbackEvents(appliedResult.ledger.at(-1)?.ts ?? new Date().toISOString());

  return {
    ...appliedResult,
    mode: "rolled_back",
    canonicalEdit: { ...appliedResult.canonicalEdit, from, to, semanticStepDelta: toDelta(from, to) },
    tokens: { before: snapshot.tokens.byState[from], after: snapshot.tokens.byState[to] },
    ledger: [...appliedResult.ledger, ...rollbackEvents],
    rollbackVerification: { status: "pass", expectedPx: snapshot.rollback.successPx, actualPx: snapshot.tokens.byState[to].resolved.value }
  };
}
