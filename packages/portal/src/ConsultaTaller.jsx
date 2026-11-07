import { useEffect, useRef, useState } from 'react';
import { useContenidoPortal } from './contextoContenido.jsx';
import { mensajeSolicitud } from './mensajesSolicitud.js';
import {
  enlaceConsulta,
  eventoConsultas,
  fragmentoSeguimiento,
  guardarConsulta,
  leerConsultasGuardadas,
  quitarConsulta,
} from './consultasGuardadas.js';

const idMisConsultas = 'mis-consultas-talleres';

export function ConsultaTaller({ taller }) {
  const { avisoTalleres } = useContenidoPortal();
  const [ocupado, cambiarOcupado] = useState(false);
  const [error, cambiarError] = useState('');
  const [duplicada, cambiarDuplicada] = useState(false);
  const [recibo, cambiarRecibo] = useState(null);
  const bloqueo = useRef(false);
  const confirmacion = useRef(null);
  useEffect(() => {
    if (recibo) confirmacion.current?.focus();
  }, [recibo]);
  return (
    <details className="taller-consulta">
      <summary className="boton">Solicitar información</summary>
      {!avisoTalleres ? (
        <p>Las consultas en línea todavía no están disponibles.</p>
      ) : recibo ? (
        <div className="consulta-recibo" role="status" tabIndex={-1} ref={confirmacion}>
          <h4>Recibimos tu consulta</h4>
          <p>
            Tu folio es <strong>{recibo.folio}</strong>. La responsable podrá responderte dentro de
            este sitio.
          </p>
          <p>
            {recibo.guardado
              ? 'Guardamos el acceso en este navegador. Al volver al sitio, encontrarás tu solicitud en «Mis consultas de talleres».'
              : 'Este navegador no permitió guardar el acceso. Conserva el enlace privado para consultar tu respuesta.'}
          </p>
          <p>
            {recibo.correo === 'enviado'
              ? 'Enviamos una copia a tu correo con un botón para consultar el estado. Si no aparece, revisa el correo no deseado.'
              : recibo.correo === 'fallido'
                ? 'Tu consulta quedó registrada, pero no pudimos enviar la copia por correo. Puedes revisar la respuesta aquí.'
                : 'La copia por correo todavía no está disponible. Puedes revisar la respuesta aquí.'}
          </p>
          <a href={recibo.enlace}>Consultar mi solicitud</a>
          {!recibo.guardado && (
            <label>
              Enlace privado
              <input readOnly value={recibo.enlace} onFocus={(e) => e.currentTarget.select()} />
            </label>
          )}
        </div>
      ) : (
        <form
          className="formulario-consulta"
          onSubmit={async (e) => {
            e.preventDefault();
            if (bloqueo.current) return;
            bloqueo.current = true;
            cambiarOcupado(true);
            cambiarError('');
            cambiarDuplicada(false);
            const datos = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const respuesta = await fetch(`/api/v1/publico/talleres/${taller.id}/consultas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...datos,
                  mensaje: datos.mensaje.trim(),
                  aceptoAviso: datos.aceptoAviso === 'on',
                  versionAviso: avisoTalleres.version,
                }),
              });
              const resultado = await respuesta.json();
              if (!respuesta.ok) {
                cambiarDuplicada(resultado.error === 'CONSULTA_DUPLICADA');
                throw new Error(
                  resultado.mensaje ?? 'No se pudo enviar la consulta. Inténtalo de nuevo.',
                );
              }
              const guardado = guardarConsulta({
                folio: resultado.folio,
                acceso: resultado.acceso,
                tallerNombre: taller.nombre ?? taller.titulo,
              });
              const enlace = `${location.origin}${enlaceConsulta(resultado)}`;
              cambiarRecibo({ folio: resultado.folio, enlace, guardado, correo: resultado.correo });
            } catch (e) {
              cambiarError(mensajeSolicitud(e));
            } finally {
              bloqueo.current = false;
              cambiarOcupado(false);
            }
          }}
        >
          <p>
            Solicita información sobre este taller. Para reservar un lugar, utiliza la inscripción
            del taller.
          </p>
          <p>
            El acceso se guardará en este navegador para volver a tu consulta. También recibirás una
            copia por correo cuando el envío esté disponible.
          </p>
          <fieldset disabled={ocupado}>
            <legend>Solicitud de información</legend>
            <label>
              Nombre completo
              <input name="nombre" autoComplete="name" maxLength={160} required />
            </label>
            <label>
              Correo de contacto
              <input name="correo" type="email" autoComplete="email" maxLength={160} required />
            </label>
            <label>
              ¿Qué te gustaría saber? (opcional)
              <textarea name="mensaje" maxLength={1000} rows={4} />
            </label>
            <label className="inscripcion-consentimiento">
              <input name="aceptoAviso" type="checkbox" required />
              <span>
                Leí y acepto el{' '}
                <a href={avisoTalleres.url} target="_blank" rel="noreferrer">
                  aviso de privacidad
                </a>
                .
              </span>
            </label>
            {error && <p role="alert">{error}</p>}
            {duplicada && <a href={`#${idMisConsultas}`}>Ir a Mis consultas de talleres</a>}
            <button className="boton" disabled={ocupado}>
              {ocupado ? 'Enviando…' : 'Enviar consulta'}
            </button>
          </fieldset>
        </form>
      )}
    </details>
  );
}

const fecha = (valor) =>
  valor
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(valor))
    : 'Sin fecha registrada';

const accionesSolicitud = {
  REGISTRAR_SOLICITUD: 'Solicitud recibida',
  RESPONDER_SOLICITUD: 'Respuesta publicada',
  AGREGAR_MENSAJE: 'Mensaje del solicitante',
  CANCELAR_SOLICITUD: 'Solicitud cancelada',
  REABRIR_SOLICITUD: 'Solicitud reabierta',
  HABILITAR_SEGUIMIENTO: 'Enlace de seguimiento preparado',
};

export function SeguimientoConsultaTaller({ tipo = 'CT' }) {
  const social = tipo === 'SS';
  const fragmento = fragmentoSeguimiento(tipo);
  const ruta = social ? 'servicio-social' : 'consultas-talleres';
  const tituloId = social ? 'titulo-seguimiento-social' : 'titulo-seguimiento';
  const [acceso, cambiarAcceso] = useState(null);
  const [consulta, cambiarConsulta] = useState(null);
  const [error, cambiarError] = useState('');
  const [ocupado, cambiarOcupado] = useState(false);
  const [revision, cambiarRevision] = useState(0);
  const region = useRef(null);
  const mensajes = [
    ...(consulta?.seguimientos ?? []).map((m) => ({ ...m, titulo: 'Tu mensaje de seguimiento' })),
    ...(consulta?.respuestas ?? []).map((m) => ({ ...m, titulo: 'Respuesta del Módulo' })),
  ].sort((a, b) => a.momento.localeCompare(b.momento));
  useEffect(() => {
    const leer = () => {
      const datos = new URLSearchParams(location.hash.slice(1));
      if (!datos.has(fragmento)) {
        cambiarAcceso(null);
        cambiarConsulta(null);
        return;
      }
      cambiarAcceso({ folio: datos.get(fragmento), acceso: datos.get('acceso') ?? '' });
      requestAnimationFrame(() => {
        region.current?.focus();
        region.current?.scrollIntoView();
      });
    };
    leer();
    window.addEventListener('hashchange', leer);
    return () => window.removeEventListener('hashchange', leer);
  }, [fragmento]);
  useEffect(() => {
    if (!acceso) return;
    const controlador = new AbortController();
    cambiarOcupado(true);
    cambiarError('');
    cambiarConsulta(null);
    (async () => {
      try {
        const respuesta = await fetch(`/api/v1/publico/${ruta}/consultar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(acceso),
          signal: controlador.signal,
          cache: 'no-store',
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.mensaje ?? 'No pudimos consultar la respuesta.');
        if (!controlador.signal.aborted) {
          cambiarConsulta(datos);
          guardarConsulta({ ...acceso, tallerNombre: datos.programaNombre ?? datos.tallerNombre });
        }
      } catch (e) {
        if (!controlador.signal.aborted) cambiarError(mensajeSolicitud(e));
      } finally {
        if (!controlador.signal.aborted) cambiarOcupado(false);
      }
    })();
    return () => controlador.abort();
  }, [acceso, revision, ruta]);
  if (!acceso) return null;
  return (
    <section
      id={social ? 'consultar-servicio-social' : 'consultar-solicitud'}
      className="seguimiento-consulta seccion"
      aria-labelledby={tituloId}
      ref={region}
      tabIndex={-1}
    >
      <div className="contenido contenido-estrecho">
        <h2 id={tituloId}>
          {social ? 'Mi solicitud de servicio social' : 'Solicitud de información del taller'}
        </h2>
        <p>
          {social
            ? 'Consulta aquí tu conversación con el Módulo. La solicitud de información no constituye admisión al programa.'
            : 'Este folio corresponde a tus preguntas sobre el taller. Para reservar un lugar, utiliza «Inscribirme al taller».'}
        </p>
        {error && <p role="alert">{error}</p>}
        {ocupado && <p role="status">Consultando tu solicitud…</p>}
        {consulta && (
          <>
            <h3>{consulta.programaNombre ?? consulta.tallerNombre}</h3>
            <p>
              Folio: <strong>{consulta.folio}</strong> · {fecha(consulta.creadoEn)}
            </p>
            <h4>Tu pregunta</h4>
            <p className="consulta-mensaje">
              {consulta.mensaje || 'Solicitaste información sin agregar un mensaje inicial.'}
            </p>
            <p role="status">
              {consulta.estado === 'cancelada'
                ? 'La solicitud está cancelada.'
                : consulta.estado === 'pendiente'
                  ? 'Tu consulta está pendiente de respuesta.'
                  : 'Tu consulta fue respondida.'}
            </p>
            <div className="consulta-respuestas">
              {mensajes.map((m, i) => (
                <article key={i}>
                  <h4>{m.titulo}</h4>
                  <time dateTime={m.momento}>{fecha(m.momento)}</time>
                  <p className="consulta-mensaje">{m.texto}</p>
                </article>
              ))}
            </div>
            {consulta.historial?.length > 0 && (
              <details className="solicitud-historial">
                <summary>Historial de la solicitud</summary>
                <ol>
                  {consulta.historial.map((h, i) => (
                    <li key={i}>
                      <strong>{accionesSolicitud[h.accion] ?? h.accion}</strong> ·{' '}
                      {fecha(h.momento)} · {h.origen}
                      {h.motivo && <p className="consulta-mensaje">{h.motivo}</p>}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {consulta.estado === 'cancelada' ? (
              <p>
                {consulta.historial?.findLast((h) => h.accion === 'CANCELAR_SOLICITUD')?.motivo &&
                  `Motivo: ${consulta.historial.findLast((h) => h.accion === 'CANCELAR_SOLICITUD').motivo}`}
              </p>
            ) : (
              <form
                className="formulario-consulta"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (ocupado) return;
                  const formulario = e.currentTarget;
                  const texto = new FormData(formulario).get('texto');
                  cambiarOcupado(true);
                  cambiarError('');
                  try {
                    const respuesta = await fetch(`/api/v1/publico/${ruta}/mensajes`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...acceso, texto, version: consulta.version }),
                    });
                    const datos = await respuesta.json();
                    if (!respuesta.ok)
                      throw new Error(datos.mensaje ?? 'No se pudo enviar el mensaje.');
                    if (new URLSearchParams(location.hash.slice(1)).get(fragmento) === acceso.folio)
                      cambiarConsulta(datos);
                    formulario.reset();
                  } catch (e) {
                    cambiarError(mensajeSolicitud(e));
                  } finally {
                    cambiarOcupado(false);
                  }
                }}
              >
                <label>
                  Continuar esta consulta
                  <textarea name="texto" required maxLength={1000} rows={3} disabled={ocupado} />
                </label>
                <button className="boton" disabled={ocupado}>
                  Enviar mensaje de seguimiento
                </button>
              </form>
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
            Actualizar respuesta
          </button>
          <a href={social ? '#interes-servicio-social' : '#talleres'}>
            {social ? 'Volver a servicio social' : 'Volver a talleres'}
          </a>
        </div>
      </div>
    </section>
  );
}

export function MisConsultasTaller({ tipo = 'CT' }) {
  const [consultas, cambiarConsultas] = useState([]);
  const [error, cambiarError] = useState('');
  useEffect(() => {
    const actualizar = () => cambiarConsultas(leerConsultasGuardadas(tipo));
    actualizar();
    const eventos = [eventoConsultas, 'storage', 'focus', 'pageshow', 'hashchange'];
    for (const evento of eventos) window.addEventListener(evento, actualizar);
    return () => {
      for (const evento of eventos) window.removeEventListener(evento, actualizar);
    };
  }, [tipo]);
  if (!consultas.length && tipo !== 'CT') return null;
  const id =
    tipo === 'INS'
      ? 'mis-inscripciones-talleres'
      : tipo === 'SS'
        ? 'mis-solicitudes-social'
        : idMisConsultas;
  return (
    <section className="consultas-guardadas" id={id} aria-labelledby={`${id}-titulo`} tabIndex={-1}>
      <h3 id={`${id}-titulo`}>
        {tipo === 'INS'
          ? 'Mis inscripciones a talleres'
          : tipo === 'SS'
            ? 'Mis solicitudes de servicio social'
            : 'Mis consultas de talleres'}
      </h3>
      {consultas.length ? (
        <p>
          Estas solicitudes están guardadas en este navegador. Puedes quitar su acceso en un equipo
          compartido. Tu consulta seguirá registrada en el Módulo.
        </p>
      ) : (
        <p>
          No hay consultas guardadas en este navegador. Si ya enviaste una, abre el correo de
          confirmación y pulsa <strong>Consulta tu estado</strong> para continuar con tu folio.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {consultas.length > 0 && (
        <ul>
          {consultas.map((c) => (
            <li key={c.folio}>
              <div>
                <strong>{c.tallerNombre}</strong>
                <span>Folio: {c.folio}</span>
              </div>
              <div className="consulta-acciones">
                <a href={enlaceConsulta(c)} aria-label={`Consultar estado de ${c.folio}`}>
                  Consultar estado
                </a>
                <button
                  type="button"
                  aria-label={`Quitar ${c.folio} de este navegador`}
                  onClick={() => {
                    if (!quitarConsulta(c.folio)) {
                      cambiarError(
                        'No se pudo quitar el acceso de este navegador. Inténtalo de nuevo.',
                      );
                      return;
                    }
                    cambiarError('');
                    if (
                      new URLSearchParams(location.hash.slice(1)).get(
                        fragmentoSeguimiento(tipo),
                      ) === c.folio
                    )
                      location.hash = tipo === 'SS' ? 'interes-servicio-social' : 'talleres';
                  }}
                >
                  Quitar de este navegador
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
