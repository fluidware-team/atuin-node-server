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
import { ulid } from 'ulid';
import { LoginData, RegisterRequest } from '../types';
import { hashPassword } from '../utils/crypoUtils';
import { getSha256 } from '@fluidware-it/saddlebag';

export class Account {
  static async register(
    dbClient: DbClient,
    account: RegisterRequest,
    validationCode?: string,
    admin = false
  ): Promise<string> {
    const userId = ulid();
    const sql =
      'INSERT INTO users (userId, email, username, password, validationCode, validatedAt, admin) VALUES (?, ?, ?, ?, ?, ?, ?)';
    let validatedAt: string | null = null;
    if (validationCode) {
      validationCode = getSha256(validationCode);
    } else {
      validatedAt = getDateAsUTCMysqlString(new Date());
    }
    await dbClient.insert(sql, [
      userId,
      account.email,
      account.username,
      hashPassword(userId, account.password),
      validationCode || null,
      validatedAt,
      admin
    ]);
    return userId;
  }
  static async validateAccount(dbClient: DbClient, userId: string, validationCode: string): Promise<number> {
    const sql = 'UPDATE users SET validationCode = NULL, validatedAt = ? WHERE userId = ? AND validationCode = ?';
    return await dbClient.update(sql, [getDateAsUTCMysqlString(new Date()), userId, getSha256(validationCode)]);
  }
  static async changePassword(dbClient: DbClient, userId: string, newPassword: string): Promise<void> {
    await dbClient.update('UPDATE users SET password = ? WHERE userId = ?', [
      hashPassword(userId, newPassword),
      userId
    ]);
  }
  static async getLoginData(dbClient: DbClient, username: string): Promise<LoginData | undefined> {
    const data = await dbClient.get(
      'SELECT userId, email, password, blocked, validatedAt, createdAt FROM users WHERE username = ?',
      [username]
    );
    if (data) {
      return {
        userId: data.userId,
        email: data.email,
        hashedPassword: data.password,
        blocked: data.blocked,
        validatedAt: data.validatedAt,
        createdAt: data.createdAt
      };
    }
  }
  static async deleteAccount(dbClient: DbClient, username: string): Promise<number> {
    return dbClient.delete('DELETE FROM users WHERE username = ?', [username]);
  }
  static async resetPasswordRequest(
    dbClient: DbClient,
    userId: string,
    resetCode: string,
    info?: string
  ): Promise<void> {
    await dbClient.update(
      'insert into users_resets (userId, code, info) values (?, ?, ?) on duplicate key update code = value(code), info = value(info)',
      [userId, getSha256(resetCode), info ?? null]
    );
  }
  static async getAccountByResetCode(dbClient: DbClient, code: string) {
    const row = await dbClient.get(
      'select userId from users_resets where code = ? and createdAt > date_sub(now(), interval 2 hour)',
      [getSha256(code)]
    );
    return row?.userId;
  }
  static async deleteResetCode(dbClient: DbClient, userId: string): Promise<void> {
    await dbClient.delete('DELETE FROM users_resets WHERE userId = ?', [userId]);
  }
  static async blockUnblockUser(dbClient: DbClient, userId: string, block: boolean): Promise<void> {
    await dbClient.update('UPDATE users SET blocked = ? WHERE userId = ?', [block, userId]);
  }
  static async getByEmail(dbClient: DbClient, email: string) {
    const row = await dbClient.get('select userId, username, email from users where email = ?', [email]);
    if (row) {
      return {
        userId: row.userId,
        username: row.username,
        email: row.email
      };
    }
  }
  static async getByUsername(dbClient: DbClient, username: string) {
    const row = await dbClient.get('select userId, username, email from users where username = ?', [username]);
    if (row) {
      return {
        userId: row.userId,
        username: row.username,
        email: row.email
      };
    }
  }
  static async invite(dbClient: DbClient, email: string, invitedBy: string, invitationCode: string): Promise<void> {
    const sql =
      'INSERT INTO users_invitations (email, invitedBy, code) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE code = value(code)';
    await dbClient.insert(sql, [email, invitedBy, getSha256(invitationCode)]);
  }
  static async getInvitation(dbClient: DbClient, code: string) {
    const row = await dbClient.get('select email, invitedBy from users_invitations where code = ?', [getSha256(code)]);
    if (row) {
      return {
        email: row.email,
        invitedBy: row.invitedBy
      };
    }
  }
  static async deleteInvitation(dbClient: DbClient, email: string): Promise<number> {
    return dbClient.delete('DELETE FROM users_invitations WHERE email = ?', [email]);
  }
}
