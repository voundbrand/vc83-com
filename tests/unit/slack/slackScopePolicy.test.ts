import { describe, expect, it } from "vitest";
import {
  getMissingSlackScopes,
  getSlackRequestedScopes,
  resolveSlackCalendarOnboardingReadinessState,
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

  it("maps to not_started when required failures exist and no progress is present", () => {
    const state = resolveSlackCalendarOnboardingReadinessState({
      checks: [
        {
          id: "slack.connection",
          title: "Slack workspace connection",
          category: "slack",
          severity: "required",
          status: "fail",
          reasonCodes: ["slack_connection_missing"],
          evidence: {},
        },
      ] as never,
      hasSlackConnection: false,
      hasCalendarConnection: false,
      hasPolicy: false,
    });
    expect(state).toBe("not_started");
  });

  it("maps to blocked when blocked reason code is present", () => {
    const state = resolveSlackCalendarOnboardingReadinessState({
      checks: [
        {
          id: "permission.manage_integrations",
          title: "Permission",
          category: "slack",
          severity: "required",
          status: "fail",
          reasonCodes: ["permission_manage_integrations_required"],
          evidence: {},
        },
      ] as never,
      hasSlackConnection: true,
      hasCalendarConnection: false,
      hasPolicy: false,
    });
    expect(state).toBe("blocked");
  });

  it("maps to misconfigured when Slack identity reason code is present", () => {
    const state = resolveSlackCalendarOnboardingReadinessState({
      checks: [
        {
          id: "slack.route_identity",
          title: "Slack route identity",
          category: "slack",
          severity: "required",
          status: "fail",
          reasonCodes: ["slack_identity_route_key_missing"],
          evidence: {},
        },
      ] as never,
      hasSlackConnection: true,
      hasCalendarConnection: true,
      hasPolicy: false,
    });
    expect(state).toBe("misconfigured");
  });

  it("maps to partial when required failures remain after onboarding progress", () => {
    const state = resolveSlackCalendarOnboardingReadinessState({
      checks: [
        {
          id: "vacation_policy.selection",
          title: "Vacation policy selection",
          category: "vacation_policy",
          severity: "required",
          status: "fail",
          reasonCodes: ["vacation_policy_missing"],
          evidence: {},
        },
      ] as never,
      hasSlackConnection: true,
      hasCalendarConnection: true,
      hasPolicy: false,
    });
    expect(state).toBe("partial");
  });

  it("maps to degraded when optional organization settings warnings are present", () => {
    const state = resolveSlackCalendarOnboardingReadinessState({
      checks: [
        {
          id: "organization.regional_settings",
          title: "Regional settings",
          category: "organization",
          severity: "optional",
          status: "warn",
          reasonCodes: ["organization_settings_timezone_missing"],
          evidence: {},
        },
      ] as never,
      hasSlackConnection: true,
      hasCalendarConnection: true,
      hasPolicy: true,
    });
    expect(state).toBe("degraded");
  });

  it("maps to ready when required checks pass and progress exists", () => {
    const state = resolveSlackCalendarOnboardingReadinessState({
      checks: [
        {
          id: "slack.connection",
          title: "Slack workspace connection",
          category: "slack",
          severity: "required",
          status: "pass",
          reasonCodes: [],
          evidence: {},
        },
        {
          id: "calendar.work_connection",
          title: "Google Calendar work connection",
          category: "calendar",
          severity: "required",
          status: "pass",
          reasonCodes: [],
          evidence: {},
        },
      ] as never,
      hasSlackConnection: true,
      hasCalendarConnection: true,
      hasPolicy: true,
    });
    expect(state).toBe("ready");
  });
});
