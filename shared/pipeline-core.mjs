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

const stripQuotes = (value = "") => value.replace(/^"|"$/g, "").trim();
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

function extractQuoted(text, fallback = "") {
  const match = text.match(/"([^"]+)"/);
  return match ? match[1] : fallback;
}

function extractYamlValue(text, key) {
  return findYamlScalar(text, key)?.value ?? "";
}

const splitLines = (text) => text.replace(/\r\n/g, "\n").split("\n");

function findYamlScalar(text, key) {
  const lines = splitLines(text);
  const matcher = new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(matcher);
    if (match) return { value: stripQuotes(match[1]), line: index + 1 };
  }
  return null;
}

function extractSectionLines(text, headerRegex) {
  const lines = splitLines(text);
  const start = lines.findIndex((line) => headerRegex.test(line));
  if (start < 0) return [];
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith("## ")) break;
    if (trimmed) collected.push(trimmed);
  }
  return collected;
}

function extractListAfterHeader(text, headerRegex) {
  const lines = extractSectionLines(text, headerRegex);
  const list = [];
  for (const line of lines) {
    if (line.startsWith("## ")) break;
    if (line.startsWith("- ")) list.push(stripQuotes(line.slice(2).replace(/`/g, "")));
  }
  return list;
}

function parseJsonLines(jsonl) {
  return jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseYamlListBlock(text, key) {
  const lines = splitLines(text);
  const collected = [];
  let collecting = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === `${key}:`) {
      collecting = true;
      continue;
    }

    if (!collecting) continue;

    if (line.startsWith("- ")) {
      collected.push(stripQuotes(line.slice(2)));
      continue;
    }

    if (line !== "") break;
  }

  return collected;
}

function parseVerificationChecks(report) {
  const lines = splitLines(report);
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
    if (trimmed.startsWith("detail:")) current.detail = stripQuotes(trimmed.replace(/^detail:\s*/, ""));
  }

  if (current) checks.push(current);
  return checks;
}

function parseOperatorDetails(operatorYaml) {
  const rationale = parseYamlListBlock(operatorYaml, "rationale");
  const checks = [];
  let currentCheck = null;
  let inChecks = false;

  for (const raw of splitLines(operatorYaml)) {
    const line = raw.trim();

    if (line === "checks:") {
      inChecks = true;
      continue;
    }

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

    if (line === "") {
      checks.push(currentCheck);
      currentCheck = null;
    }
  }

  if (currentCheck) checks.push(currentCheck);
  return { rationale, checks };
}

function parseCanonicalEditDetails(editYaml) {
  return {
    components: parseYamlListBlock(editYaml, "components"),
    screens: parseYamlListBlock(editYaml, "screens"),
    expectedSideEffects: parseYamlListBlock(editYaml, "expected_side_effects"),
    forbiddenChanges: parseYamlListBlock(editYaml, "forbidden_changes")
  };
}

function parseIrResolution(irYaml) {
  const [, afterSection = ""] = irYaml.split("after:");
  return {
    relation: extractYamlValue(irYaml, "relation"),
    invariantCount: (irYaml.match(/- id:\s*inv_/g) ?? []).length,
    beforeState: extractYamlValue(irYaml, "place_card.header_body_gap"),
    beforeAlias: extractYamlValue(irYaml, "resolved_dimension"),
    beforePx: safeNumber(extractYamlValue(irYaml, "resolved_px")),
    afterState: extractYamlValue(afterSection, "place_card.header_body_gap"),
    afterAlias: extractYamlValue(afterSection, "resolved_dimension"),
    afterPx: safeNumber(extractYamlValue(afterSection, "resolved_px"))
  };
}

function parseRollbackPlan(plan) {
  const steps = [];
  const stepFiles = [];
  let stepIndex = -1;

  for (const raw of splitLines(plan)) {
    const line = raw.trim();
    if (line.startsWith("- step:")) {
      steps.push(stripQuotes(line.replace(/^- step:\s*/, "")));
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
    successPx: safeNumber(extractYamlValue(plan, "resolved_px")),
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

function lineNumberLine(lineNo, text) {
  return `${String(lineNo).padStart(3, " ")}│ ${text}`;
}

function findFocusLineIndexes(lines, focusTerms = []) {
  const loweredTerms = focusTerms.map((term) => term.toLowerCase()).filter(Boolean);
  if (!loweredTerms.length) return [];
  const indexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    const normalized = lines[index].toLowerCase();
    if (loweredTerms.some((term) => normalized.includes(term))) indexes.push(index);
  }
  return indexes;
}

function makeExcerpt(source, { focusTerms = [], maxLines = 12, radius = 2, label = "artifact excerpt" } = {}) {
  const lines = splitLines(source);
  if (!lines.length) return "";

  const focusIndexes = findFocusLineIndexes(lines, focusTerms);
  const center = focusIndexes.length ? focusIndexes[Math.floor(focusIndexes.length / 2)] : Math.floor(lines.length / 2);
  const start = Math.max(0, center - radius);
  let end = Math.min(lines.length, start + maxLines);
  const boundedStart = Math.max(0, end - maxLines);

  const excerptLines = [];
  if (boundedStart > 0) excerptLines.push("…");
  for (let index = boundedStart; index < end; index += 1) {
    excerptLines.push(lineNumberLine(index + 1, lines[index]));
  }
  if (end < lines.length) excerptLines.push("…");

  const focusLabel = focusTerms.length ? `focus: ${focusTerms.join(", ")}` : "focus: stage body";
  return `${label} (${focusLabel})\n${excerptLines.join("\n")}`;
}

function facts(entries) {
  return entries.filter((entry) => entry.value !== "" && entry.value !== undefined);
}

function buildStage(id, label, kind, status, artifactPath, structuredFacts, rawSource, excerptOptions = {}) {
  return {
    id,
    label,
    kind,
    status,
    artifactPath,
    structuredFacts: facts(structuredFacts),
    rawSource,
    rawExcerpt: makeExcerpt(rawSource, excerptOptions)
  };
}

function buildStages(snapshot, from, to) {
  const fromToken = snapshot.tokens.byState[from];
  const toToken = snapshot.tokens.byState[to];

  return [
    buildStage("00", "Human Input", "reference", "captured", snapshot.stagePaths["00"], [
      { key: "request.prompt", value: snapshot.heroPromptFromArtifact },
      { key: "request.mapping", value: `${from} -> ${to}` }
    ], snapshot.artifactSources.humanRequest, { focusTerms: ["isso precisa ficar um pouco mais abaixo"], label: "human request.md excerpt" }),

    buildStage("01", "Operator Translation", "reference", snapshot.operator.policyAllowed ? "allowed" : "blocked", snapshot.stagePaths["01"], [
      { key: "intent.type", value: snapshot.operator.type },
      { key: "intent.action", value: snapshot.operator.action },
      { key: "intent.axis", value: snapshot.operator.axis },
      { key: "policy.profile", value: snapshot.operator.policyProfile },
      { key: "policy.allowed", value: String(snapshot.operator.policyAllowed) },
      { key: "policy.checks", value: snapshot.operator.policyChecks.map((check) => `${check.check}:${check.status}`).join(" | ") },
      { key: "operator.rationale", value: snapshot.operator.rationale.join(" · ") },
      { key: "operator.confidence", value: `${Math.round(snapshot.operator.confidence * 100)}%` }
    ], snapshot.artifactSources.operator, { focusTerms: ["axis: header_body_gap", "action: auto_apply", snapshot.operator.decisionReason], label: "operator-translation.yaml excerpt" }),

    buildStage("02", "Canonical Edit", "reference", "generated", snapshot.stagePaths["02"], [
      { key: "edit.id", value: snapshot.canonical.editId },
      { key: "edit.target", value: snapshot.canonical.target },
      { key: "edit.reason", value: snapshot.canonical.reason },
      { key: "edit.state", value: `${from} -> ${to}` },
      { key: "policy.class", value: snapshot.canonical.policyClass },
      { key: "blast.components", value: snapshot.canonical.blastRadius.components.join(", ") },
      { key: "blast.screens", value: snapshot.canonical.blastRadius.screens.join(", ") },
      { key: "blast.expected", value: snapshot.canonical.blastRadius.expectedSideEffects.join(" · ") },
      { key: "forbidden.changes", value: snapshot.canonical.blastRadius.forbiddenChanges.join(", ") }
    ], snapshot.artifactSources.uiEdit, { focusTerms: ["target: place_card.header_body_gap", "from: cozy", "to: relaxed"], label: "ui-edit.yaml excerpt" }),

    buildStage("03", "Semantic IR", "reference", "resolved", snapshot.stagePaths["03"], [
      { key: "ir.component", value: snapshot.ir.component },
      { key: "ir.axis", value: snapshot.ir.axis },
      { key: "ir.relation", value: snapshot.ir.relation },
      { key: "ir.before", value: `${snapshot.ir.beforeState} / ${snapshot.ir.beforeAlias} / ${snapshot.ir.beforePx}px` },
      { key: "ir.after", value: `${snapshot.ir.afterState} / ${snapshot.ir.afterAlias} / ${snapshot.ir.afterPx}px` },
      { key: "ir.invariants", value: String(snapshot.ir.invariantCount) }
    ], snapshot.artifactSources.ir, { focusTerms: ["header_body_gap", "before:", "after:"], label: "ui-ir.yaml excerpt" }),

    buildStage("04", "Token Resolution", "reference", "resolved", snapshot.stagePaths["04"], [
      { key: "token.before", value: `${fromToken.alias} => ${fromToken.resolved.value}${fromToken.resolved.unit}` },
      { key: "token.after", value: `${toToken.alias} => ${toToken.resolved.value}${toToken.resolved.unit}` },
      { key: "token.active_before", value: snapshot.tokens.beforeActive },
      { key: "token.active_after", value: snapshot.tokens.afterActive }
    ], snapshot.artifactSources.resolvedTokens, { focusTerms: ["headerBodyGap", `"${from}"`, `"${to}"`], label: "resolved-tokens.json excerpt" }),

    buildStage("08", "Verification", "verification", snapshot.verification.checks.every((check) => check.status === "pass") ? "pass" : "fail", `${snapshot.stagePaths["08-report"]} + ${snapshot.stagePaths["08-diff"]}`, [
      { key: "verify.checks", value: snapshot.verification.checks.map((check) => `${check.id}:${check.status}`).join(" | ") },
      { key: "verify.changed", value: snapshot.verification.summaryChanged.join(" · ") },
      { key: "verify.unchanged", value: snapshot.verification.unchanged.join(" · ") },
      { key: "visual.expected", value: snapshot.verification.visualExpected.join(" · ") },
      { key: "visual.unchanged", value: snapshot.verification.visualUnchanged.join(" · ") }
    ], `${snapshot.artifactSources.report}\n\n${snapshot.artifactSources.semanticDiff}`, { focusTerms: ["checks:", "What changed", "What did NOT change"], label: "report + semantic-diff excerpt" }),

    buildStage("09", "Ledger", "verification", "recorded", snapshot.stagePaths["09"], [
      { key: "ledger.total_events", value: String(snapshot.ledgerSummary.totalEvents) },
      { key: "ledger.unique_refs", value: String(snapshot.ledgerSummary.uniqueRefs) },
      {
        key: "ledger.by_stage",
        value: Object.entries(snapshot.ledgerSummary.byStage)
          .map(([stage, count]) => `${stage}:${count}`)
          .join(" | ")
      }
    ], snapshot.artifactSources.ledger, { focusTerms: ["rollback", "verification_completed"], label: "events.jsonl excerpt" }),

    buildStage("10", "Rollback Plan", "rollback", "ready", snapshot.stagePaths["10"], [
      { key: "rollback.id", value: snapshot.rollback.id },
      { key: "rollback.target_edit", value: snapshot.rollback.targetEditId },
      { key: "rollback.steps", value: String(snapshot.rollback.steps.length) },
      { key: "rollback.restore", value: `${snapshot.rollback.successState} (${snapshot.rollback.successPx}px)` },
      { key: "rollback.files", value: snapshot.rollback.stepFiles.flat().join(" | ") }
    ], snapshot.artifactSources.rollbackPlan, { focusTerms: ["rollback_id", "target_edit_id", "header_body_gap"], label: "rollback-plan.yaml excerpt" })
  ];
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
  const rollback = parseRollbackPlan(artifacts.rollbackPlan);

  const target = extractYamlValue(artifacts.uiEdit, "target");
  const operatorAxis = extractYamlValue(artifacts.operator, "axis");
  const operatorConfidence = safeNumber(extractYamlValue(artifacts.operator, "confidence"));
  const policyAllowed = extractYamlValue(artifacts.operator, "allowed") === "true";
  const stateMap = resolvedTokens.semantic.component.placeCard.headerBodyGap;

  return {
    heroPromptFromArtifact: extractQuoted(artifacts.humanRequest, "isso precisa ficar um pouco mais abaixo"),
    canonical: {
      target,
      before: extractYamlValue(artifacts.uiEdit, "from"),
      after: extractYamlValue(artifacts.uiEdit, "to"),
      editId: extractYamlValue(artifacts.uiEdit, "edit_id"),
      policyClass: extractYamlValue(artifacts.uiEdit, "policy_class"),
      reason: extractYamlValue(artifacts.uiEdit, "reason"),
      blastRadius: canonicalDetails
    },
    operator: {
      type: extractYamlValue(artifacts.operator, "type"),
      action: extractYamlValue(artifacts.operator, "action"),
      axis: operatorAxis,
      confidence: operatorConfidence,
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
      visualExpected: parseYamlListBlock(artifacts.report, "expected"),
      visualUnchanged: parseYamlListBlock(artifacts.report, "unchanged")
    },
    rollback,
    ledgerEvents,
    ledgerSummary: summarizeLedger(ledgerEvents),
    rollbackTrace: buildRollbackTrace(ledgerEvents),
    stagePaths: STAGE_PATHS,
    artifactSources: artifacts
  };
}

function mapInputToAfterState(input, fallbackAfter) {
  const normalized = input.trim().toLowerCase();
  return PROMPT_PRESETS[normalized] ?? fallbackAfter;
}

function toDelta(from, to) {
  return GAP_ORDER.indexOf(to) - GAP_ORDER.indexOf(from);
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
