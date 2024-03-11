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

import { randomBytes } from 'node:crypto';

const whole = /^((\d+(\.\d+)*)([dhms]))+$/;
const pieces = /((\d+(\.\d+)*)([dhms]))/g;
const measure = /([dhms])/g;
const multipliers = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400
};

function analyse(time: string) {
  const unit = time.match(measure)?.[0];
  /* istanbul ignore next */
  if (!unit) return 0;
  time = time.substring(0, time.length - 1);
  const _multiplier = multipliers[unit as 's' | 'm' | 'h' | 'd'];
  return parseFloat(time) * _multiplier * 1000;
}

export function humanToMs(time: string): number {
  if (!whole.test(time)) {
    throw new Error('invalid time');
  }
  const x = time.match(pieces);
  /* istanbul ignore next */
  if (!x) {
    throw new Error('invalid time');
  }
  return x.reduce((sum, currentVal) => {
    return sum + analyse(currentVal);
  }, 0);
}

export function randomString(length: number) {
  if (length % 2 !== 0) {
    length++;
  }
  return randomBytes(length / 2).toString('hex');
}
