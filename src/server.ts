import { Microservice } from '@fluidware-it/express-microservice';
import type { NextFunction, Request, Response } from 'express';
import { static as ExpressStatic, urlencoded as ExpressUrlencoded } from 'express';

import { getMysql2Middleware } from '@fluidware-it/express-mysql2-middleware';
import path from 'path';
import { ATUIN_API_VERSION, OPENAPI_SPEC_FILE, OPENAPI_VALIDATE_RESPONSE, OPENAPI_VIEWER_PATH } from './consts';
import { apiReference } from '@scalar/express-api-reference';
import fs from 'fs';
import { VERSION } from './version';
import { sessionMiddleware } from './middlewares/sessionMiddleware';

export class NatuinServer extends Microservice {
  override setupPreLoggerMiddlewares() {
    this.express.use((req: Request, res: Response, next: NextFunction) => {
      res
        .setHeader('x-atuin-node-version', VERSION)
        .setHeader('atuin-version', ATUIN_API_VERSION)
        .setHeader('x-clacks-overhead', 'GNU Terry Pratchett, Kris Nova');
      next();
    });
  }
  override setupPreBodyParsersMiddlewares() {
    this.express.use(
      OPENAPI_VIEWER_PATH,
      apiReference({
        spec: {
          content: fs.readFileSync(OPENAPI_SPEC_FILE, 'utf8')
        }
      })
    );
  }
  override setupPostBodyParsersMiddlewares() {
    this.setupUiRoutes();
    this.express.use(getMysql2Middleware());
    this.express.use(sessionMiddleware);
    this.useOpenapiValidatorMiddleware(
      OPENAPI_SPEC_FILE,
      path.join(__dirname, 'controllers'),
      OPENAPI_VALIDATE_RESPONSE
    );
  }
  setupUiRoutes() {
    this.express.set('view engine', 'pug');
    this.express.use('/account/validate', ExpressUrlencoded({ extended: false }));
    this.express.use('/static', ExpressStatic('public'));
    this.express.get('/account/validate', (req: Request, res: Response) => {
      res.render('account-validate', {
        title: 'natuin'
      });
    });
    this.express.get('/account/accept-invite', (req: Request, res: Response) => {
      res.render('account-accept-invite', {
        title: 'natuin'
      });
    });
    this.express.get('/account/password-reset', (req: Request, res: Response) => {
      res.render('password-reset', {
        title: 'natuin'
      });
    });
    this.express.get('/account/forgot-password', (req: Request, res: Response) => {
      res.render('forgot-password', {
        title: 'natuin'
      });
    });
  }
}
