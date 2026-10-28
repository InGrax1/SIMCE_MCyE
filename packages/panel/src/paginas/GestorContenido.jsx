import { useEffect, useRef, useState } from 'react';
import { consultarApi, establecerSesion, renovarSesion } from '../servicios/sesion.js';
import { Prototipo } from './Prototipo.jsx';
import './gestor.css';

const nombres = {
  area: 'Áreas',
  practica: 'Prácticas académicas',
  actividad: 'Servicios y actividades',
  producto: 'Productos',
  programa: 'Servicio social',
  taller: 'Talleres',
  aviso: 'Avisos',
  institucion: 'Información institucional',
  galeria: 'Galería',
};
const especificos = {
  area: ['etiqueta'],
  practica: ['carrera', 'asignatura', 'licenciaturas'],
  actividad: ['areas', 'enfoque'],
  producto: ['especies', 'enfoque', 'mostrarPrecio', 'precio'],
  programa: ['codigo', 'licenciaturas', 'actividades'],
  taller: ['inicio', 'fin', 'estadoTaller', 'costo', 'requisitos'],
  aviso: ['fecha'],
  institucion: ['responsable', 'correo', 'mapa', 'ubicacion', 'objetivo'],
  galeria: [],
};
const etiquetas = {
  nombre: 'Nombre o título',
  descripcion: 'Descripción',
  foto: 'Imagen',
  alt: 'Texto alternativo',
  etiqueta: 'Etiqueta del área',
  carrera: 'Licenciatura o ámbito académico',
  asignatura: 'Asignatura',
  licenciaturas: 'Licenciaturas (una por línea)',
  areas: 'Áreas donde se realiza',
  enfoque: 'Enfoque académico o proceso',
  especies: 'Especies (una por línea)',
  codigo: 'Clave del programa',
  actividades: 'Actividades (una por línea)',
  inicio: 'Fecha de inicio',
  fin: 'Fecha de conclusión',
  fecha: 'Fecha del aviso',
  estadoTaller: 'Estado del taller',
  costo: 'Costo indicativo',
  requisitos: 'Requisitos',
  responsable: 'Responsable',
  correo: 'Correo institucional',
  mapa: 'Enlace de Google Maps',
  ubicacion: 'Ubicación',
  objetivo: 'Objetivo institucional',
  precio: 'Precio por kilogramo (MXN)',
  mostrarPrecio: 'Mostrar el precio en el portal',
};
const listas = ['licenciaturas', 'especies', 'actividades'];
const imagenTipos = ['area', 'practica', 'actividad', 'producto', 'galeria'];

function Acceso({ recibir, ejecutar, ocupado }) {
  return (
    <main className="cms-acceso">
      <section className="cms-login">
        <p className="cms-marca">SIMCE · CEA</p>
        <h1>Gestión de contenido</h1>
        <p>Actualiza la información pública del Módulo de Carnes y Embutidos.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            ejecutar(async () =>
              recibir(
                await consultarApi('/auth/login', {
                  metodo: 'POST',
                  datos: Object.fromEntries(datos),
                }),
              ),
            );
          }}
        >
          <label>
            Correo
            <input name="correo" type="email" autoComplete="username" required maxLength={160} />
          </label>
          <label>
            Contraseña
            <input
              name="clave"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <button disabled={ocupado}>Iniciar sesión</button>
        </form>
        <a href="/">Volver al portal público</a>
      </section>
    </main>
  );
}

function CambioClave({ recibir, ejecutar, ocupado }) {
  return (
    <main className="cms-acceso">
      <section className="cms-login">
        <h1>Cambia tu contraseña inicial</h1>
        <p>Elige una contraseña personal de al menos 10 caracteres.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(async () =>
              recibir(
                await consultarApi('/auth/clave', {
                  metodo: 'POST',
                  datos: Object.fromEntries(new FormData(e.currentTarget)),
                }),
              ),
            );
          }}
        >
          <label>
            Contraseña inicial
            <input
              type="password"
              name="anterior"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              name="nueva"
              autoComplete="new-password"
              minLength={10}
              maxLength={200}
              required
            />
          </label>
          <button disabled={ocupado}>Actualizar contraseña</button>
        </form>
      </section>
    </main>
  );
}

function SubirImagen({ alSubir, ejecutar, ocupado }) {
  const [archivo, cambiarArchivo] = useState(null);
  const [vista, cambiarVista] = useState('');
  const [alt, cambiarAlt] = useState('');
  const [recorte, cambiarRecorte] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [recortar, activarRecorte] = useState(false);
  const imagen = useRef(null);
  useEffect(() => {
    if (!archivo) {
      cambiarVista('');
      return;
    }
    const url = URL.createObjectURL(archivo);
    cambiarVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);
  const cambiar = (campo, valor) => cambiarRecorte({ ...recorte, [campo]: Number(valor) });
  return (
    <details className="cms-medios">
      <summary>Subir y recortar una imagen</summary>
      <div className="cms-medios-cuerpo">
        <label>
          Archivo JPEG, PNG o WebP · máximo 5 MB
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file?.size > 5 * 1024 * 1024) {
                ejecutar(async () => {
                  throw new Error('El archivo supera los 5 MB.');
                });
                return;
              }
              cambiarArchivo(file ?? null);
            }}
          />
        </label>
        {vista && (
          <>
            <div className="cms-recorte">
              <img
                ref={imagen}
                src={vista}
                alt="Vista del recorte"
                onLoad={() =>
                  cambiarRecorte({
                    left: 0,
                    top: 0,
                    width: imagen.current.naturalWidth,
                    height: imagen.current.naturalHeight,
                  })
                }
              />
              {recortar && (
                <span
                  style={{
                    left: `${(recorte.left / (imagen.current?.naturalWidth || 1)) * 100}%`,
                    top: `${(recorte.top / (imagen.current?.naturalHeight || 1)) * 100}%`,
                    width: `${(recorte.width / (imagen.current?.naturalWidth || 1)) * 100}%`,
                    height: `${(recorte.height / (imagen.current?.naturalHeight || 1)) * 100}%`,
                  }}
                />
              )}
            </div>
            <label className="cms-check">
              <input
                type="checkbox"
                checked={recortar}
                onChange={(e) => activarRecorte(e.target.checked)}
              />
              Recortar imagen
            </label>
            {recortar && (
              <div className="cms-recorte-campos">
                {[
                  ['left', 'Desde la izquierda'],
                  ['top', 'Desde arriba'],
                  ['width', 'Ancho'],
                  ['height', 'Alto'],
                ].map(([campo, titulo]) => (
                  <label key={campo}>
                    {titulo} (px)
                    <input
                      type="number"
                      min={campo === 'width' || campo === 'height' ? 1 : 0}
                      max={
                        campo === 'left' || campo === 'width'
                          ? imagen.current?.naturalWidth
                          : imagen.current?.naturalHeight
                      }
                      value={recorte[campo]}
                      onChange={(e) => cambiar(campo, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            )}
          </>
        )}
        <label>
          Texto alternativo
          <input
            value={alt}
            onChange={(e) => cambiarAlt(e.target.value)}
            maxLength={300}
            placeholder="Describe lo que aporta la imagen"
          />
        </label>
        <button
          type="button"
          disabled={ocupado || !archivo || !alt.trim()}
          onClick={() =>
            ejecutar(async () => {
              const medio = await consultarApi('/cms/medios', {
                metodo: 'POST',
                cuerpo: archivo,
                cabeceras: {
                  'Content-Type': 'application/octet-stream',
                  'X-Imagen-Alt': encodeURIComponent(alt),
                  ...(recortar ? { 'X-Recorte': JSON.stringify(recorte) } : {}),
                },
              });
              await alSubir(medio);
              cambiarArchivo(null);
              cambiarAlt('');
            })
          }
        >
          Subir imagen
        </button>
      </div>
    </details>
  );
}

export function GestorContenido() {
  const [sesion, cambiarSesion] = useState(undefined);
  const [contenido, cambiarContenido] = useState(null);
  const [tipo, cambiarTipo] = useState('area');
  const [entrada, cambiarEntrada] = useState(null);
  const [datos, cambiarDatos] = useState({});
  const [orden, cambiarOrden] = useState(0);
  const [mensaje, cambiarMensaje] = useState('');
  const [error, cambiarError] = useState('');
  const [ocupado, cambiarOcupado] = useState(false);
  const [confirmar, confirmarRevision] = useState(false);
  const [previa, cambiarPrevia] = useState('');
  const [auditoria, cambiarAuditoria] = useState(null);
  const [intereses, cambiarIntereses] = useState(null);
  const bloqueo = useRef(false);
  const editado = useRef(false);
  function recibir(valor) {
    establecerSesion(valor?.token, recibir);
    cambiarSesion(valor);
  }
  useEffect(() => {
    renovarSesion()
      .then(recibir)
      .catch(() => cambiarSesion(null));
  }, []);
  useEffect(() => {
    if (!sesion) return;
    let actividad = Date.now();
    let comprobacion = Date.now();
    const actualizar = () => {
      actividad = Date.now();
    };
    const temporizador = setInterval(() => {
      if (Date.now() - actividad > 8 * 3600_000) {
        consultarApi('/auth/salir', { metodo: 'POST' }).catch(() => {});
        recibir(null);
      } else if (Date.now() - comprobacion > 15 * 60_000 && Date.now() - actividad < 15 * 60_000) {
        comprobacion = Date.now();
        consultarApi('/auth/yo').catch((e) => cambiarError(e.message));
      }
    }, 60000);
    window.addEventListener('pointerdown', actualizar);
    window.addEventListener('keydown', actualizar);
    document.addEventListener('scroll', actualizar, { passive: true });
    return () => {
      clearInterval(temporizador);
      window.removeEventListener('pointerdown', actualizar);
      window.removeEventListener('keydown', actualizar);
      document.removeEventListener('scroll', actualizar);
    };
  }, [sesion?.usuario?.id]);
  useEffect(() => {
    const avisar = (e) => {
      if (editado.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, []);
  async function cargar() {
    const valor = await consultarApi('/cms/entradas');
    cambiarContenido(valor);
    return valor;
  }
  useEffect(() => {
    if (sesion && !sesion.usuario.debeCambiar && sesion.usuario.rol !== 'operador')
      cargar().catch((e) => cambiarError(e.message));
  }, [sesion?.usuario?.id, sesion?.usuario?.debeCambiar]);
  async function ejecutar(accion) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    cambiarOcupado(true);
    cambiarError('');
    cambiarMensaje('');
    try {
      await accion();
    } catch (e) {
      cambiarError(e.message);
    } finally {
      bloqueo.current = false;
      cambiarOcupado(false);
    }
  }
  function seleccionar(item, nuevoTipo = tipo) {
    if (editado.current && !window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?'))
      return;
    cambiarTipo(nuevoTipo);
    cambiarEntrada(item);
    cambiarDatos(
      structuredClone(
        item?.borrador ?? { nombre: '', descripcion: '', estadoTaller: 'informativo', areas: [] },
      ),
    );
    cambiarOrden(item?.orden ?? 0);
    confirmarRevision(false);
    editado.current = false;
    cambiarPrevia('');
    cambiarError('');
    cambiarMensaje('');
  }
  function campo(nombre, valor) {
    editado.current = true;
    cambiarDatos((actual) => ({ ...actual, [nombre]: valor }));
    confirmarRevision(false);
  }
  async function guardar() {
    const item = await consultarApi(entrada ? `/cms/entradas/${entrada.id}` : '/cms/entradas', {
      metodo: entrada ? 'PUT' : 'POST',
      datos: { tipo, datos, version: entrada?.version, orden: Number(orden) },
    });
    editado.current = false;
    await cargar();
    cambiarEntrada(item);
    cambiarDatos(item.borrador);
    cambiarMensaje('Borrador guardado. Los cambios aún no están publicados.');
    return item;
  }
  const publica = ['responsable', 'admin'].includes(sesion?.usuario?.rol);
  const estado = (
    <>
      {error && (
        <div className="cms-error" role="alert">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="cms-exito" role="status">
          {mensaje}
        </div>
      )}
    </>
  );
  if (sesion === undefined)
    return (
      <main className="cms-acceso">
        <p role="status">Comprobando sesión…</p>
      </main>
    );
  if (!sesion)
    return (
      <>
        <Acceso recibir={recibir} ejecutar={ejecutar} ocupado={ocupado} />
        <div className="cms-mensajes">{estado}</div>
      </>
    );
  if (sesion.usuario.debeCambiar)
    return (
      <>
        <CambioClave recibir={recibir} ejecutar={ejecutar} ocupado={ocupado} />
        <div className="cms-mensajes">{estado}</div>
      </>
    );
  if (location.pathname.includes('/prototipo'))
    return (
      <>
        <a href="/panel/">Volver al gestor</a>
        <Prototipo />
      </>
    );
  return (
    <div className="cms">
      <header className="cms-cabecera">
        <div>
          <p className="cms-marca">SIMCE · CEA</p>
          <h1>Gestión de contenido</h1>
        </div>
        <div className="cms-cuenta">
          <span>
            {sesion.usuario.correo} · {sesion.usuario.rol}
          </span>
          <a href="/" target="_blank" rel="noreferrer">
            Ver portal
          </a>
          <button
            type="button"
            className="secundario"
            disabled={ocupado}
            onClick={() =>
              ejecutar(async () => {
                if (
                  editado.current &&
                  !window.confirm('¿Cerrar sesión y descartar los cambios sin guardar?')
                )
                  return;
                await consultarApi('/auth/salir', { metodo: 'POST' });
                editado.current = false;
                cambiarContenido(null);
                recibir(null);
              })
            }
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="cms-marco">
        {estado}
        {sesion.usuario.rol === 'operador' ? (
          <p>
            Tu cuenta tiene acceso a la operación.{' '}
            <a href="/panel/prototipo">Abrir prototipo operativo</a>
          </p>
        ) : (
          <>
            <div className="cms-resumen">
              <p>
                Prepara un borrador, revisa la vista previa y publica cuando la información esté
                validada.
              </p>
              {contenido && (
                <span
                  className={
                    contenido.revisionPortal === contenido.revisionHtml
                      ? 'cms-actualizado'
                      : 'cms-pendiente'
                  }
                >
                  {contenido.revisionPortal === contenido.revisionHtml
                    ? 'Portal actualizado'
                    : 'Publicación pendiente'}
                </span>
              )}
              {publica && (
                <button
                  type="button"
                  className="secundario"
                  disabled={ocupado}
                  onClick={() =>
                    ejecutar(async () => {
                      await consultarApi('/cms/regenerar', { metodo: 'POST' });
                      await cargar();
                      cambiarMensaje('Portal regenerado.');
                    })
                  }
                >
                  Regenerar portal
                </button>
              )}
            </div>
            <div className="cms-columnas">
              <aside className="cms-listado">
                <label>
                  Tipo de contenido
                  <select value={tipo} onChange={(e) => seleccionar(null, e.target.value)}>
                    {Object.entries(nombres).map(([clave, nombre]) => (
                      <option value={clave} key={clave}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" disabled={ocupado} onClick={() => seleccionar(null)}>
                  Crear entrada
                </button>
                <ul>
                  {contenido?.entradas
                    .filter((e) => e.tipo === tipo)
                    .sort((a, b) => a.orden - b.orden)
                    .map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="cms-entrada"
                          aria-pressed={entrada?.id === item.id}
                          onClick={() => seleccionar(item)}
                        >
                          <strong>{item.borrador.nombre ?? item.borrador.titulo}</strong>
                          <span>
                            {item.publicado ? 'Publicado' : 'Borrador'}
                            {item.publicado &&
                            JSON.stringify(item.borrador) !== JSON.stringify(item.publicado)
                              ? ' · cambios pendientes'
                              : ''}
                          </span>
                          <span>
                            {item.validacion === 'referencia'
                              ? 'Contenido de referencia por validar'
                              : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </aside>
              <section className="cms-editor" aria-labelledby="cms-titulo-editor">
                <h2 id="cms-titulo-editor">
                  {entrada ? 'Editar entrada' : 'Nueva entrada'} · {nombres[tipo]}
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    ejecutar(guardar);
                  }}
                >
                  {['nombre', 'descripcion', ...(especificos[tipo] ?? [])].map((nombre) => {
                    const valor = datos[nombre] ?? '';
                    if (nombre === 'mostrarPrecio')
                      return (
                        <label className="cms-check" key={nombre}>
                          <input
                            type="checkbox"
                            checked={Boolean(valor)}
                            onChange={(e) => campo(nombre, e.target.checked)}
                          />
                          {etiquetas[nombre]}
                        </label>
                      );
                    if (nombre === 'areas')
                      return (
                        <fieldset key={nombre}>
                          <legend>{etiquetas[nombre]}</legend>
                          {contenido?.entradas
                            .filter((e) => e.tipo === 'area')
                            .map((area) => (
                              <label className="cms-check" key={area.id}>
                                <input
                                  type="checkbox"
                                  checked={
                                    (datos.areas ?? []).includes(area.id) ||
                                    (datos.areas ?? []).includes(area.borrador.nombre)
                                  }
                                  onChange={(e) =>
                                    campo(
                                      'areas',
                                      e.target.checked
                                        ? [...(datos.areas ?? []), area.id]
                                        : (datos.areas ?? []).filter(
                                            (id) => id !== area.id && id !== area.borrador.nombre,
                                          ),
                                    )
                                  }
                                />
                                {area.borrador.nombre}
                              </label>
                            ))}
                        </fieldset>
                      );
                    if (nombre === 'estadoTaller')
                      return (
                        <label key={nombre}>
                          {etiquetas[nombre]}
                          <select
                            value={valor || 'informativo'}
                            onChange={(e) => campo(nombre, e.target.value)}
                          >
                            {[
                              ['informativo', 'Información'],
                              ['abierto', 'Convocatoria abierta'],
                              ['cerrado', 'Cerrado'],
                              ['concluido', 'Concluido'],
                            ].map(([id, texto]) => (
                              <option key={id} value={id}>
                                {texto}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    const multilinea =
                      listas.includes(nombre) ||
                      ['descripcion', 'objetivo', 'requisitos'].includes(nombre);
                    return (
                      <label key={nombre}>
                        {etiquetas[nombre]}
                        {multilinea ? (
                          <textarea
                            rows={4}
                            value={Array.isArray(valor) ? valor.join('\n') : valor}
                            maxLength={4000}
                            onChange={(e) =>
                              campo(
                                nombre,
                                listas.includes(nombre)
                                  ? e.target.value.split('\n')
                                  : e.target.value,
                              )
                            }
                          />
                        ) : (
                          <input
                            type={
                              ['inicio', 'fin', 'fecha'].includes(nombre)
                                ? 'date'
                                : nombre === 'correo'
                                  ? 'email'
                                  : nombre === 'precio'
                                    ? 'number'
                                    : 'text'
                            }
                            step={nombre === 'precio' ? '0.01' : undefined}
                            min={nombre === 'precio' ? 0 : undefined}
                            value={valor}
                            maxLength={nombre === 'nombre' ? 160 : 1000}
                            required={nombre === 'nombre'}
                            onChange={(e) => campo(nombre, e.target.value)}
                          />
                        )}
                      </label>
                    );
                  })}
                  {imagenTipos.includes(tipo) && (
                    <>
                      <label>
                        Imagen asociada
                        <select
                          value={datos.foto ?? ''}
                          onChange={(e) => {
                            const medio = contenido.medios.find((m) => m.ruta === e.target.value);
                            campo('foto', e.target.value);
                            if (medio) campo('alt', medio.alt);
                          }}
                        >
                          <option value="">Sin imagen</option>
                          {datos.foto && !contenido?.medios.some((m) => m.ruta === datos.foto) && (
                            <option value={datos.foto}>Imagen actual del diseño</option>
                          )}
                          {contenido?.medios.map((m) => (
                            <option key={m.id} value={m.ruta}>
                              {m.alt}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Texto alternativo de esta imagen
                        <input
                          value={datos.alt ?? ''}
                          maxLength={300}
                          onChange={(e) => campo('alt', e.target.value)}
                          required={Boolean(datos.foto)}
                        />
                      </label>
                      <SubirImagen
                        ejecutar={ejecutar}
                        ocupado={ocupado}
                        alSubir={async (medio) => {
                          await cargar();
                          campo('foto', medio.ruta);
                          campo('alt', medio.alt);
                          cambiarMensaje(
                            'Imagen validada y comprimida. Guarda el borrador para asociarla.',
                          );
                        }}
                      />
                    </>
                  )}
                  <label>
                    Orden en la lista
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={orden}
                      onChange={(e) => {
                        cambiarOrden(e.target.value);
                        editado.current = true;
                      }}
                    />
                  </label>
                  <div className="cms-acciones">
                    <button disabled={ocupado}>Guardar borrador</button>
                    <button
                      type="button"
                      className="secundario"
                      disabled={ocupado}
                      onClick={() =>
                        ejecutar(async () => {
                          const html = await consultarApi('/cms/vista-previa', {
                            metodo: 'POST',
                            datos: { id: entrada?.id, tipo, datos },
                          });
                          cambiarPrevia(html);
                        })
                      }
                    >
                      Vista previa
                    </button>
                  </div>
                </form>
                {entrada && publica && (
                  <div className="cms-publicar">
                    <label className="cms-check">
                      <input
                        type="checkbox"
                        checked={confirmar}
                        onChange={(e) => confirmarRevision(e.target.checked)}
                      />
                      Revisé el texto, las imágenes y la información antes de publicar.
                    </label>
                    <div className="cms-acciones">
                      <button
                        type="button"
                        disabled={ocupado || !confirmar || editado.current}
                        onClick={() =>
                          ejecutar(async () => {
                            await consultarApi(`/cms/entradas/${entrada.id}/publicar`, {
                              metodo: 'POST',
                              datos: { version: entrada.version, confirmarRevision: true },
                            });
                            editado.current = false;
                            const actual = await cargar();
                            seleccionar(actual.entradas.find((e) => e.id === entrada.id));
                            cambiarMensaje(
                              'Entrada publicada. El portal público ya está actualizado.',
                            );
                          })
                        }
                      >
                        Publicar
                      </button>
                      <button
                        type="button"
                        className="secundario"
                        disabled={ocupado || !entrada.publicado || editado.current}
                        onClick={() =>
                          ejecutar(async () => {
                            await consultarApi(`/cms/entradas/${entrada.id}/despublicar`, {
                              metodo: 'POST',
                              datos: { version: entrada.version },
                            });
                            const actual = await cargar();
                            seleccionar(actual.entradas.find((e) => e.id === entrada.id));
                            cambiarMensaje('La entrada ya no aparece en el portal.');
                          })
                        }
                      >
                        Despublicar
                      </button>
                      <button
                        type="button"
                        className="peligro"
                        disabled={ocupado}
                        onClick={() =>
                          ejecutar(async () => {
                            if (
                              !window.confirm(
                                '¿Eliminar esta entrada? Se conservará el registro de la acción en la bitácora.',
                              )
                            )
                              return;
                            await consultarApi(`/cms/entradas/${entrada.id}`, {
                              metodo: 'DELETE',
                              datos: { version: entrada.version },
                            });
                            editado.current = false;
                            await cargar();
                            seleccionar(null);
                            cambiarMensaje('Entrada eliminada.');
                          })
                        }
                      >
                        Eliminar entrada
                      </button>
                    </div>
                    {editado.current && <p>Guarda el borrador antes de publicar o despublicar.</p>}
                  </div>
                )}
                {entrada?.historial.length > 0 && (
                  <details className="cms-historial">
                    <summary>Versiones anteriores</summary>
                    {entrada.historial.map((v) => (
                      <button
                        type="button"
                        className="secundario"
                        disabled={ocupado || editado.current}
                        key={v.version}
                        onClick={() =>
                          ejecutar(async () => {
                            const item = await consultarApi(
                              `/cms/entradas/${entrada.id}/restaurar/${v.version}`,
                              { metodo: 'POST', datos: { version: entrada.version } },
                            );
                            editado.current = false;
                            await cargar();
                            seleccionar(item);
                            cambiarMensaje('Versión restaurada como borrador.');
                          })
                        }
                      >
                        Restaurar versión {v.version}
                      </button>
                    ))}
                  </details>
                )}
                {previa && (
                  <section className="cms-previa">
                    <h3>Vista previa · sin publicar</h3>
                    <button type="button" className="secundario" onClick={() => cambiarPrevia('')}>
                      Cerrar vista previa
                    </button>
                    <iframe
                      title="Vista previa del portal"
                      srcDoc={previa}
                      sandbox="allow-same-origin"
                    />
                  </section>
                )}
              </section>
            </div>
            {publica && (
              <details
                className="cms-bitacora"
                onToggle={(e) => {
                  if (e.currentTarget.open)
                    ejecutar(async () => cambiarIntereses(await consultarApi('/cms/intereses')));
                }}
              >
                <summary>Solicitudes de servicio social</summary>
                {intereses?.length ? (
                  <ul>
                    {intereses.map((item) => (
                      <li key={item.id}>
                        <strong>{item.nombre}</strong> · {item.correo}
                        <p>{item.mensaje}</p>
                        <small>
                          Programa:{' '}
                          {contenido?.entradas.find((e) => e.id === item.programaId)?.borrador
                            .nombre ?? item.programaId}{' '}
                          · Aviso aceptado: {item.versionAviso} ·{' '}
                          {new Date(item.momento).toLocaleString('es-MX')}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No hay solicitudes registradas.</p>
                )}
              </details>
            )}
            {publica && (
              <details
                className="cms-bitacora"
                onToggle={(e) => {
                  if (e.currentTarget.open)
                    ejecutar(async () => cambiarAuditoria(await consultarApi('/cms/auditoria')));
                }}
              >
                <summary>Bitácora reciente</summary>
                <ul>
                  {auditoria?.map((evento) => (
                    <li key={evento.id}>
                      <time>{new Date(evento.momento).toLocaleString('es-MX')}</time> ·{' '}
                      {evento.accion} · {evento.recurso} · usuario {evento.usuarioId}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
