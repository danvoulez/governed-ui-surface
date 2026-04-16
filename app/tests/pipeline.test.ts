import { describe, expect, it } from "vitest";
import { applyPipeline, getArtifactSnapshot, rollbackPipeline, runPipeline, canonicalAxes, projectedAxes } from "../src/pipeline/runner";

const toCanonical = (axis: string) => axis.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

describe("governed artifact-backed pipeline", () => {
  it("canonical artifact data yields semantic state transition", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    expect(result.canonicalEdit.target).toBe("place_card.header_body_gap");
    expect(result.canonicalEdit.from).toBe("cozy");
    expect(result.canonicalEdit.to).toBe("relaxed");
  });

  it("stage inspector exposes structured facts from canonical artifacts", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    const operatorStage = result.stages.find((stage) => stage.id === "01");
    const canonicalStage = result.stages.find((stage) => stage.id === "02");
    const verificationStage = result.stages.find((stage) => stage.id === "08");

    expect(operatorStage?.structuredFacts.some((fact) => fact.key === "axis" && fact.value === "header_body_gap")).toBe(true);
    expect(canonicalStage?.structuredFacts.some((fact) => fact.key === "edit_id" && fact.value.includes("uiedit_2026_04_16"))).toBe(true);
    expect(verificationStage?.structuredFacts.some((fact) => fact.key === "unchanged" && fact.value.includes("DOM structure"))).toBe(true);
  });

  it("resolved tokens reflect canonical edit", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    expect(result.tokens.before.alias).toBe("{space.4}");
    expect(result.tokens.before.resolved.value).toBe(16);
    expect(result.tokens.after.alias).toBe("{space.6}");
    expect(result.tokens.after.resolved.value).toBe(24);
  });

  it("rollback trace shows requested → applied → post verification", () => {
    const proposed = runPipeline("isso precisa ficar um pouco mais abaixo");
    const applied = applyPipeline(proposed);
    const rolledBack = rollbackPipeline(applied);

    expect(rolledBack.rollbackTrace.map((step) => step.status)).toEqual(["done", "done", "done"]);
    expect(rolledBack.ledger.slice(-3).map((e) => e.event)).toEqual([
      "rollback_requested",
      "rollback_applied",
      "post_rollback_verification_completed"
    ]);
  });

  it("app-facing snapshot aligns with canonical files without invented facts", () => {
    const snapshot = getArtifactSnapshot();
    expect(snapshot.heroPromptFromArtifact).toBe("isso precisa ficar um pouco mais abaixo");
    expect(snapshot.operator.confidence).toBe(0.81);
    expect(snapshot.verification.unchanged).toEqual([
      "DOM structure",
      "Component hierarchy",
      "Microcopy",
      "Action behavior"
    ]);
    expect(snapshot.canonical.target).toBe("place_card.header_body_gap");
  });

  it("does not allow unsupported semantic axis only downstream", () => {
    const normalizedProjected = projectedAxes.map((axis) => toCanonical(axis));
    for (const axis of normalizedProjected) {
      expect(canonicalAxes).toContain(axis as (typeof canonicalAxes)[number]);
    }
  });
});
