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

import { DbClient, getDateAsUTCMysqlString } from '@fluidware-it/mysql2-client';
import { Focus, History as HistoryApi } from '../types';
import { UsersCounter } from './UsersCounter';

export class History {
  static async add(dbClient: DbClient, userId: string, history: HistoryApi[]) {
    const sql =
      'INSERT IGNORE INTO history (clientId, userId, timestamp, data, hostname) VALUES ' +
      history.map(() => '(?, ?, ?, ?, ?)').join(', ');
    await dbClient.insert(
      sql,
      history.reduce(
        (acc, h) => {
          acc.push(h.id, userId, getDateAsUTCMysqlString(h.timestamp, true), h.data, h.hostname);
          return acc;
        },
        [] as (string | number | null)[]
      )
    );
    await UsersCounter.align(dbClient, userId);
  }
  static async getHistory(
    dbClient: DbClient,
    userId: string,
    created_after: Date,
    since: Date,
    hostname: string,
    limit: number
  ) {
    const sql = `select id, clientId, userId, hostname, timestamp, data, createdAt
        from history
        where userId = ?
            and hostname != ?
            and createdAt >= ?
            and timestamp >= ?
            order by timestamp asc
            limit ${limit}`;
    const phs = [userId, hostname, getDateAsUTCMysqlString(created_after, true), getDateAsUTCMysqlString(since, true)];
    return dbClient.all(sql, phs);
  }
  static async deleteHistory(dbClient: DbClient, userId: string, clientId: string) {
    const sql = `update history
            set deletedAt = ?
            where userId = ?
            and clientId = ?
            and deletedAt is null`;
    return dbClient.delete(sql, [getDateAsUTCMysqlString(new Date(), true), userId, clientId]);
  }
  static async getDeleted(dbClient: DbClient, userId: string) {
    const sql = `select clientId
            from history
            where userId = ?
            and deletedAt is not null`;
    const rows = await dbClient.all(sql, [userId]);
    return rows.map(row => row.clientId as string);
  }

  static async getHistoryStats(
    dbClient: DbClient,
    userId: string,
    tz = 'UTC',
    focus: Focus,
    year?: number,
    month?: number
  ) {
    const phs: (string | number)[] = [];
    let where = '';
    let timestamp = 'timestamp';
    phs.push(userId);
    if (tz !== 'UTC') {
      timestamp = `convert_tz(timestamp, 'utc', '${tz}')`;
    }
    if (focus === Focus.month) {
      if (!year) {
        year = new Date().getUTCFullYear();
      }
      where = `and year(${timestamp}) = ? `;
      phs.push(year);
    } else if (focus === Focus.day) {
      if (!year) {
        year = new Date().getUTCFullYear();
      }
      if (!month) {
        month = new Date().getUTCMonth() + 1;
      }
      where = `and year(${timestamp}) = ? and month(${timestamp}) = ? `;
      phs.push(year, month);
    }
    const sql = `select count(*) count, ${focus}(${timestamp}) period from history where userId = ? ${where} group by period order by period asc`;
    return dbClient.all(sql, phs);
  }
}
