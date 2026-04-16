import { useMemo, useState } from "react";
import { PlaceCardPreview } from "./components/PlaceCardPreview";
import { runPipeline, rollbackPipeline } from "./pipeline/runner";

const presets = [
  "isso precisa ficar um pouco mais abaixo",
  "isso está apertado demais",
  "deixa isso mais arejado",
  "quero um visual mais denso"
];

export default function App() {
  const [input, setInput] = useState(presets[0]);
  const [applied, setApplied] = useState(false);

  const result = useMemo(() => runPipeline(input), [input]);
  const active = applied ? result : { ...result, canonicalEdit: { ...result.canonicalEdit, to: result.canonicalEdit.from }, resolvedTokenAfter: result.resolvedTokenBefore };

  return (
    <div className="layout">
      <aside>
        <h1>UI Lens demo</h1>
        <p>Natural language → governed semantic edit → verifiable artifacts → rollback.</p>
        <label>Human request</label>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
        <div className="preset-row">
          {presets.map((preset) => (
            <button key={preset} onClick={() => setInput(preset)}>{preset}</button>
          ))}
        </div>
        <div className="actions">
          <button onClick={() => setApplied(true)}>Apply</button>
          <button onClick={() => setApplied(false)}>Rollback</button>
        </div>
        <div className="panel">
          <h3>Semantic diff</h3>
          <p>{active.canonicalEdit.target}: {active.canonicalEdit.from} → {active.canonicalEdit.to}</p>
          <p>Resolved token: {active.resolvedTokenBefore}px → {active.resolvedTokenAfter}px</p>
        </div>
      </aside>

      <main>
        <h2>Before / After</h2>
        <div className="compare">
          <PlaceCardPreview gap={result.canonicalEdit.from} title="Place details" body="Corpo do cartão" badge="Before" />
          <PlaceCardPreview gap={active.canonicalEdit.to} title="Place details" body="Corpo do cartão" badge={applied ? "After" : "Current"} />
        </div>
      </main>

      <section>
        <h2>Pipeline 00–10</h2>
        <ul className="stages">
          {result.stages.map((stage) => (
            <li key={stage.id}><strong>{stage.id} {stage.label}</strong><span>{stage.artifact}</span></li>
          ))}
        </ul>
        <div className="panel">
          <h3>Verification <span className="pass">PASS</span></h3>
          <ul>{result.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
        <div className="panel">
          <h3>Ledger events</h3>
          <ul>{(applied ? result.eventLog : [...result.eventLog, "rollback_applied"]).map((event, i) => <li key={`${event}-${i}`}>{event}</li>)}</ul>
        </div>
        <div className="panel">
          <h3>Rollback plan</h3>
          <ul>{rollbackPipeline(result).rollbackPlan.map((step) => <li key={step}>{step}</li>)}</ul>
        </div>
      </section>
    </div>
  );
}
