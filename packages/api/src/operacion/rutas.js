import { Router } from 'express';
import {
  fechaOperativa,
  rolesOperativos,
  rolesResponsables,
  saldoPorProducto,
} from '@simce/dominio';
import { ErrorApi } from '../errores.js';

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
