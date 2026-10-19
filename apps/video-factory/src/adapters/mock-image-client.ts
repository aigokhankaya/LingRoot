/**
 * Deterministic no-network image generator for dry-run and tests.
 */

import { assertValid } from "../core/validators.js";
import type {
  ImageGenerationMetadata,
  ImageGenerationRequest,
} from "../core/types.js";
import type {
  GeneratedImage,
  ImageClient,
} from "../services/image-client.js";

// Valid 1×1 PNG. Dimensions are intentionally irrelevant to the mock boundary;
// requested output dimensions remain recorded in provenance metadata.
const MOCK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

export class MockImageClient implements ImageClient {
  async generateImage(request: ImageGenerationRequest): Promise<GeneratedImage> {
    assertValid("image-generation-request", request);
    const metadata: ImageGenerationMetadata = {
      schemaVersion: 1,
      topicId: request.topicId,
      sceneId: request.sceneId,
      provider: "mock",
      model: "mock-image-v1",
      requestId: `mock-${request.topicId}-${request.sceneId}`,
      createdAt: "2026-06-21T00:00:00.000Z",
      contentType: "image/png",
      extension: "png",
      bytes: MOCK_PNG.byteLength,
      size: request.size,
      quality: request.quality,
      moderation: "auto",
    };
    assertValid("image-generation-result", metadata);
    return { bytes: MOCK_PNG, metadata };
  }
}
