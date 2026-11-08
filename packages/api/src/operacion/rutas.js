import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import {
  calcularRenglon,
  fechaOperativa,
  identificarEtiqueta,
  rolesOperativos,
  rolesResponsables,
  saldoPorProducto,
  uuidOperativo,
} from '@simce/dominio';
import { ErrorApi } from '../errores.js';
import { construirReporte, reporteCsv, reportePdf } from './reportes.js';

export function crearRutasOperacion({ auth, operacion }) {
  const rutas = Router();
  const autenticar = [auth.identificar, auth.permitir(rolesOperativos)];
  rutas.post(
    '/sync/push',
    (req, _res, next) => {
      if (!Object.hasOwn(req.body ?? {}, 'operaciones')) return next('route');
      next();
    },
    autenticar,
    auth.origen,
    async (req, res) => {
      res.status(207).json(await operacion.enviar(req.body.operaciones, req.usuario));
    },
  );
  rutas.get('/sync/pull', autenticar, async (req, res) => {
    const cursor = req.query.cursor ?? '0';
    if (
      typeof cursor !== 'string' ||
      !/^\d+$/.test(cursor) ||
      !Number.isSafeInteger(Number(cursor))
    )
      throw new ErrorApi(422, 'CURSOR_INVALIDO', 'El cursor de sincronización no es válido.');
    res.json(await operacion.descargar(Number(cursor), req.query.catalogo));
  });
  rutas.use('/operacion', autenticar);
  rutas.get(
    '/reportes/:tipo',
    auth.identificar,
    auth.permitir(rolesResponsables),
    async (req, res) => {
      const formato = req.query.formato ?? 'json';
      if (!['json', 'pdf', 'csv'].includes(formato))
        throw new ErrorApi(422, 'FORMATO_INVALIDO', 'Selecciona PDF, CSV o consulta en pantalla.');
      const reporte = construirReporte(req.params.tipo, req.query, await operacion.datos());
      if (formato === 'json') return res.json(reporte);
      const nombre = `simce-${reporte.tipo}-${reporte.hasta}.${formato}`;
      if (formato === 'csv')
        return res.attachment(nombre).type('text/csv; charset=utf-8').send(reporteCsv(reporte));
      return res.attachment(nombre).send(reportePdf(reporte));
    },
  );
  rutas.post('/escaneos/decodificar', autenticar, auth.origen, async (req, res) => {
    const estado = await operacion.datos();
    const datos = req.body ?? {};
    if (datos.soloIdentificar === true)
      return res.json(identificarEtiqueta(datos.codigo, estado.catalogo, estado.perfil));
    res.json(
      calcularRenglon(
        estado,
        { ...datos, origen: 'ESCANEO', renglonUuid: randomUUID(), partidaUuid: randomUUID() },
        {
          usuario: req.usuario,
          momento: new Date().toISOString(),
          perfil: estado.perfil,
        },
      ),
    );
  });
  rutas.get('/remisiones', autenticar, async (req, res) => {
    const { desde, hasta, destino, producto, estado } = req.query;
    if (desde !== undefined) fechaOperativa(desde);
    if (hasta !== undefined) fechaOperativa(hasta);
    if (desde && hasta && hasta < desde)
      throw new ErrorApi(
        422,
        'RANGO_INVALIDO',
        'La fecha final debe ser igual o posterior a la inicial.',
      );
    if (destino !== undefined) uuidOperativo(destino);
    if (producto !== undefined) uuidOperativo(producto);
    if (estado !== undefined && !['BORRADOR', 'CERRADA', 'CANCELADA'].includes(estado))
      throw new ErrorApi(422, 'ESTADO_INVALIDO', 'El estado de remisión no es válido.');
    const { remisiones } = await operacion.datos();
    res.json(
      remisiones
        .filter(
          (r) =>
            (!desde || r.fecha >= desde) &&
            (!hasta || r.fecha <= hasta) &&
            (!destino || r.destinoUuid === destino) &&
            (!estado || r.estado === estado) &&
            (!producto || r.renglones.some((fila) => fila.productoUuid === producto)),
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadaEn.localeCompare(a.creadaEn)),
    );
  });
  rutas.get('/operacion/documentos/:uuid/pdf', async (req, res) => {
    const uuid = uuidOperativo(req.params.uuid);
    res.attachment(`remision-${uuid}.pdf`).send(await operacion.pdf(uuid));
  });
  rutas.get('/operacion/inventario', async (req, res) => {
    const fecha = req.query.fecha === undefined ? undefined : fechaOperativa(req.query.fecha);
    const { catalogo, movimientos, lotes } = await operacion.datos();
    const saldos = saldoPorProducto(movimientos, fecha);
    res.json({
      lotes,
      movimientos: movimientos.filter((m) => !fecha || m.fecha <= fecha),
      existencias: catalogo.productos.map((p) => ({
        productoUuid: p.uuid,
        producto: p.nombre,
        gramos: saldos.get(p.uuid) ?? 0,
      })),
    });
  });
  rutas.get('/operacion/conflictos', async (req, res) =>
    res.json(await operacion.conflictos(req.usuario)),
  );
  rutas.post(
    '/operacion/conflictos/:uuid/resolver',
    auth.permitir(rolesResponsables),
    auth.origen,
    async (req, res) => {
      res.json(await operacion.resolver(req.params.uuid, req.body?.motivo, req.usuario));
    },
  );
  return rutas;
}
