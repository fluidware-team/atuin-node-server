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
import { StoreService } from '../services/StoreService';
import { getUserFromSession, returnError } from './ControllersUtils';
import type { StoreNextParams } from '../types';

export async function getRecords(req: Request, res: Response) {
  try {
    const user = getUserFromSession();
    const data = await StoreService.get(user.id);
    res.json(data);
  } catch (e) {
    returnError(e, res);
  }
}

export async function deleteStore(req: Request, res: Response) {
  try {
    const user = getUserFromSession();
    await StoreService.deleteStore(user.id);
    res.sendStatus(200);
  } catch (e) {
    returnError(e, res);
  }
}

export async function addRecords(req: Request, res: Response) {
  try {
    const user = getUserFromSession();
    const body = req.body;
    await StoreService.add(user.id, body);
    res.sendStatus(200);
  } catch (e) {
    returnError(e, res);
  }
}

export async function getNextRecords(req: Request, res: Response) {
  const { host, tag, count, start } = req.query as unknown as StoreNextParams;
  try {
    const user = getUserFromSession();
    const data = await StoreService.getNextRecords(user.id, host, tag, count, start);
    res.json(data);
  } catch (e) {
    returnError(e, res);
  }
}
