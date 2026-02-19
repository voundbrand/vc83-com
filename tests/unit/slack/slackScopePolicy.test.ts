import { describe, expect, it } from "vitest";
import {
  getMissingSlackScopes,
  getSlackRequestedScopes,
} from "../../../convex/oauth/slack";

describe("Slack OAuth scope policy", () => {
  it("omits commands scope when slash commands are disabled", () => {
    const scopes = getSlackRequestedScopes(false);
    expect(scopes).toEqual([
      "app_mentions:read",
      "channels:history",
      "channels:read",
      "chat:write",
    ]);
  });

  it("includes commands scope when slash commands are enabled", () => {
    const scopes = getSlackRequestedScopes(true);
    expect(scopes).toContain("commands");
  });

  it("detects missing required scopes", () => {
    const required = getSlackRequestedScopes(true);
    const granted = required.filter((scope) => scope !== "commands");

    expect(getMissingSlackScopes(granted, required)).toEqual(["commands"]);
  });

  it("returns no missing scopes when all required scopes are granted", () => {
    const required = getSlackRequestedScopes(true);
    expect(getMissingSlackScopes(required, required)).toEqual([]);
  });
});
