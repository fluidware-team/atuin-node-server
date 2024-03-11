import './appenv';

import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2';
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import { hostDetector, osDetector } from '@opentelemetry/resources';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { GrpcInstrumentation } from '@opentelemetry/instrumentation-grpc';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { NAME } from './version';

// eslint-disable-next-line n/no-process-env
const serviceName = process.env.OTEL_SERVICE_NAME ?? NAME;

const otelSDKConfig: Partial<NodeSDKConfiguration> = {
  serviceName,
  instrumentations: [
    new HttpInstrumentation(),
    new PinoInstrumentation(),
    new GrpcInstrumentation(),
    new UndiciInstrumentation(),
    new MySQL2Instrumentation()
  ],
  resourceDetectors: [hostDetector, osDetector]
};

const sdk = new NodeSDK(otelSDKConfig);

sdk.start();

async function stop(signal: string) {
  try {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}, shutting down...`);
    await sdk.shutdown();
  } catch (e: unknown | Error) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
  // process.kill(process.pid, signal);
}

process.once('SIGTERM', async () => {
  await stop('SIGTERM');
});

process.once('SIGINT', async () => {
  await stop('SIGINT');
});

import('./main');
