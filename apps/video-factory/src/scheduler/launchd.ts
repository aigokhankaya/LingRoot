import { resolvePath } from "../core/file-system.js";

export const LAUNCHD_LABEL = "com.lingroot.video-factory.daily";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildLaunchdPlist(hour = 9, minute = 0): string {
  const projectRoot = resolvePath(".");
  const nodePath = process.execPath;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(nodePath)}</string>
    <string>--import</string>
    <string>tsx</string>
    <string>${escapeXml(`${projectRoot}/src/cli/daily.ts`)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(projectRoot)}</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${hour}</integer>
    <key>Minute</key>
    <integer>${minute}</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(`${projectRoot}/logs/launchd.out.log`)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(`${projectRoot}/logs/launchd.err.log`)}</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
`;
}

export function parseSchedulerTime(value: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`Invalid scheduler time: ${value}`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}
