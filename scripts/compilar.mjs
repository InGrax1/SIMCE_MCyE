import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const vite = resolve(raiz, 'node_modules/vite/bin/vite.js');
for (const [carpeta, args] of [
  ['packages/api', ['scripts/verificar-build.mjs']],
  ['packages/panel', [vite, 'build']],
  ['packages/portal', ['scripts/preparar-imagenes.mjs']],
  ['packages/portal', [vite, 'build']],
  ['packages/portal', [vite, 'build', '--ssr', 'src/entry-server.jsx', '--outDir', 'dist-ssr']],
  ['packages/portal', ['scripts/prerender.mjs']],
]) {
  await new Promise((aceptar, rechazar) => {
    const proceso = spawn(process.execPath, args, {
      cwd: resolve(raiz, carpeta),
      stdio: 'inherit',
    });
    proceso.on('error', rechazar);
    proceso.on('exit', (codigo) =>
      codigo === 0
        ? aceptar()
        : rechazar(new Error(`La compilación de ${carpeta} terminó con código ${codigo}.`)),
    );
  });
}
