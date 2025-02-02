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
import { Settings } from '../Settings';
import { generateAPIKey } from 'prefixed-api-key';
import { NATUIN_KEY_PREFIX, PUBLIC_URL } from '../consts';
import { User } from '../types';
import { HTTPError } from '@fluidware-it/express-microservice';

export class Token {
  static async createToken(dbClient: DbClient, userId: string) {
    const key = await generateAPIKey({ keyPrefix: NATUIN_KEY_PREFIX });
    if (!key || !key.longTokenHash || !key.shortToken) {
      throw new Error('Failed to generate API key');
    }
    const expiresAt = Settings.sessionTTL
      ? new Date(Date.now() + Settings.sessionTTL)
      : new Date('2099-12-31T23:59:59.999Z');
    await dbClient.insert('insert into tokens (tokenHash, shortToken, userId, expiresAt) values (?, ?, ?, ?)', [
      key.longTokenHash,
      key.shortToken,
      userId,
      getDateAsUTCMysqlString(expiresAt)
    ]);
    return key.token;
  }
  static async getUserByToken(dbClient: DbClient, shortToken: string, tokenHash: string): Promise<User | undefined> {
    const row = await dbClient.get(
      `select u.userId, u.email, u.username, u.blocked, u.validatedAt, u.admin, u.createdAt
            from
                tokens t,
                users u
            where
                t.userId = u.userId and
                t.tokenHash = ? and
                t.shortToken = ? and
                t.expiresAt > now()`,
      [tokenHash, shortToken]
    );
    if (row) {
      if (row.blocked) {
        throw new HTTPError('user blocked. please contact instance administrator', 403);
      }
      if (!row.validatedAt) {
        const now = Date.now();
        const createdAt = row.createdAt as Date;
        const diff = now - createdAt.getTime();
        if (diff > Settings.emailRegistrationValidationTimeout) {
          throw new HTTPError(
            `user not validated. please reset your password to validate it ${PUBLIC_URL}/account/forgot-password`,
            403
          );
        }
      }
      await dbClient.run('update tokens set lastUsedAt = current_timestamp(3) where shortToken = ?', [shortToken]);
      return {
        id: row.userId,
        username: row.username,
        email: row.email,
        validated: !!row.validatedAt,
        isAdmin: !!row.admin
      };
    }
  }
  static async deleteToken(dbClient: DbClient, userId: string, shortToken: string) {
    return dbClient.delete('delete from tokens where shortToken = ? and userId = ?', [shortToken, userId]);
  }
  static async getTokens(dbClient: DbClient, userId: string) {
    return dbClient.all(
      'select shortToken, expiresAt, lastUsedAt from tokens where userId = ? order by createdAt asc',
      [userId]
    );
  }
}
