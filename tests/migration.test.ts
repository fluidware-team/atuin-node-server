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

import { MariaDbContainer, StartedMariaDbContainer } from '@testcontainers/mariadb';
import { EnvParse, getLogger } from '@fluidware-it/saddlebag';
import { NatuinServer } from '../src/server';
import { Settings } from '../src/Settings';
import { DbClient, setMysqlConnectionOptions } from '@fluidware-it/mysql2-client';

function cleanEnvVars() {
  Object.keys(process.env).forEach(env => {
    if (env.startsWith('NATUIN_')) {
      delete process.env[env];
    }
  });
}

const adminToken = 'natuin_test_qwertyuiopasdfghjklzxcvbnm123456';

describe('natuin', () => {
  jest.setTimeout(60_000);
  let container: StartedMariaDbContainer;
  let dbClient: DbClient;
  let server: NatuinServer | undefined;

  beforeAll(async () => {
    container = await new MariaDbContainer().start();
    process.env.NATUIN_DB_NAME = container.getDatabase();
    process.env.NATUIN_DB_HOST = container.getHost();
    process.env.NATUIN_DB_PORT = container.getMappedPort(3306).toString();
    process.env.NATUIN_DB_USERNAME = container.getUsername();
    process.env.NATUIN_DB_PASSWORD = container.getUserPassword();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    await container!.stop();
    cleanEnvVars();
  });

  describe('migration', () => {
    beforeAll(async () => {
      delete require.cache[require.resolve('@fluidware-it/mysql2-client')];
      const { DbClient: DbClient2 } = await import('@fluidware-it/mysql2-client');
      setMysqlConnectionOptions('', {
        port: EnvParse.envInt('NATUIN_DB_PORT', 3306),
        host: EnvParse.envString('NATUIN_DB_HOST', 'localhost'),
        user: EnvParse.envString('NATUIN_DB_USERNAME', 'atuin'),
        password: EnvParse.envString('NATUIN_DB_PASSWORD', 'atuin'),
        database: EnvParse.envString('NATUIN_DB_NAME', 'atuin'),
        timezone: 'Z'
      });
      dbClient = new DbClient2();
      await dbClient.open();
    });
    afterAll(async () => {
      await dbClient.close();
    });
    it('should init db without seeding admin', async () => {
      const { migrate } = await import('../src/runMigration');
      const { CURRENT_SCHEMA_VERSION } = await import('../src/db/migrate');
      await migrate(getLogger());
      const res = await dbClient.get(`select value from ${container.getDatabase()}._version`);
      expect(res?.value).toStrictEqual(CURRENT_SCHEMA_VERSION);
      const resAdmin = await dbClient.get(`select count(*) count from ${container.getDatabase()}.users`);
      expect(resAdmin?.count).toStrictEqual(0);
    });
    it('should init db with seeding admin - throwing an error since token is not valid', async () => {
      const { migrate } = await import('../src/runMigration');
      await import('../src/db/migrate');
      Settings.adminToken = 'bum';
      await expect(async () => migrate(getLogger())).rejects.toThrow('Invalid admin token format');
    });
    it('should init db with seeding admin (create)', async () => {
      const { migrate } = await import('../src/runMigration');
      Settings.adminToken = 'natuin_testa_something';
      await migrate(getLogger());
      const resAdmin = await dbClient.get(`select count(*) count from ${container.getDatabase()}.users`);
      expect(resAdmin?.count).toStrictEqual(1);
    });
    it('should init db with seeding admin (update by hash)', async () => {
      const { migrate } = await import('../src/runMigration');
      Settings.adminToken = 'natuin_testa_somethingelse';
      await migrate(getLogger());
      const resAdmin = await dbClient.get(`select count(*) count from ${container.getDatabase()}.users`);
      expect(resAdmin?.count).toStrictEqual(1);
    });
    it('should init db with seeding admin (update)', async () => {
      const { migrate } = await import('../src/runMigration');
      Settings.adminToken = adminToken;
      await migrate(getLogger());
      const resAdmin = await dbClient.get(`select shortToken from ${container.getDatabase()}.tokens`);
      expect(resAdmin?.shortToken).toStrictEqual('test');
    });
  });
});
