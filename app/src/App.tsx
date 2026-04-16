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
        <p>Vague feedback → governed semantic edit → canonical artifacts → explicit rollback.</p>

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
          <h3>Operation status</h3>
          <p><strong>State:</strong> {operation}</p>
          <p><strong>Prompt matched preset:</strong> {active.promptRecognized ? "yes" : "fallback to canonical mapping"}</p>
          <p><strong>Policy:</strong> {active.canonicalEdit.policyClass}</p>
        </div>

        <div className="panel">
          <h3>Governed vs ad hoc</h3>
          <p><strong>Changed:</strong> {active.productFraming.changed}</p>
          <p><strong>Low risk:</strong> {active.productFraming.whyLowRisk}</p>
          <p><strong>Safer than class edits:</strong> {active.productFraming.whySafer}</p>
        </div>
      </aside>

      <main>
        <h2>Visual proof: PlaceCard spacing change</h2>
        <div className="diff-banner">
          <span className="change-badge">Changed property: place_card.header_body_gap</span>
          <span className="change-badge">Semantic diff: {active.canonicalEdit.from} → {active.canonicalEdit.to}</span>
          <span className="change-badge">Resolved: {active.tokens.before.resolved.value}px → {active.tokens.after.resolved.value}px ({deltaPx >= 0 ? "+" : ""}{deltaPx}px)</span>
        </div>
        <div className="compare">
          <PlaceCardPreview gap={beforeGap} title="Place details" body="Corpo do cartão" badge="Before (baseline)" highlight={false} />
          <PlaceCardPreview gap={afterGap} title="Place details" body="Corpo do cartão" badge={operation === "rolled_back" ? "After rollback" : operation === "applied" ? "After governed edit" : "Current preview"} highlight={operation !== "initial"} />
        </div>

        <div className="panel">
          <h3>Verification + unchanged scope</h3>
          <ul>
            {active.productFraming.unchanged.map((item) => <li key={item}>{item}</li>)}
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
              <span>{stage.excerpt}</span>
            </li>
          ))}
        </ul>

        <div className="panel">
          <h3>Evidence (08)</h3>
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
