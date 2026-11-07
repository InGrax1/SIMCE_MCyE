import { useEffect, useRef, useState } from 'react';
import { guardarConsulta } from './consultasGuardadas.js';
import { mensajeSolicitud } from './mensajesSolicitud.js';

const fecha = (valor) =>
  valor
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(valor))
    : '';
const estados = {
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  asistio: 'Asistencia registrada',
};
const acciones = {
  INSCRIBIR: 'Inscripción confirmada',
  cancelar: 'Inscripción cancelada',
  reactivar: 'Inscripción reactivada',
  asistencia: 'Asistencia registrada',
  CANCELAR_TALLER: 'Taller cancelado',
};

export function SeguimientoInscripcion() {
  const [acceso, cambiarAcceso] = useState(null);
  const [registro, cambiarRegistro] = useState(null);
  const [error, cambiarError] = useState('');
  const [mensaje, cambiarMensaje] = useState('');
  const [ocupado, cambiarOcupado] = useState(false);
  const [revision, cambiarRevision] = useState(0);
  const region = useRef(null);
  const bloqueo = useRef(false);
  useEffect(() => {
    const leer = () => {
      const hash = new URLSearchParams(location.hash.slice(1));
      cambiarRegistro(null);
      cambiarError('');
      cambiarMensaje('');
      cambiarAcceso(
        hash.has('inscripcion-taller')
          ? { folio: hash.get('inscripcion-taller'), acceso: hash.get('acceso') ?? '' }
          : null,
      );
      if (hash.has('inscripcion-taller'))
        requestAnimationFrame(() => {
          region.current?.focus();
          region.current?.scrollIntoView();
        });
    };
    leer();
    window.addEventListener('hashchange', leer);
    return () => window.removeEventListener('hashchange', leer);
  }, []);
  useEffect(() => {
    if (!acceso) return;
    const controlador = new AbortController();
    cambiarOcupado(true);
    cambiarError('');
    (async () => {
      try {
        const r = await fetch('/api/v1/publico/inscripciones/consultar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(acceso),
          signal: controlador.signal,
          cache: 'no-store',
        });
        const datos = await r.json();
        if (!r.ok) throw new Error(datos.mensaje ?? 'No fue posible consultar tu inscripción.');
        if (!controlador.signal.aborted) {
          cambiarRegistro(datos);
          guardarConsulta({ ...acceso, tallerNombre: datos.tallerNombre });
        }
      } catch (e) {
        if (!controlador.signal.aborted) cambiarError(mensajeSolicitud(e));
      } finally {
        if (!controlador.signal.aborted) cambiarOcupado(false);
      }
    })();
    return () => controlador.abort();
  }, [acceso, revision]);
  if (!acceso) return null;
  return (
    <section
      id="consultar-inscripcion"
      className="seguimiento-consulta seccion"
      aria-labelledby="titulo-mi-inscripcion"
      tabIndex={-1}
      ref={region}
    >
      <div className="contenido contenido-estrecho">
        <h2 id="titulo-mi-inscripcion">Mi inscripción al taller</h2>
        {error && <p role="alert">{error}</p>}
        {mensaje && <p role="status">{mensaje}</p>}
        {ocupado && <p role="status">Actualizando tu inscripción…</p>}
        {registro && (
          <>
            <h3>{registro.tallerNombre}</h3>
            <p>
              Folio: <strong>{registro.folio}</strong> · <strong>{estados[registro.estado]}</strong>
            </p>
            <p>
              {registro.sede}
              {registro.inicio && ` · ${registro.inicio} al ${registro.fin}`}
            </p>
            <h4>Mis datos de inscripción</h4>
            <dl className="inscripcion-datos">
              <dt>Nombre</dt>
              <dd>{registro.nombre}</dd>
              <dt>Correo</dt>
              <dd>{registro.correo}</dd>
              <dt>Teléfono</dt>
              <dd>{registro.telefono}</dd>
              <dt>Procedencia</dt>
              <dd>{registro.procedencia === 'interna' ? 'Comunidad UNAM' : 'Externa'}</dd>
              {registro.licenciatura && (
                <>
                  <dt>Licenciatura</dt>
                  <dd>{registro.licenciatura}</dd>
                  <dt>Número de cuenta</dt>
                  <dd>{registro.numeroCuenta}</dd>
                </>
              )}
            </dl>
            <h4>Historial y asistencia</h4>
            <ol className="inscripcion-historial">
              {registro.historial.map((h, i) => (
                <li key={i}>
                  <strong>{acciones[h.accion] ?? h.accion}</strong>
                  <p>
                    <time dateTime={h.momento}>{fecha(h.momento)}</time> · {h.origen}
                  </p>
                  {h.motivo && <p className="consulta-mensaje">{h.motivo}</p>}
                </li>
              ))}
            </ol>
            <p>
              El personal del Módulo registra tu asistencia y sus cambios se muestran en este
              historial.
            </p>
            {registro.estadoTaller === 'cancelado' && <p>El taller fue cancelado.</p>}
            {registro.estadoTaller === 'concluido' && <p>El taller ha concluido.</p>}
            {(registro.puedeCancelar || registro.puedeReactivar) && (
              <form
                className="formulario-consulta"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (bloqueo.current) return;
                  bloqueo.current = true;
                  cambiarOcupado(true);
                  cambiarError('');
                  cambiarMensaje('');
                  const formulario = e.currentTarget;
                  const datos = Object.fromEntries(new FormData(formulario));
                  const accion = registro.puedeCancelar ? 'cancelar' : 'reactivar';
                  try {
                    const r = await fetch('/api/v1/publico/inscripciones/acciones', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...acceso,
                        accion,
                        motivo: datos.motivo,
                        version: registro.version,
                        aceptoAviso: datos.aceptoAviso === 'on',
                        versionAviso: registro.aviso?.version,
                      }),
                    });
                    const resultado = await r.json();
                    if (!r.ok)
                      throw new Error(resultado.mensaje ?? 'No se pudo actualizar la inscripción.');
                    if (
                      new URLSearchParams(location.hash.slice(1)).get('inscripcion-taller') ===
                      acceso.folio
                    ) {
                      cambiarRegistro(resultado);
                      cambiarMensaje(
                        accion === 'cancelar'
                          ? 'Cancelaste tu inscripción. La plaza quedó disponible.'
                          : 'Tu inscripción fue reactivada con el mismo folio.',
                      );
                    }
                    formulario.reset();
                  } catch (e) {
                    cambiarError(mensajeSolicitud(e));
                  } finally {
                    bloqueo.current = false;
                    cambiarOcupado(false);
                  }
                }}
              >
                <h4>
                  {registro.puedeCancelar ? 'Cancelar mi inscripción' : 'Reactivar mi inscripción'}
                </h4>
                <label>
                  Motivo
                  <textarea name="motivo" maxLength={500} required rows={3} disabled={ocupado} />
                </label>
                {registro.puedeReactivar && (
                  <label className="inscripcion-consentimiento">
                    <input type="checkbox" name="aceptoAviso" required disabled={ocupado} />
                    <span>
                      Leí y acepto el{' '}
                      <a href={registro.aviso.url} target="_blank" rel="noreferrer">
                        aviso de privacidad vigente
                      </a>
                      .
                    </span>
                  </label>
                )}
                <button className="boton" disabled={ocupado}>
                  {registro.puedeCancelar ? 'Cancelar mi inscripción' : 'Reactivar mi inscripción'}
                </button>
              </form>
            )}
            {registro.estado === 'cancelada' && !registro.puedeReactivar && (
              <p>
                La reactivación requiere una convocatoria abierta y un lugar disponible. Actualiza
                el estado para revisar la disponibilidad.
              </p>
            )}
          </>
        )}
        <div className="consulta-acciones">
          <button
            type="button"
            className="boton"
            disabled={ocupado}
            onClick={() => cambiarRevision((n) => n + 1)}
          >
            Actualizar inscripción
          </button>
          <a href="#talleres">Volver a talleres</a>
        </div>
      </div>
    </section>
  );
}
