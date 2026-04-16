import { cva, type VariantProps } from "class-variance-authority";

/**
 * Governed component contract projection.
 * Source of truth:
 * - ui-canon/grammar/components.yaml
 * - ui-canon/final-placecard/03-ir/ui-ir.yaml
 */
export const placeCardVariants = cva("place-card", {
  variants: {
    density: {
      compact: "place-card-density-compact",
      cozy: "place-card-density-cozy",
      relaxed: "place-card-density-relaxed"
    },
    surface: {
      default: "place-card-surface-default",
      elevated: "place-card-surface-elevated"
    },
    headerBodyGap: {
      compact: "place-card-gap-compact",
      cozy: "place-card-gap-cozy",
      relaxed: "place-card-gap-relaxed"
    }
  },
  compoundVariants: [
    {
      density: "relaxed",
      surface: "elevated",
      headerBodyGap: "relaxed",
      class: "transition-all duration-200"
    }
  ],
  defaultVariants: {
    density: "cozy",
    surface: "default",
    headerBodyGap: "cozy"
  }
});

export type PlaceCardVariantProps = VariantProps<typeof placeCardVariants>;

export type PlaceCardSemanticEdit = {
  axis: "header_body_gap";
  from: "compact" | "cozy" | "relaxed";
  to: "compact" | "cozy" | "relaxed";
  reason: string;
};
