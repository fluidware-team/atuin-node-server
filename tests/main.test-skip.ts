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
import { setMailerTransporter } from '../src/helper/mailerHelper';
import { createTransport } from 'nodemailer';
import { setTimeout } from 'timers/promises';
import { DbClient, setMysqlConnectionOptions } from '@fluidware-it/mysql2-client';
import { INVIATION_MODE } from '../src/types';

function cleanEnvVars() {
  Object.keys(process.env).forEach(env => {
    if (env.startsWith('ATUIN_') || env.startsWith('FW_')) {
      delete process.env[env];
    }
  });
}

const adminToken = 'natuin_test_qwertyuiopasdfghjklzxcvbnm123456';

describe('natuin', () => {
  jest.setTimeout(60_000);
  let container: StartedMariaDbContainer;
  let dbClient: DbClient;

  beforeAll(async () => {
    container = await new MariaDbContainer().start();
    process.env.NATUIN_DB_NAME = container.getDatabase();
    process.env.NATUIN_DB_HOST = container.getHost();
    process.env.NATUIN_DB_PORT = container.getMappedPort(3306).toString();
    process.env.NATUIN_DB_USERNAME = container.getUsername();
    process.env.NATUIN_DB_PASSWORD = container.getUserPassword();

    setMysqlConnectionOptions('', {
      port: EnvParse.envInt('NATUIN_DB_PORT', 3306),
      host: EnvParse.envString('NATUIN_DB_HOST', 'localhost'),
      user: EnvParse.envString('NATUIN_DB_USERNAME', 'atuin'),
      password: EnvParse.envString('NATUIN_DB_PASSWORD', 'atuin'),
      database: EnvParse.envString('NATUIN_DB_NAME', 'atuin'),
      timezone: 'Z'
    });

    const { migrate } = await import('../src/runMigration');
    await migrate(getLogger());

    setMysqlConnectionOptions('', {
      port: EnvParse.envInt('NATUIN_DB_PORT', 3306),
      host: EnvParse.envString('NATUIN_DB_HOST', 'localhost'),
      user: EnvParse.envString('NATUIN_DB_USERNAME', 'atuin'),
      password: EnvParse.envString('NATUIN_DB_PASSWORD', 'atuin'),
      database: EnvParse.envString('NATUIN_DB_NAME', 'atuin'),
      timezone: 'Z'
    });
    dbClient = new DbClient();
    await dbClient.open();
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.close();
    }
    await container!.stop();
    cleanEnvVars();
  });

  describe('server', () => {
    let server: NatuinServer;
    let port: number;
    let userToken: string | null = null;

    beforeAll(async () => {
      server = new NatuinServer({
        port: 0
      });
      const ret = await server.start();
      port = ret.port;
    });
    afterAll(async () => {
      await server.stop();
    });

    it('should expose a health check endpoint', async () => {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      expect(res.status).toBe(200);
    });
    describe('check protected urls', () => {
      const url = ['/sync/count', '/sync/status', '/account/me', '/account/tokens'];
      url.forEach(u => {
        it(`should refuse to access ${u} without authorization header`, async () => {
          const res = await fetch(`http://127.0.0.1:${port}${u}`);
          expect(res.status).toBe(401);
        });
        it(`should refuse to access ${u} with wrong authorization token type`, async () => {
          const res = await fetch(`http://127.0.0.1:${port}${u}`, {
            headers: {
              authorization: 'bearer this_fake_token'
            }
          });
          expect(res.status).toBe(401);
        });
        it(`should refuse to access ${u} with wrong authorization token format`, async () => {
          const res = await fetch(`http://127.0.0.1:${port}${u}`, {
            headers: {
              authorization: 'token qwertyuiopasdfghjklzxcvbnm123456'
            }
          });
          expect(res.status).toBe(401);
        });
        it(`should refuse to access ${u} with invalid token`, async () => {
          const res = await fetch(`http://127.0.0.1:${port}${u}`, {
            headers: {
              authorization: 'token this_fake_token'
            }
          });
          expect(res.status).toBe(401);
        });
      });
    });
    describe('registration closed', () => {
      it('should refuse to register a user', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@test.com',
            username: 'test',
            password: 'testComplexPassword99'
          })
        });
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.reason).toBe('this server is not open for registrations');
      });
    });
    describe('registration open - max password complexity', () => {
      const defaultPasswordValidation = structuredClone(Settings.passwordValidation);
      beforeAll(() => {
        Settings.openRegistration = true;
        Settings.passwordValidation = {
          minLength: 32,
          requireLowercase: true,
          requireUppercase: true,
          requireNumber: true,
          requireSpecial: true
        };
      });
      afterAll(() => {
        Settings.openRegistration = false;
        Settings.passwordValidation = defaultPasswordValidation;
      });
      it('should refuse to register a user if password does not match the required complexity (min length)', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'testfail@example.com',
            username: 'exampleuser',
            password: 'easy'
          })
        });
        await res.json();
        expect(res.status).toBe(400);
      });
      it('should refuse to register a user if password does not match the required complexity (lowercase char)', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'testfail@example.com',
            username: 'exampleuser',
            password: '1234567890ABCDEFGHJKLMNOPQRSTUVWXYZ!@#$%^&*()' // no lowercase
          })
        });
        await res.json();
        expect(res.status).toBe(400);
      });
      it('should refuse to register a user if password does not match the required complexity (uppercase char)', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'testfail@example.com',
            username: 'exampleuser',
            password: '1234567890abcdefghjklmnopqrstuvwxyz!@#$%^&*()' // no uppercase
          })
        });
        await res.json();
        expect(res.status).toBe(400);
      });
      it('should refuse to register a user if password does not match the required complexity (number)', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'testfail@example.com',
            username: 'exampleuser',
            password: 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghjklmnopqrstuvwxyz!@#$%^&*()' // no number
          })
        });
        await res.json();
        expect(res.status).toBe(400);
      });
      it('should refuse to register a user if password does not match the required complexity (special char)', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'testfail@example.com',
            username: 'exampleuser',
            password: '1234567890ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghjklmnopqrstuvwxyz' // no number
          })
        });
        await res.json();
        expect(res.status).toBe(400);
      });
    });
    describe('registration open', () => {
      beforeAll(() => {
        Settings.openRegistration = true;
      });
      afterAll(() => {
        Settings.openRegistration = false;
      });
      it('should refuse to register a user with a reserved username', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'me',
            password: 'anotherTestComplexPassword99'
          })
        });
        await res.json();
        expect(res.status).toBe(400);
      });
      it('should refuse to register a user if request is authenticated and made by non-admin user', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'exampleuser',
            password: 'anotherTestComplexPassword99'
          })
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        const res2 = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Token ${body.session}`
          },
          body: JSON.stringify({
            email: 'test2@example.com',
            username: 'exampleuser2',
            password: 'anotherTestComplexPassword99'
          })
        });
        await res2.json();
        expect(res2.status).toBe(400);
        await fetch(`http://127.0.0.1:${port}/account`, {
          method: 'DELETE',
          headers: {
            authorization: `Token ${body.session}`
          }
        });
      });
      it('should allow to register a user, call /account/me, check tokens and delete itself', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'exampleuser',
            password: 'anotherTestComplexPassword99'
          })
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty('session');

        const res2 = await fetch(`http:///127.0.0.1:${port}/account/me`, {
          headers: {
            Authorization: `Token ${body.session}`
          }
        });
        const body2 = await res2.json();
        expect(res2.status).toBe(200);
        expect(body2.username).toBe('exampleuser');

        const resTokens = await fetch(`http:///127.0.0.1:${port}/account/tokens`, {
          headers: {
            Authorization: `Token ${body.session}`
          }
        });
        const bodyTokens = await resTokens.json();
        expect(resTokens.status).toBe(200);
        expect(bodyTokens.length).toBe(1);

        await fetch(`http:///127.0.0.1:${port}/account`, {
          method: 'DELETE',
          headers: {
            Authorization: `Token ${body.session}`
          }
        });
        expect(res2.status).toBe(200);
      });
      it('an admin should check for an account', async () => {
        const url = `http://127.0.0.1:${port}/register`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'exampleuser',
            password: 'anotherTestComplexPassword99'
          })
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveProperty('session');

        const res2 = await fetch(`http:///127.0.0.1:${port}/account/exampleuser`, {
          headers: {
            Authorization: `Token ${adminToken}`
          }
        });
        const body2 = await res2.json();
        expect(res2.status).toBe(200);
        expect(body2.username).toBe('exampleuser');

        await fetch(`http:///127.0.0.1:${port}/account/exampleuser`, {
          method: 'DELETE',
          headers: {
            Authorization: `Token ${adminToken}`
          }
        });
        expect(res2.status).toBe(200);

        const res3 = await fetch(`http:///127.0.0.1:${port}/account/exampleuser`, {
          headers: {
            Authorization: `Token ${adminToken}`
          }
        });
        await res3.json();
        expect(res3.status).toBe(404);
      });
      describe('with blacklist', () => {
        beforeAll(() => {
          Settings.emailDomainsBlacklist = ['test.com'];
        });
        afterAll(() => {
          Settings.emailDomainsBlacklist = [];
        });
        it('should refuse to register a user with a blacklisted domain', async () => {
          const url = `http://127.0.0.1:${port}/register`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'test@test.com',
              username: 'test',
              password: 'testComplexPassword99'
            })
          });
          const body = await res.json();
          expect(res.status).toBe(400);
          expect(body.reason).toBe('this server is not open for registrations');
        });
        it('should allow to register a user with a non blacklisted domain', async () => {
          const url = `http://127.0.0.1:${port}/register`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'test@anothertest.com',
              username: 'anothertest',
              password: 'anotherTestComplexPassword99'
            })
          });
          const body = await res.json();
          expect(res.status).toBe(200);
          expect(body).toHaveProperty('session');
        });
      });
      describe('with whitelist', () => {
        beforeAll(() => {
          Settings.emailDomainsWhitelist = ['test.com'];
        });
        afterAll(() => {
          Settings.emailDomainsWhitelist = [];
        });
        it('should refuse to register a user with a non whitelisted domain', async () => {
          const url = `http://127.0.0.1:${port}/register`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'test@anothertest.com',
              username: 'test',
              password: 'testComplexPassword99'
            })
          });
          const body = await res.json();
          expect(res.status).toBe(400);
          expect(body.reason).toBe('this server is not open for registrations');
        });
        it('should allow to register a user with a whitelisted domain', async () => {
          const url = `http://127.0.0.1:${port}/register`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'test2@test.com',
              username: 'test2',
              password: 'anotherTestComplexPassword99'
            })
          });
          const body = await res.json();
          expect(res.status).toBe(200);
          expect(body).toHaveProperty('session');
        });
      });
    });
    it('should allow an admin to register a user', async () => {
      const res = await fetch(`http://127.0.0.1:${port}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${adminToken}`
        },
        body: JSON.stringify({
          email: 'test@test.com',
          username: 'test',
          password: 'testComplexPassword99'
        })
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toHaveProperty('session');
    });
    it('should allow login', async () => {
      const url = `http://127.0.0.1:${port}/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'test',
          password: 'testComplexPassword99'
        })
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toHaveProperty('session');
      userToken = body.session;
    });
    it('should deny normal user to get /account/{user}', async () => {
      const url = `http://127.0.0.1:${port}/account/test`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Token ${userToken}`
        }
      });
      await res.json();
      expect(res.status).toBe(403);
    });
    it('should deny normal user to delete other users', async () => {
      const url = `http://127.0.0.1:${port}/account/testanother`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Token ${userToken}`
        }
      });
      await res.json();
      expect(res.status).toBe(403);
    });
    it('should deny double login', async () => {
      const url = `http://127.0.0.1:${port}/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify({
          username: 'test',
          password: 'testComplexPassword99'
        })
      });
      await res.json();
      expect(res.status).toBe(400);
    });
    it('should not allow to delete the current token', async () => {
      const short = userToken?.split('_')[1];
      const url = `http://127.0.0.1:${port}/account/tokens/${short}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      expect(res.status).toBe(400);
    });
    it('should not allow to delete an existing token', async () => {
      const url = `http://127.0.0.1:${port}/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'test',
          password: 'testComplexPassword99'
        })
      });
      const body = await res.json();
      const anotherToken = body.session;
      const short = anotherToken.split('_')[1];
      const urlToDelete = `http://127.0.0.1:${port}/account/tokens/${short}`;
      const res2 = await fetch(urlToDelete, {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      expect(res2.status).toBe(200);
    });
    it('should allow a logged user to get sync count', async () => {
      const url = `http://127.0.0.1:${port}/sync/count`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        }
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.count).toBe(0);
    });
    it('should allow a logged user to get sync status', async () => {
      const url = `http://127.0.0.1:${port}/sync/status`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        }
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.count).toBe(0);
      expect(body.deleted).toHaveLength(0);
    });
    it('should allow a logged user to post history', async () => {
      async function getHistoryCount() {
        const urlCount = `http://127.0.0.1:${port}/sync/count`;
        const resCount = await fetch(urlCount, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`
          }
        });
        const bodyCount = await resCount.json();
        return bodyCount.count;
      }
      async function getTotalCount() {
        const urlTotalCount = `http://127.0.0.1:${port}/`;
        const resTotalCount = await fetch(urlTotalCount, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`
          }
        });
        const bodyTotalCount = await resTotalCount.json();
        return bodyTotalCount.total_history;
      }
      const preCount = await getHistoryCount();
      const url = `http://127.0.0.1:${port}/history`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify([
          {
            id: 'clientId1',
            timestamp: '2024-03-10T02:22:17.946Z',
            data: '{"ciphertext":[123,345],"nonce":[0,1,2]}',
            hostname: 'hostname1'
          }
        ])
      });
      await res.text();
      expect(res.status).toBe(200);

      const postCount = await getHistoryCount();
      const postTotalCount = await getTotalCount();
      expect(postCount).toBe(preCount + 1);
      expect(postTotalCount).toBe(0);
    });
    it('should allow a logged user to post history (duplicate id)', async () => {
      async function getHistoryCount() {
        const urlCount = `http://127.0.0.1:${port}/sync/count`;
        const resCount = await fetch(urlCount, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`
          }
        });
        const bodyCount = await resCount.json();
        return bodyCount.count;
      }
      async function getTotalCount() {
        const urlTotalCount = `http://127.0.0.1:${port}/`;
        const resTotalCount = await fetch(urlTotalCount, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${userToken}`
          }
        });
        const bodyTotalCount = await resTotalCount.json();
        return bodyTotalCount.total_history;
      }
      const preCount = await getHistoryCount();
      const preTotalCount = await getTotalCount();
      const url = `http://127.0.0.1:${port}/history`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify([
          {
            id: 'clientId1',
            timestamp: '2024-03-10T02:22:17.946Z',
            data: '{"ciphertext":[123,345],"nonce":[0,1,2]}',
            hostname: 'hostname1'
          }
        ])
      });
      await res.text();
      expect(res.status).toBe(200);

      const postCount = await getHistoryCount();
      const postTotalCount = await getTotalCount();

      expect(postCount).toBe(preCount);
      expect(postTotalCount).toBe(preTotalCount);
    });
    it('should return history from other hosts', async () => {
      const url = new URL(`http://127.0.0.1:${port}/sync/history`);
      url.searchParams.set('host', 'hostname2');
      url.searchParams.set('sync_ts', '2024-03-10T02:22:17.000Z');
      url.searchParams.set('history_ts', '1970-01-01T00:00:00Z');
      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.history).toHaveLength(1);
      expect(body.history[0]).toBe('{"ciphertext":[123,345],"nonce":[0,1,2]}');
    });

    it('should return history stats', async () => {
      const url = new URL(`http://127.0.0.1:${port}/sync/calendar/day?year=2024&month=3`);
      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body['10'].count).toBe(1);
    });

    it('should return history stats for a specific timezone', async () => {
      const url = new URL(`http://127.0.0.1:${port}/sync/calendar/day?year=2024&month=3`);
      url.searchParams.set('tz', 'Pacific/Honolulu');
      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body['9'].count).toBe(1);
    });

    it('should allow to delete a history', async () => {
      const url = `http://localhost:${port}/history`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify([
          {
            id: 'clientId2',
            timestamp: '2024-03-10T02:22:18.946Z',
            data: '{"ciphertext":[123,345],"nonce":[0,1,2]}',
            hostname: 'hostname1'
          }
        ])
      });
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify({
          client_id: 'clientId2'
        })
      });
      expect(res.status).toBe(200);
      const urlSync = `http://localhost:${port}/sync/status`;
      const resSync = await fetch(urlSync, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const bodySync = await resSync.json();
      expect(resSync.status).toBe(200);
      expect(bodySync.count).toBe(1);
      expect(bodySync.deleted).toHaveLength(1);
    });

    it('should empty data value if data content is invalid (not json)', async () => {
      let res = await fetch(`http://127.0.0.1:${port}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify([
          {
            id: 'clientIdInvalid1',
            timestamp: '2024-03-10T02:22:17.946Z',
            data: 'some invalid data',
            hostname: 'hostname2'
          }
        ])
      });
      await res.text();
      expect(res.status).toBe(200);

      const url = new URL(`http://127.0.0.1:${port}/sync/history`);
      url.searchParams.set('host', 'hostname1');
      url.searchParams.set('sync_ts', '2024-03-10T02:22:17.000Z');
      url.searchParams.set('history_ts', '1970-01-01T00:00:00Z');
      res = await fetch(url, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const bodyHistory = (await res.json()) as { history: string[] };
      expect(res.status).toBe(200);
      expect(bodyHistory.history.length).toBe(1);
      expect(bodyHistory.history[0]).toBe('{}');
    });

    it('should empty data value if data content is invalid (less keys json)', async () => {
      let res = await fetch(`http://127.0.0.1:${port}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify([
          {
            id: 'clientIdInvalid1',
            timestamp: '2024-03-10T02:24:17.946Z',
            data: '{"something": "else"}',
            hostname: 'hostname2'
          }
        ])
      });
      await res.text();
      expect(res.status).toBe(200);

      const url = new URL(`http://127.0.0.1:${port}/sync/history`);
      url.searchParams.set('host', 'hostname1');
      url.searchParams.set('sync_ts', '2024-03-10T02:24:17.000Z');
      url.searchParams.set('history_ts', '1970-01-01T00:00:00Z');
      res = await fetch(url, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const bodyHistory = (await res.json()) as { history: string[] };
      expect(res.status).toBe(200);
      expect(bodyHistory.history.length).toBe(1);
      expect(bodyHistory.history[0]).toBe('{}');
    });

    it('should empty data value if data content is invalid (different keys json)', async () => {
      let res = await fetch(`http://127.0.0.1:${port}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify([
          {
            id: 'clientIdInvalid1',
            timestamp: '2024-03-10T02:25:17.946Z',
            data: '{"something": "else", "another": "thing"}',
            hostname: 'hostname2'
          }
        ])
      });
      await res.text();
      expect(res.status).toBe(200);

      const url = new URL(`http://127.0.0.1:${port}/sync/history`);
      url.searchParams.set('host', 'hostname1');
      url.searchParams.set('sync_ts', '2024-03-10T02:25:17.000Z');
      url.searchParams.set('history_ts', '1970-01-01T00:00:00Z');
      res = await fetch(url, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const bodyHistory = (await res.json()) as { history: string[] };
      expect(res.status).toBe(200);
      expect(bodyHistory.history.length).toBe(1);
      expect(bodyHistory.history[0]).toBe('{}');
    });

    it('should empty data value if data content is invalid (too long)', async () => {
      const buffer: Buffer = Buffer.alloc(33 * 1024);
      buffer.fill(1);
      const data = { ciphertext: Array.from(buffer), nonce: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] };
      let res = await fetch(`http://127.0.0.1:${port}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${userToken}`
        },
        body: JSON.stringify([
          {
            id: 'clientIdInvalid1',
            timestamp: '2024-03-10T02:26:17.946Z',
            data: JSON.stringify(data),
            hostname: 'hostname2'
          }
        ])
      });
      await res.text();
      expect(res.status).toBe(200);
      const url = new URL(`http://127.0.0.1:${port}/sync/history`);
      url.searchParams.set('host', 'hostname1');
      url.searchParams.set('sync_ts', '2024-03-10T02:26:17.000Z');
      url.searchParams.set('history_ts', '1970-01-01T00:00:00Z');
      res = await fetch(url, {
        headers: {
          Authorization: `Token ${userToken}`
        }
      });
      const bodyHistory = (await res.json()) as { history: string[] };
      expect(res.status).toBe(200);
      expect(bodyHistory.history.length).toBe(1);
      expect(bodyHistory.history[0]).toBe('{}');
    });

    describe('change password', () => {
      let token = '';
      beforeAll(async () => {
        Settings.openRegistration = true;
        const res = await fetch(`http://127.0.0.1:${port}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'testpassword@example.com',
            username: 'testpassworduser',
            password: 'first1ComplexPassword'
          })
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        token = body.session;
      });
      afterAll(async () => {
        Settings.openRegistration = false;
        await fetch(`http://127.0.0.1:${port}/account`, {
          method: 'DELETE',
          headers: {
            Authorization: `Token ${token}`
          }
        });
      });
      it('should correctly handle change password flow', async () => {
        const urlPassword = `http://127.0.0.1:${port}/account/password`;
        let res = await fetch(urlPassword, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`
          },
          body: JSON.stringify({
            current_password: 'wrongpassword',
            new_password: 'secondComplexP4ssword'
          })
        });
        await res.json();
        expect(res.status).toBe(403);
        res = await fetch(urlPassword, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`
          },
          body: JSON.stringify({
            current_password: 'first1ComplexPassword',
            new_password: 'secondComplexP4ssword'
          })
        });
        await res.text();
        expect(res.status).toBe(200);
        res = await fetch(`http://127.0.0.1:${port}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'testpassworduser',
            password: 'secondComplexP4ssword'
          })
        });
        const loginBody = await res.json();
        expect(res.status).toBe(200);
        expect(loginBody).toHaveProperty('session');
      });
    });
    describe('email validation', () => {
      let token = '';
      let from = '';
      let to = '';
      let message = '';
      const user = {
        email: 'testvalidationemail@example.com',
        username: 'testpassworduser',
        password: 'first1ComplexPassword'
      };
      beforeAll(async () => {
        const transporter = createTransport({
          jsonTransport: true
        });
        setMailerTransporter(transporter, (_err, info) => {
          from = info.envelope.from;
          to = info.envelope.to[0];
          message = info.message;
        });
        Settings.openRegistration = true;
        Settings.emailFrom = 'sender@test.com';
        Settings.emailRegistrationValidation = true;
        const res = await fetch(`http://127.0.0.1:${port}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user)
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        token = body.session;
      });
      afterAll(async () => {
        Settings.openRegistration = false;
        Settings.emailFrom = '';
        Settings.emailRegistrationValidation = false;
        await fetch(`http://127.0.0.1:${port}/account`, {
          method: 'DELETE',
          headers: {
            Authorization: `Token ${token}`
          }
        });
      });
      it('should send an email with a validation link', async () => {
        await setTimeout(50);
        expect(from).toBe('sender@test.com');
        expect(to).toBe('testvalidationemail@example.com');
        expect(message).toContain('Hello testpassworduser!');

        const regex = /Your validation code is (.*?)\\n/;
        const match = message.match(regex);
        const validationCode = match ? match[1] : null;
        expect(validationCode).toBeTruthy();
        const htmlFormReq = await fetch(`http://localhost:${port}/account/validate`);
        await htmlFormReq.text();
        const resp = await fetch(`http://localhost:${port}/account/validate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            username: 'testpassworduser',
            password: 'first1ComplexPassword',
            code: validationCode
          })
        });
        expect(resp.status).toBe(200);
      });
      it('should refuse to validate an account with an invalid code', async () => {
        const resp = await fetch(`http://localhost:${port}/account/validate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            username: 'testpassworduser',
            password: 'first1ComplexPassword',
            code: 'invalidcode'
          })
        });
        expect(resp.status).toBe(400);
      });
    });
    describe('password reset', () => {
      let token = '';
      const user = {
        email: 'testresetpassword@example.com',
        username: 'testresetpassworduser',
        password: 'first1ComplexPassword'
      };
      beforeAll(async () => {
        Settings.openRegistration = true;
        const res = await fetch(`http://127.0.0.1:${port}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user)
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        token = body.session;
      });
      afterAll(async () => {
        Settings.openRegistration = false;
        await fetch(`http://127.0.0.1:${port}/account`, {
          method: 'DELETE',
          headers: {
            Authorization: `Token ${token}`
          }
        });
      });
      it('should send an email with a reset link', async () => {
        let to = '';
        let message = '';
        const transporter = createTransport({
          jsonTransport: true
        });
        setMailerTransporter(transporter, (_err, info) => {
          to = info.envelope.to[0];
          message = info.message;
        });
        const url = `http://localhost:${port}/account/forgot-password`;
        let res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            username: user.username
          })
        });
        await res.json();
        expect(res.status).toBe(200);
        // timeout?
        await setTimeout(50);
        expect(to).toBe(user.email);
        expect(message).toContain(`Hello ${user.username}!`);
        const regex = /Your reset code is\\n\\n(.*?)\\n/;
        const match = message.match(regex);
        const validationCode = match ? match[1] : null;
        expect(validationCode).toBeTruthy();
        res = await fetch(`http://localhost:${port}/account/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: validationCode,
            password: 'newComplexPassword99'
          })
        });
        await res.json();
        expect(res.status).toBe(200);
        // login with new password
        res = await fetch(`http://localhost:${port}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: user.username,
            password: 'newComplexPassword99'
          })
        });
        await res.json();
        expect(res.status).toBe(200);
        // login must fail with old password
        res = await fetch(`http://localhost:${port}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: user.username,
            password: user.password
          })
        });
        await res.json();
        expect(res.status).toBe(403);
        // validation code must be invalid
        res = await fetch(`http://localhost:${port}/account/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: validationCode,
            password: 'extraComplexPassword123'
          })
        });
        await res.json();
        expect(res.status).toBe(400);
      });
      it('a new forget password request should override the previous one', async () => {
        let to = '';
        let message = '';
        const transporter = createTransport({
          jsonTransport: true
        });
        setMailerTransporter(transporter, (_err, info) => {
          to = info.envelope.to[0];
          message = info.message;
        });
        const url = `http://localhost:${port}/account/forgot-password`;
        let res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            username: user.username
          })
        });
        await res.json();
        expect(res.status).toBe(200);
        await setTimeout(50);
        expect(to).toBe(user.email);
        expect(message).toContain(`Hello ${user.username}!`);
        const regex = /Your reset code is\\n\\n(.*?)\\n/;
        const match = message.match(regex);
        const firstValidationCode = match ? match[1] : null;
        expect(firstValidationCode).toBeTruthy();

        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            username: user.username
          })
        });
        await res.json();
        expect(res.status).toBe(200);
        await setTimeout(50);
        expect(to).toBe(user.email);
        expect(message).toContain(`Hello ${user.username}!`);
        const match2 = message.match(regex);
        const secondValidationCode = match2 ? match2[1] : null;
        expect(secondValidationCode).toBeTruthy();
        // reset with the first code must fail
        res = await fetch(`http://localhost:${port}/account/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: firstValidationCode,
            password: 'newComplexPassword99'
          })
        });
        await res.json();
        expect(res.status).toBe(400);
        // reset with the second code must succeed
        res = await fetch(`http://localhost:${port}/account/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: secondValidationCode,
            password: 'newComplexPassword992'
          })
        });
        await res.json();
        expect(res.status).toBe(200);
        // login with new password
        res = await fetch(`http://localhost:${port}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: user.username,
            password: 'newComplexPassword992'
          })
        });
        await res.json();
        expect(res.status).toBe(200);
      });
    });
    describe('user block/unblock', () => {
      let token = '';
      const user = {
        email: 'testblock@example.com',
        username: 'testblock',
        password: 'first1ComplexPassword'
      };
      beforeAll(async () => {
        Settings.openRegistration = true;
        const res = await fetch(`http://127.0.0.1:${port}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user)
        });
        const body = await res.json();
        expect(res.status).toBe(200);
        token = body.session;
      });
      afterAll(async () => {
        Settings.openRegistration = false;
        await fetch(`http://127.0.0.1:${port}/account`, {
          method: 'DELETE',
          headers: {
            Authorization: `Token ${token}`
          }
        });
      });
      it('should return an error if block is called by non admin', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/account/${user.username}/block`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Token ${token}`
          }
        });
        expect(res.status).toBe(403);
      });
      it('should block a user', async () => {
        const res = await fetch(`http://127.0.0.1:${port}/account/${user.username}/block`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Token ${adminToken}`
          }
        });
        expect(res.status).toBe(200);
        // login must fail
        const res2 = await fetch(`http://127.0.0.1:${port}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: user.username,
            password: user.password
          })
        });
        expect(res2.status).toBe(403);
        // token must be blocked
        const res2bis = await fetch(`http://127.0.0.1:${port}/account/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Token ${token}`
          }
        });
        expect(res2bis.status).toBe(403);
        // unblock
        await fetch(`http://127.0.0.1:${port}/account/${user.username}/unblock`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Token ${adminToken}`
          }
        });
        expect(res.status).toBe(200);
        // login must succeed
        const res4 = await fetch(`http://127.0.0.1:${port}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: user.username,
            password: user.password
          })
        });
        expect(res4.status).toBe(200);
      });
    });
    describe('user invitation', () => {
      let to = '';
      let message = '';
      const regex = /Your invitation code is (.*?)\\n/;
      const transporter = createTransport({
        jsonTransport: true
      });
      beforeAll(() => {
        setMailerTransporter(transporter, (_err, info) => {
          to = info.envelope.to[0];
          message = info.message;
        });
      });
      describe('user invitation closed', () => {
        beforeAll(() => {
          Settings.invitationMode = INVIATION_MODE.CLOSE;
        });
        it('should refuse to register a user (unauth request)', async () => {
          const res = await fetch(`http://127.0.0.1:${port}/account/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: 'testinvite@example.com'
            })
          });
          await res.text();
          expect(res.status).toBe(401);
        });
        it('should refuse to register a user (admin)', async () => {
          const res = await fetch(`http://127.0.0.1:${port}/account/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Token ${adminToken}`
            },
            body: JSON.stringify({
              email: 'testinvite@example.com'
            })
          });
          await res.text();
          expect(res.status).toBe(405);
        });
      });
      async function adminInviteUser() {
        let res = await fetch(`http://127.0.0.1:${port}/account/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Token ${adminToken}`
          },
          body: JSON.stringify({
            email: 'testinvite@example.com'
          })
        });
        await res.text();
        expect(res.status).toBe(200);
        await setTimeout(50);
        expect(to).toBe('testinvite@example.com');
        const match = message.match(regex);
        const firstValidationCode = match ? match[1] : null;
        expect(firstValidationCode).toBeTruthy();
        res = await fetch(`http://127.0.0.1:${port}/account/accept-invitation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Token ${adminToken}`
          },
          body: JSON.stringify({
            username: 'testinviteuser',
            password: 'notcomplexpassword',
            code: firstValidationCode
          })
        });
        await res.json();
        expect(res.status).toBe(400);
        res = await fetch(`http://127.0.0.1:${port}/account/accept-invitation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'testinviteuser',
            password: 'notcomplexpassword',
            code: firstValidationCode
          })
        });
        await res.json();
        expect(res.status).toBe(400);
        res = await fetch(`http://127.0.0.1:${port}/account/accept-invitation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'testinviteuser',
            password: 'enoughComplexPassword1',
            code: firstValidationCode
          })
        });
        await res.json();
        expect(res.status).toBe(200);
      }
      describe('user invitation admin-only', () => {
        let userToken = '';
        beforeAll(() => {
          Settings.invitationMode = INVIATION_MODE.ADMIN_ONLY;
        });
        afterAll(async () => {
          Settings.invitationMode = INVIATION_MODE.CLOSE;
          await fetch(`http://127.0.0.1:${port}/account`, {
            method: 'DELETE',
            headers: {
              authorization: `Token ${userToken}`
            }
          });
        });
        it('should allow to invite a user (only admin user)', async () => {
          await adminInviteUser();
          let res = await fetch(`http://127.0.0.1:${port}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: 'testinviteuser',
              password: 'enoughComplexPassword1'
            })
          });
          const loginBody = await res.json();
          expect(res.status).toBe(200);
          expect(loginBody).toHaveProperty('session');
          userToken = loginBody.session;
          res = await fetch(`http://127.0.0.1:${port}/account/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Token ${userToken}`
            },
            body: JSON.stringify({
              email: 'testinvite2@example.com'
            })
          });
          await res.text();
          expect(res.status).toBe(405);
        });
      });
      describe('user invitation open', () => {
        beforeAll(() => {
          Settings.invitationMode = INVIATION_MODE.OPEN;
        });
        afterAll(() => {
          Settings.invitationMode = INVIATION_MODE.CLOSE;
        });
        it('should allow to register a user (normal)', async () => {
          await adminInviteUser();
          let res = await fetch(`http://127.0.0.1:${port}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: 'testinviteuser',
              password: 'enoughComplexPassword1'
            })
          });
          const loginBody = await res.json();
          expect(res.status).toBe(200);
          expect(loginBody).toHaveProperty('session');
          userToken = loginBody.session;
          res = await fetch(`http://127.0.0.1:${port}/account/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Token ${userToken}`
            },
            body: JSON.stringify({
              email: 'testinvite3@example.com'
            })
          });
          await res.text();
          expect(res.status).toBe(200);
        });
      });
    });
  });
});
