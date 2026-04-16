import type { GapState } from "../pipeline/types";

type Props = {
  gap: GapState;
  title: string;
  body: string;
  badge?: string;
  highlight?: boolean;
};

const gapPx: Record<GapState, number> = {
  compact: 8,
  cozy: 16,
  relaxed: 24
};

export function PlaceCardPreview({ gap, title, body, badge, highlight = false }: Props) {
  return (
    <article className="place-card" data-gap={gap} data-highlight={highlight}>
      {badge ? <span className="badge">{badge}</span> : null}
      <header className="place-card-header">{title}</header>
      <div className="gap-meter" aria-hidden="true">↕ {gapPx[gap]}px governed gap</div>
      <section className="place-card-body" style={{ marginTop: gapPx[gap] }}>
        {body}
      </section>
      <small className="token-note">header_body_gap = {gap} ({gapPx[gap]}px)</small>
    </article>
  );
}
