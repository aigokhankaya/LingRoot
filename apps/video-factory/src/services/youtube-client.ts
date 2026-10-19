import type { YouTubeMetadata, YouTubePrivacy } from "../core/types.js";

export interface YouTubeUploadResult {
  provider: "youtube";
  videoId: string;
  privacyStatus: YouTubePrivacy;
  title: string;
}

export interface YouTubePlaylistResult {
  playlistId: string;
  title: string;
  privacyStatus: YouTubePrivacy;
  created: boolean;
}

export interface YouTubePlaylistItemResult {
  playlistId: string;
  videoId: string;
  inserted: boolean;
  playlistItemId?: string;
}

export interface YouTubeClient {
  uploadPrivateVideo(
    videoPath: string,
    metadata: YouTubeMetadata,
  ): Promise<YouTubeUploadResult>;
  updateVideoMetadata(
    videoId: string,
    metadata: YouTubeMetadata,
  ): Promise<YouTubeUploadResult>;
  ensurePlaylist(
    title: string,
    description: string,
    privacyStatus: YouTubePrivacy,
  ): Promise<YouTubePlaylistResult>;
  setPlaylistPrivacy(
    playlistId: string,
    privacyStatus: YouTubePrivacy,
  ): Promise<YouTubePlaylistResult>;
  addVideoToPlaylist(
    playlistId: string,
    videoId: string,
  ): Promise<YouTubePlaylistItemResult>;
}
