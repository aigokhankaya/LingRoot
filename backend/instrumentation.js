/**
 * OpenTelemetry Instrumentation for LingRoot Backend
 * MUST be loaded before any other module (first require in server.js)
 *
 * Automatically instruments:
 * - Express HTTP requests (traces)
 * - Winston logs (forwarded to SigNoz via OTLP)
 * - Outgoing HTTP/HTTPS calls
 * - Database clients (pg, ioredis, mongoose)
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT - SigNoz OTel Collector URL (e.g. https://otel.lingroot.com)
 *   OTEL_EXPORTER_OTLP_HEADERS  - Auth header (e.g. Authorization=Bearer <token>)
 *   OTEL_SERVICE_NAME            - Service name shown in SigNoz (default: lingroot-backend)
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { WinstonInstrumentation } = require('@opentelemetry/instrumentation-winston');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// Only initialize OTel if endpoint is configured
if (endpoint) {
  const headers = {};
  const rawHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  if (rawHeaders) {
    // Parse "Key=Value,Key2=Value2" format
    rawHeaders.split(',').forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        headers[pair.substring(0, idx).trim()] = pair.substring(idx + 1).trim();
      }
    });
  }

  const commonConfig = { url: undefined, headers };

  const traceExporter = new OTLPTraceExporter({
    ...commonConfig,
    url: `${endpoint}/v1/traces`,
  });

  const logExporter = new OTLPLogExporter({
    ...commonConfig,
    url: `${endpoint}/v1/logs`,
  });

  const metricExporter = new OTLPMetricExporter({
    ...commonConfig,
    url: `${endpoint}/v1/metrics`,
  });

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'lingroot-backend',
    }),
    traceExporter,
    logRecordProcessor: logExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60_000, // Export metrics every 60s
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation to reduce noise
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
      new WinstonInstrumentation(),
    ],
  });

  sdk.start();

  // Graceful shutdown
  const shutdown = () => {
    sdk.shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Use console.log here intentionally - logger is not yet initialized
  // eslint-disable-next-line no-console
  console.log(`[OTel] Instrumentation active → ${endpoint}`);
} else {
  // eslint-disable-next-line no-console
  console.log('[OTel] OTEL_EXPORTER_OTLP_ENDPOINT not set, instrumentation disabled');
}
