import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const modo = process.argv[2];
const comandos = [];
if (!modo)
  comandos.push(
    [raiz, ['scripts/verificar-repositorio.mjs']],
    [raiz, ['node_modules/eslint/bin/eslint.js', '.']],
    [raiz, ['node_modules/prettier/bin/prettier.cjs', '--check', '.']],
  );
if (modo && !['pruebas', 'cobertura'].includes(modo))
  throw new Error('Modo de verificación desconocido.');
for (const paquete of ['api', 'dominio', 'panel', 'portal'])
  comandos.push([
    resolve(raiz, 'packages', paquete),
    [
      resolve(raiz, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--passWithNoTests',
      '--no-file-parallelism',
      ...(modo === 'cobertura' ? ['--coverage'] : []),
    ],
  ]);
for (const [cwd, args] of comandos)
  await new Promise((ok, no) => {
    const proceso = spawn(process.execPath, args, { cwd, stdio: 'inherit' });
    proceso.on('error', no);
    proceso.on('exit', (codigo) =>
      codigo === 0 ? ok() : no(new Error(`Falló la verificación en ${cwd} (${codigo}).`)),
    );
  });
