/**
 * BEHAVIOR-DRIVEN CHECKOUT SCHEMA
 *
 * Configuration schema for behavior-driven checkout template
 */

import { CheckoutTemplateSchema } from "../types";

export const behaviorDrivenSchema: CheckoutTemplateSchema = {
  code: "behavior-driven",
  name: "Behavior-Driven Checkout",
  version: "1.0.0",
  description:
    "Behavior-powered checkout that uses the universal behavior system to handle business logic (employer detection, invoice mapping, form flows, etc.)",
  fields: [
    {
      key: "paymentProviders",
      label: "Payment Providers",
      type: "group",
      helpText: "Enabled payment methods for this checkout",
    },
    {
      key: "allowBackNavigation",
      label: "Allow Back Navigation",
      type: "checkbox",
      defaultValue: true,
      helpText: "Let customers go back to previous steps",
    },
    {
      key: "showProgressBar",
      label: "Show Progress Bar",
      type: "checkbox",
      defaultValue: true,
      helpText: "Display checkout progress indicator",
    },
    {
      key: "executeBehaviorsOnStepChange",
      label: "Execute Behaviors On Step Change",
      type: "checkbox",
      defaultValue: true,
      helpText: "Run behavior system after each step (recommended)",
    },
    {
      key: "behaviorExecutionTiming",
      label: "Behavior Execution Timing",
      type: "select",
      defaultValue: "eager",
      options: [
        { value: "eager", label: "Eager (After Each Step)" },
        { value: "lazy", label: "Lazy (Before Payment Only)" },
      ],
      helpText: "When to execute behaviors",
    },
    {
      key: "debugMode",
      label: "Debug Mode",
      type: "checkbox",
      defaultValue: false,
      helpText: "Show debug panel with behavior results (testing only)",
    },
    {
      key: "forceB2B",
      label: "Force B2B Mode",
      type: "checkbox",
      defaultValue: false,
      helpText: "Always show invoice enforcement step (for testing)",
    },
  ],
  defaultConfig: {
    paymentProviders: ["stripe", "invoice"],
    allowBackNavigation: true,
    showProgressBar: true,
    executeBehaviorsOnStepChange: true,
    behaviorExecutionTiming: "eager",
    debugMode: false,
    forceB2B: false,
  },
};
