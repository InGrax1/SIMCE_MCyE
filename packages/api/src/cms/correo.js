import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function configurarCorreo(carpeta, entorno = process.env) {
  const modo = entorno.CORREO_MODO ?? (entorno.NODE_ENV === 'production' ? 'smtp' : 'archivo');
  if (modo === 'archivo') {
    if (entorno.NODE_ENV === 'production')
      throw new Error('El buzón de archivo es exclusivo del desarrollo local.');
    return async (mensaje) => {
      const destino = join(carpeta, 'correos');
      await mkdir(destino, { recursive: true });
      await writeFile(
        join(destino, `${Date.now()}-${randomUUID()}.json`),
        JSON.stringify({ ...mensaje, creadoEn: new Date().toISOString() }, null, 2),
        { flag: 'wx', mode: 0o600 },
      );
      return { modo: 'archivo' };
    };
  }
  if (modo !== 'smtp') throw new Error('CORREO_MODO debe ser archivo o smtp.');
  if (!entorno.SMTP_HOST || !entorno.SMTP_FROM) return null;
  const puerto = Number(entorno.SMTP_PORT ?? 587);
  if (![465, 587].includes(puerto)) throw new Error('Configura SMTP_PORT en 465 o 587 con TLS.');
  const transporte = nodemailer.createTransport({
    host: entorno.SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    requireTLS: true,
    auth: entorno.SMTP_USER ? { user: entorno.SMTP_USER, pass: entorno.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  return async ({ para, asunto, texto, html }) => {
    await transporte.sendMail({
      from: entorno.SMTP_FROM,
      to: para,
      subject: asunto,
      text: texto,
      html,
    });
    return { modo: 'smtp' };
  };
}
