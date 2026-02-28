import { expect, test } from "@playwright/test";
import {
  FOUNDER_SCENARIO_IDS,
  buildFounderDemoRunId,
  runFounderScenarioRehearsal,
  writeFounderScenarioEvidenceArtifact,
} from "./utils/founder-rehearsal";

test.describe("Founder rehearsal core scenarios", () => {
  test.describe.configure({ mode: "serial" });

  for (const scenarioId of FOUNDER_SCENARIO_IDS) {
    test(`${scenarioId} emits deterministic fail-closed evidence`, async () => {
      const evidence = await runFounderScenarioRehearsal(scenarioId);
      await writeFounderScenarioEvidenceArtifact(evidence);

      expect(evidence.scenarioId).toBe(scenarioId);
      expect(evidence.runId).toBe(buildFounderDemoRunId(scenarioId));
      expect(evidence.checkpointResults).toHaveLength(4);
      expect(
        evidence.checkpointResults.find((checkpoint) => checkpoint.id.endsWith("-C1"))?.status,
      ).toBe("PASS");

      if (evidence.preflightStatus === "blocked") {
        expect(evidence.result).toBe("FAIL");
        expect(evidence.blockedUnblockingStepsPresent).toBe("yes");
      } else {
        expect(evidence.result).toBe("PASS");
        expect(evidence.checkpointFailIds).toBe("none");
      }
    });
  }
});
