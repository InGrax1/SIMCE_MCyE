import { useState } from 'react';
import { consultarApi } from '../servicios/sesion.js';

export function ConsultasTaller({ entrada, ejecutar, ocupado }) {
  const [consultas, cambiarConsultas] = useState(null);
  const [mensaje, cambiarMensaje] = useState('');
  async function cargar() {
    cambiarConsultas(await consultarApi(`/talleres/${entrada.id}/consultas`));
  }
  return (
    <section className="cms-consultas" aria-labelledby="titulo-consultas-taller">
      <h3 id="titulo-consultas-taller">Solicitudes de información del taller</h3>
      <p>
        Consulta las preguntas recibidas y responde aquí. La persona verá la respuesta con su enlace
        privado.
      </p>
      <button
        type="button"
        className="secundario"
        disabled={ocupado}
        onClick={() => ejecutar(cargar)}
      >
        Consultar solicitudes de información
      </button>
      {mensaje && <p role="status">{mensaje}</p>}
      {consultas &&
        (consultas.length ? (
          <ul className="cms-asistentes">
            {consultas.map((c) => (
              <li key={c.id}>
                <FichaConsulta
                  c={c}
                  ejecutar={ejecutar}
                  ocupado={ocupado}
                  cargar={cargar}
                  cambiarMensaje={cambiarMensaje}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay consultas para este taller.</p>
        ))}
    </section>
  );
}

export function FichaConsulta({ c, ejecutar, ocupado, cargar, cambiarMensaje }) {
  const mensajes = [
    ...(c.seguimientos ?? []).map((m) => ({ ...m, titulo: 'Mensaje del visitante' })),
    ...c.respuestas.map((m) => ({ ...m, titulo: 'Respuesta del Módulo' })),
  ].sort((a, b) => a.momento.localeCompare(b.momento));
  return (
    <>
      <h4>{c.nombre}</h4>
      <p>
        {c.folio} · {c.estado === 'pendiente' ? 'Pendiente de respuesta' : 'Respondida'}
      </p>
      <p>{c.correo}</p>
      <p className="consulta-mensaje">{c.mensaje}</p>
      {mensajes.map((m, i) => (
        <div className="cms-respuesta" key={i}>
          <strong>{m.titulo}</strong>
          <p>{new Date(m.momento).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
          <p className="consulta-mensaje">{m.texto}</p>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const texto = new FormData(e.currentTarget).get('texto');
          const formulario = e.currentTarget;
          ejecutar(async () => {
            await consultarApi(`/consultas-talleres/${c.id}/respuestas`, {
              metodo: 'POST',
              datos: { texto, version: c.version },
            });
            await cargar();
            formulario.reset();
            cambiarMensaje(`Respuesta publicada para ${c.folio}.`);
          });
        }}
      >
        <label>
          Respuesta para {c.folio}
          <textarea name="texto" maxLength={2000} rows={4} required disabled={ocupado} />
        </label>
        <button disabled={ocupado}>Publicar respuesta</button>
      </form>
    </>
  );
}
