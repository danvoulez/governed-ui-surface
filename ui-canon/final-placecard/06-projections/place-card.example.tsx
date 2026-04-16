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
  decisionState = "idle"
}: PlaceCardProps) {
  return (
    <article
      className={placeCardVariants({ density, surface, decisionState })}
      data-density={density}
      data-surface={surface}
      data-decision-state={decisionState}
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
    />
  );
}
