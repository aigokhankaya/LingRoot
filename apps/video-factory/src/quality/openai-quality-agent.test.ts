import { describe, expect, it, vi } from "vitest";
import type { QualityPackageContext } from "./quality-agent.js";
import { OpenAiQualityAgent } from "./openai-quality-agent.js";

const context = {
  qualityRunId: "quality-1",
  packageDir: "/tmp/package",
  topicPackage: {
    topicId: "topic-1", slug: "topic", title: "A topic",
    visualScenes: { topicId: "topic-1", scenes: [] }, levels: [],
  },
  qaReport: { topicId: "topic-1", generatedAt: new Date().toISOString(), passed: true, checks: [] },
  socialMetadata: {}, images: [],
} as QualityPackageContext;

describe("OpenAiQualityAgent", () => {
  it("requests and validates a strict structured assessment", async () => {
    const modelOutput = {
      score: 88, confidence: 0.86, summary: "The package is suitable.",
      dimensionScores: [{ name: "content", score: 88 }, { name: "cefr", score: 90 }],
      findings: [],
    };
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(modelOutput) }] }],
      usage: { input_tokens: 100, output_tokens: 40, total_tokens: 140 },
    }), { status: 200 }));
    const agent = new OpenAiQualityAgent({
      type: "content", apiKey: "secret", baseUrl: "https://api.openai.test/v1", model: "test-model",
      timeoutMs: 1000, maxAttempts: 1, imageDetail: "low", fetchImpl,
    });
    const result = await agent.evaluate(context);
    expect(result.score).toBe(88);
    expect(result.dimensionScores.cefr).toBe(90);
    expect(result.usage.totalTokens).toBe(140);
    const request = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
    expect(request.text.format.type).toBe("json_schema");
    expect(request.text.format.strict).toBe(true);
    expect(request.store).toBe(false);
    expect(request.max_output_tokens).toBe(8000);
  });

  it("maps the av_sync agent type to the versioned av-sync prompt file", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
        score: 90,
        confidence: 0.8,
        summary: "Audio and subtitle timing are suitable.",
        dimensionScores: [{ name: "av_sync", score: 90 }],
        findings: [],
      }) }] }],
      usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 },
    }), { status: 200 }));
    const agent = new OpenAiQualityAgent({
      type: "av_sync", apiKey: "secret", baseUrl: "https://api.openai.test/v1", model: "test-model",
      timeoutMs: 1000, maxAttempts: 1, imageDetail: "low", fetchImpl,
    });

    const result = await agent.evaluate(context);

    expect(result.promptVersion).toBe("av-sync-v1");
    expect(result.agentType).toBe("av_sync");
  });

  it("normalizes a consistently unit-scaled assessment to percentages", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
        score: 0.93,
        confidence: 0.8,
        summary: "The visuals are strong.",
        dimensionScores: [{ name: "relevance", score: 0.98 }, { name: "coherence", score: 0.88 }],
        findings: [],
      }) }] }],
    }), { status: 200 }));
    const agent = new OpenAiQualityAgent({
      type: "visual", apiKey: "secret", baseUrl: "https://api.openai.test/v1", model: "test-model",
      timeoutMs: 1000, maxAttempts: 1, imageDetail: "low", fetchImpl,
    });

    const result = await agent.evaluate(context);

    expect(result.score).toBe(93);
    expect(result.dimensionScores).toEqual({ relevance: 98, coherence: 88 });
  });

  it("retries a transient invalid structured response", async () => {
    const valid = {
      score: 87,
      confidence: 0.81,
      summary: "The content is suitable after retry.",
      dimensionScores: [{ name: "content", score: 87 }],
      findings: [],
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: [{ type: "message", content: [{ type: "output_text", text: "{invalid" }] }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(valid) }] }],
      }), { status: 200 }));
    const agent = new OpenAiQualityAgent({
      type: "content", apiKey: "secret", baseUrl: "https://api.openai.test/v1", model: "test-model",
      timeoutMs: 1000, maxAttempts: 2, imageDetail: "low", fetchImpl, sleep: vi.fn(),
    });

    const result = await agent.evaluate(context);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.score).toBe(87);
  });
});
