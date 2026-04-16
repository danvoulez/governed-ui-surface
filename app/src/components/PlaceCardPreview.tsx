import type { GapState } from "../pipeline/types";

type Props = {
  gap: GapState;
  title: string;
  body: string;
  badge?: string;
  highlight?: boolean;
  governed?: boolean;
};

const gapPx: Record<GapState, number> = {
  compact: 8,
  cozy: 16,
  relaxed: 24
};

export function PlaceCardPreview({ gap, title, body, badge, highlight = false, governed = false }: Props) {
  return (
    <article className="place-card" data-gap={gap} data-highlight={highlight} data-governed={governed}>
      {badge ? <span className="badge">{badge}</span> : null}
      <header className="place-card-header">{title}</header>
      <div className="gap-guide" aria-hidden="true">
        <span className="guide-line" />
        <span className="guide-value">{gapPx[gap]}px</span>
        <span className="guide-line" />
      </div>
      <div className="gap-meter" aria-hidden="true">header_body_gap token: {gap}</div>
      <section className="place-card-body" style={{ marginTop: gapPx[gap] }}>
        {body}
      </section>
      <small className="token-note">Only spacing axis changed: header_body_gap = {gap} ({gapPx[gap]}px)</small>
    </article>
  );
}
