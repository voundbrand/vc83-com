import { describe, expect, it } from "vitest";
import {
  generateWebchatDeploymentSnippets,
  parseWebchatSnippetRuntimeSeedFromDataset,
  parseWebchatSnippetRuntimeSeedFromQuery,
  type WebchatSnippetBootstrapContract,
} from "@/components/chat-widget/deploymentSnippets";
import { normalizeChannelBindingContract } from "../../../convex/webchatCustomizationContract";

describe("webchat deployment snippets", () => {
  it("generates deterministic script/react/iframe snippets from bootstrap contract", () => {
    const contract: WebchatSnippetBootstrapContract = {
      contractVersion: "2026-02-18.webchat-bootstrap.v1",
      resolvedAt: 1730000000000,
      channel: "webchat",
      organizationId: "org_123",
      agentId: "agent_abc",
      config: {
        agentId: "agent_abc",
        agentName: "Sales Agent",
        welcomeMessage: "Welcome to support",
        brandColor: "#1d4ed8",
        position: "bottom-left",
        collectContactInfo: false,
        bubbleText: "Help",
        offlineMessage: "We are currently offline",
        language: "en",
      },
      deploymentDefaults: {
        snippetMode: "script",
        iframe: {
          width: 420,
          height: 620,
          offsetPx: 24,
          position: "bottom-left",
        },
      },
    };

    const first = generateWebchatDeploymentSnippets(contract, {
      appBaseUrl: "https://app.l4yercak3.com",
    });
    const second = generateWebchatDeploymentSnippets(contract, {
      appBaseUrl: "https://app.l4yercak3.com",
    });

    expect(first).toEqual(second);
    expect(first.script).toContain('data-agent-id="agent_abc"');
    expect(first.script).toContain('data-collect-contact-info="false"');
    expect(first.react).toContain('collectContactInfo: false,');
    expect(first.iframe).toContain("collectContactInfo=false");
    expect(first.runtimeSeed.customization.position).toBe("bottom-left");
  });

  it("parses runtime seed values from both dataset and iframe query", () => {
    const datasetSeed = parseWebchatSnippetRuntimeSeedFromDataset({
      agentId: "dataset_agent",
      apiUrl: "https://api.example.com/api/v1",
      channel: "webchat",
      welcomeMessage: "  Hello there  ",
      brandColor: "#ABC",
      position: "bottom-left",
      collectContactInfo: "0",
      bubbleText: " Talk ",
      offlineMessage: "  Try later  ",
      language: "EN_us",
    });

    expect(datasetSeed).toEqual({
      agentId: "dataset_agent",
      apiUrl: "https://api.example.com/api/v1",
      channel: "webchat",
      customization: {
        welcomeMessage: "Hello there",
        brandColor: "#aabbcc",
        position: "bottom-left",
        collectContactInfo: false,
        bubbleText: "Talk",
        offlineMessage: "Try later",
        language: "en-US",
      },
    });

    const querySeed = parseWebchatSnippetRuntimeSeedFromQuery(
      "?agentId=query_agent&apiUrl=https%3A%2F%2Fapi.example.com%2Fapi%2Fv1&channel=native_guest&brandColor=%2300FF00&collectContactInfo=true&language=de"
    );

    expect(querySeed.agentId).toBe("query_agent");
    expect(querySeed.channel).toBe("native_guest");
    expect(querySeed.customization?.brandColor).toBe("#00ff00");
    expect(querySeed.customization?.collectContactInfo).toBe(true);
    expect(querySeed.customization?.language).toBe("de");
  });

  it("drops invalid channel/customization seed values from dataset and query payloads", () => {
    const invalidDatasetSeed = parseWebchatSnippetRuntimeSeedFromDataset({
      agentId: "dataset_agent",
      channel: "sms",
      collectContactInfo: "sometimes",
      brandColor: "invalid",
      position: "top-right",
      bubbleText: "   ",
      offlineMessage: "",
      language: "___",
    });

    expect(invalidDatasetSeed.agentId).toBe("dataset_agent");
    expect(invalidDatasetSeed.channel).toBeUndefined();
    expect(invalidDatasetSeed.customization).toEqual({});

    const invalidQuerySeed = parseWebchatSnippetRuntimeSeedFromQuery(
      "?agentId=query_agent&channel=sms&collectContactInfo=maybe&brandColor=not-a-color&position=top-right"
    );

    expect(invalidQuerySeed.agentId).toBe("query_agent");
    expect(invalidQuerySeed.channel).toBeUndefined();
    expect(invalidQuerySeed.customization).toEqual({});
  });
});

describe("webchat customization contract normalization", () => {
  it("normalizes webchat channel bindings to the backend contract", () => {
    const normalized = normalizeChannelBindingContract({
      channel: "webchat",
      enabled: true,
      welcomeMessage: "  Welcome   customer  ",
      brandColor: "not-a-color",
      position: "top-left" as "bottom-left",
      collectContactInfo: "yes" as unknown as boolean,
      bubbleText: "   ",
      offlineMessage: "",
      language: "EN_us",
    });

    expect(normalized.channel).toBe("webchat");
    expect(normalized.enabled).toBe(true);
    expect(normalized.welcomeMessage).toBe("Welcome customer");
    expect(normalized.brandColor).toBe("#7c3aed");
    expect(normalized.position).toBe("bottom-right");
    expect(normalized.collectContactInfo).toBe(true);
    expect(normalized.bubbleText).toBe("Chat");
    expect(normalized.offlineMessage).toContain("nicht erreichbar");
    expect(normalized.language).toBe("en-US");
  });

  it("keeps non-webchat channels untouched apart from basic channel/enabled normalization", () => {
    const normalized = normalizeChannelBindingContract({
      channel: " sms ",
      enabled: false,
      bubbleText: "Ignored",
    });

    expect(normalized.channel).toBe("sms");
    expect(normalized.enabled).toBe(false);
    expect(normalized.bubbleText).toBe("Ignored");
    expect(normalized.welcomeMessage).toBeUndefined();
  });
});
