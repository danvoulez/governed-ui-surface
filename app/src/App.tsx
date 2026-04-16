import { useMemo, useState } from "react";
import { PlaceCardPreview } from "./components/PlaceCardPreview";
import { applyPipeline, getArtifactSnapshot, promptPresets, rollbackPipeline, runPipeline } from "./pipeline/runner";
import type { PipelineResult, StageFact } from "./pipeline/types";

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

export default function App() {
  const [input, setInput] = useState(promptPresets[0]);
  const [operation, setOperation] = useState<"initial" | "applied" | "rolled_back">("initial");

  const proposed = useMemo(() => runPipeline(input), [input]);
  const applied = useMemo(() => applyPipeline(proposed), [proposed]);
  const rolledBack = useMemo(() => rollbackPipeline(applied), [applied]);
  const artifactSnapshot = useMemo(() => getArtifactSnapshot(), []);

  const active: PipelineResult = operation === "applied" ? applied : operation === "rolled_back" ? rolledBack : proposed;
  const beforeGap = proposed.canonicalEdit.from;
  const afterGap = operation === "initial" ? beforeGap : active.canonicalEdit.to;
  const deltaPx = active.tokens.after.resolved.value - active.tokens.before.resolved.value;

  return (
    <div className="layout">
      <aside>
        <h1>UI Lens operator surface</h1>
        <p>Governed semantic edits over canonical artifacts — explainable, verified, reversible.</p>

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

        <div className="panel">
          <h3>Product framing</h3>
          <p><strong>What changed</strong>: {active.productFraming.changed}</p>
          <p><strong>Why allowed</strong>: {active.productFraming.whyAllowed}</p>
          <p><strong>Stayed untouched</strong>: {active.productFraming.unchanged.join(", ")}</p>
          <p><strong>Why governed is safer</strong>: {active.productFraming.whySafer}</p>
        </div>

        <div className="panel">
          <h3>Execution status</h3>
          <p><strong>Operation</strong>: {operation}</p>
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
          <h3>Rollback operation trail</h3>
          <p><strong>Plan</strong>: {active.rollbackPlan.id}</p>
          <p><strong>Target edit</strong>: {active.rollbackPlan.targetEditId}</p>
          <p><strong>Restored semantic state</strong>: {active.rollbackPlan.successState} ({active.rollbackPlan.successPx}px)</p>
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
        <ul className="stages">
          {active.stages.map((stage) => (
            <li key={stage.id}>
              <div className="stage-topline">
                <strong>{stage.id} {stage.label}</strong>
                <span className="status-pill" data-status={stage.status}>{stage.status}</span>
              </div>
              <span>Artifact: <code>{stage.artifactPath}</code></span>
              {groupFacts(stage.structuredFacts).map(([group, entries]) => (
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
              ))}
              {stage.rawExcerpt ? <p className="raw-excerpt">“{stage.rawExcerpt}”</p> : null}
            </li>
          ))}
        </ul>

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
