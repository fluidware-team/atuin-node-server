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

export class UsersCounter {
  static async getTotalCount(dbClient: DbClient): Promise<number> {
    const result = await dbClient.get('select historyCount as sum from counters');
    return result?.sum || 0;
  }
  static async getStats(dbClient: DbClient) {
    return dbClient.get('select id, historyCount from counters');
  }
  static async align(dbClient: DbClient, userId: string): Promise<void> {
    await dbClient.update(
      'update users set historyCount = (select count(*) from history where userId = ?) where userId = ?',
      [userId, userId]
    );
    await dbClient.update('update counters set historyCount = (select sum(historyCount) from users)');
  }
  static async getHistoryCount(dbClient: DbClient, userId: string): Promise<number> {
    const result = await dbClient.get('select historyCount from users where userId = ?', [userId]);
    return result?.historyCount || 0;
  }
  static async getUsersCount(dbClient: DbClient): Promise<number> {
    const result = await dbClient.get('select count(*) as count from users');
    return result?.count || 0;
  }
}
