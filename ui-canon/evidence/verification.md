# Verification Evidence — PlaceCard Gap Adjustment

## Semantic diff
- `place_card.header_body_gap`: `cozy -> relaxed`.
- Scope: `PlaceCard` only.
- Policy class: `presentational_low_risk`.

## Visual expectation
- Header and body content in `PlaceCard` gain one semantic step of vertical spacing.
- No color, typography, or layout structure changes.

## Safety checks
- Token aliases remain acyclic.
- Change respects `grammar/components.yaml` invariant: `density=relaxed` enforces `header_body_gap=relaxed`.
- Auto-apply allowed by policy (confidence `0.81`).

## Rollback pointer
- Revert canonical edit in `ui-canon/operator/placecard-gap-adjustment.yaml` from `to: relaxed` to `to: cozy` and regenerate projections.
