import express from 'express';
import { ErrorApi } from '../errores.js';
import { auditar } from '../cms/contenido.js';
import { buscarTaller, proyectarTaller } from './reglas.js';
import {
  configurarTaller,
  registrarInscripcion,
  cambiarInscripcion,
  cambiarEstadoTaller,
} from './servicio.js';
import { exportarCsv, exportarPdf } from './exportar.js';
import {
  registrarConsulta,
  consultarRespuesta,
  listarConsultas,
  responderYNotificar,
  agregarSeguimiento,
  cambiarEstadoSolicitud,
} from './consultas.js';
import { sinAccesoPrivado } from './accesoPrivado.js';
import { consultarInscripcion, gestionarInscripcionPropia } from './seguimientoInscripciones.js';

export function crearRutasTalleres({ almacen, auth, publicador, enviarReciboConsulta }) {
  const router = express.Router();
  const cuotas = new Map();
  const cuotasConsultas = new Map();
  const cuotasLectura = new Map();
  const cuotasAcciones = new Map();
  function limitar(cuotas, limite, req) {
    const ahora = Date.now();
    for (const [ip, cuota] of cuotas) if (cuota.hasta <= ahora) cuotas.delete(ip);
    const cuota = cuotas.get(req.ip) ?? { total: 0, hasta: ahora + 3600_000 };
    if (cuota.total >= limite || cuotas.size >= 10000)
      throw new ErrorApi(
        429,
        'LIMITE_TASA',
        'Se alcanzó el límite de solicitudes. Inténtalo más tarde.',
      );
    cuota.total++;
    cuotas.set(req.ip, cuota);
  }
  router.get('/publico/talleres', async (_req, res) => {
    const estado = await almacen.leer();
    res.json({
      aviso: estado.avisoTalleres ?? null,
      talleres: estado.entradas
        .filter((e) => e.tipo === 'taller' && e.publicado)
        .map((e) => proyectarTaller(estado, e)),
    });
  });
  router.post('/publico/talleres/:id/inscripciones', auth.origen, async (req, res) => {
    const ahora = Date.now();
    for (const [ip, cuota] of cuotas) if (cuota.hasta <= ahora) cuotas.delete(ip);
    const cuota = cuotas.get(req.ip) ?? { total: 0, hasta: ahora + 3600_000 };
    if (cuota.total >= 5 || cuotas.size >= 10000)
      throw new ErrorApi(
        429,
        'LIMITE_TASA',
        'Se alcanzó el límite de solicitudes. Inténtalo más tarde.',
      );
    cuota.total++;
    cuotas.set(req.ip, cuota);
    const resultado = await almacen.cambiar((estado) =>
      registrarInscripcion(estado, req.params.id, req.body ?? {}),
    );
    const correo = enviarReciboConsulta ? await enviarReciboConsulta(resultado) : 'no_disponible';
    res.status(201).json({ ...resultado, correo });
  });
  router.post('/publico/talleres/:id/consultas', auth.origen, async (req, res) => {
    limitar(cuotasConsultas, 5, req);
    const resultado = await almacen.cambiar((estado) =>
      registrarConsulta(estado, req.params.id, req.body ?? {}),
    );
    const correo = enviarReciboConsulta ? await enviarReciboConsulta(resultado) : 'no_disponible';
    res.status(201).json({ ...resultado, correo });
  });
  router.post('/publico/consultas-talleres/consultar', auth.origen, async (req, res) => {
    limitar(cuotasLectura, 60, req);
    res.json(consultarRespuesta(await almacen.leer(), req.body ?? {}));
  });
  router.post('/publico/consultas-talleres/mensajes', auth.origen, async (req, res) => {
    limitar(cuotasAcciones, 15, req);
    res.json(await almacen.cambiar((estado) => agregarSeguimiento(estado, req.body ?? {})));
  });
  router.post('/publico/inscripciones/consultar', auth.origen, async (req, res) => {
    limitar(cuotasLectura, 60, req);
    res.json(consultarInscripcion(await almacen.leer(), req.body ?? {}));
  });
  router.post('/publico/inscripciones/acciones', auth.origen, async (req, res) => {
    limitar(cuotasAcciones, 15, req);
    res.json(await almacen.cambiar((estado) => gestionarInscripcionPropia(estado, req.body ?? {})));
  });
  router.use(
    ['/talleres', '/inscripciones', '/consultas-talleres'],
    auth.identificar,
    auth.permitir(['responsable', 'admin']),
    (req, res, next) =>
      ['GET', 'HEAD'].includes(req.method) ? next() : auth.origen(req, res, next),
  );
  router.get('/talleres/:id/consultas', async (req, res) => {
    res.json(
      await almacen.cambiar((estado) => listarConsultas(estado, req.params.id, req.usuario)),
    );
  });
  router.post('/consultas-talleres/:id/respuestas', async (req, res) => {
    res.json(
      await responderYNotificar(
        almacen,
        enviarReciboConsulta,
        req.params.id,
        req.body ?? {},
        req.usuario,
      ),
    );
  });
  router.post('/consultas-talleres/:id/acciones', async (req, res) => {
    res.json(
      await almacen.cambiar((s) =>
        cambiarEstadoSolicitud(s, req.params.id, req.body ?? {}, req.usuario),
      ),
    );
  });
  router.get('/talleres/:id/inscripciones', async (req, res) => {
    const formato = req.query.formato;
    if (formato && !['csv', 'pdf'].includes(formato))
      throw new ErrorApi(422, 'FORMATO_INVALIDO', 'Selecciona CSV o PDF.');
    const resultado = await almacen.cambiar((estado) => {
      const taller = buscarTaller(estado, req.params.id);
      const inscripciones = estado.inscripciones
        .filter((i) => i.tallerId === taller.id)
        .map(sinAccesoPrivado);
      auditar(
        estado,
        req.usuario,
        formato ? 'EXPORTAR_INSCRIPCIONES' : 'CONSULTAR_INSCRIPCIONES',
        taller.id,
      );
      return { taller, inscripciones, aviso: estado.avisoTalleres };
    });
    if (formato) {
      res.attachment(`inscripciones-${resultado.taller.id}.${formato}`);
      return formato === 'csv'
        ? res.type('text/csv; charset=utf-8').send(exportarCsv(resultado.inscripciones))
        : res.type('application/pdf').send(exportarPdf(resultado.taller, resultado.inscripciones));
    }
    res.json(resultado);
  });
  async function actualizar(req, res, cambiar) {
    const taller = await almacen.cambiar((estado) =>
      cambiar(estado, req.params.id, req.body ?? {}, req.usuario),
    );
    try {
      await publicador.publicar();
    } catch {
      throw new ErrorApi(
        503,
        'PUBLICACION_PENDIENTE',
        'El cambio quedó guardado. Recarga el taller y usa Regenerar portal para actualizar la página pública.',
      );
    }
    res.json(taller);
  }
  router.put('/talleres/:id', (req, res) => actualizar(req, res, configurarTaller));
  router.post('/talleres/:id/acciones', (req, res) => actualizar(req, res, cambiarEstadoTaller));
  router.post('/inscripciones/:id/acciones', async (req, res) =>
    res.json(
      await almacen.cambiar((estado) =>
        cambiarInscripcion(estado, req.params.id, req.body ?? {}, req.usuario),
      ),
    ),
  );
  return router;
}
