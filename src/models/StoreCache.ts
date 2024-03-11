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

import { DbClient } from '@fluidware-it/mysql2-client';
import type { StoreCacheIndexRow } from '../types';

export class StoreCacheIndex {
  static async upsert(dbClient: DbClient, userId: string, hostId: string, tag: string, idx: number) {
    await dbClient.insert(
      'INSERT INTO store_idx_cache (userId, host, tag, idx) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE idx = values(idx)',
      [userId, hostId, tag, idx]
    );
  }
  static async get(dbClient: DbClient, userId: string): Promise<StoreCacheIndexRow[]> {
    const rows = await dbClient.all('SELECT host, tag, idx FROM store_idx_cache WHERE userId = ?', [userId]);
    return rows.map(row => {
      return {
        host: row.host,
        tag: row.tag,
        idx: row.idx
      };
    });
  }
  static async getTotal(dbClient: DbClient): Promise<number> {
    const row = await dbClient.get('SELECT sum(idx) as total FROM store_idx_cache');
    return row!.total;
  }
}
