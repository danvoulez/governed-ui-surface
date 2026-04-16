import { cva, type VariantProps } from "class-variance-authority";

/**
 * Governed component contract projection.
 * Source of truth:
 * - grammar/components.yaml
 * - final-placecard/03-ir/ui-ir.yaml
 */
export const placeCardVariants = cva("place-card", {
  variants: {
    density: {
      compact: "place-card-gap-compact",
      cozy: "place-card-gap-cozy",
      relaxed: "place-card-gap-relaxed"
    },
    surface: {
      default: "place-card-surface-default",
      elevated: "place-card-surface-elevated"
    },
    decisionState: {
      idle: "opacity-100",
      pending: "opacity-90",
      blocked: "opacity-80"
    }
  },
  compoundVariants: [
    {
      density: "relaxed",
      surface: "elevated",
      class: "transition-all duration-200"
    },
    {
      density: "compact",
      decisionState: "blocked",
      class: "pointer-events-none"
    }
  ],
  defaultVariants: {
    density: "cozy",
    surface: "default",
    decisionState: "idle"
  }
});

export type PlaceCardVariantProps = VariantProps<typeof placeCardVariants>;

export type PlaceCardSemanticEdit = {
  axis: "header_body_gap";
  from: "compact" | "cozy" | "relaxed";
  to: "compact" | "cozy" | "relaxed";
  reason: string;
};
