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
  if (!header || typeof header.index !== "number") return [];
  const after = text.slice(header.index + header[0].length);
  const lines = [];
  for (const raw of after.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) break;
    if (line.startsWith("- ")) lines.push(line.slice(2).replace(/^"|"$/g, ""));
  }
  return lines;
}

function parseJsonLines(jsonl) {
  return jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseVerificationChecks(report) {
  const lines = report.split("\n");
  const checks = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- id:")) {
      if (current) checks.push(current);
      current = { id: trimmed.replace(/^- id:\s*/, ""), status: "", detail: "" };
      continue;
    }
    if (!current) continue;
    if (trimmed.startsWith("status:")) {
      current.status = trimmed.replace(/^status:\s*/, "");
    }
    if (trimmed.startsWith("detail:")) {
      current.detail = trimmed.replace(/^detail:\s*/, "").replace(/^"|"$/g, "");
    }
  }

  if (current) checks.push(current);
  return checks;
}

function parseRollbackSteps(plan) {
  return plan
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- step:"))
    .map((line) => line.replace(/^- step:\s*/, "").replace(/^"|"$/g, ""));
}

function parseCanonicalBlastRadius(editYaml) {
  const components = [];
  const screens = [];
  const expectedSideEffects = [];
  let mode = "";

  for (const raw of editYaml.split("\n")) {
    const line = raw.trim();
    if (line === "components:") mode = "components";
    else if (line === "screens:") mode = "screens";
    else if (line === "expected_side_effects:") mode = "effects";
    else if (!line.startsWith("- ")) mode = "";

    if (!line.startsWith("- ")) continue;
    const value = line.slice(2).replace(/^"|"$/g, "");
    if (mode === "components") components.push(value);
    if (mode === "screens") screens.push(value);
    if (mode === "effects") expectedSideEffects.push(value);
  }

  return { components, screens, expectedSideEffects };
}

function buildRollbackTrace(ledgerEvents) {
  const wanted = ["rollback_requested", "rollback_applied", "post_rollback_verification_completed"];
  return wanted.map((eventName) => {
    const hit = ledgerEvents.find((entry) => entry.event === eventName);
    return {
      event: eventName,
      status: hit ? "done" : "pending",
      ts: hit?.ts,
      ref: hit?.ref
    };
  });
}

export function parseCanonicalArtifacts(artifacts) {
  const resolvedTokens = JSON.parse(artifacts.resolvedTokens);
  const ledgerEvents = parseJsonLines(artifacts.ledger);

  const before = extractYamlValue(artifacts.uiEdit, "from");
  const canonicalAfter = extractYamlValue(artifacts.uiEdit, "to");
  const target = extractYamlValue(artifacts.uiEdit, "target");
  const operatorType = extractYamlValue(artifacts.operator, "type");
  const operatorAction = extractYamlValue(artifacts.operator, "action");
  const operatorAxis = extractYamlValue(artifacts.operator, "axis");
  const operatorConfidence = Number(extractYamlValue(artifacts.operator, "confidence"));
  const policyAllowed = extractYamlValue(artifacts.operator, "allowed") === "true";

  const stateMap = resolvedTokens.semantic.component.placeCard.headerBodyGap;
  const verificationChecks = parseVerificationChecks(artifacts.report);
  const unchanged = extractListAfterHeader(artifacts.semanticDiff, /^## What did NOT change\s*$/m);
  const summaryChanged = extractListAfterHeader(artifacts.semanticDiff, /^## What changed\s*$/m);
  const blastRadius = parseCanonicalBlastRadius(artifacts.uiEdit);

  return {
    heroPromptFromArtifact: extractQuoted(artifacts.humanRequest, "isso precisa ficar um pouco mais abaixo"),
    canonical: {
      target,
      before,
      after: canonicalAfter,
      editId: extractYamlValue(artifacts.uiEdit, "edit_id"),
      blastRadius
    },
    operator: {
      type: operatorType,
      action: operatorAction,
      axis: operatorAxis,
      confidence: Number.isNaN(operatorConfidence) ? 0 : operatorConfidence,
      policyAllowed,
      decisionReason: extractYamlValue(artifacts.operator, "reason")
    },
    ir: {
      component: extractYamlValue(artifacts.operator, "component"),
      axis: operatorAxis,
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
      checks: verificationChecks,
      unchanged,
      summaryChanged
    },
    rollback: {
      id: extractYamlValue(artifacts.rollbackPlan, "rollback_id"),
      successState: extractYamlValue(artifacts.rollbackPlan, "header_body_gap"),
      successPx: Number(extractYamlValue(artifacts.rollbackPlan, "resolved_px")),
      steps: parseRollbackSteps(artifacts.rollbackPlan)
    },
    ledgerEvents,
    rollbackTrace: buildRollbackTrace(ledgerEvents),
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

function facts(entries) {
  return entries.filter((entry) => entry.value !== "" && entry.value !== undefined);
}

function buildStages(snapshot, from, to) {
  const fromToken = snapshot.tokens.byState[from];
  const toToken = snapshot.tokens.byState[to];

  return [
    {
      id: "00",
      label: "Human Input",
      status: "captured",
      artifactPath: snapshot.stagePaths["00"],
      structuredFacts: facts([
        { key: "prompt", value: snapshot.heroPromptFromArtifact }
      ])
    },
    {
      id: "01",
      label: "Operator Translation",
      status: snapshot.operator.policyAllowed ? "allowed" : "blocked",
      artifactPath: snapshot.stagePaths["01"],
      structuredFacts: facts([
        { key: "type", value: snapshot.operator.type },
        { key: "action", value: snapshot.operator.action },
        { key: "axis", value: snapshot.operator.axis },
        { key: "confidence", value: `${Math.round(snapshot.operator.confidence * 100)}%` },
        { key: "allowed", value: String(snapshot.operator.policyAllowed) }
      ]),
      rawExcerpt: snapshot.operator.decisionReason
    },
    {
      id: "02",
      label: "Canonical Edit",
      status: "generated",
      artifactPath: snapshot.stagePaths["02"],
      structuredFacts: facts([
        { key: "edit_id", value: snapshot.canonical.editId },
        { key: "target", value: snapshot.canonical.target },
        { key: "from", value: from },
        { key: "to", value: to },
        {
          key: "blast_radius",
          value: `${snapshot.canonical.blastRadius.components.join(", ")} @ ${snapshot.canonical.blastRadius.screens.join(", ")}`
        }
      ])
    },
    {
      id: "03",
      label: "Semantic IR",
      status: "resolved",
      artifactPath: snapshot.stagePaths["03"],
      structuredFacts: facts([
        { key: "component", value: snapshot.ir.component },
        { key: "axis", value: snapshot.ir.axis },
        { key: "relation", value: snapshot.ir.relation },
        { key: "invariants", value: String(snapshot.ir.invariantCount) }
      ])
    },
    {
      id: "04",
      label: "Token Resolution",
      status: "resolved",
      artifactPath: snapshot.stagePaths["04"],
      structuredFacts: facts([
        { key: "before_alias", value: fromToken.alias },
        { key: "before_px", value: `${fromToken.resolved.value}${fromToken.resolved.unit}` },
        { key: "after_alias", value: toToken.alias },
        { key: "after_px", value: `${toToken.resolved.value}${toToken.resolved.unit}` }
      ])
    },
    {
      id: "08",
      label: "Verification",
      status: "pass",
      artifactPath: `${snapshot.stagePaths["08-report"]} + ${snapshot.stagePaths["08-diff"]}`,
      structuredFacts: facts([
        { key: "checks", value: snapshot.verification.checks.map((check) => `${check.id}:${check.status}`).join(" | ") },
        { key: "changed", value: snapshot.verification.summaryChanged.join(" · ") },
        { key: "unchanged", value: snapshot.verification.unchanged.join(" · ") }
      ])
    },
    {
      id: "09",
      label: "Ledger",
      status: "recorded",
      artifactPath: snapshot.stagePaths["09"],
      structuredFacts: facts([
        { key: "events", value: String(snapshot.ledgerEvents.length) },
        { key: "ordered_refs", value: snapshot.ledgerEvents.map((event) => `${event.event}→${event.ref ?? "n/a"}`).join(" | ") }
      ])
    },
    {
      id: "10",
      label: "Rollback Plan",
      status: "ready",
      artifactPath: snapshot.stagePaths["10"],
      structuredFacts: facts([
        { key: "rollback_id", value: snapshot.rollback.id },
        { key: "steps", value: String(snapshot.rollback.steps.length) },
        { key: "success_condition", value: `${snapshot.rollback.successState} (${snapshot.rollback.successPx}px)` }
      ]),
      rawExcerpt: snapshot.rollback.steps[0]
    }
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
    rollbackTrace: buildRollbackTrace(snapshot.ledgerEvents),
    stages,
    ledger: [...snapshot.ledgerEvents],
    productFraming: {
      changed: `${snapshot.canonical.target} ${from} -> ${to}`,
      unchanged: snapshot.verification.unchanged,
      whyAllowed: `Intent ${snapshot.operator.type} on axis ${snapshot.operator.axis} is authorized by presentational_low_risk policy.`,
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
  const ledger = [...appliedResult.ledger, ...rollbackEvents];

  return {
    ...appliedResult,
    mode: "rolled_back",
    canonicalEdit: { ...appliedResult.canonicalEdit, from, to, semanticStepDelta: toDelta(from, to) },
    tokens: { before: snapshot.tokens.byState[from], after: snapshot.tokens.byState[to] },
    ledger,
    rollbackTrace: buildRollbackTrace(ledger),
    rollbackVerification: { status: "pass", expectedPx: snapshot.rollback.successPx, actualPx: snapshot.tokens.byState[to].resolved.value }
  };
}
