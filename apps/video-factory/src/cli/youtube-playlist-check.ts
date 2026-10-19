import { createYouTubeClient } from "../adapters/index.js";
import {
  getConfig,
  getLogger,
  makeRunId,
  writeJson,
} from "../core/index.js";
import { parseArgs, parseLevels } from "./args.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const videoId =
    typeof args["video-id"] === "string" ? args["video-id"].trim() : "";
  const topicTitle =
    typeof args["topic-title"] === "string"
      ? args["topic-title"].trim()
      : "";
  const levels = parseLevels(args.levels);
  if (!videoId || !topicTitle || !levels?.length) {
    throw new Error(
      "--video-id, --topic-title and --levels are required.",
    );
  }
  if (levels.length !== 1) {
    throw new Error(
      "youtube:playlist-check accepts exactly one CEFR level per video.",
    );
  }

  const client = createYouTubeClient(getConfig());
  const playlistDefinitions = [
    {
      kind: "topic" as const,
      title: `${topicTitle} | All Levels`,
      description:
        `LingRoot English listening videos about ${topicTitle}, ` +
        "organized across CEFR levels.",
    },
    ...levels.map((level) => ({
      kind: "level" as const,
      level,
      title: `${level} English Listening`,
      description:
        `LingRoot ${level} English listening practice videos.`,
    })),
  ];

  const playlists = [];
  for (const definition of playlistDefinitions) {
    const playlist = await client.ensurePlaylist(
      definition.title,
      definition.description,
      "private",
    );
    const item = await client.addVideoToPlaylist(
      playlist.playlistId,
      videoId,
    );
    playlists.push({
      ...definition,
      playlistId: playlist.playlistId,
      privacyStatus: playlist.privacyStatus,
      playlistCreated: playlist.created,
      videoInserted: item.inserted,
      playlistItemId: item.playlistItemId,
    });
  }

  const runId = makeRunId(`youtube-playlists-${videoId}`);
  const result = {
    runId,
    videoId,
    topicTitle,
    levels,
    playlists,
  };
  await writeJson(`outputs/youtube-playlist-checks/${runId}.json`, result);
  getLogger("youtube-playlist-check").info(
    "YouTube private playlist check passed.",
    {
      videoId,
      playlistCount: playlists.length,
      createdCount: playlists.filter((item) => item.playlistCreated).length,
      insertedCount: playlists.filter((item) => item.videoInserted).length,
    },
  );
}

main().catch((error: unknown) => {
  getLogger("youtube-playlist-check").error(
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
