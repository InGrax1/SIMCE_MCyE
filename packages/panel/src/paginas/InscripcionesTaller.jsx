import { useState } from 'react';
import { consultarApi } from '../servicios/sesion.js';

// datetime-local se presenta siempre en Ciudad de México, independientemente del equipo.
const local = (iso) =>
  iso
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .format(new Date(iso))
        .replace(' ', 'T')
    : '';
const utc = (valor) => new Date(`${valor}:00-06:00`).toISOString();

export function InscripcionesTaller({ entrada, ejecutar, ocupado, actualizar }) {
  const [lista, cambiarLista] = useState(null);
  const [motivo, cambiarMotivo] = useState('');
  const [consentimiento, cambiarConsentimiento] = useState(false);
  const configuracion = entrada.inscripcion;
  const terminado = configuracion && configuracion.estado !== 'programado';
  async function cargar() {
    cambiarLista(await consultarApi(`/talleres/${entrada.id}/inscripciones`));
  }
  async function accion(inscripcion, accion) {
    await consultarApi(`/inscripciones/${inscripcion.id}/acciones`, {
      metodo: 'POST',
      datos: {
        accion,
        version: inscripcion.version,
        motivo,
        aceptoAviso: consentimiento,
        versionAviso: lista.aviso?.version,
      },
    });
    await cargar();
    cambiarConsentimiento(false);
  }
  async function descargar(formato) {
    const archivo = await consultarApi(`/talleres/${entrada.id}/inscripciones?formato=${formato}`);
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `inscripciones-${entrada.id}.${formato}`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="cms-inscripciones" aria-labelledby="titulo-inscripciones">
      <h3 id="titulo-inscripciones">Inscripciones del taller</h3>
      <p>
        Configura el cupo y el periodo de inscripción. El formulario se habilita al publicar el
        taller y disponer del aviso autorizado.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const datos = Object.fromEntries(new FormData(e.currentTarget));
          ejecutar(async () => {
            await consultarApi(`/talleres/${entrada.id}`, {
              metodo: 'PUT',
              datos: {
                ...datos,
                cupo: Number(datos.cupo),
                apertura: utc(datos.apertura),
                cierre: utc(datos.cierre),
                version: entrada.version,
              },
            });
            await actualizar();
          });
        }}
      >
        <fieldset disabled={ocupado || terminado}>
          <legend>Cupo y periodo · hora de Ciudad de México</legend>
          <label>
            Contenido temático
            <textarea
              name="temario"
              defaultValue={configuracion?.temario ?? ''}
              maxLength={4000}
              required
            />
          </label>
          <label>
            Sede
            <input name="sede" defaultValue={configuracion?.sede ?? ''} maxLength={300} required />
          </label>
          <label>
            Cupo
            <input
              name="cupo"
              type="number"
              min={1}
              max={10000}
              step={1}
              defaultValue={configuracion?.cupo ?? 25}
              required
            />
          </label>
          <label>
            Apertura de inscripción
            <input
              name="apertura"
              type="datetime-local"
              defaultValue={local(configuracion?.apertura)}
              required
            />
          </label>
          <label>
            Cierre de inscripción
            <input
              name="cierre"
              type="datetime-local"
              defaultValue={local(configuracion?.cierre)}
              required
            />
          </label>
          {configuracion && (
            <label>
              Motivo del cambio de periodo
              <input name="motivo" maxLength={500} />
            </label>
          )}
          <button disabled={ocupado || terminado}>Guardar inscripción</button>
        </fieldset>
      </form>
      {configuracion && (
        <p>
          Estado operativo: <strong>{configuracion.estado}</strong>.
        </p>
      )}
      <div className="cms-acciones">
        <button
          type="button"
          className="secundario"
          disabled={ocupado}
          onClick={() => ejecutar(cargar)}
        >
          Consultar asistentes
        </button>
        {['csv', 'pdf'].map((formato) => (
          <button
            type="button"
            className="secundario"
            key={formato}
            disabled={ocupado}
            onClick={() => ejecutar(() => descargar(formato))}
          >
            Exportar {formato.toUpperCase()}
          </button>
        ))}
      </div>
      <label>
        Motivo de la acción sobre taller o inscripción
        <input value={motivo} onChange={(e) => cambiarMotivo(e.target.value)} maxLength={500} />
      </label>
      {configuracion && !terminado && (
        <div className="cms-acciones">
          {['concluir', 'cancelar'].map((accion) => (
            <button
              type="button"
              className="secundario"
              key={accion}
              disabled={ocupado || !motivo.trim()}
              onClick={() =>
                ejecutar(async () => {
                  if (
                    !window.confirm(
                      `¿${accion === 'cancelar' ? 'Cancelar' : 'Concluir'} el taller?${accion === 'cancelar' ? ' Se cancelarán las inscripciones confirmadas.' : ''}`,
                    )
                  )
                    return;
                  await consultarApi(`/talleres/${entrada.id}/acciones`, {
                    metodo: 'POST',
                    datos: { accion, motivo, version: entrada.version },
                  });
                  await actualizar();
                })
              }
            >
              {accion === 'cancelar' ? 'Cancelar taller' : 'Concluir taller'}
            </button>
          ))}
        </div>
      )}
      {lista && (
        <>
          <p role="status">
            {lista.inscripciones.length} registros ·{' '}
            {lista.inscripciones.filter((i) => ['confirmada', 'asistio'].includes(i.estado)).length}{' '}
            plazas ocupadas.
          </p>
          {lista.aviso && (
            <label className="cms-check">
              <input
                type="checkbox"
                checked={consentimiento}
                onChange={(e) => cambiarConsentimiento(e.target.checked)}
              />
              <span>
                Confirmo que el participante aceptó el{' '}
                <a href={lista.aviso.url} target="_blank" rel="noreferrer">
                  aviso vigente
                </a>{' '}
                ({lista.aviso.version}) para reactivar su inscripción.
              </span>
            </label>
          )}
          <ul className="cms-asistentes">
            {lista.inscripciones.map((i) => (
              <li key={i.id}>
                <h4>{i.nombre}</h4>
                <p>
                  {i.folio} · {i.estado}
                </p>
                <p>
                  {i.correo} · {i.telefono}
                </p>
                <p>
                  {i.procedencia}
                  {i.licenciatura && ` · ${i.licenciatura} · ${i.numeroCuenta}`}
                </p>
                <div className="cms-acciones">
                  {i.estado === 'confirmada' &&
                    ['asistencia', 'cancelar'].map((a) => (
                      <button
                        type="button"
                        className="secundario"
                        key={a}
                        disabled={ocupado || !motivo.trim()}
                        onClick={() => ejecutar(() => accion(i, a))}
                      >
                        {a === 'asistencia' ? 'Registrar asistencia' : 'Cancelar inscripción'}
                      </button>
                    ))}
                  {i.estado === 'cancelada' && !terminado && (
                    <button
                      type="button"
                      className="secundario"
                      disabled={ocupado || !consentimiento || !motivo.trim()}
                      onClick={() => ejecutar(() => accion(i, 'reactivar'))}
                    >
                      Reactivar inscripción
                    </button>
                  )}
                </div>
                <details>
                  <summary>Historial de inscripción</summary>
                  <ul>
                    {i.historial.map((h, indice) => (
                      <li key={indice}>
                        {h.momento} · {h.accion}
                        {h.motivo && ` · ${h.motivo}`}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
