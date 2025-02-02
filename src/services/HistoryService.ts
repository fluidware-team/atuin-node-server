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

import { History as HistoryApi, HistoryData } from '../types';
import { History } from '../models/History';
import { getDbClient } from './ServiceUtils';
import { getLogger } from '@fluidware-it/saddlebag';
import { Settings } from '../Settings';
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('natuin');
const invalidDataCounter = meter.createCounter('app.data.invalid', {
  description: 'The number of invalid data received'
});

export class HistoryService {
  static async addHistory(userId: string, history: HistoryApi[]) {
    const dbClient = getDbClient();
    const logger = getLogger().child({ userId });
    const historyClean = history.map(h => {
      try {
        const data = JSON.parse(h.data) as HistoryData;
        if (Object.keys(data).length !== 2) {
          logger.warn(`invalid data: ${Object.keys(data).join(',')}`);
          h.data = '{}';
          invalidDataCounter.add(1, { reason: 'invalid keys' });
        } else if (!Array.isArray(data.ciphertext) || !Array.isArray(data.nonce)) {
          logger.warn(`invalid data: ${Object.keys(data).join(',')}`);
          h.data = '{}';
          invalidDataCounter.add(1, { reason: 'invalid keys' });
        } else {
          if (Settings.maxHistoryDataSize > 0 && data.ciphertext.length > Settings.maxHistoryDataSize) {
            logger.warn(`data too long: ${data.ciphertext.length} bytes  `);
            h.data = '{}';
            invalidDataCounter.add(1, { reason: 'invalid length' });
          }
        }
      } catch (_e) {
        logger.warn('invalid data: not valid json');
        h.data = '{}';
        invalidDataCounter.add(1, { reason: 'invalid json' });
      }
      return h;
    });
    await History.add(dbClient, userId, historyClean);
  }
  static async deleteHistory(userId: string, clientId: string) {
    const dbClient = getDbClient();
    const count = await History.deleteHistory(dbClient, userId, clientId);
    getLogger().info(`Deleted ${count} history item for ${userId}`);
  }
}
