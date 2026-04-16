import type { GapState } from "../pipeline/types";

type Props = {
  gap: GapState;
  title: string;
  body: string;
  badge?: string;
};

const gapPx: Record<GapState, number> = {
  compact: 8,
  cozy: 16,
  relaxed: 24
};

export function PlaceCardPreview({ gap, title, body, badge }: Props) {
  return (
    <article className="place-card" data-gap={gap}>
      {badge ? <span className="badge">{badge}</span> : null}
      <header className="place-card-header">{title}</header>
      <section className="place-card-body" style={{ marginTop: gapPx[gap] }}>
        {body}
      </section>
      <small className="token-note">header_body_gap = {gap} ({gapPx[gap]}px)</small>
    </article>
  );
}
