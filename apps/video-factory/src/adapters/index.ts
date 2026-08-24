/**
 * Barrel for concrete adapters. Phase 2: mock/local implementations only —
 * no external API calls. Real adapters will be added behind the same service
 * interfaces in a later phase.
 */

export * from "./mock-lingroot-core-client.js";
export * from "./mock-image-client.js";
export * from "./mock-render-client.js";
export * from "./local-storage-client.js";
export * from "./http-lingroot-core-client.js";
export * from "./lingroot-core-client-factory.js";
export * from "./openai-image-client.js";
export * from "./image-client-factory.js";
export * from "./supabase-storage-client.js";
export * from "./storage-client-factory.js";
export * from "./json2video-render-client.js";
export * from "./ffmpeg-render-client.js";
export * from "./render-client-factory.js";
export * from "./youtube-private-upload-client.js";
export * from "./youtube-client-factory.js";
export * from "./mock-topic-source-client.js";
export * from "./http-topic-source-client.js";
export * from "./topic-source-client-factory.js";
