import { getConfig, readJsonFile } from "../core/index.js";
import type { CefrLevel, PublishMode } from "../core/types.js";
import { getLogger } from "../core/logger.js";
import { runTopicProduction } from "../workflows/index.js";

interface CalendarEntry {
  date: string;
  topicId?: string;
  topic?: string;
  title?: string;
  category?: string;
  levels?: CefrLevel[];
  publishMode?: PublishMode;
  status?: string;
}

interface Calendar {
  entries: CalendarEntry[];
}

function localDate(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main(): Promise<void> {
  const config = getConfig();
  const calendar = await readJsonFile<Calendar>(
    "config/content-calendar.example.json",
  );
  const today = localDate(config.scheduler.timezone);
  const entry = calendar.entries.find(
    (item) => item.date === today && item.status === "approved",
  );
  const topic = entry?.topic ?? entry?.title;
  if (!entry || !topic) {
    throw new Error(
      `No approved content-calendar entry exists for ${today}; daily production was not started.`,
    );
  }

  const result = await runTopicProduction({
    topic,
    topicId: entry.topicId,
    levels: entry?.levels,
  });
  getLogger("daily").info("Daily production completed.", {
    date: today,
    packageDir: result.packageDir,
    stage: result.runState.stage,
  });
}

main().catch((error: unknown) => {
  getLogger("daily").error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
