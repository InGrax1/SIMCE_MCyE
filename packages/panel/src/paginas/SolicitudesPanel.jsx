import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { consultarApi } from '../servicios/sesion.js';
import {
  DetalleParticipante,
  DetalleSolicitud,
  EstadoSolicitud,
  etiquetasEstado,
  fechaPanel,
} from './DetalleAtencion.jsx';

const titulos = { consultas: 'Consultas de talleres', intereses: 'Servicio social' };

export function SolicitudesPanel({ ejecutar, ocupado, participantes = false }) {
  const [datos, cambiarDatos] = useState(null);
  const [error, cambiarError] = useState('');
  const [categoria, cambiarCategoria] = useState(participantes ? 'inscripciones' : 'consultas');
  const [busqueda, cambiarBusqueda] = useState('');
  const [actividad, cambiarActividad] = useState('');
  const [estado, cambiarEstado] = useState('');
  const [seleccion, seleccionar] = useState(null);
  const [detalleMovil, mostrarDetalle] = useState(false);
  const encabezado = useRef(null);
  const listado = useRef(null);
  const termino = useDeferredValue(busqueda.trim().toLowerCase());
  const social = categoria === 'intereses';
  async function cargar() {
    cambiarDatos(await consultarApi('/cms/solicitudes'));
    cambiarError('');
  }
  useEffect(() => {
    let activo = true;
    consultarApi('/cms/solicitudes')
      .then((resultado) => {
        if (activo) cambiarDatos(resultado);
      })
      .catch((e) => {
        if (activo) cambiarError(e.message);
      });
    return () => {
      activo = false;
    };
  }, []);
  useEffect(() => {
    if (detalleMovil && matchMedia('(max-width: 760px)').matches) encabezado.current?.focus();
  }, [detalleMovil, seleccion]);
  const actividades = (social ? datos?.programas : datos?.talleres) ?? [];
  const nombreActividad = (r) =>
    r.programaNombre ??
    r.tallerNombre ??
    actividades.find((a) => a.id === (social ? r.programaId : r.tallerId))?.nombre ??
    'Actividad del Módulo';
  const filas = (datos?.[categoria] ?? []).filter(
    (r) =>
      (!actividad || (social ? r.programaId : r.tallerId) === actividad) &&
      (!estado || r.estado === estado) &&
      [r.nombre, r.correo, r.folio, nombreActividad(r)].some((v) =>
        v?.toLowerCase().includes(termino),
      ),
  );
  const registro = (datos?.[categoria] ?? []).find((r) => r.id === seleccion) ?? filas[0];
  function reiniciarSeleccion() {
    seleccionar(null);
    mostrarDetalle(false);
  }
  async function actualizarDetalle() {
    seleccionar(registro.id);
    await cargar();
  }
  const estadosFiltro = participantes
    ? ['confirmada', 'cancelada', 'asistio']
    : ['pendiente', 'respondida', 'cancelada'];
  function elegirCategoria(clave) {
    cambiarCategoria(clave);
    cambiarBusqueda('');
    cambiarActividad('');
    cambiarEstado('');
    seleccionar(null);
    mostrarDetalle(false);
    ejecutar(cargar);
  }
  return (
    <section
      className="cms-bandeja"
      id="solicitudes-panel"
      aria-label={participantes ? 'Gestión de participantes' : 'Bandeja de solicitudes'}
    >
      <div className="cms-bandeja-barra">
        {participantes ? (
          <strong>Inscripciones {datos ? `· ${datos.inscripciones.length}` : ''}</strong>
        ) : (
          <nav className="cms-categorias" aria-label="Tipos de solicitudes">
            {Object.entries(titulos).map(([clave, titulo]) => (
              <button
                type="button"
                key={clave}
                aria-pressed={categoria === clave}
                disabled={ocupado}
                onClick={() => elegirCategoria(clave)}
              >
                {titulo} {datos && <span>{datos[clave].length}</span>}
              </button>
            ))}
          </nav>
        )}
        <button
          type="button"
          className="secundario"
          disabled={ocupado}
          onClick={() => ejecutar(cargar)}
        >
          Actualizar
        </button>
      </div>
      {error && (
        <p className="cms-error" role="alert">
          {error}
        </p>
      )}
      {!datos && !error && (
        <p className="cms-bandeja-espera" role="status">
          Cargando {participantes ? 'inscripciones' : 'solicitudes'}…
        </p>
      )}
      {datos && (
        <div className="cms-bandeja-columnas" data-detalle={detalleMovil && Boolean(registro)}>
          <section className="cms-bandeja-listado" aria-label="Listado de registros">
            <div className="cms-bandeja-filtros">
              <label>
                Buscar por nombre, correo o folio
                <input
                  type="search"
                  placeholder="Nombre, correo o folio"
                  value={busqueda}
                  onChange={(e) => {
                    cambiarBusqueda(e.target.value);
                    reiniciarSeleccion();
                  }}
                  disabled={ocupado}
                  maxLength={160}
                />
              </label>
              <div className="cms-filtros-fila">
                <label>
                  Estado
                  <select
                    value={estado}
                    onChange={(e) => {
                      cambiarEstado(e.target.value);
                      reiniciarSeleccion();
                    }}
                    disabled={ocupado}
                  >
                    <option value="">Todos</option>
                    {estadosFiltro.map((clave) => (
                      <option key={clave} value={clave}>
                        {etiquetasEstado[clave]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {social ? 'Programa' : 'Taller'}
                  <select
                    value={actividad}
                    onChange={(e) => {
                      cambiarActividad(e.target.value);
                      reiniciarSeleccion();
                    }}
                    disabled={ocupado}
                  >
                    <option value="">
                      {social ? 'Todos los programas' : 'Todos los talleres'}
                    </option>
                    {actividades.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p ref={listado} tabIndex={-1} className="cms-resultado-cantidad">
                {filas.length} {filas.length === 1 ? 'registro' : 'registros'}
              </p>
            </div>
            {filas.length ? (
              <ul className="cms-bandeja-registros">
                {filas.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="cms-bandeja-fila"
                      aria-pressed={registro?.id === r.id}
                      disabled={ocupado}
                      onClick={() => {
                        seleccionar(r.id);
                        mostrarDetalle(true);
                      }}
                    >
                      <span className="cms-bandeja-fila-cabecera">
                        <strong>{r.nombre}</strong>
                        <EstadoSolicitud estado={r.estado} />
                      </span>
                      <span className="cms-bandeja-asunto">{nombreActividad(r)}</span>
                      <span className="cms-bandeja-meta">
                        {r.folio} · {fechaPanel(r.creadoEn ?? r.momento, true)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="cms-vacio">
                <strong>
                  {(datos[categoria] ?? []).length
                    ? 'Sin resultados'
                    : `Todavía no hay ${participantes ? 'inscripciones' : 'solicitudes'}`}
                </strong>
                <p>
                  {(datos[categoria] ?? []).length
                    ? 'Cambia la búsqueda o los filtros.'
                    : 'Los registros aparecerán aquí cuando se envíen desde el portal.'}
                </p>
              </div>
            )}
          </section>
          <section className="cms-bandeja-detalle" aria-label="Detalle del registro">
            {registro ? (
              <>
                <button
                  type="button"
                  className="secundario cms-volver-lista"
                  onClick={() => {
                    mostrarDetalle(false);
                    requestAnimationFrame(() => listado.current?.focus());
                  }}
                >
                  Volver a la lista
                </button>
                <div ref={encabezado} tabIndex={-1} className="cms-detalle-encabezado">
                  <div className="cms-detalle-folio">
                    <span>{registro.folio}</span>
                    <EstadoSolicitud estado={registro.estado} />
                  </div>
                  <h2>{registro.nombre}</h2>
                  <p className="cms-detalle-asunto">{nombreActividad(registro)}</p>
                  <p>
                    {registro.correo} · {fechaPanel(registro.creadoEn ?? registro.momento)}
                  </p>
                </div>
                {participantes ? (
                  <DetalleParticipante
                    key={registro.id}
                    registro={registro}
                    taller={datos.talleres.find((t) => t.id === registro.tallerId)}
                    aviso={datos.aviso}
                    ejecutar={ejecutar}
                    ocupado={ocupado}
                    cargar={actualizarDetalle}
                  />
                ) : (
                  <DetalleSolicitud
                    key={registro.id}
                    registro={registro}
                    social={social}
                    ejecutar={ejecutar}
                    ocupado={ocupado}
                    cargar={actualizarDetalle}
                  />
                )}
              </>
            ) : (
              <div className="cms-vacio cms-detalle-vacio">
                <strong>Selecciona un registro</strong>
                <p>El detalle y sus acciones se muestran en este espacio.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
