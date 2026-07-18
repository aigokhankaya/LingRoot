import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { FfmpegRenderClient } from "../src/adapters/ffmpeg-render-client.js";
import type { RenderPayload } from "../src/core/types.js";

async function fixture(): Promise<{
  root: string;
  payload: RenderPayload;
}> {
  const root = await mkdtemp(join(tmpdir(), "lingroot-ffmpeg-"));
  const imageOne = join(root, "scene-1.png");
  const imageTwo = join(root, "scene-2.png");
  const audio = join(root, "audio.mp3");
  const subtitle = join(root, "subtitles.srt");
  const output = join(root, "video.mp4");
  await Promise.all([
    writeFile(imageOne, "image-one"),
    writeFile(imageTwo, "image-two"),
    writeFile(audio, "audio"),
    writeFile(subtitle, "1\n00:00:00,000 --> 00:00:01,000\nHello\n"),
  ]);
  return {
    root,
    payload: {
      schemaVersion: 1,
      topicId: "local-render",
      level: "A1",
      visualScenes: {
        schemaVersion: 1,
        topicId: "local-render",
        scenes: [
          {
            sceneId: "scene-1",
            order: 0,
            imagePrompt: "one",
            imageRef: imageOne,
            durationSeconds: 1,
          },
          {
            sceneId: "scene-2",
            order: 1,
            imagePrompt: "two",
            imageRef: imageTwo,
            durationSeconds: 1,
          },
        ],
      },
      audio: { ref: audio, durationSeconds: 2 },
      subtitle: { ref: subtitle, format: "srt" },
      timeline: {
        durationSeconds: 2,
        scenes: [
          { sceneId: "scene-1", startMs: 0, endMs: 1_000 },
          { sceneId: "scene-2", startMs: 1_000, endMs: 2_000 },
        ],
      },
      levelBadge: { level: "A1", label: "A1 English" },
      videoFormat: { width: 1080, height: 1920, fps: 30, durationSeconds: 2 },
      outputPath: output,
    },
  };
}

describe("FfmpegRenderClient", () => {
  it("builds a local image, audio and subtitle render command", async () => {
    const { payload } = await fixture();
    let command = "";
    let args: string[] = [];
    const client = new FfmpegRenderClient({
      execute: async (nextCommand, nextArgs) => {
        command = nextCommand;
        args = nextArgs;
        await writeFile(nextArgs.at(-1)!, Buffer.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]));
      },
      now: () => 1_000,
    });

    const result = await client.render(payload);

    expect(command).toBe("ffmpeg");
    expect(args).toContain("-filter_complex");
    expect(args).toContain("libx264");
    expect(args).toContain("aac");
    const filter = args[args.indexOf("-filter_complex") + 1]!;
    expect(filter).toContain("subtitles=filename=");
    expect(filter).toContain("drawtext=text='A1 English'");
    expect(result).toMatchObject({
      provider: "ffmpeg",
      local_video_path: payload.outputPath,
      resolution: "1080x1920",
    });
  });

  it("rejects remote assets instead of sending them to the local renderer", async () => {
    const { payload } = await fixture();
    payload.visualScenes.scenes[0]!.imageRef = "https://example.test/image.png";
    const client = new FfmpegRenderClient({ execute: async () => undefined });

    await expect(client.render(payload)).rejects.toThrow(
      "scene-1 image must be a local file path for FFmpeg",
    );
  });

  it("renders a landscape long-form payload with subtle image motion", async () => {
    const { payload } = await fixture();
    payload.videoFormat = { width: 1920, height: 1080, fps: 30, durationSeconds: 2 };
    let args: string[] = [];
    const client = new FfmpegRenderClient({
      execute: async (_command, nextArgs) => {
        args = nextArgs;
        await writeFile(nextArgs.at(-1)!, Buffer.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70]));
      },
    });

    const result = await client.render(payload);

    const filter = args[args.indexOf("-filter_complex") + 1]!;
    expect(filter).toContain("crop=1920:1080");
    expect(filter).toContain("min(t/1.000\\,1)");
    expect(filter).toContain("FontSize=24");
    expect(result.resolution).toBe("1920x1080");
  });
});
