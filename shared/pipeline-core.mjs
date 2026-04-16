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

function extractYamlMapValue(text, path) {
  const [head, child] = path;
  const block = text.match(new RegExp(`^\\s*${head}:\\s*$([\\s\\S]*?)(?:^\\S|$)`, "m"));
  if (!block) return "";
  const match = block[1].match(new RegExp(`^\\s*${child}:\\s*([^\\n]+)$`, "m"));
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
    if (line.startsWith("- ")) lines.push(line.slice(2).replace(/^"|"$/g, "").replace(/`/g, ""));
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
    if (trimmed.startsWith("status:")) current.status = trimmed.replace(/^status:\s*/, "");
    if (trimmed.startsWith("detail:")) current.detail = trimmed.replace(/^detail:\s*/, "").replace(/^"|"$/g, "");
  }

  if (current) checks.push(current);
  return checks;
}

function parseOperatorDetails(operatorYaml) {
  const rationale = [];
  const checks = [];
  let inRationale = false;
  let inChecks = false;
  let currentCheck = null;

  for (const raw of operatorYaml.split("\n")) {
    const line = raw.trim();

    if (line === "rationale:") {
      inRationale = true;
      inChecks = false;
      continue;
    }
    if (line === "checks:") {
      inRationale = false;
      inChecks = true;
      continue;
    }

    if (inRationale && line.startsWith("- ")) {
      rationale.push(line.slice(2).replace(/^"|"$/g, ""));
      continue;
    }
    if (inRationale && !line.startsWith("- ")) inRationale = false;

    if (!inChecks) continue;

    if (line.startsWith("- check:")) {
      if (currentCheck) checks.push(currentCheck);
      currentCheck = { check: line.replace(/^- check:\s*/, ""), status: "", threshold: "", actual: "" };
      continue;
    }

    if (!currentCheck) continue;
    if (line.startsWith("status:")) currentCheck.status = line.replace(/^status:\s*/, "");
    if (line.startsWith("threshold:")) currentCheck.threshold = line.replace(/^threshold:\s*/, "");
    if (line.startsWith("actual:")) currentCheck.actual = line.replace(/^actual:\s*/, "");

    if (line === "" || (/^[a-z_]+:/.test(line) && !line.startsWith("status:") && !line.startsWith("threshold:") && !line.startsWith("actual:"))) {
      if (currentCheck) checks.push(currentCheck);
      currentCheck = null;
    }
  }

  if (currentCheck) checks.push(currentCheck);
  return { rationale, checks };
}

function parseCanonicalEditDetails(editYaml) {
  const components = [];
  const screens = [];
  const expectedSideEffects = [];
  const forbiddenChanges = [];
  let mode = "";

  for (const raw of editYaml.split("\n")) {
    const line = raw.trim();
    if (line === "components:") mode = "components";
    else if (line === "screens:") mode = "screens";
    else if (line === "expected_side_effects:") mode = "effects";
    else if (line === "forbidden_changes:") mode = "forbidden";
    else if (!line.startsWith("- ")) mode = "";

    if (!line.startsWith("- ")) continue;
    const value = line.slice(2).replace(/^"|"$/g, "");
    if (mode === "components") components.push(value);
    if (mode === "screens") screens.push(value);
    if (mode === "effects") expectedSideEffects.push(value);
    if (mode === "forbidden") forbiddenChanges.push(value);
  }

  return { components, screens, expectedSideEffects, forbiddenChanges };
}

function parseIrResolution(irYaml) {
  return {
    relation: extractYamlValue(irYaml, "relation"),
    invariantCount: (irYaml.match(/- id:\s*inv_/g) ?? []).length,
    beforeState: extractYamlValue(irYaml, "place_card.header_body_gap"),
    beforeAlias: extractYamlValue(irYaml, "resolved_dimension"),
    beforePx: Number(extractYamlValue(irYaml, "resolved_px")),
    afterState: extractYamlValue(irYaml.split("after:")[1] ?? "", "place_card.header_body_gap"),
    afterAlias: extractYamlValue(irYaml.split("after:")[1] ?? "", "resolved_dimension"),
    afterPx: Number(extractYamlValue(irYaml.split("after:")[1] ?? "", "resolved_px"))
  };
}

function parseReportVisuals(reportYaml) {
  const expected = [];
  const unchanged = [];
  let mode = "";

  for (const raw of reportYaml.split("\n")) {
    const line = raw.trim();
    if (line === "expected:") mode = "expected";
    else if (line === "unchanged:") mode = "unchanged";
    else if (!line.startsWith("- ")) mode = "";

    if (!line.startsWith("- ")) continue;
    const value = line.slice(2).replace(/^"|"$/g, "");
    if (mode === "expected") expected.push(value);
    if (mode === "unchanged") unchanged.push(value);
  }

  return { expected, unchanged };
}

function parseRollbackPlan(plan) {
  const steps = [];
  const stepFiles = [];
  let stepIndex = -1;

  for (const raw of plan.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("- step:")) {
      steps.push(line.replace(/^- step:\s*/, "").replace(/^"|"$/g, ""));
      stepFiles.push([]);
      stepIndex += 1;
      continue;
    }
    if (stepIndex < 0) continue;
    if (line.startsWith("file:")) stepFiles[stepIndex].push(line.replace(/^file:\s*/, ""));
    if (line.startsWith("- ui-canon/")) stepFiles[stepIndex].push(line.replace(/^-\s*/, ""));
  }

  return {
    id: extractYamlValue(plan, "rollback_id"),
    targetEditId: extractYamlValue(plan, "target_edit_id"),
    successState: extractYamlValue(plan, "header_body_gap"),
    successPx: Number(extractYamlValue(plan, "resolved_px")),
    steps,
    stepFiles
  };
}

function buildRollbackTrace(ledgerEvents) {
  const wanted = ["rollback_requested", "rollback_applied", "post_rollback_verification_completed"];
  return wanted.map((eventName) => {
    const hit = ledgerEvents.find((entry) => entry.event === eventName);
    return { event: eventName, status: hit ? "done" : "pending", ts: hit?.ts, ref: hit?.ref };
  });
}

function summarizeLedger(ledgerEvents) {
  const byStage = {};
  for (const event of ledgerEvents) {
    const stage = (event.ref ?? "unknown").split("/")[0] || "unknown";
    byStage[stage] = (byStage[stage] ?? 0) + 1;
  }
  return {
    totalEvents: ledgerEvents.length,
    byStage,
    uniqueRefs: [...new Set(ledgerEvents.map((event) => event.ref).filter(Boolean))].length
  };
}

export function parseCanonicalArtifacts(artifacts) {
  const resolvedTokens = JSON.parse(artifacts.resolvedTokens);
  const ledgerEvents = parseJsonLines(artifacts.ledger);
  const operatorDetails = parseOperatorDetails(artifacts.operator);
  const canonicalDetails = parseCanonicalEditDetails(artifacts.uiEdit);
  const irResolution = parseIrResolution(artifacts.ir);
  const verificationChecks = parseVerificationChecks(artifacts.report);
  const semanticUnchanged = extractListAfterHeader(artifacts.semanticDiff, /^## What did NOT change\s*$/m);
  const summaryChanged = extractListAfterHeader(artifacts.semanticDiff, /^## What changed\s*$/m);
  const reportVisuals = parseReportVisuals(artifacts.report);
  const rollback = parseRollbackPlan(artifacts.rollbackPlan);

  const before = extractYamlValue(artifacts.uiEdit, "from");
  const canonicalAfter = extractYamlValue(artifacts.uiEdit, "to");
  const target = extractYamlValue(artifacts.uiEdit, "target");
  const operatorAxis = extractYamlValue(artifacts.operator, "axis");
  const operatorConfidence = Number(extractYamlValue(artifacts.operator, "confidence"));
  const policyAllowed = extractYamlValue(artifacts.operator, "allowed") === "true";
  const stateMap = resolvedTokens.semantic.component.placeCard.headerBodyGap;

  return {
    heroPromptFromArtifact: extractQuoted(artifacts.humanRequest, "isso precisa ficar um pouco mais abaixo"),
    canonical: {
      target,
      before,
      after: canonicalAfter,
      editId: extractYamlValue(artifacts.uiEdit, "edit_id"),
      policyClass: extractYamlValue(artifacts.uiEdit, "policy_class"),
      reason: extractYamlValue(artifacts.uiEdit, "reason"),
      blastRadius: canonicalDetails
    },
    operator: {
      type: extractYamlValue(artifacts.operator, "type"),
      action: extractYamlValue(artifacts.operator, "action"),
      axis: operatorAxis,
      confidence: Number.isNaN(operatorConfidence) ? 0 : operatorConfidence,
      policyProfile: extractYamlValue(artifacts.operator, "profile"),
      policyAllowed,
      decisionReason: extractYamlValue(artifacts.operator, "reason"),
      rationale: operatorDetails.rationale,
      policyChecks: operatorDetails.checks
    },
    ir: {
      component: extractYamlValue(artifacts.operator, "component"),
      axis: operatorAxis,
      ...irResolution
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
      unchanged: semanticUnchanged,
      summaryChanged,
      visualExpected: reportVisuals.expected,
      visualUnchanged: reportVisuals.unchanged
    },
    rollback,
    ledgerEvents,
    ledgerSummary: summarizeLedger(ledgerEvents),
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
        { key: "request.prompt", value: snapshot.heroPromptFromArtifact },
        { key: "request.mapping", value: `${from} -> ${to}` }
      ])
    },
    {
      id: "01",
      label: "Operator Translation",
      status: snapshot.operator.policyAllowed ? "allowed" : "blocked",
      artifactPath: snapshot.stagePaths["01"],
      structuredFacts: facts([
        { key: "intent.type", value: snapshot.operator.type },
        { key: "intent.action", value: snapshot.operator.action },
        { key: "intent.axis", value: snapshot.operator.axis },
        { key: "policy.profile", value: snapshot.operator.policyProfile },
        { key: "policy.allowed", value: String(snapshot.operator.policyAllowed) },
        { key: "policy.checks", value: snapshot.operator.policyChecks.map((check) => `${check.check}:${check.status}`).join(" | ") },
        { key: "operator.rationale", value: snapshot.operator.rationale.join(" · ") },
        { key: "operator.confidence", value: `${Math.round(snapshot.operator.confidence * 100)}%` }
      ]),
      rawExcerpt: snapshot.operator.decisionReason
    },
    {
      id: "02",
      label: "Canonical Edit",
      status: "generated",
      artifactPath: snapshot.stagePaths["02"],
      structuredFacts: facts([
        { key: "edit.id", value: snapshot.canonical.editId },
        { key: "edit.target", value: snapshot.canonical.target },
        { key: "edit.reason", value: snapshot.canonical.reason },
        { key: "edit.state", value: `${from} -> ${to}` },
        { key: "policy.class", value: snapshot.canonical.policyClass },
        { key: "blast.components", value: snapshot.canonical.blastRadius.components.join(", ") },
        { key: "blast.screens", value: snapshot.canonical.blastRadius.screens.join(", ") },
        { key: "blast.expected", value: snapshot.canonical.blastRadius.expectedSideEffects.join(" · ") },
        { key: "forbidden.changes", value: snapshot.canonical.blastRadius.forbiddenChanges.join(", ") }
      ])
    },
    {
      id: "03",
      label: "Semantic IR",
      status: "resolved",
      artifactPath: snapshot.stagePaths["03"],
      structuredFacts: facts([
        { key: "ir.component", value: snapshot.ir.component },
        { key: "ir.axis", value: snapshot.ir.axis },
        { key: "ir.relation", value: snapshot.ir.relation },
        { key: "ir.before", value: `${snapshot.ir.beforeState} / ${snapshot.ir.beforeAlias} / ${snapshot.ir.beforePx}px` },
        { key: "ir.after", value: `${snapshot.ir.afterState} / ${snapshot.ir.afterAlias} / ${snapshot.ir.afterPx}px` },
        { key: "ir.invariants", value: String(snapshot.ir.invariantCount) }
      ])
    },
    {
      id: "04",
      label: "Token Resolution",
      status: "resolved",
      artifactPath: snapshot.stagePaths["04"],
      structuredFacts: facts([
        { key: "token.before", value: `${fromToken.alias} => ${fromToken.resolved.value}${fromToken.resolved.unit}` },
        { key: "token.after", value: `${toToken.alias} => ${toToken.resolved.value}${toToken.resolved.unit}` },
        { key: "token.active_before", value: snapshot.tokens.beforeActive },
        { key: "token.active_after", value: snapshot.tokens.afterActive }
      ])
    },
    {
      id: "08",
      label: "Verification",
      status: snapshot.verification.checks.every((check) => check.status === "pass") ? "pass" : "fail",
      artifactPath: `${snapshot.stagePaths["08-report"]} + ${snapshot.stagePaths["08-diff"]}`,
      structuredFacts: facts([
        { key: "verify.checks", value: snapshot.verification.checks.map((check) => `${check.id}:${check.status}`).join(" | ") },
        { key: "verify.changed", value: snapshot.verification.summaryChanged.join(" · ") },
        { key: "verify.unchanged", value: snapshot.verification.unchanged.join(" · ") },
        { key: "visual.expected", value: snapshot.verification.visualExpected.join(" · ") },
        { key: "visual.unchanged", value: snapshot.verification.visualUnchanged.join(" · ") }
      ])
    },
    {
      id: "09",
      label: "Ledger",
      status: "recorded",
      artifactPath: snapshot.stagePaths["09"],
      structuredFacts: facts([
        { key: "ledger.total_events", value: String(snapshot.ledgerSummary.totalEvents) },
        { key: "ledger.unique_refs", value: String(snapshot.ledgerSummary.uniqueRefs) },
        {
          key: "ledger.by_stage",
          value: Object.entries(snapshot.ledgerSummary.byStage)
            .map(([stage, count]) => `${stage}:${count}`)
            .join(" | ")
        }
      ])
    },
    {
      id: "10",
      label: "Rollback Plan",
      status: "ready",
      artifactPath: snapshot.stagePaths["10"],
      structuredFacts: facts([
        { key: "rollback.id", value: snapshot.rollback.id },
        { key: "rollback.target_edit", value: snapshot.rollback.targetEditId },
        { key: "rollback.steps", value: String(snapshot.rollback.steps.length) },
        { key: "rollback.restore", value: `${snapshot.rollback.successState} (${snapshot.rollback.successPx}px)` },
        { key: "rollback.files", value: snapshot.rollback.stepFiles.flat().join(" | ") }
      ]),
      rawExcerpt: snapshot.rollback.steps[0]
    }
  ];
}

function buildRollbackEvents(lastTs, toState) {
  const base = new Date(lastTs).getTime();
  return [
    { ts: new Date(base + 1000).toISOString(), event: "rollback_requested", ref: "10-rollback/rollback-plan.yaml", reason: "operator_requested_reversal" },
    { ts: new Date(base + 2000).toISOString(), event: "rollback_applied", ref: "02-canonical-edit/ui-edit.yaml", to: toState },
    { ts: new Date(base + 3000).toISOString(), event: "post_rollback_verification_completed", ref: "08-verification/report.yaml", status: "pass" }
  ];
}

export function runGovernedPipeline(input, snapshot) {
  const from = snapshot.canonical.before;
  const to = mapInputToAfterState(input, snapshot.canonical.after);
  const stages = buildStages(snapshot, from, to);

  const unchangedScope = [...new Set([...snapshot.verification.unchanged, ...snapshot.verification.visualUnchanged, "surface", "density"])]
    .map((item) => item.toLowerCase());

  return {
    mode: "proposed",
    input,
    promptRecognized: Object.hasOwn(PROMPT_PRESETS, input.trim().toLowerCase()),
    interpretedIntent: snapshot.operator.type,
    canonicalEdit: {
      target: snapshot.canonical.target,
      from,
      to,
      semanticStepDelta: toDelta(from, to),
      policyClass: snapshot.canonical.policyClass || "low_risk_presentational",
      forbiddenChanges: snapshot.canonical.blastRadius.forbiddenChanges,
      expectedSideEffects: snapshot.canonical.blastRadius.expectedSideEffects
    },
    tokens: { before: snapshot.tokens.byState[from], after: snapshot.tokens.byState[to] },
    verification: {
      status: stages.find((stage) => stage.id === "08")?.status === "pass" ? "pass" : "fail",
      checks: snapshot.verification.checks,
      unchanged: unchangedScope,
      visualExpected: snapshot.verification.visualExpected
    },
    evidence: {
      diffSummary: snapshot.verification.summaryChanged,
      semanticDiffPath: snapshot.stagePaths["08-diff"],
      reportPath: snapshot.stagePaths["08-report"]
    },
    rollbackPlan: snapshot.rollback,
    rollbackTrace: buildRollbackTrace(snapshot.ledgerEvents),
    stages,
    ledger: [...snapshot.ledgerEvents],
    productFraming: {
      changed: `${snapshot.canonical.target} ${from} -> ${to} (${snapshot.tokens.byState[from].resolved.value}px -> ${snapshot.tokens.byState[to].resolved.value}px)`,
      unchanged: unchangedScope,
      whyAllowed: `${snapshot.operator.type} on ${snapshot.operator.axis} passed ${snapshot.operator.policyChecks.filter((check) => check.status === "pass").length} policy checks under ${snapshot.operator.policyProfile}.`,
      whySafer: `Canonical edit ${snapshot.canonical.editId} is constrained by forbidden mutations (${snapshot.canonical.blastRadius.forbiddenChanges.join(", ")}), verified, and ledgered before rollback is offered.`
    }
  };
}

export function applyGovernedEdit(result) {
  return { ...result, mode: "applied" };
}

export function rollbackGovernedEdit(appliedResult, snapshot) {
  const from = appliedResult.canonicalEdit.to;
  const to = snapshot.rollback.successState;
  const rollbackEvents = buildRollbackEvents(appliedResult.ledger.at(-1)?.ts ?? new Date().toISOString(), to);
  const ledger = [...appliedResult.ledger, ...rollbackEvents];

  return {
    ...appliedResult,
    mode: "rolled_back",
    canonicalEdit: { ...appliedResult.canonicalEdit, from, to, semanticStepDelta: toDelta(from, to) },
    tokens: { before: snapshot.tokens.byState[from], after: snapshot.tokens.byState[to] },
    ledger,
    rollbackTrace: buildRollbackTrace(ledger),
    rollbackVerification: {
      status: "pass",
      expectedPx: snapshot.rollback.successPx,
      actualPx: snapshot.tokens.byState[to].resolved.value,
      restoredState: to,
      restoredAlias: snapshot.tokens.byState[to].alias
    }
  };
}
