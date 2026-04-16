import { useMemo, useState } from "react";
import { PlaceCardPreview } from "./components/PlaceCardPreview";
import { applyPipeline, getArtifactSnapshot, promptPresets, rollbackPipeline, runPipeline } from "./pipeline/runner";
import type { PipelineResult } from "./pipeline/types";

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
        <p>Turn vague feedback into a governed, explainable, reversible semantic edit.</p>

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
          <h3>Operator framing</h3>
          <p><strong>What changed:</strong> {active.productFraming.changed}</p>
          <p><strong>Why allowed:</strong> {active.productFraming.whyAllowed}</p>
          <p><strong>What stayed untouched:</strong> {active.productFraming.unchanged.join(", ")}</p>
          <p><strong>Why safer than class edits:</strong> {active.productFraming.whySafer}</p>
        </div>

        <div className="panel">
          <h3>Execution status</h3>
          <p><strong>Operation:</strong> {operation}</p>
          <p><strong>Prompt recognized:</strong> {active.promptRecognized ? "yes" : "fallback to canonical mapping"}</p>
          <p><strong>Policy class:</strong> {active.canonicalEdit.policyClass}</p>
        </div>
      </aside>

      <main>
        <h2>Governed change preview</h2>
        <div className="diff-banner">
          <span className="change-badge">Changed property: place_card.header_body_gap</span>
          <span className="change-badge">Canonical states: {active.canonicalEdit.from} → {active.canonicalEdit.to}</span>
          <span className="change-badge">Resolved spacing: {active.tokens.before.resolved.value}px → {active.tokens.after.resolved.value}px ({deltaPx >= 0 ? "+" : ""}{deltaPx}px)</span>
        </div>

        <div className="unchanged-hero">
          {[
            "Structure unchanged",
            "Copy unchanged",
            "Behavior unchanged",
            "Surface unchanged",
            "Density unchanged"
          ].map((item) => <span key={item} className="unchanged-chip">{item}</span>)}
        </div>

        <div className="compare">
          <PlaceCardPreview gap={beforeGap} title="Place details" body="Corpo do cartão" badge="Baseline" highlight={false} governed={false} />
          <PlaceCardPreview
            gap={afterGap}
            title="Place details"
            body="Corpo do cartão"
            badge={operation === "rolled_back" ? "Rolled back (governed)" : operation === "applied" ? "Governed edit applied" : "Awaiting operation"}
            highlight={operation !== "initial"}
            governed
          />
        </div>

        <div className="panel rollback-trace">
          <h3>Rollback operation trace</h3>
          <ul>
            {active.rollbackTrace.map((step) => (
              <li key={step.event} data-status={step.status}>
                <strong>{step.event}</strong>
                <span>{step.status === "done" ? "done" : "pending"}</span>
                <span>{step.ts ? new Date(step.ts).toISOString() : "not yet emitted"}</span>
                {step.ref ? <code>{step.ref}</code> : null}
              </li>
            ))}
          </ul>
          {active.rollbackVerification ? (
            <p><strong>Post-rollback verification:</strong> {active.rollbackVerification.status.toUpperCase()} ({active.rollbackVerification.actualPx}px == expected {active.rollbackVerification.expectedPx}px)</p>
          ) : null}
        </div>
      </main>

      <section>
        <h2>Pipeline inspector (artifact-backed)</h2>
        <ul className="stages">
          {active.stages.map((stage) => (
            <li key={stage.id}>
              <strong>{stage.id} {stage.label}</strong>
              <span>Status: {stage.status}</span>
              <span>Artifact: <code>{stage.artifactPath}</code></span>
              <dl className="facts">
                {stage.structuredFacts.map((fact) => (
                  <div key={`${stage.id}-${fact.key}`}>
                    <dt>{fact.key}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
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
        </div>

        <div className="panel">
          <h3>Rollback plan (10)</h3>
          <p><strong>ID:</strong> {active.rollbackPlan.id}</p>
          <p><strong>Success condition:</strong> {active.rollbackPlan.successState} ({active.rollbackPlan.successPx}px)</p>
          <ul>{active.rollbackPlan.steps.map((step) => <li key={step}>{step}</li>)}</ul>
          <p className="artifact-note">Canonical prompt source: <code>{artifactSnapshot.stagePaths["00"]}</code></p>
        </div>
      </section>
    </div>
  );
}
