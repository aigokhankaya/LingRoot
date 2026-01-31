/**
 * OpenTelemetry Browser SDK initialization for LingRoot Frontend
 *
 * Instruments:
 * - fetch() calls (API requests → traces)
 * - Document load (page performance → traces)
 *
 * Traces are exported to SigNoz via OTLP/HTTP.
 * Call initOtel() once on app mount (client-side only).
 *
 * Environment variables (Next.js public):
 *   NEXT_PUBLIC_OTEL_ENDPOINT - SigNoz OTel Collector URL (e.g. https://otel.lingroot.com)
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode } from '@opentelemetry/api';

let initialized = false;

export function initOtel(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  const endpoint = process.env.NEXT_PUBLIC_OTEL_ENDPOINT;
  if (!endpoint) {
    // OTel disabled — no endpoint configured
    return;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'lingroot-frontend',
  });

  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
  });

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // Only trace API calls, not static assets
        ignoreUrls: [
          /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,
          /fonts\.googleapis\.com/,
          /cdnjs\.cloudflare\.com/,
        ],
        propagateTraceHeaderCorsUrls: [
          // Propagate trace context to our backend
          /lingloops-backend\.onrender\.com/,
          /localhost:5001/,
        ],
      }),
      new DocumentLoadInstrumentation(),
    ],
  });

  initialized = true;
}

/**
 * Record an error as an OTel exception span.
 * Use this from error boundaries and catch blocks.
 */
export function recordError(name: string, error: Error, attributes?: Record<string, string>): void {
  const tracer = trace.getTracer('lingroot-frontend');
  const span = tracer.startSpan(name);
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  if (attributes) {
    Object.entries(attributes).forEach(([k, v]) => span.setAttribute(k, v));
  }
  span.end();
}
