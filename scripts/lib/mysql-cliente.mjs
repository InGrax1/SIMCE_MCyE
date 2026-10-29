import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';

export async function ejecutarClienteMysql(comando, base, entrada, entorno = process.env) {
  if (!['mysql', 'mysqldump'].includes(comando) || !/^[a-zA-Z0-9_]{1,64}$/.test(base))
    throw new Error('Comando o base de datos no válidos.');
  const carpeta = await mkdtemp(join(tmpdir(), 'simce-cliente-mysql-'));
  const configuracion = join(carpeta, 'cliente.cnf');
  const escapar = (valor) =>
    String(valor ?? '')
      .replaceAll('\\', '\\\\')
      .replaceAll('"', '\\"')
      .replaceAll('\n', '\\n')
      .replaceAll('\r', '\\r');
  const directorio =
    entorno.MYSQL_BIN_DIR ??
    (process.platform === 'win32' ? 'C:/Program Files/MySQL/MySQL Server 8.0/bin' : '/usr/bin');
  const host = entorno.DATABASE_HOST ?? '127.0.0.1';
  const modoTls = ['127.0.0.1', 'localhost', '::1'].includes(host) ? 'REQUIRED' : 'VERIFY_IDENTITY';
  try {
    await writeFile(
      configuracion,
      `[client]\nhost="${escapar(host)}"\nport=${Number(entorno.DATABASE_PORT ?? 3306)}\nuser="${escapar(entorno.DATABASE_USER)}"\npassword="${escapar(entorno.DATABASE_PASSWORD)}"\n`,
      { mode: 0o600, flag: 'wx' },
    );
    const args = [
      `--defaults-file=${configuracion}`,
      `--host=${host}`,
      `--port=${Number(entorno.DATABASE_PORT ?? 3306)}`,
      `--user=${entorno.DATABASE_USER}`,
      '--default-character-set=utf8mb4',
      `--ssl-mode=${modoTls}`,
      ...(entorno.MYSQL_SSL_CA ? [`--ssl-ca=${entorno.MYSQL_SSL_CA}`] : []),
    ];
    if (comando === 'mysqldump')
      args.push(
        '--single-transaction',
        '--no-tablespaces',
        '--set-gtid-purged=OFF',
        '--hex-blob',
        '--routines',
        '--events',
        '--triggers',
        base,
      );
    else args.push('--binary-mode=1', `--database=${base}`);
    return await new Promise((ok, no) => {
      const proceso = spawn(
        join(directorio, comando + (process.platform === 'win32' ? '.exe' : '')),
        args,
        { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
      );
      const partes = [];
      let longitud = 0;
      proceso.stdout.on('data', (parte) => {
        longitud += parte.length;
        if (longitud > 128 * 1024 * 1024) {
          proceso.kill();
          no(new Error('El volcado excede el límite de 128 MB de esta herramienta.'));
        } else partes.push(parte);
      });
      proceso.stderr.resume();
      proceso.stdin.on('error', () => {});
      proceso.once('error', no);
      proceso.once('close', (codigo) =>
        codigo === 0
          ? ok(Buffer.concat(partes).toString('utf8'))
          : no(
              new Error(
                `El cliente ${comando} terminó con código ${codigo}; no se muestran datos ni credenciales del volcado.`,
              ),
            ),
      );
      proceso.stdin.end(entrada);
    });
  } finally {
    if (
      dirname(carpeta) === resolve(tmpdir()) &&
      carpeta.startsWith(join(resolve(tmpdir()), 'simce-cliente-mysql-'))
    )
      await rm(carpeta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
