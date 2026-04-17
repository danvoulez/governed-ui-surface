import { useMemo, useState } from "react";
import { PlaceCardPreview } from "./components/PlaceCardPreview";
import { applyPipeline, getArtifactSnapshot, promptPresets, rollbackPipeline, runPipeline } from "./pipeline/runner";
import type { PipelineResult, StageFact, StageKind, StageView } from "./pipeline/types";

type StageViewMode = "facts" | "excerpt";

function groupFacts(facts: StageFact[]) {
  const buckets = new Map<string, StageFact[]>();
  for (const fact of facts) {
    const [group] = fact.key.split(".");
    const normalized = group || "stage";
    if (!buckets.has(normalized)) buckets.set(normalized, []);
    buckets.get(normalized)?.push(fact);
  }
  return [...buckets.entries()];
}

const rollbackLabel: Record<string, string> = {
  rollback_requested: "rollback requested",
  rollback_applied: "rollback applied",
  post_rollback_verification_completed: "post-rollback verification completed"
};

const operationLabel: Record<PipelineResult["mode"] | "initial", string> = {
  initial: "Proposed only",
  proposed: "Proposed only",
  applied: "Applied + verified",
  rolled_back: "Rolled back + verified"
};

const stageKindLabel: Record<StageKind, string> = {
  reference: "Reference chain",
  verification: "Verification + ledger",
  rollback: "Rollback controls"
};

const stageKindOrder: StageKind[] = ["reference", "verification", "rollback"];

export default function App() {
  const [input, setInput] = useState(promptPresets[0]);
  const [operation, setOperation] = useState<"initial" | "applied" | "rolled_back">("initial");
  const [stageMode, setStageMode] = useState<Record<string, StageViewMode>>({});

  const proposed = useMemo(() => runPipeline(input), [input]);
  const applied = useMemo(() => applyPipeline(proposed), [proposed]);
  const rolledBack = useMemo(() => rollbackPipeline(applied), [applied]);
  const artifactSnapshot = useMemo(() => getArtifactSnapshot(), []);

  const active: PipelineResult = operation === "applied" ? applied : operation === "rolled_back" ? rolledBack : proposed;
  const beforeGap = proposed.canonicalEdit.from;
  const afterGap = operation === "initial" ? beforeGap : active.canonicalEdit.to;
  const deltaPx = active.tokens.after.resolved.value - active.tokens.before.resolved.value;
  const stageByKind = useMemo(() => {
    const groups = new Map<StageKind, StageView[]>();
    for (const kind of stageKindOrder) groups.set(kind, []);
    for (const stage of active.stages) groups.get(stage.kind)?.push(stage);
    return groups;
  }, [active.stages]);

  return (
    <div className="layout">
      <aside>
        <h1>UI Lens operator surface</h1>
        <p className="hero-line">From vague feedback to a governed, explainable, reversible semantic edit.</p>

        <label>Human request</label>
        <input value={input} onChange={(e) => setInput(e.target.value)} />

        <div className="preset-row">
          {promptPresets.map((preset) => (
            <button key={preset} onClick={() => setInput(preset)}>{preset}</button>
          ))}
        </div>

        <div className="actions">
          <button onClick={() => setOperation("applied")}>Apply governed edit</button>
          <button onClick={() => setOperation("rolled_back")}>Execute rollback plan</button>
          <button onClick={() => setOperation("initial")}>Back to initial</button>
        </div>

        <div className="panel operator-story">
          <h3>Operator story</h3>
          <p><strong>Request</strong>: {active.input}</p>
          <p><strong>Understood as</strong>: {active.interpretedIntent} on <code>{active.canonicalEdit.target}</code></p>
          <p><strong>Allowed because</strong>: {active.productFraming.whyAllowed}</p>
          <p><strong>Protected scope</strong>: {active.productFraming.unchanged.join(", ")}</p>
          <p><strong>Operation state</strong>: <span className="status-inline">{operationLabel[operation]}</span></p>
          <p className="artifact-note">Authority lives in canonical artifacts, not ad hoc UI mutation.</p>
        </div>

        <div className="panel">
          <h3>Guardrails</h3>
          <p><strong>Policy class</strong>: {active.canonicalEdit.policyClass}</p>
          <p><strong>Prompt recognized</strong>: {active.promptRecognized ? "yes" : "fallback to canonical mapping"}</p>
          <p><strong>Forbidden by policy</strong>: {active.canonicalEdit.forbiddenChanges.join(", ")}</p>
        </div>
      </aside>

      <main>
        <h2>Governed change preview</h2>
        <div className="diff-banner">
          <span className="change-badge">Changed axis: place_card.header_body_gap</span>
          <span className="change-badge">Canonical states: {active.canonicalEdit.from} → {active.canonicalEdit.to}</span>
          <span className="change-badge">Resolved spacing: {active.tokens.before.resolved.value}px → {active.tokens.after.resolved.value}px ({deltaPx >= 0 ? "+" : ""}{deltaPx}px)</span>
        </div>

        <div className="trust-hero panel">
          <h3>Trust boundary: what did NOT change</h3>
          <div className="unchanged-hero">
            {active.verification.unchanged.map((item) => <span key={item} className="unchanged-chip">{item}</span>)}
          </div>
          <p className="artifact-note">Semantic diff + verification enforce unchanged scope from canonical artifacts (08).</p>
        </div>

        <div className="compare">
          <PlaceCardPreview
            gap={beforeGap}
            title="Place details"
            body="Corpo do cartão"
            badge="Before (baseline)"
            highlight={false}
            governed={false}
            mode="before"
          />
          <PlaceCardPreview
            gap={afterGap}
            title="Place details"
            body="Corpo do cartão"
            badge={operation === "rolled_back" ? "Rolled back (governed)" : operation === "applied" ? "Governed edit applied" : "Awaiting operation"}
            highlight={operation !== "initial"}
            governed
            mode={operation === "rolled_back" ? "rolled_back" : operation === "applied" ? "governed" : "before"}
          />
        </div>

        <div className="panel rollback-trace">
          <h3>Governed rollback operation log</h3>
          <div className="rollback-meta">
            <p><strong>Target edit id</strong>: <code>{active.rollbackPlan.targetEditId}</code></p>
            <p><strong>Plan id</strong>: {active.rollbackPlan.id}</p>
            <p><strong>Restored state</strong>: {active.rollbackPlan.successState}</p>
            <p><strong>Restored px</strong>: {active.rollbackPlan.successPx}px</p>
          </div>
          <ul>
            {active.rollbackTrace.map((step) => (
              <li key={step.event} data-status={step.status}>
                <strong>{rollbackLabel[step.event]}</strong>
                <span>{step.status === "done" ? "done" : "pending"}</span>
                <span>{step.ts ? new Date(step.ts).toISOString() : "not yet emitted"}</span>
                {step.ref ? <code>{step.ref}</code> : null}
              </li>
            ))}
          </ul>
          {active.rollbackVerification ? (
            <p><strong>Post-rollback verification</strong>: {active.rollbackVerification.status.toUpperCase()} ({active.rollbackVerification.actualPx}px == expected {active.rollbackVerification.expectedPx}px, {active.rollbackVerification.restoredState} via {active.rollbackVerification.restoredAlias})</p>
          ) : null}
        </div>
      </main>

      <section>
        <h2>Operator console (artifact-backed)</h2>
        <div className="console-evidence">
          <span>Canonical source of truth: <code>ui-canon/final-placecard/</code></span>
          <span>Inspector mode is artifact-backed, never generated ad hoc.</span>
        </div>
        {stageKindOrder.map((kind) => (
          <div className="stage-cluster" key={kind}>
            <h3>{stageKindLabel[kind]}</h3>
            <ul className="stages">
          {(stageByKind.get(kind) ?? []).map((stage) => {
            const mode = stageMode[stage.id] ?? "facts";
            return (
              <li key={stage.id} data-kind={stage.kind}>
                <div className="stage-topline">
                  <strong>{stage.id} {stage.label}</strong>
                  <div className="stage-right">
                    <span className="kind-pill">{stageKindLabel[stage.kind]}</span>
                    <span className="status-pill" data-status={stage.status}>{stage.status}</span>
                  </div>
                </div>
                <span className="artifact-path">Artifact path: <code>{stage.artifactPath}</code></span>
                <div className="view-toggle" role="tablist" aria-label={`Inspect ${stage.label}`}>
                  <button className={mode === "facts" ? "active" : ""} onClick={() => setStageMode((prev) => ({ ...prev, [stage.id]: "facts" }))}>Facts (normalized)</button>
                  <button className={mode === "excerpt" ? "active" : ""} onClick={() => setStageMode((prev) => ({ ...prev, [stage.id]: "excerpt" }))}>Excerpt (source-grounded)</button>
                </div>

                {mode === "facts" ? groupFacts(stage.structuredFacts).map(([group, entries]) => (
                  <div className="fact-group" key={`${stage.id}-${group}`}>
                    <h4>{group}</h4>
                    <dl className="facts">
                      {entries.map((fact) => (
                        <div key={`${stage.id}-${fact.key}`}>
                          <dt>{fact.key.split(".").slice(1).join(".") || fact.key}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )) : <pre className="artifact-excerpt">{stage.rawExcerpt ?? stage.rawSource.slice(0, 220)}</pre>}
              </li>
            );
          })}
            </ul>
          </div>
        ))}

        <div className="panel">
          <h3>Verification evidence (08)</h3>
          <p><code>{active.evidence.reportPath}</code></p>
          <p><code>{active.evidence.semanticDiffPath}</code></p>
          <ul>{active.evidence.diffSummary.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>

        <div className="panel">
          <h3>Ledger stream (09)</h3>
          <ul>
            {active.ledger.map((event, idx) => (
              <li key={`${event.event}-${idx}`}><code>{event.ts}</code> — <strong>{event.event}</strong> {event.ref ? `(${event.ref})` : ""}</li>
            ))}
          </ul>
          <p className="artifact-note">Canonical prompt source: <code>{artifactSnapshot.stagePaths["00"]}</code></p>
        </div>
      </section>
    </div>
  );
}
