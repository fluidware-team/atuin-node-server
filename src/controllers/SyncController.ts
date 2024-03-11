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
import type { Focus } from '../types';
import { getLogger } from '@fluidware-it/saddlebag';
import { getUserFromSession, returnError } from './ControllersUtils';
import { SyncService } from '../services/SyncService';
import { ATUIN_API_VERSION } from '../consts';
import { Settings } from '../Settings';
import semver from 'semver';

export async function getCount(req: Request, res: Response) {
  const user = getUserFromSession();
  try {
    const count = await SyncService.getCount(user.id);
    res.json({ count });
  } catch (e) {
    returnError(e, res);
  }
}

export async function getHistory(req: Request, res: Response) {
  const user = getUserFromSession();
  const { sync_ts, history_ts, host } = req.query;
  try {
    const history = await SyncService.getHistory(user.id, sync_ts as string, history_ts as string, host as string);
    getLogger().info({ historyCount: history.length }, 'getHistory');
    res.json({ history });
  } catch (e) {
    returnError(e, res);
  }
}

export async function calendar(req: Request, res: Response) {
  const user = getUserFromSession();
  const { focus } = req.params;
  const { year, month, tz } = req.query;
  try {
    const history = await SyncService.getHistoryStats(
      user.id,
      focus as Focus,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
      tz as string
    );
    res.json(history);
  } catch (e) {
    returnError(e, res);
  }
}

export async function status(req: Request, res: Response) {
  try {
    const user = getUserFromSession();
    const status: { count: number; username: string; deleted: string[]; page_size: number; version: string } = {
      count: 0,
      username: user.username,
      deleted: [],
      page_size: Settings.pageSize,
      version: ATUIN_API_VERSION
    };
    const atunClientVersion = req.get('atuin-version');
    if (semver.lt(atunClientVersion || '0.0.0', '18.4.0')) {
      const { count, deleted } = await SyncService.getStatus(user.id);
      status.count = count;
      status.deleted = deleted;
    }
    res.json(status);
  } catch (e) {
    returnError(e, res);
  }
}
