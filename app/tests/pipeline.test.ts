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

  it("stage inspector exposes policy checks and canonical constraints", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    const operatorStage = result.stages.find((stage) => stage.id === "01");
    const canonicalStage = result.stages.find((stage) => stage.id === "02");

    expect(operatorStage?.structuredFacts.some((fact) => fact.key === "policy.checks" && fact.value.includes("intent_is_presentational:pass"))).toBe(true);
    expect(canonicalStage?.structuredFacts.some((fact) => fact.key === "forbidden.changes" && fact.value.includes("dom_structure"))).toBe(true);
    expect(canonicalStage?.structuredFacts.some((fact) => fact.key === "blast.expected" && fact.value.includes("mais espaço vertical"))).toBe(true);
  });

  it("resolved tokens reflect canonical edit and IR before/after", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    const irStage = result.stages.find((stage) => stage.id === "03");

    expect(result.tokens.before.alias).toBe("{space.4}");
    expect(result.tokens.before.resolved.value).toBe(16);
    expect(result.tokens.after.alias).toBe("{space.6}");
    expect(result.tokens.after.resolved.value).toBe(24);
    expect(irStage?.structuredFacts.some((fact) => fact.key === "ir.before" && fact.value.includes("16px"))).toBe(true);
    expect(irStage?.structuredFacts.some((fact) => fact.key === "ir.after" && fact.value.includes("24px"))).toBe(true);
  });

  it("rollback trace shows target edit and restored state", () => {
    const proposed = runPipeline("isso precisa ficar um pouco mais abaixo");
    const applied = applyPipeline(proposed);
    const rolledBack = rollbackPipeline(applied);

    expect(rolledBack.rollbackPlan.targetEditId).toBe("uiedit_2026_04_16_placecard_gap_001");
    expect(rolledBack.rollbackTrace.map((step) => step.status)).toEqual(["done", "done", "done"]);
    expect(rolledBack.rollbackVerification?.restoredState).toBe("cozy");
    expect(rolledBack.rollbackVerification?.actualPx).toBe(16);
  });

  it("unchanged scope merges semantic diff and verification unchanged evidence", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");

    expect(result.verification.unchanged).toEqual(expect.arrayContaining([
      "dom structure",
      "component hierarchy",
      "microcopy",
      "action behavior",
      "tipografia",
      "layout global",
      "surface",
      "density"
    ]));
  });

  it("cli-facing and app-facing snapshots share the same core truth", () => {
    const snapshot = getArtifactSnapshot();
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");

    expect(snapshot.operator.policyChecks.every((check: { status: string }) => check.status === "pass")).toBe(true);
    expect(snapshot.rollback.targetEditId).toBe(result.rollbackPlan.targetEditId);
    expect(snapshot.verification.visualExpected).toEqual(result.verification.visualExpected);
    expect(snapshot.canonical.blastRadius.forbiddenChanges).toEqual(result.canonicalEdit.forbiddenChanges);
  });

  it("does not allow unsupported semantic axis only downstream", () => {
    const normalizedProjected = projectedAxes.map((axis) => toCanonical(axis));
    for (const axis of normalizedProjected) {
      expect(canonicalAxes).toContain(axis as (typeof canonicalAxes)[number]);
    }
  });
});
