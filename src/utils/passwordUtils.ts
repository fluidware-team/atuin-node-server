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

import { PasswordRules } from '../types';
import { HTTPError } from '@fluidware-it/express-microservice';

let errorMessage = '';

// eslint-disable-next-line complexity
function buildErrorMessage(rules: PasswordRules) {
  errorMessage = 'Password must: ';
  if (rules.minLength > 0) {
    errorMessage += `be at least ${rules.minLength} characters long`;
  }
  if (rules.requireLowercase) {
    errorMessage += `${errorMessage.length > 15 ? ', ' : ''}contain at least one lowercase letter`;
  }
  if (rules.requireUppercase) {
    errorMessage += `${errorMessage.length > 15 ? ', ' : ''}contain at least one uppercase letter`;
  }
  if (rules.requireNumber) {
    errorMessage += `${errorMessage.length > 15 ? ', ' : ''}contain at least one number`;
  }
  if (rules.requireSpecial) {
    errorMessage += `${errorMessage.length > 15 ? ', ' : ''}contain at least one special character`;
  }
}

// eslint-disable-next-line complexity
export function validatePassword(password: string, rules: PasswordRules) {
  if (!errorMessage) {
    buildErrorMessage(rules);
  }
  if (password.length < rules.minLength) {
    throw new HTTPError(errorMessage, 400);
  }
  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    throw new HTTPError(errorMessage, 400);
  }
  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    throw new HTTPError(errorMessage, 400);
  }
  if (rules.requireNumber && !/\d/.test(password)) {
    throw new HTTPError(errorMessage, 400);
  }
  if (rules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new HTTPError(errorMessage, 400);
  }
}
