import type { TopicBrief } from "../core/types.js";

export interface GetTopicBriefParams {
  topic?: string;
  topicId?: string;
  sceneCount: number;
  language?: string;
}

/** Source of approved topic intent and its level-independent visual narrative. */
export interface TopicSourceClient {
  getTopicBrief(params: GetTopicBriefParams): Promise<TopicBrief>;
}
