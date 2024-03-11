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

import { UsersCounter } from '../models/UsersCounter';
import { getDbClient } from './ServiceUtils';
import { History } from '../models/History';
import { Settings } from '../Settings';
import { Focus, SyncStats } from '../types';

export class SyncService {
  static async getCount(userId: string) {
    const dbClient = getDbClient();
    return UsersCounter.getHistoryCount(dbClient, userId);
  }
  static async getStatus(userId: string) {
    const dbClient = getDbClient();
    const count = await UsersCounter.getHistoryCount(dbClient, userId);
    const deleted: string[] = await History.getDeleted(dbClient, userId);
    return {
      count,
      deleted
    };
  }
  static async getHistory(userId: string, sync_ts: string, history_ts: string, hostname: string) {
    const dbClient = getDbClient();
    const rows = await History.getHistory(
      dbClient,
      userId,
      new Date(sync_ts),
      new Date(history_ts),
      hostname,
      Settings.pageSize
    );
    return rows.map(row => {
      return row.data as string;
    });
  }
  static async getHistoryStats(userId: string, focus: Focus, year?: number, month?: number, tz?: string) {
    const dbClient = getDbClient();
    const rows = await History.getHistoryStats(dbClient, userId, tz, focus, year, month);
    return rows.reduce((acc, row) => {
      acc[row.period] = {
        count: row.count
      };
      return acc;
    }, {} as SyncStats);
  }
}
