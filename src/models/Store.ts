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
import type { Store as RecordApi, StoreRow } from '../types';
import { ulid } from 'ulid';
import { StoreCacheIndex } from './StoreCache';

export class Store {
  static async add(dbClient: DbClient, userId: string, records: RecordApi[]) {
    const sql =
      'INSERT IGNORE INTO store (id, clientId, userId, host, tag, idx, timestamp, version, data, cek) VALUES ' +
      records.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    await dbClient.insert(
      sql,
      records.reduce(
        (acc, record) => {
          const id = ulid();
          acc.push(
            id,
            record.id,
            userId,
            record.host.id,
            record.tag,
            record.idx,
            record.timestamp,
            record.version,
            record.data.data,
            record.data.content_encryption_key
          );
          return acc;
        },
        [] as (string | number | null)[]
      )
    );
    const lastRecord = records[records.length - 1];
    await StoreCacheIndex.upsert(dbClient, userId, lastRecord.host.id, lastRecord.tag, lastRecord.idx);
  }
  static async getNextRecords(
    dbClient: DbClient,
    userId: string,
    host: string,
    tag: string,
    count: number,
    start: number
  ): Promise<StoreRow[]> {
    const rows = await dbClient.all(
      'SELECT clientId, host, tag, idx, timestamp, version, data, cek FROM store WHERE userId = ? AND host = ? AND tag = ? AND idx >= ? ORDER BY idx ASC LIMIT ?',
      [userId, host, tag, start, count]
    );
    return rows.map(row => {
      return {
        clientId: row.clientId,
        host: row.host,
        tag: row.tag,
        idx: row.idx,
        timestamp: row.timestamp,
        version: row.version,
        data: row.data,
        cek: row.cek
      };
    });
  }
  static async deleteStore(dbClient: DbClient, userId: string): Promise<number> {
    return await dbClient.delete('DELETE FROM store WHERE userId = ?', [userId]);
  }
}
