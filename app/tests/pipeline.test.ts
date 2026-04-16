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

  it("resolved tokens reflect canonical edit", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    expect(result.tokens.before.alias).toBe("{space.4}");
    expect(result.tokens.before.resolved.value).toBe(16);
    expect(result.tokens.after.alias).toBe("{space.6}");
    expect(result.tokens.after.resolved.value).toBe(24);
  });

  it("stage inspector points to canonical file paths", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    expect(result.stages.find((stage) => stage.id === "00")?.artifactPath).toContain("00-input/human-request.md");
    expect(result.stages.find((stage) => stage.id === "04")?.artifactPath).toContain("04-token-resolution/resolved-tokens.json");
    expect(result.evidence.semanticDiffPath).toContain("08-verification/semantic-diff.md");
  });

  it("rollback returns to canonical baseline and appends rollback ledger events", () => {
    const proposed = runPipeline("isso precisa ficar um pouco mais abaixo");
    const applied = applyPipeline(proposed);
    const rolledBack = rollbackPipeline(applied);

    expect(rolledBack.canonicalEdit.to).toBe("cozy");
    expect(rolledBack.tokens.after.resolved.value).toBe(16);
    expect(rolledBack.ledger.slice(-3).map((e) => e.event)).toEqual([
      "rollback_requested",
      "rollback_applied",
      "post_rollback_verification_completed"
    ]);
  });

  it("does not allow unsupported semantic axis only downstream", () => {
    const normalizedProjected = projectedAxes.map((axis) => toCanonical(axis));
    for (const axis of normalizedProjected) {
      expect(canonicalAxes).toContain(axis as (typeof canonicalAxes)[number]);
    }
  });

  it("artifact snapshot keeps hero prompt and operator confidence", () => {
    const snapshot = getArtifactSnapshot();
    expect(snapshot.heroPromptFromArtifact).toBe("isso precisa ficar um pouco mais abaixo");
    expect(snapshot.operator.confidence).toBe(0.81);
  });
});
