/**
 * Mock {@link LingRootCoreClient}. Returns a valid level-package per requested
 * level, derived from the shared manifest's sceneIds — so script/subtitle align
 * to the same scenes every level uses. No network.
 *
 * This adapter is intentionally thin: when the API-vs-shared-package decision is
 * made, ONLY this file is replaced. The pipeline depends on the interface.
 */

import type {
  GetLevelPackageParams,
  LingRootCoreClient,
} from "../services/lingroot-core-client.js";
import type { LevelPackage } from "../core/types.js";
import { buildLevelPackage } from "../testing/fixtures.js";

export class MockLingRootCoreClient implements LingRootCoreClient {
  async getLevelPackage(params: GetLevelPackageParams): Promise<LevelPackage> {
    const pkg = buildLevelPackage(params.topicId, params.level, params.visualScenes);
    // Reflect the requested target duration in the mock audio.
    pkg.audio.durationSeconds = params.durationSeconds;
    if (params.language) pkg.metadata.language = params.language;
    return pkg;
  }
}
