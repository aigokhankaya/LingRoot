import { extname } from "node:path";

import {
  pathExists,
  readBinary,
  readJsonFile,
} from "../core/file-system.js";
import type { QaReport, TopicPackage } from "../core/types.js";
import type { QualityImageInput, QualityPackageContext } from "./quality-agent.js";

function contentType(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function imageInput(sceneId: string, uri: string): Promise<QualityImageInput | null> {
  if (/^https:\/\//.test(uri)) return { sceneId, uri, imageUrl: uri };
  if (!(await pathExists(uri))) return null;
  const bytes = await readBinary(uri);
  if (bytes.byteLength > 8_000_000) return null;
  return {
    sceneId,
    uri,
    imageUrl: `data:${contentType(uri)};base64,${bytes.toString("base64")}`,
  };
}

async function optionalJson(path: string): Promise<unknown | null> {
  return (await pathExists(path)) ? readJsonFile(path) : null;
}

export async function loadQualityPackage(
  qualityRunId: string,
  packageDir: string,
): Promise<QualityPackageContext> {
  const topicPackage = await readJsonFile<TopicPackage>(`${packageDir}/topic-package.json`);
  const qaReport = await readJsonFile<QaReport>(`${packageDir}/qa-report.json`);
  const socialMetadata = {
    generatedBatches: {
      youtube: await optionalJson(`${packageDir}/social/youtube-batch.json`),
      instagram: await optionalJson(`${packageDir}/social/instagram-batch.json`),
    },
    campaignTargets: {
      youtube: await optionalJson(`${packageDir}/platforms/youtube.json`),
      instagram: await optionalJson(`${packageDir}/platforms/instagram.json`),
      x: await optionalJson(`${packageDir}/platforms/x.json`),
      tiktok: await optionalJson(`${packageDir}/platforms/tiktok.json`),
    },
  };
  const images = (
    await Promise.all(topicPackage.visualScenes.scenes.map((scene) =>
      scene.imageRef ? imageInput(scene.sceneId, scene.imageRef) : Promise.resolve(null),
    ))
  ).filter((item): item is QualityImageInput => item !== null);
  return { qualityRunId, packageDir, topicPackage, qaReport, socialMetadata, images };
}
