import { useEffect, useState } from 'react';
import { consultarApi } from '../servicios/sesion.js';
import { FichaConsulta } from './ConsultasTaller.jsx';
import { FichaParticipante } from './InscripcionesTaller.jsx';

const tipos = {
  consultas: 'Consultas de talleres',
  inscripciones: 'Inscripciones',
  intereses: 'Servicio social',
};

export function SolicitudesPanel({ ejecutar, ocupado }) {
  const [datos, cambiarDatos] = useState(null);
  const [error, cambiarError] = useState('');
  const [categoria, cambiarCategoria] = useState('consultas');
  const [busqueda, cambiarBusqueda] = useState('');
  const [taller, cambiarTaller] = useState('');
  const [motivo, cambiarMotivo] = useState('');
  const [consentimiento, cambiarConsentimiento] = useState(false);
  const [mensaje, cambiarMensaje] = useState('');
  const [abierto, cambiarAbierto] = useState(false);
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
  const filas = (datos?.[categoria] ?? []).filter(
    (r) =>
      (!taller || categoria === 'intereses' || r.tallerId === taller) &&
      [r.nombre, r.correo, r.folio, r.tallerNombre].some((v) =>
        v?.toLowerCase().includes(busqueda.trim().toLowerCase()),
      ),
  );
  async function accion(i, accion) {
    await consultarApi(`/inscripciones/${i.id}/acciones`, {
      metodo: 'POST',
      datos: {
        accion,
        version: i.version,
        motivo,
        aceptoAviso: consentimiento,
        versionAviso: datos.aviso?.version,
      },
    });
    await cargar();
    cambiarConsentimiento(false);
    cambiarMensaje(`Inscripción ${i.folio} actualizada.`);
  }
  return (
    <section
      className="cms-solicitudes"
      id="solicitudes-panel"
      aria-labelledby="titulo-solicitudes-panel"
    >
      <div className="cms-solicitudes-cabecera">
        <div>
          <h2 id="titulo-solicitudes-panel">Solicitudes y participantes</h2>
          <p>
            Atiende las consultas de talleres, administra inscripciones y revisa el interés en
            servicio social.
          </p>
        </div>
        <button
          type="button"
          className="secundario"
          disabled={ocupado}
          onClick={() => ejecutar(cargar)}
        >
          Actualizar solicitudes
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!datos && !error && <p role="status">Cargando solicitudes…</p>}
      {datos && (
        <>
          <nav className="cms-categorias-solicitudes" aria-label="Tipos de solicitudes">
            {Object.entries(tipos).map(([tipo, titulo]) => (
              <button
                type="button"
                key={tipo}
                disabled={ocupado}
                aria-pressed={abierto && categoria === tipo}
                className="secundario"
                onClick={() => {
                  cambiarCategoria(tipo);
                  cambiarBusqueda('');
                  cambiarTaller('');
                  cambiarMensaje('');
                  cambiarAbierto(true);
                  ejecutar(cargar);
                }}
              >
                {titulo} ({datos[tipo].length})
              </button>
            ))}
          </nav>
          {abierto && (
            <>
              <button type="button" className="secundario" onClick={() => cambiarAbierto(false)}>
                Cerrar solicitudes
              </button>
              <div className="cms-filtros-solicitudes">
                <label>
                  Buscar por nombre, correo o folio
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => cambiarBusqueda(e.target.value)}
                    maxLength={160}
                  />
                </label>
                {categoria !== 'intereses' && (
                  <label>
                    Filtrar solicitudes por taller
                    <select value={taller} onChange={(e) => cambiarTaller(e.target.value)}>
                      <option value="">Todos los talleres</option>
                      {datos.talleres.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <h3>{tipos[categoria]}</h3>
              {mensaje && <p role="status">{mensaje}</p>}
              {categoria === 'inscripciones' &&
                filas.some(
                  (r) =>
                    r.estado === 'confirmada' ||
                    (r.estado === 'cancelada' &&
                      datos.talleres.find((t) => t.id === r.tallerId)?.inscripcion?.estado ===
                        'programado'),
                ) && (
                  <>
                    <label>
                      Motivo de la gestión de inscripción
                      <input
                        value={motivo}
                        onChange={(e) => cambiarMotivo(e.target.value)}
                        maxLength={500}
                      />
                    </label>
                    {datos.aviso && filas.some((r) => r.estado === 'cancelada') && (
                      <label className="cms-check">
                        <input
                          type="checkbox"
                          checked={consentimiento}
                          onChange={(e) => cambiarConsentimiento(e.target.checked)}
                        />
                        <span>
                          Confirmo que el participante aceptó el{' '}
                          <a href={datos.aviso.url} target="_blank" rel="noreferrer">
                            aviso vigente
                          </a>{' '}
                          para reactivar su inscripción.
                        </span>
                      </label>
                    )}
                  </>
                )}
              {filas.length ? (
                <ul className="cms-asistentes">
                  {filas.map((r) => (
                    <li key={r.id}>
                      {categoria !== 'intereses' && (
                        <p>
                          <strong>
                            {r.tallerNombre ??
                              datos.talleres.find((t) => t.id === r.tallerId)?.nombre}
                          </strong>
                        </p>
                      )}
                      {categoria === 'consultas' ? (
                        <FichaConsulta
                          c={r}
                          ejecutar={ejecutar}
                          ocupado={ocupado}
                          cargar={cargar}
                          cambiarMensaje={cambiarMensaje}
                        />
                      ) : categoria === 'inscripciones' ? (
                        <FichaParticipante
                          i={r}
                          ejecutar={ejecutar}
                          ocupado={ocupado}
                          motivo={motivo}
                          consentimiento={consentimiento}
                          terminado={
                            datos.talleres.find((t) => t.id === r.tallerId)?.inscripcion?.estado !==
                            'programado'
                          }
                          accion={accion}
                        />
                      ) : (
                        <>
                          <h4>{r.nombre}</h4>
                          <p>{r.correo}</p>
                          <p>{r.mensaje}</p>
                          <p>
                            Programa:{' '}
                            {datos.programas.find((p) => p.id === r.programaId)?.nombre ??
                              r.programaId}
                          </p>
                          <p>
                            {new Date(r.momento).toLocaleString('es-MX', {
                              timeZone: 'America/Mexico_City',
                            })}{' '}
                            · Aviso aceptado: {r.versionAviso}
                          </p>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay solicitudes que coincidan con este filtro.</p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
