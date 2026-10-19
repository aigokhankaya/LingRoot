import { relative } from "node:path";

import { resolvePath, writeText } from "../core/file-system.js";
import type { QaReport, TopicPackage } from "../core/types.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function relativeAsset(reviewDir: string, value: string): string {
  return relative(resolvePath(reviewDir), resolvePath(value)).replaceAll("\\", "/");
}

export async function writeReviewPage(input: {
  packageDir: string;
  topicPackage: TopicPackage;
  qaReport: QaReport;
}): Promise<string> {
  const reviewDir = `${input.packageDir}/review`;
  const images = input.topicPackage.visualScenes.scenes
    .map((scene) => {
      const source = scene.imageRef
        ? relativeAsset(reviewDir, scene.imageRef)
        : "";
      return `<figure><img src="${escapeHtml(source)}" alt="${escapeHtml(scene.altText ?? scene.sceneId)}"><figcaption>${escapeHtml(scene.sceneId)}: ${escapeHtml(scene.narrativeBeat ?? scene.altText ?? "")}</figcaption></figure>`;
    })
    .join("\n");
  const videos = input.topicPackage.levels
    .map((level) => {
      const source = `../levels/${level.level}/video.mp4`;
      return `<section><h2>${escapeHtml(level.level)} English Listening</h2><video controls preload="metadata" src="${source}"></video><pre>${escapeHtml(level.script.lines.map((line) => line.text).join("\n"))}</pre></section>`;
    })
    .join("\n");
  const errors = input.qaReport.checks
    .filter((check) => !check.passed)
    .map((check) => `<li>${escapeHtml(check.level ? `${check.level}: ` : "")}${escapeHtml(check.message)}</li>`)
    .join("\n");
  return writeText(
    `${reviewDir}/index.html`,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(input.topicPackage.title)} review</title><style>body{font-family:system-ui,sans-serif;margin:24px;max-width:1200px}figure{display:inline-block;width:220px;vertical-align:top;margin:8px}img,video{width:100%;height:auto;background:#111}figcaption,pre{white-space:pre-wrap;font-size:13px}section{margin:32px 0;border-top:1px solid #ccc}</style></head><body><h1>${escapeHtml(input.topicPackage.title)}</h1><p>QA: ${input.qaReport.passed ? "passed" : "failed"} (${Math.round((input.qaReport.score ?? 0) * 100)}%)</p><h2>Shared visuals</h2><div>${images}</div><h2>QA findings</h2><ul>${errors || "<li>No failing checks.</li>"}</ul>${videos}</body></html>\n`,
  );
}
