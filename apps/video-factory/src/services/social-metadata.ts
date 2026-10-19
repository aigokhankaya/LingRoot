import type {
  CefrLevel,
  InstagramMetadata,
  ProductionFormat,
  YouTubeMetadata,
} from "../core/types.js";

export interface YouTubeMetadataOverrides {
  title?: string | null;
  description?: string | null;
  tags?: string[];
  categoryId?: string;
  madeForKids?: boolean;
  cta?: string | null;
}

export function buildYouTubeMetadata(
  title: string,
  level: CefrLevel,
  productionFormat: ProductionFormat = "short",
  overrides: YouTubeMetadataOverrides = {},
): YouTubeMetadata {
  const suffix = ` | ${level} English Listening`;
  const baseTitle = overrides.title?.trim() || title;
  const safeTitle = `${baseTitle.slice(0, 100 - suffix.length).trim()}${suffix}`;
  const defaultDescription = [
    "Listen to this topic at your English level.",
    "",
    `This is the ${level} version of:`,
    `“${title}”`,
    "",
    "Other levels will be added to this playlist.",
    "",
    "LingRoot helps you turn topics you like into English listening practice.",
    "",
    "Same topic. Your level.",
    ...(productionFormat === "long"
      ? ["", "Narration in this video is AI-generated."]
      : []),
  ].join("\n");
  const defaultTags = [
    "English listening",
    `${level} English`,
    `CEFR ${level}`,
    "LingRoot",
    "Learn English",
  ];
  const tags = [...new Set([
    ...(overrides.tags ?? []).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean),
    ...defaultTags,
  ])].slice(0, 15);
  return {
    schemaVersion: 1,
    level,
    title: safeTitle,
    description: [
      overrides.description?.trim() || defaultDescription,
      ...(overrides.cta?.trim() ? ["", overrides.cta.trim()] : []),
    ].join("\n"),
    tags,
    categoryId: overrides.categoryId ?? "27",
    privacyStatus: "private",
    madeForKids: overrides.madeForKids ?? false,
    isShort: productionFormat === "short",
  };
}

export function buildInstagramMetadata(
  level: CefrLevel,
): InstagramMetadata {
  const hashtags = [
    "#EnglishListening",
    `#${level}English`,
    "#LearnEnglish",
    "#LingRoot",
  ];
  return {
    schemaVersion: 1,
    level,
    caption: [
      "Same topic. Your level.",
      "",
      `This is the ${level} version. Can you understand it?`,
      "",
      "Turn topics you like into English listening practice with LingRoot.",
      "",
      hashtags.join(" "),
    ].join("\n"),
    hashtags,
    shareToFeed: true,
    coverImageRef: null,
  };
}

export function withYouTubeLevelLinks(
  metadataInput: YouTubeMetadata,
  videoIds: Partial<Record<CefrLevel, string>>,
  topicPlaylistId: string,
): YouTubeMetadata {
  const metadata = { ...metadataInput };
  const links = (Object.entries(videoIds) as Array<[CefrLevel, string]>)
    .filter(([, videoId]) => Boolean(videoId))
    .map(([level, videoId]) => `${level}: https://youtu.be/${videoId}`);
  metadata.description = [
    metadata.description.trim(),
    "",
    "Other levels:",
    ...links,
    "",
    `All levels: https://www.youtube.com/playlist?list=${topicPlaylistId}`,
  ].join("\n");
  return metadata;
}
