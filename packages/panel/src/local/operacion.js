import {
  aplicarCambiosOperativos,
  aplicarComandoOperativo,
  generarDocumentoRemision,
  rolesOperativos,
  tablasOperativas,
} from '@simce/dominio';
import { baseDatosLocal } from './baseDatos.js';

const uuid = () => crypto.randomUUID();
const vigenciaDispositivo = 72 * 3600_000;
const replicaVacia = (usuarioId) => ({
  usuarioId,
  secuencia: 0,
  cursor: 0,
  revisionCatalogo: '',
  ultimaSincronizacion: null,
  datos: Object.fromEntries(tablasOperativas.map((tipo) => [tipo, []])),
});

function reconstruir(replica, cola, usuario) {
  const vista = structuredClone(replica.datos);
  if (!vista.catalogo) return vista;
  for (const { estado, comando } of cola) {
    if (estado !== 'PENDIENTE') continue;
    try {
      aplicarCambiosOperativos(
        vista,
        aplicarComandoOperativo(vista, comando, {
          usuario,
          momento: comando.ocurridaEn,
          perfil: vista.perfil,
        }),
      );
    } catch (error) {
      if (error.name !== 'ErrorDominio') throw error;
      // La versión local original permanece en la cola para revisión del servidor.
    }
  }
  return vista;
}

export function crearOperacionLocal(db = baseDatosLocal) {
  const colaPorUsuario = (id) => db.colaOperativa.where('usuarioId').equals(id);
  async function leerReplica(id) {
    return (await db.replica.get(id)) ?? replicaVacia(id);
  }
  async function modelo(usuario) {
    const replica = await leerReplica(usuario.id);
    const cola = await colaPorUsuario(usuario.id).sortBy('comando.secuencia');
    return { replica, cola, vista: reconstruir(replica, cola, usuario) };
  }
  return {
    modelo(usuario) {
      return db.transaction('r', db.replica, db.colaOperativa, () => modelo(usuario));
    },
    async preparar(usuario) {
      if (!rolesOperativos.includes(usuario.rol))
        throw new Error('Tu cuenta no tiene permiso de operación.');
      await db.transaction('rw', db.dispositivo, db.replica, async () => {
        if (!(await leerReplica(usuario.id)).datos.catalogo)
          throw new Error('Sincroniza el catálogo antes de preparar el dispositivo.');
        const equipo = (await db.dispositivo.get('equipo')) ?? { id: 'equipo', uuid: uuid() };
        await db.dispositivo.put({
          ...equipo,
          acceso: {
            usuario: {
              id: usuario.id,
              rol: usuario.rol,
              correo: usuario.correo,
              debeCambiar: false,
            },
            vence: Date.now() + vigenciaDispositivo,
          },
        });
      });
    },
    async accesoLocal() {
      const acceso = (await db.dispositivo.get('equipo'))?.acceso;
      return acceso?.vence > Date.now() && rolesOperativos.includes(acceso.usuario.rol)
        ? acceso.usuario
        : null;
    },
    actualizarAcceso(usuario) {
      return db.transaction('rw', db.dispositivo, async () => {
        const equipo = await db.dispositivo.get('equipo');
        if (!equipo?.acceso) return;
        const permitido =
          usuario.id === equipo.acceso.usuario.id &&
          !usuario.debeCambiar &&
          rolesOperativos.includes(usuario.rol);
        await db.dispositivo.put({
          ...equipo,
          acceso: permitido
            ? {
                ...equipo.acceso,
                usuario: {
                  id: usuario.id,
                  rol: usuario.rol,
                  correo: usuario.correo,
                  debeCambiar: false,
                },
              }
            : null,
        });
      });
    },
    async bloquear() {
      await db.dispositivo.update('equipo', { acceso: null });
    },
    async registrar(usuario, tipo, payload, { agregadoId = uuid(), versionBase = 0 } = {}) {
      const Pdf = tipo === 'CERRAR_REMISION' ? (await import('jspdf')).jsPDF : null;
      return db.transaction(
        'rw',
        db.dispositivo,
        db.replica,
        db.colaOperativa,
        db.pdfOperativos,
        async () => {
          const { replica, cola, vista } = await modelo(usuario);
          if (!vista.catalogo) throw new Error('Sincroniza el catálogo antes de capturar.');
          const equipo = (await db.dispositivo.get('equipo')) ?? { id: 'equipo', uuid: uuid() };
          const anterior = cola.findLast(
            (o) => o.comando.agregadoId === agregadoId && o.estado === 'PENDIENTE',
          );
          const comando = {
            operacionUuid: uuid(),
            agregadoId,
            versionBase,
            tipo,
            payload,
            autorUuid: usuario.id,
            dispositivoUuid: equipo.uuid,
            secuencia: replica.secuencia + 1,
            ocurridaEn: new Date().toISOString(),
            ...(anterior ? { dependeDe: anterior.operacionUuid } : {}),
          };
          const cambios = aplicarComandoOperativo(vista, comando, {
            usuario,
            momento: comando.ocurridaEn,
            perfil: vista.perfil,
          });
          if (Pdf) {
            const remision = cambios.find((c) => c.tipo === 'remisiones').registro;
            const documento = cambios.find((c) => c.tipo === 'documentos').registro;
            await db.pdfOperativos.put({
              usuarioId: usuario.id,
              uuid: documento.uuid,
              bytes: generarDocumentoRemision(Pdf, remision, documento),
            });
          }
          await db.dispositivo.put(equipo);
          await db.replica.put({ ...replica, secuencia: comando.secuencia });
          await db.colaOperativa.add({
            usuarioId: usuario.id,
            operacionUuid: comando.operacionUuid,
            comando,
            estado: 'PENDIENTE',
          });
          return { agregadoId, cambios };
        },
      );
    },
    async pendientes(usuario) {
      const filas = await db.colaOperativa
        .where('[usuarioId+estado]')
        .equals([usuario.id, 'PENDIENTE'])
        .sortBy('comando.secuencia');
      return filas.map((fila) => fila.comando);
    },
    confirmar(usuario, resultados) {
      return db.transaction('rw', db.replica, db.colaOperativa, async () => {
        const replica = await leerReplica(usuario.id);
        for (const resultado of resultados) {
          const llave = [usuario.id, resultado.operacionUuid];
          const entrada = await db.colaOperativa.get(llave);
          if (entrada?.estado !== 'PENDIENTE') continue;
          if (resultado.estado === 'APLICADA')
            aplicarCambiosOperativos(replica.datos, resultado.cambios);
          await db.colaOperativa.update(llave, {
            estado: resultado.estado === 'ESPERA' ? 'PENDIENTE' : resultado.estado,
            resultado,
          });
        }
        await db.replica.put(replica);
      });
    },
    cursor: leerReplica,
    aplicarPagina(usuario, solicitado, pagina) {
      return db.transaction('rw', db.replica, async () => {
        const replica = await leerReplica(usuario.id);
        if (replica.cursor !== solicitado) return;
        for (const evento of pagina.eventos)
          aplicarCambiosOperativos(replica.datos, evento.cambios);
        if (pagina.catalogo) {
          replica.datos.catalogo = pagina.catalogo;
          replica.datos.perfil = pagina.perfil;
          replica.revisionCatalogo = pagina.revisionCatalogo;
        }
        replica.cursor = pagina.cursor;
        if (!pagina.mas) replica.ultimaSincronizacion = new Date().toISOString();
        await db.replica.put(replica);
      });
    },
    reiniciarReplica(usuario) {
      return db.transaction('rw', db.replica, async () => {
        const { secuencia } = await leerReplica(usuario.id);
        await db.replica.put({ ...replicaVacia(usuario.id), secuencia });
      });
    },
    async reconciliar(usuario, conflictos) {
      await db.transaction('rw', db.colaOperativa, async () => {
        for (const conflicto of conflictos) {
          if (conflicto.resolucion)
            await db.colaOperativa.update([usuario.id, conflicto.uuid], {
              estado: 'RESUELTA',
              resolucion: conflicto.resolucion,
            });
        }
      });
    },
    obtenerPdf: (usuario, uuidDocumento) => db.pdfOperativos.get([usuario.id, uuidDocumento]),
    guardarPdf: (usuario, uuidDocumento, bytes) =>
      db.pdfOperativos.put({ usuarioId: usuario.id, uuid: uuidDocumento, bytes }),
  };
}

export const operacionLocal = crearOperacionLocal();
