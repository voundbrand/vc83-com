import { expect, test } from "@playwright/test";
import { buildWaeScenarioDsl } from "./utils/wae-scenario-dsl";

test.describe("WAE scenario DSL", () => {
  test("builds deterministic scenario rows from matrix with lexical ordering", async () => {
    const dsl = buildWaeScenarioDsl();

    expect(dsl.contractVersion).toBe("wae_eval_playwright_scenario_dsl_v1");
    expect(dsl.matrixContractVersion).toBe("wae_eval_scenario_matrix_v1");
    expect(dsl.counts.scenarios).toBe(51);

    const ids = dsl.scenarios.map((scenario) => scenario.id);
    expect(ids).toEqual([...ids].sort((left, right) => left.localeCompare(right)));

    const q001 = dsl.scenarios.find((scenario) => scenario.id === "Q-001");
    expect(q001?.executionMode).toBe("RUN_WITH_PENDING_SUBCHECKS");
    expect(q001?.runtime.verdict).toBe("RUN");
    expect(q001?.runtime.skippedSubchecks).toContain(
      "agent-self-naming-arrival:im_here_arrival_phrase",
    );

    const q009 = dsl.scenarios.find((scenario) => scenario.id === "Q-009");
    expect(q009?.executionMode).toBe("SKIP_UNTIL_FEATURE");
    expect(q009?.runtime.verdict).toBe("SKIPPED");
    expect(q009?.runtime.reasonCodes).toEqual([
      "pending_feature:agent-self-naming-arrival",
    ]);

    expect(dsl.counts.crossAgentAssertions).toBe(15);
  });

  test("supports deterministic pending-feature gate overrides", async () => {
    const withOverrides = buildWaeScenarioDsl({
      featureStates: {
        "agent-self-naming-arrival": "DELIVERED",
      },
    });

    const q009 = withOverrides.scenarios.find((scenario) => scenario.id === "Q-009");
    expect(q009?.runtime.verdict).toBe("SKIPPED");
    expect(q009?.runtime.reasonCodes).toEqual([
      "pending_feature:execution_mode_gate",
    ]);

    const q001 = withOverrides.scenarios.find((scenario) => scenario.id === "Q-001");
    expect(q001?.runtime.skippedSubchecks).toEqual([]);

    const q010 = withOverrides.scenarios.find((scenario) => scenario.id === "Q-010");
    expect(q010?.runtime.reasonCodes).toEqual([
      "pending_feature:onboarding-customization-passthrough",
    ]);
  });
});
