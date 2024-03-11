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

export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  validated: boolean;
  currentToken?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface RegisterResponse {
  session: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  session: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ValidateRequest {
  token: string;
}

export interface LoginData {
  userId: string;
  email: string;
  hashedPassword: string;
  blocked: boolean;
  validatedAt: Date | null;
  createdAt: Date;
}
