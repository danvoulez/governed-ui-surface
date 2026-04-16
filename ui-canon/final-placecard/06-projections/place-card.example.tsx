import React from "react";
import { placeCardVariants, type PlaceCardVariantProps } from "./component.variants";

type PlaceCardProps = PlaceCardVariantProps & {
  title: string;
  body: string;
};

export function PlaceCard({
  title,
  body,
  density = "cozy",
  surface = "default",
  headerBodyGap = "cozy"
}: PlaceCardProps) {
  return (
    <article
      className={placeCardVariants({ density, surface, headerBodyGap })}
      data-density={density}
      data-surface={surface}
      data-header-body-gap={headerBodyGap}
    >
      <header className="place-card-header">{title}</header>
      <section className="place-card-body">{body}</section>
    </article>
  );
}

export function DemoSemanticEditApplied() {
  return (
    <PlaceCard
      title="Aprovação de mudança"
      body="O espaço vertical foi aumentado em um passo semântico: cozy -> relaxed."
      density="relaxed"
      surface="elevated"
      headerBodyGap="relaxed"
    />
  );
}
