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

import { getDbClient } from './ServiceUtils';
import type { Store as StoreApi, StoreCacheIndex as StoreCacheIndexApi } from '../types/store';
import { Store } from '../models/Store';
import { StoreCacheIndex } from '../models/StoreCache';

export class StoreService {
  static async get(userId: string): Promise<StoreCacheIndexApi> {
    const dbClient = getDbClient();
    const records = await StoreCacheIndex.get(dbClient, userId);
    return {
      hosts: records.reduce(
        (acc, record) => {
          if (!acc[record.host]) {
            acc[record.host] = {};
          }
          acc[record.host][record.tag] = record.idx;
          return acc;
        },
        {} as StoreCacheIndexApi['hosts']
      )
    };
  }

  static async add(userId: string, records: StoreApi[]) {
    const dbClient = getDbClient();
    await Store.add(dbClient, userId, records);
  }

  static async getNextRecords(
    userId: string,
    host: string,
    tag: string,
    count: number,
    start: number
  ): Promise<StoreApi[]> {
    const dbClient = getDbClient();
    const records = await Store.getNextRecords(dbClient, userId, host, tag, count, start);
    return records.map(r => ({
      id: r.clientId,
      idx: r.idx,
      host: {
        id: r.host,
        name: ''
      },
      timestamp: r.timestamp,
      version: r.version,
      tag: r.tag,
      data: {
        data: r.data,
        content_encryption_key: r.cek
      }
    }));
  }

  static async deleteStore(userId: string) {
    const dbClient = getDbClient();
    return await Store.deleteStore(dbClient, userId);
  }

  static async getTotal(): Promise<number> {
    const dbClient = getDbClient();
    return await StoreCacheIndex.getTotal(dbClient);
  }
  static async getRowCount(): Promise<number> {
    const dbClient = getDbClient();
    const sql = `select TABLE_ROWS from information_schema.TABLES where table_name = 'store'`;
    const rows = await dbClient.all(sql);
    return rows[0].TABLE_ROWS;
  }
}
