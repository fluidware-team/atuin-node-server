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

import type { ChangePasswordRequest, LoginRequest, RegisterRequest, User, ValidateRequest } from '../types';
import { Settings } from '../Settings';
import { HTTPError } from '@fluidware-it/express-microservice';
import { getDbClient } from './ServiceUtils';
import { Account } from '../models/Account';
import { hashPassword } from '../utils/crypoUtils';
import { Token } from '../models/Token';
import { TokenItem } from '../types/token';
import { DbClient } from '@fluidware-it/mysql2-client';
import { sendValidationEmail, sendResetPasswordEmail, sendInvitationEmail } from '../helper/mailerHelper';
import { randomString } from '../utils/stringUtils';

const RESERVED_USERNAMES = [
  'me',
  'tokens',
  'validate',
  'password',
  'forgot-password',
  'reset-password',
  'invite',
  'accept-invite'
];

export class AccountService {
  static async register(body: RegisterRequest): Promise<string> {
    if (RESERVED_USERNAMES.includes(body.username)) {
      throw new HTTPError('Invalid username', 400);
    }
    const dbClient = getDbClient();
    let validationCode: string | undefined;
    if (Settings.emailRegistrationValidation) {
      validationCode = randomString(32);
    }
    const userId = await Account.register(dbClient, body, validationCode);
    if (Settings.emailRegistrationValidation && validationCode) {
      sendValidationEmail(body.email, body.username, validationCode);
    }
    return Token.createToken(dbClient, userId);
  }
  static async login(body: LoginRequest): Promise<string> {
    const dbClient = getDbClient();
    const loginData = await AccountService.validateCredentials(body.username, body.password, dbClient);
    return Token.createToken(dbClient, loginData.userId);
  }
  static async forgotPassword(username: string, email: string): Promise<void> {
    const dbClient = getDbClient();
    const user = await Account.getLoginData(dbClient, username);
    if (!user || user.email !== email || user.blocked) {
      return;
    }
    const resetCode = randomString(128);
    await Account.resetPasswordRequest(dbClient, user.userId, resetCode);
    sendResetPasswordEmail(email, username, resetCode);
  }
  static async resetPassword(code: string, password: string): Promise<void> {
    const dbClient = getDbClient();
    const userId = await Account.getAccountByResetCode(dbClient, code);
    if (!userId) {
      throw new HTTPError('Invalid code', 400);
    }
    await Account.changePassword(dbClient, userId, password);
    await Account.deleteResetCode(dbClient, userId);
    //
  }
  static async validateCode(username: string, password: string, code: string): Promise<void> {
    const dbClient = getDbClient();
    const loginData = await AccountService.validateCredentials(username, password, dbClient);
    const ret = await Account.validateAccount(dbClient, loginData.userId, code);
    if (ret === 0) {
      throw new HTTPError('Invalid validation code', 400);
    }
  }
  static async validateCredentials(username: string, password: string, dbClient?: DbClient) {
    if (!dbClient) {
      dbClient = getDbClient();
    }
    const loginData = await Account.getLoginData(dbClient, username);
    if (!loginData) {
      throw new HTTPError('Invalid username or password', 403);
    }
    if (loginData.hashedPassword !== hashPassword(loginData.userId, password)) {
      throw new HTTPError('Invalid username or password', 403);
    }
    if (loginData.blocked) {
      throw new HTTPError('Account blocked', 403);
    }
    return loginData;
  }
  static async changePassword(username: string, body: ChangePasswordRequest): Promise<void> {
    const dbClient = getDbClient();
    const loginData = await Account.getLoginData(dbClient, username);
    /* instanbul ignore next */
    if (!loginData) {
      throw new HTTPError('Invalid password', 403);
    }
    if (loginData.hashedPassword !== hashPassword(loginData.userId, body.current_password)) {
      throw new HTTPError('Invalid password', 403);
    }
    if (loginData.blocked) {
      throw new HTTPError('Account blocked', 403);
    }
    await Account.changePassword(dbClient, loginData.userId, body.new_password);
  }
  static async validate(_userId: string, _body: ValidateRequest): Promise<void> {
    throw new HTTPError('Not implemented', 501);
  }
  static async deleteAccount(username: string): Promise<void> {
    const dbClient = getDbClient();
    const deleted = await Account.deleteAccount(dbClient, username);
    if (deleted === 0) {
      throw new HTTPError('Invalid username', 400);
    }
  }
  static async checkAccount(username: string): Promise<boolean> {
    const dbClient = getDbClient();
    const user = await Account.getLoginData(dbClient, username);
    return !!user;
  }

  static async getTokens(userId: string): Promise<TokenItem[]> {
    const dbClient = getDbClient();
    const rows = await Token.getTokens(dbClient, userId);
    return rows.map(row => {
      return {
        token: row.shortToken,
        expiresAt: row.expiresAt,
        lastUsedAt: row.lastUsedAt
      };
    });
  }

  static async deleteToken(userId: string, shortToken: string): Promise<void> {
    const dbClient = getDbClient();
    const deleted = await Token.deleteToken(dbClient, userId, shortToken);
    if (deleted === 0) {
      throw new HTTPError('Invalid token', 400);
    }
  }

  static async blockUnblockUser(username: string, block: boolean): Promise<void> {
    const dbClient = getDbClient();
    const user = await Account.getLoginData(dbClient, username);
    if (!user) {
      throw new HTTPError('Invalid username', 400);
    }
    if (block === user.blocked) {
      return;
    }
    await Account.blockUnblockUser(dbClient, user.userId, block);
  }

  static async invite(email: string, invitedBy: User): Promise<void> {
    const dbClient = getDbClient();
    const user = await Account.getByEmail(dbClient, email);
    if (user) {
      // already registered
      return;
    }
    const invitationCode = randomString(32);
    await Account.invite(dbClient, email, invitedBy.username, invitationCode);
    sendInvitationEmail(email, invitedBy, invitationCode);
  }
  static async acceptInvite(username: string, password: string, code: string): Promise<void> {
    const dbClient = getDbClient();
    const user = await Account.getByUsername(dbClient, username);
    if (user) {
      throw new HTTPError('Username already registered', 400);
    }
    const invitation = await Account.getInvitation(dbClient, code);
    if (!invitation) {
      throw new HTTPError('Invalid invitation code', 400);
    }
    await Account.register(dbClient, { username, password, email: invitation.email });
    await Account.deleteInvitation(dbClient, invitation.email);
  }
}
