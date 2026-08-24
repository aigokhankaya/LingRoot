import { slugify } from "../core/slugify.js";
import type { TopicBrief } from "../core/types.js";
import type {
  GetTopicBriefParams,
  TopicSourceClient,
} from "../services/topic-source-client.js";

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/[?.!]+$/, "")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export class MockTopicSourceClient implements TopicSourceClient {
  async getTopicBrief(params: GetTopicBriefParams): Promise<TopicBrief> {
    const source =
      params.topic?.trim() ||
      params.topicId?.trim() ||
      "Why do people forget new words?";
    const topicId = slugify(params.topicId ?? source).slice(0, 80) || "topic";
    const title = titleCase(source);
    const sceneCount = Math.max(1, params.sceneCount);
    return {
      schemaVersion: 1,
      topicId,
      title,
      coreMessage: `${title} explained through practical, memorable examples.`,
      category: "education",
      language: params.language ?? "en",
      visualOutline: Array.from({ length: sceneCount }, (_, order) => ({
        sceneId: `scene-${order + 1}`,
        order,
        narrativeBeat:
          `A clear visual moment ${order + 1} that advances the explanation of ${title}.`,
        altText: `Scene ${order + 1} illustrating ${title}.`,
      })),
    };
  }
}
