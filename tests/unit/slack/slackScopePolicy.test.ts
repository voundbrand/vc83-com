import { describe, expect, it } from "vitest";
import {
  getMissingSlackScopes,
  getSlackRequestedScopes,
} from "../../../convex/oauth/slack";

describe("Slack OAuth scope policy", () => {
  it("omits commands scope when slash commands are disabled", () => {
    const scopes = getSlackRequestedScopes(false, "mentions_only");
    expect(scopes).toEqual([
      "app_mentions:read",
      "channels:history",
      "channels:read",
      "chat:write",
    ]);
  });

  it("includes commands scope when slash commands are enabled", () => {
    const scopes = getSlackRequestedScopes(true, "mentions_only");
    expect(scopes).toContain("commands");
  });

  it("includes DM scope when interaction mode enables App Home DMs", () => {
    const scopes = getSlackRequestedScopes(false, "mentions_and_dm");
    expect(scopes).toContain("im:history");
  });

  it("includes assistant scope when AI app features are enabled", () => {
    const scopes = getSlackRequestedScopes(false, "mentions_and_dm", true);
    expect(scopes).toContain("assistant:write");
  });

  it("omits assistant scope when AI app features are disabled", () => {
    const scopes = getSlackRequestedScopes(false, "mentions_and_dm", false);
    expect(scopes).not.toContain("assistant:write");
  });

  it("detects missing required scopes", () => {
    const required = getSlackRequestedScopes(true, "mentions_only");
    const granted = required.filter((scope) => scope !== "commands");

    expect(getMissingSlackScopes(granted, required)).toEqual(["commands"]);
  });

  it("returns no missing scopes when all required scopes are granted", () => {
    const required = getSlackRequestedScopes(true, "mentions_and_dm");
    expect(getMissingSlackScopes(required, required)).toEqual([]);
  });
});
