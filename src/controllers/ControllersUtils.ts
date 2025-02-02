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

import type { Response } from 'express';
import type { User } from '../types';
import { ensureError, getAsyncLocalStorageProp, getLogger } from '@fluidware-it/saddlebag';
import { HTTPError, MicroServiceStoreSymbols } from '@fluidware-it/express-microservice';
import { NODE_MODE } from '../consts';

export function returnError(err: unknown, res: Response) {
  const e = ensureError(err);
  let status = 500;
  if (err instanceof HTTPError) {
    status = err.status || status;
  }
  /* istanbul ignore next */
  if (status === 500 && NODE_MODE === '') {
    getLogger().error(e.stack);
  }
  res.status(status).json({ status, reason: e.message });
}

export function checkUserFromSession() {
  return getAsyncLocalStorageProp<User>(MicroServiceStoreSymbols.CONSUMER);
}

export function getUserFromSession() {
  const user = getAsyncLocalStorageProp<User>(MicroServiceStoreSymbols.CONSUMER);
  /* istanbul ignore next */
  if (!user) {
    // we will never reach this point in production. validation middleware will throw an error earlier in the request
    throw new HTTPError('Not logged in', 401);
  }
  return user;
}
