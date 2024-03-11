import { EnvParse } from '@fluidware-it/saddlebag';
import path from 'path';

// NODE_MODE: set by the image builder, do not override
export const NODE_MODE = EnvParse.envString('NODE_MODE', '');
export const OPENAPI_VIEWER_PATH = EnvParse.envString('OPENAPI_VIEWER_PATH', '/docs');
export const OPENAPI_SPEC_FILE = path.join(__dirname, '..', 'openapi', 'atuin-openapi.yaml');
export const OPENAPI_VALIDATE_RESPONSE = EnvParse.envBool('OPENAPI_VALIDATE_RESPONSE', true);

export const ATUIN_API_VERSION = '18.4.0';

export const NATUIN_KEY_PREFIX = EnvParse.envString('NATUIN_KEY_PREFIX', 'natuin');

export const PUBLIC_URL = EnvParse.envString('PUBLIC_URL', 'http://localhost:8080');
