import type { GapState } from "../pipeline/types";

type Props = {
  gap: GapState;
  title: string;
  body: string;
  badge?: string;
  highlight?: boolean;
  governed?: boolean;
  mode: "before" | "governed" | "rolled_back";
};

const gapPx: Record<GapState, number> = {
  compact: 8,
  cozy: 16,
  relaxed: 24
};

export function PlaceCardPreview({ gap, title, body, badge, highlight = false, governed = false, mode }: Props) {
  const stateLabel = mode === "rolled_back" ? "Rolled back state" : mode === "governed" ? "Governed state" : "Baseline state";
  return (
    <article className="place-card" data-gap={gap} data-highlight={highlight} data-governed={governed} data-mode={mode}>
      {badge ? <span className="badge">{badge}</span> : null}
      <div className="preview-state">{stateLabel}</div>
      <header className="place-card-header">{title}</header>
      <div className="spacing-annotation">Only this axis changed: <code>header_body_gap</code></div>
      <div className="gap-guide" aria-hidden="true">
        <span className="guide-line" />
        <span className="guide-value">{gapPx[gap]}px</span>
        <span className="guide-line" />
      </div>
      <div className="gap-meter" aria-hidden="true">Semantic state: {gap} ({gapPx[gap]}px)</div>
      <section className="place-card-body" style={{ marginTop: gapPx[gap] }}>
        {body}
      </section>
      <small className="token-note">Unchanged scope lock: structure, copy, and interaction remain unchanged.</small>
    </article>
  );
}
