import { describe, expect, it, vi } from "vitest";

import { HttpTopicSourceClient } from "../src/adapters/http-topic-source-client.js";

describe("HttpTopicSourceClient", () => {
  it("requests and validates a versioned topic brief without exposing its API key", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ authorization: "Bearer topic-secret" });
      expect(JSON.parse(String(init?.body))).toEqual({
        schema_version: 1,
        topic: "Memory habits",
        scene_count: 2,
        language: "en",
      });
      return new Response(
        JSON.stringify({
          schemaVersion: 1,
          topicId: "memory-habits",
          title: "Memory Habits",
          coreMessage: "Habits make recall easier.",
          category: "education",
          language: "en",
          visualOutline: [
            {
              sceneId: "scene-1",
              order: 0,
              narrativeBeat: "A learner creates a recall habit.",
              altText: "A learner creating a recall habit.",
            },
            {
              sceneId: "scene-2",
              order: 1,
              narrativeBeat: "The learner repeats the habit.",
              altText: "A learner repeating a recall habit.",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const client = new HttpTopicSourceClient({
      baseUrl: "https://topic.example.com",
      apiKey: "topic-secret",
      fetchImpl,
    });

    const result = await client.getTopicBrief({
      topic: "Memory habits",
      sceneCount: 2,
    });

    expect(result.topicId).toBe("memory-habits");
    expect(result.visualOutline.map((scene) => scene.sceneId)).toEqual([
      "scene-1",
      "scene-2",
    ]);
  });

  it("rejects non-contiguous visual outlines", async () => {
    const client = new HttpTopicSourceClient({
      baseUrl: "https://topic.example.com",
      apiKey: "topic-secret",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            schemaVersion: 1,
            topicId: "memory-habits",
            title: "Memory Habits",
            coreMessage: "Habits make recall easier.",
            category: "education",
            language: "en",
            visualOutline: [
              {
                sceneId: "scene-1",
                order: 1,
                narrativeBeat: "A learner creates a recall habit.",
                altText: "A learner creating a recall habit.",
              },
            ],
          }),
          { status: 200 },
        ),
    });

    await expect(
      client.getTopicBrief({ topic: "Memory habits", sceneCount: 1 }),
    ).rejects.toThrow("unique contiguous scene order");
  });
});
