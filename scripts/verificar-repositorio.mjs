import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const archivos = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
const rutasProhibidas = [
  /(^|\/)node_modules\//,
  /(^|\/)dist(-ssr)?\//,
  /(^|\/)coverage\//,
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)~\$/,
];
const excepciones = new Set(['.env.example']);
const encontradas = archivos.filter(
  (archivo) => !excepciones.has(archivo) && rutasProhibidas.some((patron) => patron.test(archivo)),
);

if (encontradas.length > 0) {
  throw new Error(
    `Hay archivos locales o generados bajo control de versiones:\n${encontradas.join('\n')}`,
  );
}

const extensionesTexto = new Set([
  '',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.toml',
  '.txt',
  '.yaml',
  '.yml',
]);
const patronesSecretos = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{30,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
];

for (const archivo of archivos) {
  if (!extensionesTexto.has(extname(archivo).toLowerCase()) || statSync(archivo).size > 1_000_000) {
    continue;
  }
  const contenido = readFileSync(archivo, 'utf8');
  if (patronesSecretos.some((patron) => patron.test(contenido))) {
    throw new Error(`Se detectó un posible secreto en ${archivo}.`);
  }
}

console.log('Repositorio sin artefactos locales ni patrones de credenciales conocidos');
