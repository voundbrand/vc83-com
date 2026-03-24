import { query } from "../../_generated/server";
import { TOOL_REGISTRY } from "./registry";

export const inspect = query({
  args: {},
  handler: async () => {
    const invalidEntries = Object.entries(TOOL_REGISTRY)
      .filter(([_, tool]) => !tool || typeof tool.name !== "string")
      .map(([key]) => key)
      .sort();

    return {
      invalidEntries,
      totalEntries: Object.keys(TOOL_REGISTRY).length,
    };
  },
});
