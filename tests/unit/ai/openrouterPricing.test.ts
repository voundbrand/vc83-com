import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterClient } from "../../../convex/ai/openrouter";

describe("OpenRouter pricing fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("warns and uses fallback rates when no resolved model pricing is provided", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = new OpenRouterClient("test-api-key");

    const cost = client.calculateCost(
      {
        prompt_tokens: 1000,
        completion_tokens: 1000,
      },
      "unknown/model"
    );

    expect(cost).toBeCloseTo(0.018, 8);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain(
      "Missing resolved pricing for model unknown/model"
    );
  });

  it("uses provided pricing without emitting fallback warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = new OpenRouterClient("test-api-key");

    const cost = client.calculateCost(
      {
        prompt_tokens: 1000,
        completion_tokens: 1000,
      },
      "openai/gpt-4o",
      {
        promptPerMToken: 2,
        completionPerMToken: 8,
      }
    );

    expect(cost).toBeCloseTo(0.01, 8);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("passes sanitized extra request fields into provider payload", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 4,
          total_tokens: 12,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new OpenRouterClient("test-api-key", {
      providerId: "openrouter",
      baseUrl: "https://mock.openrouter.local/v1",
    });

    await client.chatCompletion({
      model: "openai/gpt-5",
      messages: [
        {
          role: "user",
          content: "Hello",
        },
      ],
      temperature: 0.65,
      max_tokens: 1500,
      extraBody: {
        reasoning: {
          effort: "high",
        },
        model: "do-not-override",
      },
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body));

    expect(body.model).toBe("openai/gpt-5");
    expect(body.temperature).toBe(0.65);
    expect(body.max_tokens).toBe(1500);
    expect(body.reasoning).toEqual({
      effort: "high",
    });
  });

  it("passes sanitized extra request fields into anthropic payload", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: "ok",
          },
        ],
        usage: {
          input_tokens: 11,
          output_tokens: 7,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new OpenRouterClient("test-api-key", {
      providerId: "anthropic",
      baseUrl: "https://mock.anthropic.local/v1",
    });

    await client.chatCompletion({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        {
          role: "user",
          content: "List my forms",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "list_forms",
            description: "List forms",
            parameters: {
              type: "object",
              properties: {},
            },
          },
        },
      ],
      max_tokens: 512,
      extraBody: {
        tool_choice: {
          type: "tool",
          name: "list_forms",
        },
        max_tokens: 1,
      },
    });

    const requestUrl = String(fetchSpy.mock.calls[0]?.[0] ?? "");
    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(requestInit.body));

    expect(requestUrl).toContain("/messages");
    expect(body.model).toBe("claude-sonnet-4.5");
    expect(body.max_tokens).toBe(512);
    expect(body.tool_choice).toEqual({
      type: "tool",
      name: "list_forms",
    });
  });
});
