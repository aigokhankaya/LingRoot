import AsyncStorage from '@react-native-async-storage/async-storage';

const PERF_LOG_KEY = '@perf_logs';
const SLOW_THRESHOLD_MS = 500;
const AUTO_FLUSH_THRESHOLD = 1;

const pending = new Map<string, { screen: string; start: number }>();
let flushing = false;

let currentScreen: string = 'Unknown';

const perfLog = {
  start(opName: string, screen: string = 'Unknown') {
    pending.set(opName, { screen, start: Date.now() });
  },

  async end(opName: string) {
    const entry = pending.get(opName);
    if (!entry) return;
    pending.delete(opName);

    const duration = Date.now() - entry.start;
    if (duration < SLOW_THRESHOLD_MS) return;

    try {
      const line = `[${new Date().toISOString()}] screen=${entry.screen} op=${opName} duration=${duration}ms`;
      const existing = await AsyncStorage.getItem(PERF_LOG_KEY);
      const logs: string[] = existing ? JSON.parse(existing) : [];
      logs.push(line);
      // Keep last 200 entries to avoid unbounded growth
      if (logs.length > 200) {
        logs.splice(0, logs.length - 200);
      }
      await AsyncStorage.setItem(PERF_LOG_KEY, JSON.stringify(logs));

      // Auto-flush when threshold reached
      if (logs.length >= AUTO_FLUSH_THRESHOLD) {
        perfLog.flush();
      }
    } catch {
      // Silent — logging must never crash the app
    }
  },

  async readLogs(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(PERF_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PERF_LOG_KEY);
    } catch {
      // Silent
    }
  },

  setScreen(name: string) {
    currentScreen = name;
  },

  /**
   * Log a single timestamped mark for instrumentation.
   * Writes to console and persists to AsyncStorage for later flush.
   */
  mark(label: string) {
    const now = new Date().toISOString();
    const line = `[MARK] ${label} at=${now} screen=${currentScreen}`;
    console.log(line);

    // Persist asynchronously — fire and forget
    AsyncStorage.getItem(PERF_LOG_KEY)
      .then(existing => {
        const logs: string[] = existing ? JSON.parse(existing) : [];
        logs.push(line);
        if (logs.length > 200) logs.splice(0, logs.length - 200);
        return AsyncStorage.setItem(PERF_LOG_KEY, JSON.stringify(logs));
      })
      .catch(() => {});
  },

  /**
   * Flush accumulated logs to the backend and clear local storage on success.
   * Uses lazy import to avoid circular dependency with api.ts.
   */
  async flush(): Promise<void> {
    if (flushing) {
      // Another flush is running; schedule a retry so logs are not lost
      setTimeout(() => perfLog.flush(), 2000);
      return;
    }
    flushing = true;
    try {
      const logs = await perfLog.readLogs();
      if (logs.length === 0) return;

      // Lazy import to avoid circular dependency
      const { apiService } = require('../services/api');
      const ok = await apiService.sendPerfLogs(logs);
      if (ok) {
        await perfLog.clearLogs();
        console.log(`[PerfLog] Flushed ${logs.length} log(s) to backend`);
      } else {
        console.warn('[PerfLog] Flush returned false — logs kept locally');
      }
    } catch (e) {
      console.warn('[PerfLog] Flush failed:', e);
    } finally {
      flushing = false;
    }
  },
};

export default perfLog;
