import { useCallback, useEffect, useRef, useState } from 'react';
import { operacionLocal } from '../../local/operacion.js';
import { sincronizarOperacionLocal } from '../../servicios/operacion.js';
import { consultarApi } from '../../servicios/sesion.js';
import { CatalogoOperativo } from '../CatalogoOperativo.jsx';
import { CatalogoDescargado } from './CatalogoDescargado.jsx';
import { Conflictos } from './Conflictos.jsx';
import { Inventario } from './Inventario.jsx';
import { Remisiones } from './Remisiones.jsx';
import { Reportes } from './Reportes.jsx';
import { Respaldo } from './Respaldo.jsx';
import { descargarBlob } from './controles.jsx';
import './operacion.css';

const secciones = [
  ['remisiones', 'Remisiones'],
  ['inventario', 'Inventario'],
  ['catalogo', 'Catálogo'],
  ['reportes', 'Reportes'],
  ['conflictos', 'Por revisar'],
  ['respaldo', 'Respaldo'],
];
const fechaHora = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

export function OperacionesPanel({
  usuario,
  modoLocal,
  administra,
  ocupado: ocupadoGestor,
  ejecutar,
  avisar,
}) {
  const [seccion, cambiarSeccion] = useState('remisiones');
  const [modelo, cambiarModelo] = useState(null);
  const [ocupado, cambiarOcupado] = useState(false);
  const [sincronizando, cambiarSincronizando] = useState(false);
  const [enLinea, cambiarEnLinea] = useState(() => navigator.onLine);
  const [preparado, cambiarPreparado] = useState(false);
  const [falla, cambiarFalla] = useState(null);
  const [error, cambiarError] = useState('');
  const [mensaje, cambiarMensaje] = useState('');
  const accionActiva = useRef(false);
  const syncActiva = useRef(false);

  const refrescar = useCallback(async () => {
    cambiarModelo(await operacionLocal.modelo(usuario));
    cambiarPreparado((await operacionLocal.accesoLocal())?.id === usuario.id);
  }, [usuario]);

  const sincronizar = useCallback(async () => {
    if (modoLocal || !navigator.onLine || syncActiva.current) return;
    syncActiva.current = true;
    cambiarSincronizando(true);
    try {
      await sincronizarOperacionLocal(operacionLocal, usuario);
      cambiarFalla(null);
    } catch (e) {
      cambiarFalla(e);
    } finally {
      try {
        await refrescar();
      } catch (e) {
        cambiarError(e.message);
      }
      syncActiva.current = false;
      cambiarSincronizando(false);
    }
  }, [modoLocal, usuario, refrescar]);

  useEffect(() => {
    refrescar().catch((e) => cambiarError(e.message));
    sincronizar();
    const conectar = () => {
      cambiarEnLinea(true);
      sincronizar();
    };
    const desconectar = () => cambiarEnLinea(false);
    window.addEventListener('online', conectar);
    window.addEventListener('offline', desconectar);
    const intervalo = setInterval(sincronizar, 30_000);
    return () => {
      window.removeEventListener('online', conectar);
      window.removeEventListener('offline', desconectar);
      clearInterval(intervalo);
    };
  }, [refrescar, sincronizar]);

  async function intentar(accion) {
    if (accionActiva.current) return false;
    accionActiva.current = true;
    cambiarOcupado(true);
    cambiarError('');
    cambiarMensaje('');
    try {
      return (await accion()) ?? true;
    } catch (e) {
      cambiarError(e.message);
      return false;
    } finally {
      accionActiva.current = false;
      cambiarOcupado(false);
    }
  }
  function registra(tipo, preparar, registro) {
    return intentar(async () => {
      const resultado = await operacionLocal.registrar(
        usuario,
        tipo,
        preparar(),
        registro
          ? {
              agregadoId: registro.uuid,
              versionBase: registro.version,
            }
          : {},
      );
      await refrescar();
      cambiarMensaje('Cambio guardado en este dispositivo.');
      sincronizar();
      return resultado;
    });
  }
  function descargar(uuid, folio) {
    return intentar(async () => {
      const local = await operacionLocal.obtenerPdf(usuario, uuid);
      if (local)
        return descargarBlob(new Blob([local.bytes], { type: 'application/pdf' }), `${folio}.pdf`);
      if (!conectado)
        throw new Error('Este PDF se puede descargar cuando se recupere la conexión.');
      const archivo = await consultarApi(`/operacion/documentos/${uuid}/pdf`);
      await operacionLocal.guardarPdf(usuario, uuid, new Uint8Array(await archivo.arrayBuffer()));
      descargarBlob(archivo, `${folio}.pdf`);
    });
  }
  const vista = modelo?.vista;
  const cola = modelo?.cola ?? [];
  const pendientes = cola.filter((r) => r.estado === 'PENDIENTE');
  const conflictos = cola.filter((r) => ['RECHAZADA', 'CONFLICTO'].includes(r.estado)).length;
  const conectado = enLinea && !modoLocal && falla?.codigo !== 'SIN_CONEXION';
  const puedePreparar = conectado && vista?.catalogo;
  const ultima = modelo?.replica.ultimaSincronizacion;
  return (
    <section className="cms-bandeja operacion" aria-label="Operación del módulo">
      <header className="cms-bandeja-barra operacion-barra">
        <div role="status">
          <strong>
            {conectado ? 'Con conexión' : 'Sin conexión'} · {pendientes.length} pendientes ·{' '}
            {conflictos} por revisar
          </strong>
          <small>
            {ultima
              ? `Última sincronización ${fechaHora.format(new Date(ultima))}`
              : 'Aún sin sincronizar'}
          </small>
          {pendientes.some(
            (p) => Date.now() - Date.parse(p.comando.ocurridaEn) > 7 * 86400_000,
          ) && <small>Hay operaciones pendientes desde hace más de siete días.</small>}
        </div>
        <div className="operacion-acciones">
          <button
            type="button"
            className="secundario"
            disabled={sincronizando || modoLocal || !enLinea}
            onClick={sincronizar}
          >
            {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
          {puedePreparar && (
            <button
              type="button"
              className="secundario"
              disabled={ocupado || sincronizando}
              onClick={() =>
                intentar(async () => {
                  if (!navigator.serviceWorker?.controller)
                    throw new Error(
                      'Espera a que el panel termine de instalarse o recárgalo con conexión.',
                    );
                  await operacionLocal.preparar(usuario);
                  await navigator.storage?.persist?.().catch(() => false);
                  await refrescar();
                  cambiarMensaje(
                    'Dispositivo preparado para continuar sin conexión durante 72 horas.',
                  );
                })
              }
            >
              {preparado ? 'Renovar preparación sin conexión' : 'Preparar este dispositivo'}
            </button>
          )}
        </div>
      </header>
      {falla && falla.codigo !== 'SIN_CONEXION' && (
        <div className="cms-error" role="alert">
          {falla.message}
          {['CURSOR_REQUIERE_REINICIO', 'REPLICA_INCOMPLETA'].includes(falla.codigo) && (
            <button
              type="button"
              className="secundario"
              disabled={ocupado}
              onClick={() =>
                intentar(async () => {
                  await operacionLocal.reiniciarReplica(usuario);
                  await sincronizar();
                })
              }
            >
              Reconstruir réplica
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="cms-error" role="alert">
          {error}
        </p>
      )}
      {mensaje && (
        <p className="cms-exito" role="status">
          {mensaje}
        </p>
      )}
      <nav className="cms-bandeja-barra cms-categorias" aria-label="Herramientas de operación">
        {secciones
          .filter(([id]) => id !== 'reportes' || administra)
          .map(([id, etiqueta]) => (
            <button
              type="button"
              key={id}
              aria-pressed={id === seccion}
              disabled={ocupado || ocupadoGestor}
              onClick={() => {
                cambiarSeccion(id);
                cambiarError('');
                cambiarMensaje('');
              }}
            >
              {etiqueta}
            </button>
          ))}
      </nav>
      {seccion === 'respaldo' ? (
        <Respaldo
          {...{ usuario, ocupado, intentar }}
          incidencias={modelo?.replica.incidenciasRespaldo ?? []}
          alRestaurar={async () => {
            await refrescar();
            sincronizar();
          }}
        />
      ) : seccion === 'reportes' ? (
        conectado && administra ? (
          <Reportes {...{ ocupado, intentar }} />
        ) : (
          <p className="cms-vacio">
            Conéctate para consultar y exportar los reportes del servidor.
          </p>
        )
      ) : seccion === 'conflictos' ? (
        <Conflictos
          {...{ cola, conectado, administra, ocupado, intentar }}
          reconciliar={async (datos) => {
            await operacionLocal.reconciliar(usuario, datos);
            await refrescar();
          }}
        />
      ) : (
        <>
          {seccion === 'catalogo' && conectado && administra && (
            <div className="cms-bandeja-detalle">
              <button
                type="button"
                className="secundario"
                disabled={ocupado}
                onClick={() =>
                  intentar(async () =>
                    descargarBlob(
                      await consultarApi('/productos/exportar-bascula'),
                      'programacion-manual-bascula.csv',
                    ),
                  )
                }
              >
                Descargar lista para programar la báscula
              </button>
              <CatalogoOperativo
                administra
                avisar={(texto) => {
                  avisar(texto);
                  sincronizar();
                }}
                ocupado={ocupadoGestor}
                ejecutar={ejecutar}
              />
            </div>
          )}
          {!vista?.catalogo ? (
            <p className="cms-vacio" role="status">
              {sincronizando
                ? 'Descargando catálogo y movimientos…'
                : 'Sincroniza para descargar el catálogo operativo.'}
            </p>
          ) : (
            <>
              {seccion === 'catalogo' && <CatalogoDescargado {...{ vista, ocupado, intentar }} />}
              {seccion === 'remisiones' && (
                <Remisiones {...{ vista, registra, ocupado, administra, usuario, descargar }} />
              )}
              {seccion === 'inventario' && (
                <Inventario {...{ vista, ocupado, administra }} registrar={registra} />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
