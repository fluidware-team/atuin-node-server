/*
 * Copyright Fluidware srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Span, trace } from '@opentelemetry/api';
import {
  DbClient,
  getDateAsUTCMysqlString,
  setMysqlConnectionOptions,
  UpgradeManager
} from '@fluidware-it/mysql2-client';
import { CURRENT_SCHEMA_VERSION, onSchemaInit, onSchemaUpgrade } from './db/migrate';
import { ensureError, EnvParse } from '@fluidware-it/saddlebag';
import type { Logger } from 'pino';
import { getTokenComponents } from 'prefixed-api-key';
import { Settings } from './Settings';

setMysqlConnectionOptions('', {
  port: EnvParse.envInt('NATUIN_DB_PORT', 3306),
  host: EnvParse.envString('NATUIN_DB_HOST', 'localhost'),
  user: EnvParse.envString('NATUIN_DB_USERNAME', 'atuin'),
  password: EnvParse.envString('NATUIN_DB_PASSWORD', 'atuin'),
  database: EnvParse.envString('NATUIN_DB_NAME', 'atuin'),
  timezone: 'Z'
});

export async function migrate(logger: Logger) {
  logger.info('start db migration');
  const tracer = trace.getTracer('natuin-migration');
  /* istanbul ignore next */
  await tracer.startActiveSpan('db migration', async (span: Span) => {
    try {
      const upgradeManager = new UpgradeManager();
      await upgradeManager.checkDb(CURRENT_SCHEMA_VERSION, onSchemaInit, onSchemaUpgrade);
    } catch (err) {
      logger.error('db migration failed');
      const e = ensureError(err);
      span.recordException(e);
      throw e;
    } finally {
      span.end();
    }
  });
  logger.info('end db migration');
  if (Settings.adminToken) {
    const prefixedToken = getTokenComponents(Settings.adminToken);
    if (!prefixedToken || !prefixedToken.shortToken) {
      throw new Error('Invalid admin token format');
    }
    const dbClient = new DbClient();
    try {
      await dbClient.open();
      const user = await dbClient.get('select userId from users where userId = ?', ['_atuin_admin']);
      if (!user) {
        await dbClient.insert(
          'insert into users (userId, username, email, password, validatedAt, admin) values (?, ?, ?, ?, ?, ?)',
          ['_atuin_admin', '_atuin_admin', 'admin@natuin', 'admin', getDateAsUTCMysqlString(new Date()), 1]
        );
      }
      const token = await dbClient.get('select tokenHash, shortToken from tokens where userId = ?', ['_atuin_admin']);
      if (!token) {
        await dbClient.insert('insert into tokens (tokenHash, shortToken, userId, expiresAt) values (?, ?, ?, ?)', [
          prefixedToken.longTokenHash,
          prefixedToken.shortToken,
          '_atuin_admin',
          '2099-12-31 23:59:59.999'
        ]);
      } else {
        if (token.shortToken !== prefixedToken.shortToken || token.tokenHash !== prefixedToken.longTokenHash) {
          await dbClient.run('update tokens set tokenHash = ?, shortToken = ? where userId = ?', [
            prefixedToken.longTokenHash,
            prefixedToken.shortToken,
            '_atuin_admin'
          ]);
        }
      }
    } finally {
      await dbClient.close();
    }
  }
}
