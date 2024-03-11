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
import { getAsyncLocalStorageProp } from '@fluidware-it/saddlebag';
import { StoreSymbols } from '@fluidware-it/express-mysql2-middleware';

export function getDbClient(): DbClient {
  const dbClient = getAsyncLocalStorageProp<DbClient>(StoreSymbols.DB_CLIENT);
  /* istanbul ignore next */
  if (!dbClient) {
    // we will never reach this point in production. middleware will throw an error earlier in the request
    throw new Error('database connection not available');
  }
  return dbClient;
}
