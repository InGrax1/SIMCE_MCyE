import express from 'express';
import { crearRutasTalleres } from '../talleres/rutas.js';
import { validarPublicacionTaller } from '../talleres/reglas.js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorApi } from '../errores.js';
import {
  auditar,
  proyectarPortal,
  tipos,
  validarContenido,
  validarPublicacion,
  validarAsociacionGaleria,
} from './contenido.js';

const editores = ['editor', 'responsable', 'admin'];
const responsables = ['responsable', 'admin'];
const buscar = (estado, id) => {
  const entrada = estado.entradas.find((e) => e.id === id);
  if (!entrada) throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró la entrada.');
  return entrada;
};
const version = (entrada, numero) => {
  if (!Number.isInteger(numero) || entrada.version !== numero)
    throw new ErrorApi(
      409,
      'VERSION_DESACTUALIZADA',
      'La entrada cambió. Recarga antes de guardar.',
    );
};

export function crearRutasCms({ almacen, auth, publicador, carpetaMedios, recuperacion }) {
  const router = express.Router();
  const tasas = new Map();
  const tasasInteres = new Map();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(crearRutasTalleres({ almacen, auth, publicador }));
  router.get('/publico/contenido', async (_req, res) =>
    res.json(proyectarPortal(await almacen.leer())),
  );
  const registrarInteres = async (req, res) => {
    req.body ??= {};
    const ahora = Date.now();
    for (const [ip, cuota] of tasasInteres) if (cuota.hasta < ahora) tasasInteres.delete(ip);
    const cuota = tasasInteres.get(req.ip) ?? { total: 0, hasta: ahora + 3600_000 };
    if (cuota.total >= 5 || tasasInteres.size > 10000)
      throw new ErrorApi(429, 'LIMITE_TASA', 'Inténtalo más tarde o escribe al módulo.');
    cuota.total++;
    tasasInteres.set(req.ip, cuota);
    await almacen.cambiar((estado) => {
      if (!estado.avisoInteres)
        throw new ErrorApi(
          503,
          'AVISO_PENDIENTE',
          'El registro de interés todavía no está disponible. Contacta al módulo por correo.',
        );
      if (
        ![true, 'on'].includes(req.body.aceptoAviso) ||
        req.body.versionAviso !== estado.avisoInteres.version
      )
        throw new ErrorApi(
          422,
          'AVISO_NO_ACEPTADO',
          'Lee y acepta el aviso de privacidad vigente.',
        );
      const programa = estado.entradas.find(
        (e) =>
          e.id === (req.params.id ?? req.body.programa) && e.tipo === 'programa' && e.publicado,
      );
      if (!programa) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El programa no está publicado.');
      const { nombre, correo, mensaje = '' } = req.body;
      if (
        typeof nombre !== 'string' ||
        !nombre.trim() ||
        nombre.length > 160 ||
        typeof correo !== 'string' ||
        correo.length > 160 ||
        !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(correo) ||
        typeof mensaje !== 'string' ||
        mensaje.length > 1000 ||
        /[<>]/.test(nombre + mensaje)
      )
        throw new ErrorApi(
          422,
          'DATOS_INVALIDOS',
          'Revisa el nombre, el correo y el mensaje (máximo 1000 caracteres).',
        );
      const id = randomUUID();
      (estado.intereses ??= []).push({
        id,
        programaId: programa.id,
        nombre: nombre.trim(),
        correo: correo.toLowerCase(),
        mensaje,
        versionAviso: estado.avisoInteres.version,
        momento: new Date().toISOString(),
      });
      auditar(estado, { id: 'visitante' }, 'REGISTRAR_INTERES', id);
    });
    res.status(201).json({ recibido: true });
  };
  router.post('/publico/programas/:id/intereses', auth.origen, registrarInteres);
  router.post(
    '/publico/intereses',
    express.urlencoded({ extended: false, limit: '8kb' }),
    auth.origen,
    registrarInteres,
  );
  const servirMedio = async (req, res) => {
    if (!/^[a-f0-9-]{36}\.webp$/.test(req.params.archivo))
      throw new ErrorApi(404, 'NO_ENCONTRADO', 'Imagen no encontrada.');
    const ruta = `/medios/${req.params.archivo}`;
    const estado = await almacen.leer();
    if (!estado.entradas.some((e) => e.publicado?.foto === ruta))
      throw new ErrorApi(404, 'NO_ENCONTRADO', 'Imagen no publicada.');
    res
      .type('webp')
      .set('Cache-Control', 'no-store')
      .set('X-Content-Type-Options', 'nosniff')
      .send(await readFile(join(carpetaMedios, req.params.archivo)));
  };
  router.get('/medios/:archivo', servirMedio);
  router.servirMedio = servirMedio;
  router.post('/auth/login', auth.origen, auth.login);
  if (recuperacion) {
    router.post('/auth/recuperar', auth.origen, recuperacion.solicitar);
    router.post('/auth/restablecer', auth.origen, recuperacion.restablecer);
  }
  router.post('/auth/refrescar', auth.origen, auth.refrescar);
  router.post('/auth/salir', auth.origen, auth.salir);
  router.post('/auth/clave', auth.origen, auth.identificar, auth.cambiarClave);
  router.get('/auth/yo', auth.identificar, (req, res) => res.json(req.usuario));
  router.use('/cms', auth.identificar, auth.permitir(editores), (req, _res, next) => {
    req.body ??= {};
    if (!['GET', 'HEAD'].includes(req.method)) return auth.origen(req, _res, next);
    next();
  });
  router.get('/cms/entradas', async (_req, res) => {
    const estado = await almacen.leer();
    res.json({
      entradas: estado.entradas,
      medios: estado.medios,
      tipos,
      revisionPortal: estado.revisionPortal,
      revisionHtml: estado.revisionHtml,
    });
  });
  router.get('/cms/auditoria', auth.permitir(responsables), async (_req, res) =>
    res.json((await almacen.leer()).auditoria.slice(-200).reverse()),
  );
  router.get('/cms/intereses', auth.permitir(responsables), async (req, res) => {
    const salida = await almacen.cambiar((estado) => {
      auditar(estado, req.usuario, 'CONSULTAR_INTERESES', 'intereses');
      return estado.intereses ?? [];
    });
    res.json(salida);
  });
  async function regenerar(res) {
    try {
      await publicador.publicar();
    } catch {
      return res.status(503).json({
        error: 'PUBLICACION_PENDIENTE',
        mensaje:
          'El cambio quedó guardado, pero el portal no se actualizó. Usa Regenerar portal para reintentarlo.',
      });
    }
    return res.json({ publicado: true });
  }
  router.post('/cms/regenerar', auth.permitir(responsables), async (_req, res) => regenerar(res));
  router.post('/cms/entradas', async (req, res) => {
    const datos = validarContenido(req.body.tipo, req.body.datos);
    const entrada = await almacen.cambiar((estado) => {
      validarAsociacionGaleria(estado, req.body.tipo, datos);
      if (req.body.tipo === 'institucion' && estado.entradas.some((e) => e.tipo === 'institucion'))
        throw new ErrorApi(409, 'FICHA_EXISTENTE', 'Edita la ficha institucional existente.');
      if (estado.entradas.length >= 2000)
        throw new ErrorApi(422, 'LIMITE_ENTRADAS', 'Se alcanzó el límite de 2000 entradas.');
      if (datos.foto?.startsWith('/medios/') && !estado.medios.some((m) => m.ruta === datos.foto))
        throw new ErrorApi(422, 'IMAGEN_INVALIDA', 'Selecciona una imagen del gestor.');
      const nueva = {
        id: randomUUID(),
        tipo: req.body.tipo,
        borrador: datos,
        publicado: null,
        orden: req.body.orden ?? estado.entradas.length,
        version: 1,
        validacion: 'pendiente',
        actualizadoEn: new Date().toISOString(),
        historial: [],
      };
      if (!Number.isInteger(nueva.orden) || nueva.orden < 0 || nueva.orden > 10000)
        throw new ErrorApi(422, 'ORDEN_INVALIDO', 'El orden debe ser un entero de 0 a 10000.');
      estado.entradas.push(nueva);
      auditar(estado, req.usuario, 'CREAR_BORRADOR', nueva.id);
      return nueva;
    });
    res.status(201).json(entrada);
  });
  router.put('/cms/entradas/:id', async (req, res) => {
    const salida = await almacen.cambiar((estado) => {
      const entrada = buscar(estado, req.params.id);
      version(entrada, req.body.version);
      const datos = validarContenido(entrada.tipo, req.body.datos);
      validarAsociacionGaleria(estado, entrada.tipo, datos);
      if (datos.foto?.startsWith('/medios/') && !estado.medios.some((m) => m.ruta === datos.foto))
        throw new ErrorApi(422, 'IMAGEN_INVALIDA', 'Selecciona una imagen del gestor.');
      entrada.historial = [
        { version: entrada.version, datos: entrada.borrador },
        ...entrada.historial,
      ].slice(0, 3);
      entrada.borrador = datos;
      entrada.version++;
      entrada.actualizadoEn = new Date().toISOString();
      if (req.body.orden !== undefined) {
        if (!Number.isInteger(req.body.orden) || req.body.orden < 0 || req.body.orden > 10000)
          throw new ErrorApi(422, 'ORDEN_INVALIDO', 'El orden debe ser un entero de 0 a 10000.');
        entrada.orden = req.body.orden;
      }
      auditar(estado, req.usuario, 'EDITAR_BORRADOR', entrada.id);
      return entrada;
    });
    res.json(salida);
  });
  router.post('/cms/entradas/:id/restaurar/:version', async (req, res) => {
    const salida = await almacen.cambiar((estado) => {
      const entrada = buscar(estado, req.params.id);
      version(entrada, req.body.version);
      const anterior = entrada.historial.find((v) => v.version === Number(req.params.version));
      if (!anterior) throw new ErrorApi(404, 'NO_ENCONTRADO', 'La versión ya no está disponible.');
      entrada.historial = [
        { version: entrada.version, datos: entrada.borrador },
        ...entrada.historial,
      ].slice(0, 3);
      entrada.borrador = structuredClone(anterior.datos);
      entrada.version++;
      auditar(estado, req.usuario, 'RESTAURAR_BORRADOR', entrada.id);
      return entrada;
    });
    res.json(salida);
  });
  router.post('/cms/entradas/:id/publicar', auth.permitir(responsables), async (req, res) => {
    if (req.body.confirmarRevision !== true)
      throw new ErrorApi(
        422,
        'REVISION_REQUERIDA',
        'Confirma que revisaste el contenido antes de publicarlo.',
      );
    await almacen.cambiar((estado) => {
      const entrada = buscar(estado, req.params.id);
      version(entrada, req.body.version);
      validarPublicacion(entrada);
      validarPublicacionTaller(entrada, entrada.borrador, req.body.motivo);
      const fechasAnteriores = entrada.fechasPublicadas ?? entrada.publicado;
      if (
        entrada.tipo === 'taller' &&
        entrada.inscripcion &&
        fechasAnteriores &&
        ['inicio', 'fin'].some((c) => entrada.borrador[c] !== fechasAnteriores[c])
      )
        (entrada.historialOperativo ??= []).push({
          accion: 'CAMBIAR_FECHAS',
          motivo: req.body.motivo.trim(),
          anterior: { inicio: fechasAnteriores.inicio, fin: fechasAnteriores.fin },
          usuarioId: req.usuario.id,
          momento: new Date().toISOString(),
        });
      validarAsociacionGaleria(estado, entrada.tipo, entrada.borrador, true);
      entrada.publicado = structuredClone(entrada.borrador);
      if (entrada.tipo === 'taller')
        entrada.fechasPublicadas = { inicio: entrada.publicado.inicio, fin: entrada.publicado.fin };
      entrada.version++;
      entrada.validacion = 'revisado-por-publicador';
      estado.revisionPortal++;
      auditar(estado, req.usuario, 'PUBLICAR', entrada.id);
    });
    await regenerar(res);
  });
  router.post('/cms/entradas/:id/despublicar', auth.permitir(responsables), async (req, res) => {
    await almacen.cambiar((estado) => {
      const entrada = buscar(estado, req.params.id);
      version(entrada, req.body.version);
      if (entrada.tipo === 'institucion')
        throw new ErrorApi(
          422,
          'FICHA_ESENCIAL',
          'La ficha institucional se actualiza publicando sus cambios.',
        );
      if (entrada.tipo === 'taller' && entrada.publicado)
        entrada.fechasPublicadas = { inicio: entrada.publicado.inicio, fin: entrada.publicado.fin };
      entrada.publicado = null;
      if (
        entrada.tipo === 'area' &&
        estado.entradas.some((e) => e.publicado?.areaId === entrada.id)
      )
        throw new ErrorApi(
          409,
          'AREA_EN_USO',
          'Despublica o reasigna primero las imágenes de la galería de esta área.',
        );
      entrada.version++;
      estado.revisionPortal++;
      auditar(estado, req.usuario, 'DESPUBLICAR', entrada.id);
    });
    await regenerar(res);
  });
  router.delete('/cms/entradas/:id', auth.permitir(responsables), async (req, res) => {
    await almacen.cambiar((estado) => {
      const entrada = buscar(estado, req.params.id);
      version(entrada, req.body.version);
      if (entrada.tipo === 'taller' && estado.inscripciones.some((i) => i.tallerId === entrada.id))
        throw new ErrorApi(
          409,
          'TALLER_CON_INSCRIPCIONES',
          'El taller tiene inscripciones. Conserva su historial y cancélalo desde el panel.',
        );
      if (entrada.tipo === 'institucion')
        throw new ErrorApi(
          422,
          'FICHA_ESENCIAL',
          'La ficha institucional se actualiza publicando sus cambios.',
        );
      if (
        entrada.tipo === 'area' &&
        estado.entradas.some(
          (e) =>
            e.borrador.areas?.includes(entrada.id) ||
            e.publicado?.areas?.includes(entrada.id) ||
            e.borrador.areaId === entrada.id ||
            e.publicado?.areaId === entrada.id,
        )
      )
        throw new ErrorApi(
          409,
          'AREA_EN_USO',
          'Quita primero la asociación del área en sus actividades y galerías.',
        );
      estado.entradas = estado.entradas.filter((e) => e.id !== entrada.id);
      estado.revisionPortal++;
      auditar(estado, req.usuario, 'ELIMINAR', entrada.id);
    });
    await regenerar(res);
  });
  router.post('/cms/vista-previa', async (req, res) => {
    const estado = await almacen.leer();
    const datos = validarContenido(req.body.tipo, req.body.datos);
    validarAsociacionGaleria(estado, req.body.tipo, datos);
    const entrada = req.body.id
      ? buscar(estado, req.body.id)
      : { id: randomUUID(), tipo: req.body.tipo, orden: estado.entradas.length };
    if (req.body.id && entrada.tipo !== req.body.tipo)
      throw new ErrorApi(422, 'CONTENIDO_INVALIDO', 'El tipo no corresponde a la entrada.');
    entrada.publicado = datos;
    if (!req.body.id) estado.entradas.push(entrada);
    res.type('html').send(await publicador.previsualizar(proyectarPortal(estado)));
  });
  router.post(
    '/cms/medios',
    express.raw({ type: () => true, limit: 5 * 1024 * 1024 }),
    async (req, res) => {
      const ahora = Date.now();
      const limite = tasas.get(req.usuario.id) ?? { total: 0, hasta: ahora + 3600_000 };
      if (limite.hasta < ahora) {
        limite.total = 0;
        limite.hasta = ahora + 3600_000;
      }
      if (limite.total >= 30)
        throw new ErrorApi(429, 'LIMITE_TASA', 'El límite de carga es de 30 imágenes por hora.');
      limite.total++;
      tasas.set(req.usuario.id, limite);
      let alt;
      try {
        alt = decodeURIComponent(req.get('x-imagen-alt') ?? '').trim();
      } catch {
        alt = '';
      }
      if (!alt || alt.length > 300 || /[<>]/.test(alt))
        throw new ErrorApi(
          422,
          'ALT_REQUERIDO',
          'Describe la imagen sin HTML (máximo 300 caracteres).',
        );
      let archivo;
      try {
        const imagen = sharp(req.body, { limitInputPixels: 25_000_000, failOn: 'warning' });
        const meta = await imagen.metadata();
        if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages ?? 1) > 1)
          throw new Error('Formato no admitido');
        let proceso = imagen.rotate();
        if (req.get('x-recorte')) {
          const recorte = JSON.parse(req.get('x-recorte'));
          const { left, top, width, height } = recorte;
          if (
            ![left, top, width, height].every(Number.isInteger) ||
            left < 0 ||
            top < 0 ||
            width < 1 ||
            height < 1
          )
            throw new Error('Recorte inválido');
          proceso = proceso.extract({ left, top, width, height });
        }
        archivo = await proceso
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer({ resolveWithObject: true });
      } catch {
        throw new ErrorApi(
          422,
          'IMAGEN_INVALIDA',
          'Usa JPEG, PNG o WebP estático, hasta 5 MB y 25 megapíxeles; revisa el recorte.',
        );
      }
      const id = randomUUID();
      const nombre = `${id}.webp`;
      const medio = {
        id,
        ruta: `/medios/${nombre}`,
        alt,
        ancho: archivo.info.width,
        alto: archivo.info.height,
        bytes: archivo.data.length,
      };
      await mkdir(carpetaMedios, { recursive: true });
      await writeFile(join(carpetaMedios, nombre), archivo.data, { flag: 'wx' });
      try {
        await almacen.cambiar((estado) => {
          estado.medios.push(medio);
          auditar(estado, req.usuario, 'SUBIR_IMAGEN', id);
        });
      } catch (error) {
        await unlink(join(carpetaMedios, nombre));
        throw error;
      }
      res.status(201).json(medio);
    },
  );
  return router;
}
