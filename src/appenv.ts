import dotenv from 'dotenv';
import { NAME, VERSION } from './version';

dotenv.config({ override: true });

function setEnvIfNotSet(envVar: string, value: string) {
  /* eslint-disable n/no-process-env */
  if (!process.env[envVar]) {
    process.env[envVar] = value;
  }
  /* eslint-enable n/no-process-env */
}
setEnvIfNotSet('npm_package_version', VERSION);
setEnvIfNotSet('npm_package_name', NAME);
