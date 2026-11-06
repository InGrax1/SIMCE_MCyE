import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';

export function cargarEntornoLocal(raiz) {
  try {
    loadEnvFile(resolve(raiz, '.env'));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
