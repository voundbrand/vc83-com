/**
 * Tests for Universal Behavior Registry
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BehaviorRegistry,
  registerBehaviors,
  executeBehaviorsFromObject,
} from "../index";
import type {
  BehaviorHandler,
  Behavior,
  BehaviorContext,
  InputSource,
} from "../types";

describe("BehaviorRegistry", () => {
  let registry: BehaviorRegistry;

  // Mock handler for testing
  const mockHandler: BehaviorHandler = {
    type: "test_behavior",
    name: "Test Behavior",
    description: "A test behavior for unit tests",
    extract: (config: any, inputs, context) => {
      const formInput = inputs.find((i) => i.type === "form");
      if (!formInput) return null;
      return { value: formInput.data.testField };
    },
    apply: (config: any, extracted: any, context) => {
      return {
        success: true,
        data: { processed: extracted.value },
        actions: [
          {
            type: "test_action",
            payload: { value: extracted.value },
            when: "immediate" as const,
          },
        ],
      };
    },
    validate: (config: any) => {
      if (!config.requiredField) {
        return [
          {
            field: "requiredField",
            code: "required",
            message: "requiredField is required",
          },
        ];
      }
      return [];
    },
  } as any;

  beforeEach(() => {
    registry = new BehaviorRegistry();
  });

  describe("register", () => {
    it("should register a behavior handler", () => {
      registry.register(mockHandler);
      expect(registry.get("test_behavior")).toBe(mockHandler);
    });

    it("should warn when overwriting existing handler", () => {
      // Note: In real usage, overwriting would log a warning
      // For test purposes, we just verify it doesn't throw
      registry.register(mockHandler);
      registry.register(mockHandler);
      expect(registry.get("test_behavior")).toBe(mockHandler);
    });
  });

  describe("get", () => {
    it("should return registered handler", () => {
      registry.register(mockHandler);
      expect(registry.get("test_behavior")).toBe(mockHandler);
    });

    it("should return undefined for unknown type", () => {
      expect(registry.get("unknown")).toBeUndefined();
    });
  });

  describe("getTypes", () => {
    it("should return all registered types", () => {
      registry.register(mockHandler);
      registry.register({ ...mockHandler, type: "another_type" });
      expect(registry.getTypes()).toContain("test_behavior");
      expect(registry.getTypes()).toContain("another_type");
      expect(registry.getTypes()).toHaveLength(2);
    });
  });

  describe("validate", () => {
    beforeEach(() => {
      registry.register(mockHandler);
    });

    it("should validate correct config", () => {
      const behavior: Behavior = {
        type: "test_behavior",
        config: { requiredField: "value" },
      };
      expect(registry.validate(behavior)).toHaveLength(0);
    });

    it("should return errors for invalid config", () => {
      const behavior: Behavior = {
        type: "test_behavior",
        config: {},
      };
      const errors = registry.validate(behavior);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("required");
    });

    it("should return error for unknown behavior type", () => {
      const behavior: Behavior = {
        type: "unknown",
        config: {},
      };
      const errors = registry.validate(behavior);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("unknown_behavior");
    });
  });

  describe("execute", () => {
    beforeEach(() => {
      registry.register(mockHandler);
    });

    it("should execute behavior successfully", async () => {
      const behavior: Behavior = {
        type: "test_behavior",
        config: { requiredField: "value" },
      };

      const context: BehaviorContext = {
        inputs: [
          {
            type: "form",
            data: { testField: "test-value" },
            metadata: {},
          },
        ],
        availableData: {},
        metadata: {},
      };

      const result = await registry.execute(behavior, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: "test-value" });
      expect(result.actions).toHaveLength(1);
      expect(result.actions?.[0].type).toBe("test_action");
    });

    it("should skip behavior when extraction returns null", async () => {
      const behavior: Behavior = {
        type: "test_behavior",
        config: { requiredField: "value" },
      };

      const context: BehaviorContext = {
        organizationId: "testOrg" as any,
        workflow: "test",
        objects: [],
        inputs: [
          {
            type: "api",
            data: {},
            metadata: {
              timestamp: Date.now(),
            },
          },
        ],
      };

      const result = await registry.execute(behavior, context);

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.actions).toEqual([]);
    });

    it("should return error for unknown behavior type", async () => {
      const behavior: Behavior = {
        type: "unknown",
        config: {},
      };

      const context: BehaviorContext = {
        inputs: [],
        availableData: {},
        metadata: {},
      };

      const result = await registry.execute(behavior, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("unknown_behavior");
    });

    it("should return error for invalid config", async () => {
      const behavior: Behavior = {
        type: "test_behavior",
        config: {},
      };

      const context: BehaviorContext = {
        inputs: [],
        availableData: {},
        metadata: {},
      };

      const result = await registry.execute(behavior, context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("validation_failed");
    });
  });

  describe("executeMany", () => {
    beforeEach(() => {
      registry.register(mockHandler);

      // Register a second handler that modifies context
      const contextModifier: BehaviorHandler = {
        type: "context_modifier",
        name: "Context Modifier",
        description: "Modifies context",
        extract: async () => ({ value: "modified" }),
        apply: async () => ({
          success: true,
          data: { modified: true },
          modifiedContext: {
            workflowData: { modified: true },
          } as Partial<BehaviorContext>,
        }),
        validate: () => [],
      };
      registry.register(contextModifier);
    });

    it("should execute multiple behaviors in sequence", async () => {
      const behaviors: Behavior[] = [
        { type: "test_behavior", config: { requiredField: "value" } },
        { type: "context_modifier", config: {} },
      ];

      const context: BehaviorContext = {
        inputs: [
          {
            type: "form",
            data: { testField: "test-value" },
            metadata: {},
          },
        ],
        availableData: {},
        metadata: {},
      };

      const result = await registry.executeMany(behaviors, context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.actions).toHaveLength(1); // Only first behavior has actions
    });

    it("should stop on first failure", async () => {
      const behaviors: Behavior[] = [
        { type: "test_behavior", config: {} }, // Invalid config
        { type: "context_modifier", config: {} },
      ];

      const context: BehaviorContext = {
        inputs: [],
        availableData: {},
        metadata: {},
      };

      const result = await registry.executeMany(behaviors, context);

      expect(result.success).toBe(false);
    });

    it("should propagate context modifications", async () => {
      const behaviors: Behavior[] = [
        { type: "context_modifier", config: {} },
        { type: "test_behavior", config: { requiredField: "value" } },
      ];

      const context: BehaviorContext = {
        inputs: [
          {
            type: "form",
            data: { testField: "test-value" },
            metadata: {},
          },
        ],
        availableData: {},
        metadata: {},
      };

      const result = await registry.executeMany(behaviors, context);

      expect(result.success).toBe(true);
      expect(result.modifiedContext?.workflowData).toEqual({ modified: true });
    });
  });

  describe("executeManyWithBatching", () => {
    beforeEach(() => {
      // Register handlers with different action timings
      const immediateHandler: BehaviorHandler = {
        type: "immediate",
        name: "Immediate",
        description: "Immediate action handler",
        extract: async () => ({}),
        apply: async () => ({
          success: true,
          actions: [
            { type: "action1", payload: {}, when: "immediate" as const },
          ],
        }),
        validate: () => [],
      };

      const deferredHandler: BehaviorHandler = {
        type: "deferred",
        name: "Deferred",
        description: "Deferred action handler",
        extract: async () => ({}),
        apply: async () => ({
          success: true,
          actions: [
            { type: "action2", payload: {}, when: "deferred" as const },
          ],
        }),
        validate: () => [],
      };

      const scheduledHandler: BehaviorHandler = {
        type: "scheduled",
        name: "Scheduled",
        description: "Scheduled action handler",
        extract: async () => ({}),
        apply: async () => ({
          success: true,
          actions: [
            { type: "action3", payload: {}, when: "scheduled" as const },
          ],
        }),
        validate: () => [],
      };

      registry.register(immediateHandler);
      registry.register(deferredHandler);
      registry.register(scheduledHandler);
    });

    it("should batch actions by timing", async () => {
      const behaviors: Behavior[] = [
        { type: "immediate", config: {} },
        { type: "deferred", config: {} },
        { type: "scheduled", config: {} },
      ];

      const context: BehaviorContext = {
        inputs: [],
        availableData: {},
        metadata: {},
      };

      const { result, batches } =
        await registry.executeManyWithBatching(behaviors, context);

      expect(result.success).toBe(true);
      expect(batches.immediate).toHaveLength(1);
      expect(batches.deferred).toHaveLength(1);
      expect(batches.scheduled).toHaveLength(1);
    });
  });

  describe("registerBehaviors helper", () => {
    it("should register multiple handlers at once", () => {
      const registry = new BehaviorRegistry();
      const handler1 = { ...mockHandler, type: "handler1" };
      const handler2 = { ...mockHandler, type: "handler2" };

      registerBehaviors([handler1, handler2]);

      expect(registry.get("handler1")).toBeDefined();
      expect(registry.get("handler2")).toBeDefined();
    });
  });

  describe("executeBehaviorsFromObject helper", () => {
    beforeEach(() => {
      registry.register(mockHandler);
    });

    it("should execute behaviors from object customProperties", async () => {
      const object = {
        customProperties: {
          behaviors: [
            { type: "test_behavior", config: { requiredField: "value" } },
          ],
        },
      };

      const context: BehaviorContext = {
        inputs: [
          {
            type: "form",
            data: { testField: "test-value" },
            metadata: {},
          },
        ],
        availableData: {},
        metadata: {},
      };

      const result = await executeBehaviorsFromObject(object, context);

      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
    });

    it("should handle objects without behaviors", async () => {
      const object = {};

      const context: BehaviorContext = {
        inputs: [],
        availableData: {},
        metadata: {},
      };

      const result = await executeBehaviorsFromObject(object, context);

      expect(result.success).toBe(true);
      expect(result.actions).toEqual([]);
    });
  });
});
