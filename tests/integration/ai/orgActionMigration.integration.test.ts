import { describe, expect, it } from "vitest";
import {
  ORG_ACTION_RUNTIME_MIGRATION_CONTRACT_VERSION,
  buildOrgActionRuntimeMigrationPatch,
  resolveOrgActionRuntimeRolloutFlags,
} from "../../../convex/migrations/backfillOrgAgentActionRuntime";
import { buildOrgActionRuntimeMigrationRolloutFlags } from "../../../convex/migrations/backfillTransactions";

describe("org action runtime migration rollout contract", () => {
  it("publishes a stable migration contract version", () => {
    expect(ORG_ACTION_RUNTIME_MIGRATION_CONTRACT_VERSION).toBe(
      "org_action_runtime_migration_v1",
    );
  });

  it("keeps external execution fail-closed unless connector sync is enabled", () => {
    expect(
      resolveOrgActionRuntimeRolloutFlags({
        captureEnabled: true,
        ownerWorkflowEnabled: true,
        connectorSyncEnabled: false,
        externalExecutionEnabled: true,
      }),
    ).toEqual({
      captureEnabled: true,
      ownerWorkflowEnabled: true,
      connectorSyncEnabled: false,
      externalExecutionEnabled: false,
    });

    expect(
      resolveOrgActionRuntimeRolloutFlags({
        captureEnabled: true,
        ownerWorkflowEnabled: true,
        connectorSyncEnabled: true,
        externalExecutionEnabled: true,
      }),
    ).toEqual({
      captureEnabled: true,
      ownerWorkflowEnabled: true,
      connectorSyncEnabled: true,
      externalExecutionEnabled: true,
    });
  });

  it("backfills action-item migration metadata with source session continuity", () => {
    const patch = buildOrgActionRuntimeMigrationPatch({
      objectType: "org_agent_action_item",
      migratedAt: 1_739_900_000_000,
      customProperties: {
        sessionId: "agentSessions_1",
        correlationId: "corr_1",
        oarRolloutFlags: {
          captureEnabled: true,
          ownerWorkflowEnabled: true,
          connectorSyncEnabled: false,
          externalExecutionEnabled: true,
        },
      },
    });

    expect(patch.sourceSessionId).toBe("agentSessions_1");
    expect(patch.oarMigration).toMatchObject({
      contractVersion: ORG_ACTION_RUNTIME_MIGRATION_CONTRACT_VERSION,
      objectType: "org_agent_action_item",
      sourceSessionId: "agentSessions_1",
      correlationId: "corr_1",
    });
    expect(patch.oarRolloutFlags).toEqual({
      captureEnabled: true,
      ownerWorkflowEnabled: true,
      connectorSyncEnabled: false,
      externalExecutionEnabled: false,
    });
  });

  it("promotes connector sync rollout only after transaction history is canonicalized", () => {
    expect(
      buildOrgActionRuntimeMigrationRolloutFlags({
        migratedTransactions: 0,
        skippedAlreadyMigrated: 0,
      }),
    ).toEqual({
      captureEnabled: true,
      ownerWorkflowEnabled: true,
      connectorSyncEnabled: false,
      externalExecutionEnabled: false,
    });

    expect(
      buildOrgActionRuntimeMigrationRolloutFlags({
        migratedTransactions: 10,
        skippedAlreadyMigrated: 4,
      }),
    ).toEqual({
      captureEnabled: true,
      ownerWorkflowEnabled: true,
      connectorSyncEnabled: true,
      externalExecutionEnabled: false,
    });
  });
});
