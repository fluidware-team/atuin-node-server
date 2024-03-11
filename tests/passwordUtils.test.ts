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

describe('passwordUtils', () => {
  describe('validatePassword', () => {
    let validatePassword: typeof import('../src/utils/passwordUtils').validatePassword;
    beforeEach(async () => {
      // clean node cache to reset errorMessage
      jest.resetModules();
      validatePassword = (await import('../src/utils/passwordUtils')).validatePassword;
    });
    it('should build correct error message (only minLength)', () => {
      expect(() =>
        validatePassword('a', {
          minLength: 2,
          requireLowercase: false,
          requireUppercase: false,
          requireNumber: false,
          requireSpecial: false
        })
      ).toThrow('Password must: be at least 2 characters long');
    });
    it('should build correct error message (only requireLowercase)', () => {
      expect(() =>
        validatePassword('A', {
          minLength: 0,
          requireLowercase: true,
          requireUppercase: false,
          requireNumber: false,
          requireSpecial: false
        })
      ).toThrow('Password must: contain at least one lowercase letter');
    });
    it('should build correct error message (only requireUppercase)', () => {
      expect(() =>
        validatePassword('a', {
          minLength: 0,
          requireLowercase: false,
          requireUppercase: true,
          requireNumber: false,
          requireSpecial: false
        })
      ).toThrow('Password must: contain at least one uppercase letter');
    });
    it('should build correct error message (only requireNumber)', () => {
      expect(() =>
        validatePassword('a', {
          minLength: 0,
          requireLowercase: false,
          requireUppercase: false,
          requireNumber: true,
          requireSpecial: false
        })
      ).toThrow('Password must: contain at least one number');
    });
    it('should build correct error message (only requireSpecial)', () => {
      expect(() =>
        validatePassword('a', {
          minLength: 0,
          requireLowercase: false,
          requireUppercase: false,
          requireNumber: false,
          requireSpecial: true
        })
      ).toThrow('Password must: contain at least one special character');
    });
  });
});
