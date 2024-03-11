import './appenv';
import { ensureError, getLogger } from '@fluidware-it/saddlebag';
import { NatuinServer } from './server';
import { migrate } from './runMigration';
import { startVersionChecker } from './helper/versionCheckerHelper';
import { HealthzServer } from '@fluidware-it/healthz-server';

const logger = getLogger();
logger.info('Starting app');

const server = new NatuinServer({
  maxUploadSize: '5mb'
});

async function startServer() {
  try {
    const listener = await server.start();
    logger.info(`REST server started on port ${listener.address}:${listener.port}`);
    startVersionChecker();
  } catch (err) {
    const e = ensureError(err);
    logger.error({ error_message: e.message }, 'REST server failed to start');
    throw e;
  }
}

async function stop(signal: string) {
  logger.info(`${signal} received, stopping server`);
  await server.stop();

  logger.info(`${signal} received, server stopped`);
  process.kill(process.pid, signal);
}

process.once('SIGINT', async () => {
  await stop('SIGINT');
});

process.once('SIGTERM', async () => {
  await stop('SIGTERM');
});

HealthzServer.start()
  .then(() => {
    return migrate(logger);
  })
  .then(startServer)
  .catch(err => {
    const e = ensureError(err);
    logger.error({ error_message: e.message }, 'failed to boot');
    process.kill(process.pid, 'SIGINT');
  });
