import { describe, expect, it } from "vitest";
import { runPipeline, rollbackPipeline, canonicalAxes, projectedAxes } from "../src/pipeline/runner";

const toCanonical = (axis: string) => axis.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

describe("governed pipeline", () => {
  it("canonical edit changes resolved spacing token", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    expect(result.canonicalEdit.to).toBe("relaxed");
    expect(result.resolvedTokenBefore).toBe(16);
    expect(result.resolvedTokenAfter).toBe(24);
  });

  it("projections reflect semantic change", () => {
    const result = runPipeline("isso está apertado demais");
    expect(result.stages.find((stage) => stage.id === "05")?.artifact).toContain("governed axis");
    expect(result.stages.find((stage) => stage.id === "06")?.artifact).toContain("semantic gap");
  });

  it("rollback restores original semantic state", () => {
    const result = runPipeline("isso precisa ficar um pouco mais abaixo");
    const rolledBack = rollbackPipeline(result);
    expect(rolledBack.canonicalEdit.to).toBe("cozy");
    expect(rolledBack.resolvedTokenAfter).toBe(16);
    expect(rolledBack.eventLog.at(-1)).toBe("post_rollback_verification_passed");
  });

  it("does not allow unsupported semantic axis only downstream", () => {
    const normalizedProjected = projectedAxes.map((axis) => toCanonical(axis));
    for (const axis of normalizedProjected) {
      expect(canonicalAxes).toContain(axis as (typeof canonicalAxes)[number]);
    }
  });
});
