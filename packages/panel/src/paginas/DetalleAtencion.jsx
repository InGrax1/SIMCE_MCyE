import { useEffect, useRef, useState } from 'react';
import { consultarApi } from '../servicios/sesion.js';

export const etiquetasEstado = {
  pendiente: 'Pendiente',
  respondida: 'Respondida',
  cancelada: 'Cancelada',
  confirmada: 'Confirmada',
  asistio: 'Asistencia registrada',
};
const eventos = {
  REGISTRAR_SOLICITUD: 'Solicitud recibida',
  AGREGAR_MENSAJE: 'Mensaje del solicitante',
  RESPONDER_SOLICITUD: 'Respuesta publicada',
  CANCELAR_SOLICITUD: 'Solicitud cancelada',
  REABRIR_SOLICITUD: 'Solicitud reabierta',
  HABILITAR_SEGUIMIENTO: 'Preparación del acceso privado',
  INSCRIBIR: 'Inscripción confirmada',
  cancelar: 'Inscripción cancelada',
  reactivar: 'Inscripción reactivada',
  asistencia: 'Asistencia registrada',
  CANCELAR_TALLER: 'Taller cancelado',
};
export const fechaPanel = (momento, corta = false) =>
  momento
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        dateStyle: 'medium',
        ...(corta ? {} : { timeStyle: 'short' }),
      }).format(new Date(momento))
    : 'Sin fecha';
export function EstadoSolicitud({ estado }) {
  return (
    <span className="cms-estado-etiqueta" data-estado={estado}>
      {etiquetasEstado[estado] ?? 'Pendiente'}
    </span>
  );
}

function Historial({ eventos: lista = [] }) {
  return (
    <details className="cms-detalle-historial">
      <summary>Historial</summary>
      {lista.length ? (
        <ol>
          {lista.toReversed().map((h, i) => (
            <li key={i}>
              <strong>{eventos[h.accion] ?? h.accion}</strong>
              <p>{fechaPanel(h.momento)}</p>
              {h.motivo && <p className="consulta-mensaje">{h.motivo}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p>Todavía no hay cambios registrados.</p>
      )}
    </details>
  );
}

function FormularioGestion({ accion, titulo, confirmacion, aviso, ocupado, cancelar, enviar }) {
  const motivo = useRef(null);
  useEffect(() => motivo.current?.focus(), []);
  return (
    <form
      className="cms-form-gestion"
      onSubmit={(e) => {
        e.preventDefault();
        const datos = Object.fromEntries(new FormData(e.currentTarget));
        enviar({
          accion,
          motivo: datos.motivo,
          aceptoAviso: datos.aceptoAviso === 'on',
          versionAviso: aviso?.version,
        });
      }}
    >
      <h3>{titulo}</h3>
      {accion === 'cancelar' && (
        <p>
          {titulo.includes('inscripción')
            ? 'Al cancelar se libera su plaza.'
            : 'Se conservarán el folio y la conversación. La solicitud quedará en solo lectura hasta que la reabras.'}
        </p>
      )}
      <label>
        Motivo
        <textarea ref={motivo} name="motivo" rows={3} maxLength={500} required disabled={ocupado} />
      </label>
      <p>El motivo aparecerá en el historial de la persona.</p>
      {aviso && (
        <label className="cms-check">
          <input type="checkbox" name="aceptoAviso" required disabled={ocupado} />
          <span>
            Confirmo que el participante aceptó el{' '}
            <a href={aviso.url} target="_blank" rel="noreferrer">
              aviso vigente
            </a>
            .
          </span>
        </label>
      )}
      <div className="cms-acciones">
        <button disabled={ocupado} className={accion === 'cancelar' ? 'peligro' : undefined}>
          {confirmacion}
        </button>
        <button type="button" className="secundario" disabled={ocupado} onClick={cancelar}>
          Volver
        </button>
      </div>
    </form>
  );
}

export function DetalleSolicitud({ registro, social, ejecutar, ocupado, cargar }) {
  const [accion, elegirAccion] = useState(null);
  const [mensaje, cambiarMensaje] = useState('');
  const [respuesta, cambiarRespuesta] = useState('');
  const cancelada = registro.estado === 'cancelada';
  const ruta = social ? `/cms/intereses/${registro.id}` : `/consultas-talleres/${registro.id}`;
  const conversacion = [
    {
      titulo: 'Solicitante',
      texto: registro.mensaje || 'Sin mensaje adicional.',
      momento: registro.creadoEn ?? registro.momento,
    },
    ...[
      ...(registro.seguimientos ?? []).map((m) => ({ ...m, titulo: 'Solicitante' })),
      ...(registro.respuestas ?? []).map((m) => ({ ...m, titulo: 'Módulo' })),
    ].sort((a, b) => a.momento.localeCompare(b.momento)),
  ];
  function gestionar(datos) {
    ejecutar(async () => {
      await consultarApi(`${ruta}/acciones`, {
        metodo: 'POST',
        datos: { ...datos, version: registro.version },
      });
      await cargar();
      elegirAccion(null);
      cambiarMensaje(
        `Solicitud ${registro.folio} ${datos.accion === 'cancelar' ? 'cancelada' : 'reabierta'}.`,
      );
    });
  }
  return (
    <div className="cms-detalle-cuerpo">
      {mensaje && (
        <p className="cms-exito" role="status">
          {mensaje}
        </p>
      )}
      {social && !registro.seguimientoHabilitado && (
        <div className="cms-seguimiento-legado">
          <div>
            <strong>Solicitud anterior</strong>
            <p>
              Envía el enlace privado para que la persona pueda leer tus respuestas en el portal.
            </p>
          </div>
          <button
            type="button"
            className="secundario"
            disabled={ocupado}
            onClick={() =>
              ejecutar(async () => {
                const { correo } = await consultarApi(`${ruta}/seguimiento`, {
                  metodo: 'POST',
                  datos: { version: registro.version },
                });
                await cargar();
                cambiarMensaje(
                  correo === 'enviado'
                    ? 'Enlace de seguimiento enviado por correo.'
                    : correo === 'archivo'
                      ? 'Enlace preparado en el buzón local de prueba.'
                      : 'No se pudo enviar el enlace. Revisa el correo del sistema y vuelve a intentarlo.',
                );
              })
            }
          >
            Enviar acceso de seguimiento
          </button>
        </div>
      )}
      <div className="cms-detalle-controles cms-solicitud-acciones">
        <Historial eventos={registro.historial} />
        <button
          type="button"
          className="secundario"
          disabled={ocupado || Boolean(accion)}
          onClick={() => elegirAccion(cancelada ? 'reabrir' : 'cancelar')}
        >
          {cancelada ? 'Reabrir solicitud' : 'Cancelar solicitud'}
        </button>
      </div>
      {accion && (
        <FormularioGestion
          key={accion}
          accion={accion}
          titulo={accion === 'cancelar' ? 'Cancelar solicitud' : 'Reabrir solicitud'}
          confirmacion={accion === 'cancelar' ? 'Confirmar cancelación' : 'Confirmar reapertura'}
          ocupado={ocupado}
          cancelar={() => elegirAccion(null)}
          enviar={gestionar}
        />
      )}
      <h3>Conversación</h3>
      <ol className="cms-conversacion">
        {conversacion.map((m, i) => (
          <li key={i} data-autor={m.titulo}>
            <div>
              <strong>{m.titulo}</strong>
              <time dateTime={m.momento ?? undefined}>{fechaPanel(m.momento)}</time>
            </div>
            <p className="consulta-mensaje">{m.texto}</p>
          </li>
        ))}
      </ol>
      {cancelada ? (
        <p className="cms-detalle-cerrado">
          La solicitud está cancelada. Reábrela para continuar la conversación.
        </p>
      ) : (
        <form
          className="cms-responder"
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(async () => {
              await consultarApi(`${ruta}/respuestas`, {
                metodo: 'POST',
                datos: { texto: respuesta, version: registro.version },
              });
              await cargar();
              cambiarRespuesta('');
              cambiarMensaje(`Respuesta publicada para ${registro.folio}.`);
            });
          }}
        >
          <label>
            Respuesta para {registro.folio}
            <textarea
              value={respuesta}
              onChange={(e) => cambiarRespuesta(e.target.value)}
              placeholder="Escribe una respuesta al solicitante"
              rows={4}
              maxLength={2000}
              required
              disabled={ocupado}
            />
          </label>
          <button disabled={ocupado || !respuesta.trim()}>Publicar respuesta</button>
        </form>
      )}
    </div>
  );
}

export function DetalleParticipante({ registro, taller, aviso, ejecutar, ocupado, cargar }) {
  const [accion, elegirAccion] = useState(null);
  const [mensaje, cambiarMensaje] = useState('');
  const acciones =
    registro.estado === 'confirmada'
      ? [
          ['asistencia', 'Registrar asistencia', 'Confirmar asistencia'],
          ['cancelar', 'Cancelar inscripción', 'Confirmar cancelación'],
        ]
      : registro.estado === 'cancelada' && taller?.inscripcion?.estado === 'programado' && aviso
        ? [['reactivar', 'Reactivar inscripción', 'Confirmar reactivación']]
        : [];
  const actual = acciones.find(([clave]) => clave === accion);
  function gestionar(datos) {
    ejecutar(async () => {
      await consultarApi(`/inscripciones/${registro.id}/acciones`, {
        metodo: 'POST',
        datos: { ...datos, version: registro.version },
      });
      await cargar();
      elegirAccion(null);
      cambiarMensaje(`Inscripción ${registro.folio} actualizada.`);
    });
  }
  return (
    <div className="cms-detalle-cuerpo">
      {mensaje && (
        <p className="cms-exito" role="status">
          {mensaje}
        </p>
      )}
      <h3>Datos del participante</h3>
      <dl className="cms-datos-participante">
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
      <div className="cms-detalle-controles">
        <Historial eventos={registro.historial} />
        <div className="cms-acciones">
          {acciones.map(([clave, titulo]) => (
            <button
              type="button"
              className="secundario"
              key={clave}
              disabled={ocupado || Boolean(accion)}
              onClick={() => elegirAccion(clave)}
            >
              {titulo}
            </button>
          ))}
        </div>
      </div>
      {actual && (
        <FormularioGestion
          key={accion}
          accion={accion}
          titulo={actual[1]}
          confirmacion={actual[2]}
          aviso={accion === 'reactivar' ? aviso : null}
          ocupado={ocupado}
          cancelar={() => elegirAccion(null)}
          enviar={gestionar}
        />
      )}
    </div>
  );
}
