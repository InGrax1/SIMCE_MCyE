import { createHash } from 'node:crypto';
import {
  aplicarComandoOperativo,
  ErrorDominio,
  motivoOperativo,
  rolesOperativos,
  rolesResponsables,
  validarComandoOperativo,
  uuidOperativo,
} from '@simce/dominio';
import { ErrorApi } from '../errores.js';
import { auditar } from '../cms/contenido.js';
import { serializarEstable } from '../servicios/sincronizarOperacion.js';

const huella = (valor) => createHash('sha256').update(serializarEstable(valor)).digest('hex');
const permisos = () =>
  new ErrorApi(403, 'SIN_PERMISO', 'Tu cuenta no tiene permiso para realizar esta acción.');
const errorPublico = (e) => ({ codigo: e.codigo, mensaje: e.message, detalles: e.detalles });

export function crearServicioOperacion(almacen, reloj = () => new Date().toISOString()) {
  async function procesar(comando, usuario) {
    try {
      validarComandoOperativo(comando);
    } catch (error) {
      if (!(error instanceof ErrorDominio)) throw error;
      return { operacionUuid: comando?.operacionUuid, estado: 'RECHAZADA', ...errorPublico(error) };
    }
    const { operacionUuid, autorUuid, agregadoId } = comando;
    if (usuario.id !== autorUuid)
      return { operacionUuid, estado: 'RECHAZADA', ...errorPublico(permisos()) };
    const hash = huella(comando);
    return almacen.cambiar(async (tx) => {
      const actual = tx.estado.usuarios.find(
        (u) => u.id === usuario.id && u.activo && !u.debeCambiar,
      );
      if (!actual || !rolesOperativos.includes(actual.rol)) throw permisos();
      const anterior = await tx.recibo(operacionUuid);
      if (anterior) {
        if (anterior.autor_uuid !== autorUuid || anterior.huella !== hash)
          return {
            operacionUuid,
            estado: 'RECHAZADA',
            codigo: 'OPERACION_INCONSISTENTE',
            mensaje: 'El identificador ya fue utilizado para otra operación.',
          };
        return { ...anterior.resultado, repetida: true };
      }
      const momento = reloj();
      const registros = await tx.registros();
      const base = { operacionUuid, agregadoId, momento };
      let cambios;
      let resultado;
      let conflicto;
      try {
        if (comando.dependeDe) {
          const previo = await tx.recibo(uuidOperativo(comando.dependeDe));
          if (!previo)
            return {
              ...base,
              estado: 'ESPERA',
              codigo: 'DEPENDENCIA_PENDIENTE',
              mensaje: 'La operación anterior aún no se ha recibido.',
            };
          if (
            previo.autor_uuid !== autorUuid ||
            previo.resultado.agregadoId !== agregadoId ||
            previo.resultado.estado !== 'APLICADA'
          )
            throw new ErrorDominio(
              'DEPENDENCIA_RECHAZADA',
              'La operación anterior requiere revisión.',
            );
        }
        cambios = aplicarComandoOperativo(
          { ...registros, catalogo: await tx.catalogo() },
          comando,
          { usuario: actual, momento },
        );
        resultado = { ...base, estado: 'APLICADA', cambios };
      } catch (error) {
        if (!(error instanceof ErrorDominio)) throw error;
        resultado = {
          ...base,
          estado: error.codigo === 'CONFLICTO_SINCRONIZACION' ? 'CONFLICTO' : 'RECHAZADA',
          ...errorPublico(error),
        };
        const servidor =
          [...registros.lotes, ...registros.movimientos, ...registros.remisiones].find(
            ({ uuid }) => uuid === agregadoId,
          ) ?? null;
        conflicto = { uuid: operacionUuid, comando, servidor, resultado, resolucion: null };
      }
      if (cambios) await tx.guardarCambios(cambios);
      await tx.guardarRecibo(
        operacionUuid,
        { autor_uuid: autorUuid, huella: hash, resultado },
        conflicto,
      );
      auditar(tx.estado, actual, conflicto ? 'RECHAZAR_OPERACION' : comando.tipo, agregadoId);
      return resultado;
    });
  }

  return {
    procesar,
    async enviar(operaciones, usuario) {
      if (!Array.isArray(operaciones) || !operaciones.length || operaciones.length > 500)
        throw new ErrorApi(422, 'LOTE_INVALIDO', 'Envía entre 1 y 500 operaciones ordenadas.');
      const resultados = [];
      for (const comando of operaciones) resultados.push(await procesar(comando, usuario));
      return { resultados };
    },
    descargar(cursor, revisionCatalogo) {
      return almacen.leer(async (tx) => {
        const eventos = await tx.pagina(cursor, 101);
        const mas = eventos.length > 100;
        const pagina = eventos.slice(0, 100);
        const catalogo = await tx.catalogo();
        for (const lista of Object.values(catalogo))
          lista.sort((a, b) => a.uuid.localeCompare(b.uuid));
        const revision = huella(catalogo);
        return {
          cursor: pagina.at(-1)?.cursor ?? cursor,
          mas,
          eventos: pagina,
          revisionCatalogo: revision,
          ...(revisionCatalogo === revision ? {} : { catalogo }),
        };
      });
    },
    async datos() {
      return almacen.leer(async (tx) => ({
        ...(await tx.registros()),
        catalogo: await tx.catalogo(),
      }));
    },
    conflictos(usuario) {
      return almacen.leer((tx) =>
        tx.conflictos(rolesResponsables.includes(usuario.rol) ? null : usuario.id),
      );
    },
    resolver(uuid, motivo, usuario) {
      return almacen.cambiar(async (tx) => {
        const actual = tx.estado.usuarios.find(
          (u) => u.id === usuario.id && u.activo && !u.debeCambiar,
        );
        if (!actual || !rolesResponsables.includes(actual.rol)) throw permisos();
        const conflicto = (await tx.conflictos()).find((c) => c.uuid === uuid);
        if (!conflicto)
          throw new ErrorApi(404, 'NO_ENCONTRADO', 'No se encontró la operación rechazada.');
        if (conflicto.resolucion) return conflicto;
        conflicto.resolucion = {
          motivo: motivoOperativo(motivo),
          autorUuid: actual.id,
          momento: reloj(),
        };
        await tx.guardarResolucion(conflicto);
        auditar(tx.estado, actual, 'RESOLVER_OPERACION', uuid);
        return conflicto;
      });
    },
  };
}
