import { afterEach, describe, expect, it } from "vitest";

import { getConfig, resetConfigCache } from "../src/core/config.js";

const originalPublishMode = process.env.PUBLISH_MODE;
const originalAutoPublic = process.env.AUTO_PUBLIC_PUBLISH;
const originalImageSize = process.env.OPENAI_IMAGE_SIZE;
const originalModeration = process.env.OPENAI_IMAGE_MODERATION;
const originalRenderQuality = process.env.JSON2VIDEO_QUALITY;
const originalRenderProvider = process.env.RENDER_PROVIDER;
const originalFfmpegCrf = process.env.FFMPEG_CRF;

afterEach(() => {
  if (originalPublishMode === undefined) delete process.env.PUBLISH_MODE;
  else process.env.PUBLISH_MODE = originalPublishMode;
  if (originalAutoPublic === undefined) delete process.env.AUTO_PUBLIC_PUBLISH;
  else process.env.AUTO_PUBLIC_PUBLISH = originalAutoPublic;
  if (originalImageSize === undefined) delete process.env.OPENAI_IMAGE_SIZE;
  else process.env.OPENAI_IMAGE_SIZE = originalImageSize;
  if (originalModeration === undefined) {
    delete process.env.OPENAI_IMAGE_MODERATION;
  } else process.env.OPENAI_IMAGE_MODERATION = originalModeration;
  if (originalRenderQuality === undefined) {
    delete process.env.JSON2VIDEO_QUALITY;
  } else process.env.JSON2VIDEO_QUALITY = originalRenderQuality;
  if (originalRenderProvider === undefined) delete process.env.RENDER_PROVIDER;
  else process.env.RENDER_PROVIDER = originalRenderProvider;
  if (originalFfmpegCrf === undefined) delete process.env.FFMPEG_CRF;
  else process.env.FFMPEG_CRF = originalFfmpegCrf;
  resetConfigCache();
});

describe("publishing safety", () => {
  it("defaults to review mode", () => {
    delete process.env.PUBLISH_MODE;
    delete process.env.AUTO_PUBLIC_PUBLISH;
    resetConfigCache();

    expect(getConfig().publishMode).toBe("review");
  });

  it("rejects auto_public without the second explicit gate", () => {
    process.env.PUBLISH_MODE = "auto_public";
    process.env.AUTO_PUBLIC_PUBLISH = "false";
    resetConfigCache();

    expect(() => getConfig()).toThrow(
      "PUBLISH_MODE=auto_public requires AUTO_PUBLIC_PUBLISH=true",
    );
  });

  it("accepts auto_public only when both gates are enabled", () => {
    process.env.PUBLISH_MODE = "auto_public";
    process.env.AUTO_PUBLIC_PUBLISH = "true";
    resetConfigCache();

    expect(getConfig().publishMode).toBe("auto_public");
    expect(getConfig().autoPublicPublish).toBe(true);
  });

  it("rejects image sizes outside GPT Image constraints", () => {
    process.env.OPENAI_IMAGE_SIZE = "1000x1500";
    resetConfigCache();

    expect(() => getConfig()).toThrow("violates GPT Image size constraints");
  });

  it("locks image moderation to auto", () => {
    process.env.OPENAI_IMAGE_MODERATION = "low";
    resetConfigCache();

    expect(() => getConfig()).toThrow(
      "OPENAI_IMAGE_MODERATION must remain auto",
    );
  });

  it("rejects unknown JSON2Video quality values", () => {
    process.env.JSON2VIDEO_QUALITY = "ultra";
    resetConfigCache();

    expect(() => getConfig()).toThrow(
      "JSON2VIDEO_QUALITY must be low, medium or high",
    );
  });

  it("accepts local FFmpeg as the primary renderer", () => {
    process.env.RENDER_PROVIDER = "ffmpeg";
    resetConfigCache();

    expect(getConfig().render.provider).toBe("ffmpeg");
  });

  it("rejects FFmpeg CRF outside its supported range", () => {
    process.env.FFMPEG_CRF = "52";
    resetConfigCache();

    expect(() => getConfig()).toThrow("FFMPEG_CRF must be an integer between 0 and 51");
  });
});
