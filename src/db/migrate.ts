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
import { ulid } from 'ulid';

export const CURRENT_SCHEMA_VERSION = 2;

const CREATE_TABLE_USERS = `create table if not exists users (
  userId varchar(26) binary not null primary key,
  email varchar(255) not null,
  username varchar(255) not null,
  password varchar(255) not null,
  validationCode varchar(255) null,
  blocked tinyint(1) not null default 0,
  admin tinyint(1) not null default 0,
  historyCount int not null default 0,
  createdAt datetime(3) not null default current_timestamp(3),
  validatedAt datetime(3) null,
  updatedAt timestamp(3) null ON UPDATE current_timestamp(3),
  unique uq_users_email (email),
  unique uq_users_username (username),
  unique uq_users_validation_code (validationCode)
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

const CREATE_TABLE_USERS_RESET_REQUESTS = `create table if not exists users_resets (
  userId varchar(26) binary not null primary key,
  code varchar(64) binary not null,
  createdAt datetime(3) not null default current_timestamp(3),
  info longtext null,
  unique uq_users_resets_code (code),
  CONSTRAINT fk_users_resets_user_id foreign key (userId) references users(userId) on delete cascade
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

const CREATE_TABLE_USERS_INVITATIONS = `create table if not exists users_invitations (
  email varchar(255) binary not null primary key,
  code varchar(64) binary not null,
  createdAt datetime(3) not null default current_timestamp(3),
  invitedBy varchar(255) not null,
  unique uq_users_invitations_code (code)
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

const CREATE_TABLE_TOKENS = `create table if not exists tokens (
  tokenHash varchar(64) binary not null primary key,
  shortToken varchar(64) binary not null,
  userId varchar(26) binary not null,
  createdAt datetime(3) not null default current_timestamp(3),
  expiresAt datetime(3) not null,
  lastUsedAt timestamp(3) null ON UPDATE current_timestamp(3),
  unique uq_tokens_short (shortToken),
  CONSTRAINT fk_tokens_user_id foreign key (userId) references users(userId) on delete cascade
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

const CREATE_TABLE_HISTORY = `create table if not exists history (
  id int NOT NULL primary key AUTO_INCREMENT,
  clientId varchar(255) NOT NULL,
  userId varchar(26) binary not null,
  hostname varchar(255) not null,
  timestamp timestamp(3) NOT NULL,
  data longtext NOT NULL,
  createdAt datetime(3) not null default current_timestamp(3),
  deletedAt timestamp(3) null,
  unique uq_history_client_id (clientId),
  CONSTRAINT fk_history_user_id foreign key (userId) references users(userId) on delete cascade,
  index idx_history_deleted_at (userId, deletedAt),
  index idx_history_hostname (userId, hostname)
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

const CREATE_TABLE_STORE = `CREATE TABLE store (
  id varchar(26) NOT NULL PRIMARY KEY,
  clientId varchar(36) NOT NULL,
  userId varchar(26) binary not null,
  host varchar(36) NOT NULL,
  tag varchar(64) binary not null,
  idx bigint(20) NOT NULL,
  timestamp bigint(20) NOT NULL,
  version varchar(8) NOT NULL,
  data longtext NOT NULL,
  cek varchar(256) NOT NULL,
  createdAt datetime(3) NOT NULL DEFAULT current_timestamp(3),
  unique key uq_store_record (userId, host, tag, idx),
  CONSTRAINT fk_store_user_id FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

const CREATE_TABLE_STORE_IDX_CACHE = `create table store_idx_cache(
  userId varchar(26) binary not null,
  host varchar(36) NOT NULL,
  tag varchar(64) binary not null,
  idx bigint(20) NOT NULL,
  primary key (userId, host, tag),
  CONSTRAINT fk_store_idx_cache_user_id FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

const CREATE_TABLE_COUNTERS = `create table if not exists counters (
    id varchar(36) binary NOT NULL,
    historyCount int not null default 0
) CHARACTER SET utf8 COLLATE utf8_general_ci`;

export const onSchemaInit = async function (dbClient: DbClient) {
  await dbClient.run(CREATE_TABLE_USERS);
  await dbClient.run(CREATE_TABLE_USERS_RESET_REQUESTS);
  await dbClient.run(CREATE_TABLE_TOKENS);
  await dbClient.run(CREATE_TABLE_USERS_INVITATIONS);
  await dbClient.run(CREATE_TABLE_HISTORY);
  await dbClient.run(CREATE_TABLE_STORE);
  await dbClient.run(CREATE_TABLE_STORE_IDX_CACHE);
  await dbClient.run(CREATE_TABLE_COUNTERS);
  await dbClient.run('insert ignore into counters (id, historyCount) values (?, 0)', [ulid()]);
};

// remove the following line we introduce a schema upgrade
/* istanbul ignore next */
export const onSchemaUpgrade = async function (dbClient: DbClient, fromVersion: number) {
  if (fromVersion < 2) {
    await dbClient.run(CREATE_TABLE_STORE_IDX_CACHE);
  }
};
