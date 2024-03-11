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

import type { Request, Response } from 'express';
import type { ChangePasswordRequest, LoginRequest, RegisterRequest } from '../types';
import { INVIATION_MODE } from '../types/index';
import { checkUserFromSession, getUserFromSession, returnError } from './ControllersUtils';
import { AccountService } from '../services/AccountService';
import { ensureError } from '@fluidware-it/saddlebag';
import { HTTPError } from '@fluidware-it/express-microservice';
import { Settings } from '../Settings';
import { checkDomain } from '../utils/registrationUtils';
import { validatePassword } from '../utils/passwordUtils';

export async function getMe(req: Request, res: Response) {
  const user = getUserFromSession();
  res.json({ username: user.username });
}

export async function register(req: Request, res: Response) {
  const body = req.body as RegisterRequest;
  const user = checkUserFromSession();
  let err: HTTPError | null = null;
  if (user) {
    if (!user.isAdmin) {
      err = new HTTPError('Already registered', 400);
    }
  } else {
    if (!Settings.openRegistration) {
      err = new HTTPError('this server is not open for registrations', 400);
    }
    const emailDomain = body.email.split('@')[1];
    if (!checkDomain(emailDomain, Settings)) {
      err = new HTTPError('this server is not open for registrations', 400);
    }
  }
  if (err) {
    returnError(err, res);
    return;
  }
  try {
    validatePassword(body.password, Settings.passwordValidation);
    const session = await AccountService.register(body);
    res.json({
      session
    });
  } catch (e) {
    returnError(e, res);
  }
}

export async function login(req: Request, res: Response) {
  const user = checkUserFromSession();
  if (user) {
    returnError(new HTTPError('Already logged in', 400), res);
    return;
  }
  const body = req.body as LoginRequest;
  try {
    const session = await AccountService.login(body);
    res.json({
      session
    });
  } catch (err) {
    returnError(err, res);
  }
}

export async function changePassword(req: Request, res: Response) {
  const user = getUserFromSession();
  const body = req.body as ChangePasswordRequest;
  try {
    validatePassword(body.new_password, Settings.passwordValidation);
    await AccountService.changePassword(user.username, body);
    res.sendStatus(200);
  } catch (err) {
    returnError(err, res);
  }
}

export async function getAccount(req: Request, res: Response) {
  const user = getUserFromSession();
  if (!user.isAdmin) {
    returnError(new HTTPError('Not authorized', 403), res);
    return;
  }
  const { username } = req.params;
  try {
    const ok = await AccountService.checkAccount(username);
    if (!ok) {
      returnError(new HTTPError('Not found', 404), res);
      return;
    }
    res.json({ username });
  } catch (err) {
    returnError(err, res);
  }
}

export async function deleteAccount(req: Request, res: Response) {
  const user = getUserFromSession();
  const { username } = req.params;
  if (username && !user.isAdmin && user.username !== username) {
    returnError(new HTTPError('Not authorized', 403), res);
    return;
  }
  try {
    await AccountService.deleteAccount(username || user.username);
    res.sendStatus(200);
  } catch (err) {
    returnError(err, res);
  }
}

export async function getTokens(req: Request, res: Response) {
  const user = getUserFromSession();
  try {
    const tokens = await AccountService.getTokens(user.id);
    res.json(tokens);
  } catch (err) {
    returnError(err, res);
  }
}

export async function deleteToken(req: Request, res: Response) {
  const user = getUserFromSession();
  const { token } = req.params;
  if (token && user.currentToken === token) {
    returnError(new HTTPError('Cannot delete current token', 400), res);
    return;
  }
  try {
    await AccountService.deleteToken(user.id, token as string);
    res.sendStatus(200);
  } catch (err) {
    returnError(err, res);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { username, email } = req.body;
  try {
    await AccountService.forgotPassword(username, email);
    res.json({});
  } catch (err) {
    returnError(err, res);
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { code, password } = req.body;
  try {
    validatePassword(password, Settings.passwordValidation);
    await AccountService.resetPassword(code, password);
    res.json({});
  } catch (err) {
    returnError(err, res);
  }
}

export async function validateCode(req: Request, res: Response) {
  const { username, password, code } = req.body;
  try {
    await AccountService.validateCode(username, password, code);
    res.json({});
  } catch (err) {
    const e = ensureError(err);
    returnError(e, res);
  }
}

export async function blockUnblockUser(req: Request, res: Response) {
  const user = getUserFromSession();
  if (!user.isAdmin) {
    returnError(new HTTPError('Not authorized', 403), res);
    return;
  }
  const { username, action } = req.params;
  try {
    await AccountService.blockUnblockUser(username, action === 'block');
    res.json({
      username
    });
  } catch (err) {
    returnError(err, res);
  }
}

export async function inviteAccount(req: Request, res: Response) {
  if (Settings.invitationMode === INVIATION_MODE.CLOSE) {
    returnError(new HTTPError('Method not allowed', 405), res);
    return;
  }
  const user = getUserFromSession();
  if (Settings.invitationMode === INVIATION_MODE.ADMIN_ONLY && !user.isAdmin) {
    returnError(new HTTPError('Not authorized', 405), res);
    return;
  }
  const { email } = req.body;
  try {
    await AccountService.invite(email, user);
    res.sendStatus(200);
  } catch (err) {
    returnError(err, res);
  }
}

export async function acceptInvite(req: Request, res: Response) {
  const user = checkUserFromSession();
  if (user) {
    returnError(new HTTPError('Already logged in', 400), res);
    return;
  }
  const { code, username, password } = req.body;
  try {
    validatePassword(password, Settings.passwordValidation);
    await AccountService.acceptInvite(username, password, code);
    res.json({});
  } catch (err) {
    returnError(err, res);
  }
}
