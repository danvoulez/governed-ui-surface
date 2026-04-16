import { cva, type VariantProps } from "class-variance-authority";

export const placeCardVariants = cva("place-card grid", {
  variants: {
    density: {
      cozy: "place-card-gap-cozy",
      relaxed: "place-card-gap-relaxed"
    },
    surface: {
      default: "bg-[var(--color-place-card-surface-default)]",
      elevated: "bg-[var(--color-place-card-surface-elevated)] shadow-[0_4px_16px_0_rgba(15,23,42,0.12)]"
    }
  },
  compoundVariants: [
    {
      density: "relaxed",
      surface: "elevated",
      class: "density-relaxed:transition-all"
    }
  ],
  defaultVariants: {
    density: "cozy",
    surface: "default"
  }
});

export type PlaceCardVariantProps = VariantProps<typeof placeCardVariants>;
