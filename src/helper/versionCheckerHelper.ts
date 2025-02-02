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

import { VERSION } from '../version';
import { EnvParse, getLogger } from '@fluidware-it/saddlebag';
import semver from 'semver';
import { DbClient } from '@fluidware-it/mysql2-client';
import { UsersCounter } from '../models/UsersCounter';

const CHECK_UPDATE_URL = 'https://update.natuin.fluidware.it/version';
const CHECK_INTERVAL = 604800000; // 7days: 7 * 24 * 60 * 60 * 1000;
const intervalGap = 3600000; // 1hour: 60 * 60 * 1000;
let lastCheck = 0;
let interval: NodeJS.Timeout;

function checkUpdate() {
  const now = Date.now();
  if (now - lastCheck < intervalGap) {
    return;
  }
  lastCheck = now;
  const logger = getLogger().child({ component: 'versionCheckerHelper' });
  const timeout = Math.floor(Math.random() * (60000 - 1000) + 1000);
  logger.debug(`Checking for new version in ${Math.floor(timeout / 1000)} seconds`);
  setTimeout(async function () {
    const dbClient = new DbClient();
    try {
      await dbClient.open();
      const users = await UsersCounter.getUsersCount(dbClient);
      const stats = await UsersCounter.getStats(dbClient);
      const res = await fetch(CHECK_UPDATE_URL, {
        headers: {
          'User-Agent': `natuin/${VERSION}`,
          Accept: 'application/json',
          'x-natuin-id': stats?.id,
          'x-natuin-users': `${users}`,
          'x-natuin-history': `${stats?.historyCount}`
        }
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const version = data.version;
      const securityUpdate = !!data.security_update;
      if (semver.gt(version, VERSION)) {
        if (securityUpdate) {
          logger.warn(`Security update available: ${version}`);
        } else {
          logger.info(`Update available: ${version}`);
        }
      }
    } catch (_error) {
      //
    } finally {
      try {
        await dbClient.close();
      } catch (_error2) {
        //
      }
    }
  }, timeout);
}

export function startVersionChecker() {
  if (EnvParse.envBool('NATUIN_DISABLE_VERSION_CHECK', false)) {
    return;
  }
  if (!interval) {
    checkUpdate();
    interval = setInterval(checkUpdate, CHECK_INTERVAL);
    process.once('SIGTERM', () => {
      if (interval) {
        clearInterval(interval);
      }
    });
  }
}
