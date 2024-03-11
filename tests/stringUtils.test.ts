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

import { humanToMs, randomString } from '../src/utils/stringUtils';

describe('stringUtils', () => {
  describe('humanToMs', () => {
    it('should convert human readable time to milliseconds', () => {
      const _1d = 86400000;
      const _1h = 3600000;
      const _1m = 60000;
      const _1s = 1000;
      expect(humanToMs('1d')).toBe(_1d);
      expect(humanToMs('1h')).toBe(_1h);
      expect(humanToMs('1m')).toBe(_1m);
      expect(humanToMs('1s')).toBe(_1s);
      expect(humanToMs('1.5d')).toBe(_1d + _1d / 2);
      expect(humanToMs('1.5h')).toBe(_1h + _1h / 2);
      expect(humanToMs('1.5m')).toBe(_1m + _1m / 2);
      expect(humanToMs('1.5s')).toBe(_1s + _1s / 2);
      expect(humanToMs('1d1h1m1s')).toBe(_1d + _1h + _1m + _1s);
      expect(humanToMs('1.5d1.5h1.5m1.5s')).toBe(_1d + _1d / 2 + _1h + _1h / 2 + _1m + _1m / 2 + _1s + _1s / 2);
    });
    it('should convert throw an error if string is not parsable', () => {
      expect(() => humanToMs('1x')).toThrow();
    });
  });
  describe('randomString', () => {
    it('should return a random string', () => {
      const length = 16;
      const _randomString = randomString(length);
      expect(_randomString).toHaveLength(length);
      const _randomString2 = randomString(length);
      expect(_randomString).not.toEqual(_randomString2);
    });
    it('should return a random string (passing odd number)', () => {
      const length = 15;
      const _randomString = randomString(length);
      expect(_randomString).toHaveLength(length + 1);
      const _randomString2 = randomString(length);
      expect(_randomString).not.toEqual(_randomString2);
    });
  });
});
