/**
 * Provider-neutral image generation boundary.
 *
 * Scene planning is deliberately separate. The client receives exactly one
 * shared topic-level scene request and returns binary image bytes plus
 * non-secret provenance metadata.
 */

import type {
  ImageGenerationMetadata,
  ImageGenerationRequest,
} from "../core/types.js";

export interface GeneratedImage {
  bytes: Uint8Array;
  metadata: ImageGenerationMetadata;
}

export interface ImageClient {
  generateImage(request: ImageGenerationRequest): Promise<GeneratedImage>;
}
