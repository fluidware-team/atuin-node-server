import { getSha256 } from '@fluidware-it/saddlebag';

export function hashPassword(id: string, password: string) {
  return getSha256(`${id}#${password}`);
}
