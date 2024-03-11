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
import type { HistoryRequest } from '../types';
import { getLogger } from '@fluidware-it/saddlebag';
import { getUserFromSession, returnError } from './ControllersUtils';
import { HistoryService } from '../services/HistoryService';

export async function add(req: Request, res: Response) {
  const user = getUserFromSession();
  const body = req.body as HistoryRequest[];
  getLogger().info(`Adding ${body.length} items to history`);
  try {
    await HistoryService.addHistory(
      user.id,
      body.map(h => ({ ...h, timestamp: new Date(h.timestamp) }))
    );
    res.sendStatus(200);
  } catch (e) {
    returnError(e, res);
  }
}

export async function deleteHistory(req: Request, res: Response) {
  const user = getUserFromSession();
  const { client_id } = req.body;
  getLogger().info(`Deleting history for ${client_id}`);
  try {
    await HistoryService.deleteHistory(user.id, client_id);
    res.sendStatus(200);
  } catch (e) {
    returnError(e, res);
  }
}
