import { useEffect, useRef, useState } from 'react';
import { enlaceConsulta, guardarConsulta } from './consultasGuardadas.js';
import { mensajeSolicitud } from './mensajesSolicitud.js';

const fecha = (valor) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor));

export function InscripcionTaller({ taller }) {
  const [actual, cambiarActual] = useState(null);
  const [aviso, cambiarAviso] = useState(null);
  const [procedencia, cambiarProcedencia] = useState('externa');
  const [ocupado, cambiarOcupado] = useState(false);
  const [error, cambiarError] = useState('');
  const [folio, cambiarFolio] = useState('');
  const [recibo, cambiarRecibo] = useState(null);
  const bloqueo = useRef(false);
  const confirmacion = useRef(null);
  useEffect(() => {
    if (folio) confirmacion.current?.focus();
  }, [folio]);
  async function consultar() {
    cambiarActual(null);
    cambiarError('');
    try {
      const respuesta = await fetch('/api/v1/publico/talleres', { cache: 'no-store' });
      if (!respuesta.ok)
        throw new Error('No fue posible consultar los lugares. Inténtalo de nuevo.');
      const datos = await respuesta.json();
      cambiarActual(datos.talleres.find((t) => t.id === taller.id) ?? { inscripcion: null });
      cambiarAviso(datos.aviso);
    } catch (e) {
      cambiarError(mensajeSolicitud(e));
    }
  }
  async function enviar(e) {
    e.preventDefault();
    if (bloqueo.current) return;
    bloqueo.current = true;
    cambiarOcupado(true);
    cambiarError('');
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const respuesta = await fetch(`/api/v1/publico/talleres/${taller.id}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...datos,
          aceptoAviso: datos.aceptoAviso === 'on',
          versionAviso: aviso.version,
        }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        if (
          ['AVISO_NO_ACEPTADO', 'AVISO_PENDIENTE', 'CUPO_AGOTADO', 'INSCRIPCION_CERRADA'].includes(
            resultado.error,
          )
        )
          await consultar();
        throw new Error(resultado.mensaje ?? 'No fue posible completar la inscripción.');
      }
      cambiarFolio(resultado.folio);
      const guardado = guardarConsulta({
        ...resultado,
        tallerNombre: taller.nombre ?? taller.titulo,
      });
      cambiarRecibo({
        ...resultado,
        guardado,
        enlace: `${location.origin}${enlaceConsulta(resultado)}`,
      });
    } catch (e) {
      cambiarError(mensajeSolicitud(e));
    } finally {
      bloqueo.current = false;
      cambiarOcupado(false);
    }
  }
  if (!taller.inscripcion)
    return <p>Este taller todavía no tiene inscripción en línea. Puedes solicitar información.</p>;
  const inscripcion = actual?.inscripcion;
  return (
    <details
      className="taller-inscripcion"
      onToggle={(e) => {
        if (e.currentTarget.open && !folio) consultar();
      }}
    >
      <summary>Inscribirme al taller</summary>
      {error && <p role="alert">{error}</p>}
      {folio ? (
        <div role="status" tabIndex={-1} ref={confirmacion} className="inscripcion-confirmada">
          <h4>Inscripción confirmada</h4>
          <p>
            Tu folio es <strong>{folio}</strong>. Puedes consultar tu registro, cancelar o reactivar
            tu inscripción y revisar el historial y la asistencia dentro del sitio.
          </p>
          <p>
            {recibo?.guardado
              ? 'El acceso quedó guardado en «Mis inscripciones a talleres» en este navegador.'
              : 'El navegador no permitió guardar el acceso. Conserva el enlace privado.'}
          </p>
          <p>
            {recibo?.correo === 'enviado'
              ? 'Enviamos una copia por correo con el botón para consultar tu estado.'
              : recibo?.correo === 'fallido'
                ? 'La inscripción está confirmada, pero falló el envío de la copia por correo.'
                : 'La copia por correo todavía no está disponible.'}
          </p>
          <a href={recibo?.enlace}>Consultar mi inscripción</a>
          {recibo && !recibo.guardado && (
            <label>
              Enlace privado de inscripción
              <input readOnly value={recibo.enlace} onFocus={(e) => e.currentTarget.select()} />
            </label>
          )}
        </div>
      ) : !actual ? (
        <p role="status">
          {error ? 'Cierra y vuelve a abrir para reintentar.' : 'Consultando disponibilidad…'}
        </p>
      ) : !inscripcion ? (
        <p>Este taller no tiene una inscripción disponible.</p>
      ) : (
        <>
          <p>{inscripcion.sede}</p>
          <p className="taller-temario">{inscripcion.temario}</p>
          <p>
            Inscripción: {fecha(inscripcion.apertura)} al {fecha(inscripcion.cierre)} (hora de
            Ciudad de México).
          </p>
          <p>
            {inscripcion.disponibles} de {inscripcion.cupo} lugares disponibles.
          </p>
          {!aviso ? (
            <p>La inscripción aún no está disponible. Solicita información al módulo.</p>
          ) : !inscripcion.habilitada ? (
            <p>
              {inscripcion.estado === 'cancelado'
                ? 'Taller cancelado.'
                : inscripcion.estado === 'concluido'
                  ? 'Taller concluido.'
                  : inscripcion.estadoInscripcion === 'cupo_lleno'
                    ? 'Cupo agotado.'
                    : inscripcion.estadoInscripcion === 'proximamente'
                      ? 'La inscripción todavía no abre.'
                      : 'La inscripción está cerrada.'}
            </p>
          ) : (
            <form onSubmit={enviar} className="formulario-inscripcion">
              <fieldset disabled={ocupado}>
                <legend>Datos de inscripción</legend>
                <label>
                  Nombre completo
                  <input name="nombre" autoComplete="name" maxLength={160} required />
                </label>
                <label>
                  Correo
                  <input name="correo" type="email" autoComplete="email" maxLength={160} required />
                </label>
                <label>
                  Teléfono
                  <input
                    name="telefono"
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    minLength={7}
                    required
                  />
                </label>
                <label>
                  Procedencia
                  <select
                    name="procedencia"
                    value={procedencia}
                    onChange={(e) => cambiarProcedencia(e.target.value)}
                  >
                    <option value="externa">Externa</option>
                    <option value="interna">Comunidad UNAM</option>
                  </select>
                </label>
                {procedencia === 'interna' && (
                  <>
                    <label>
                      Licenciatura
                      <input name="licenciatura" maxLength={160} required />
                    </label>
                    <label>
                      Número de cuenta
                      <input name="numeroCuenta" inputMode="numeric" maxLength={30} required />
                    </label>
                  </>
                )}
                <label className="inscripcion-consentimiento">
                  <input type="checkbox" name="aceptoAviso" required />
                  <span>
                    He leído y acepto el{' '}
                    <a href={aviso.url} target="_blank" rel="noreferrer">
                      aviso de privacidad
                    </a>{' '}
                    (versión {aviso.version}).
                  </span>
                </label>
                <button className="boton" disabled={ocupado}>
                  {ocupado ? 'Registrando…' : 'Confirmar inscripción'}
                </button>
              </fieldset>
            </form>
          )}
        </>
      )}
    </details>
  );
}
