import { useEffect, useRef, useState } from 'react';
import { consultarApi, establecerSesion, renovarSesion } from '../servicios/sesion.js';
import { Prototipo } from './Prototipo.jsx';
import { InscripcionesTaller, OperacionTaller } from './InscripcionesTaller.jsx';
import { SolicitudesPanel } from './SolicitudesPanel.jsx';
import { PanelMarco } from './PanelMarco.jsx';
import { CatalogoOperativo } from './CatalogoOperativo.jsx';
import { fechaPanel } from './DetalleAtencion.jsx';
import { RecuperarAcceso, RestablecerAcceso } from './RecuperarAcceso.jsx';
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
  galeria: ['areaId'],
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
  areaId: 'Área de la galería',
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

function Acceso({ recibir, ejecutar, ocupado, estado, recuperar }) {
  return (
    <main className="cms-acceso">
      <section className="cms-login">
        <p className="cms-marca">SIMCE · CEA</p>
        <h1>Gestión de contenido</h1>
        <p>Actualiza la información pública del Módulo de Carnes y Embutidos.</p>
        {estado}
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
        <button type="button" className="secundario" disabled={ocupado} onClick={recuperar}>
          Olvidé mi contraseña
        </button>
        <a href="/">Volver al portal público</a>
      </section>
    </main>
  );
}

function CambioClave({ recibir, ejecutar, ocupado, volver, estado }) {
  return (
    <main className="cms-acceso">
      <section className="cms-login">
        <h1>Cambia tu contraseña inicial</h1>
        <p>Elige una contraseña personal de al menos 10 caracteres.</p>
        {estado}
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
        <button type="button" className="secundario" disabled={ocupado} onClick={volver}>
          Volver al inicio de sesión
        </button>
        <a href="/">Volver al portal público</a>
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
  const [recuperando, cambiarRecuperando] = useState(false);
  const [tokenRecuperacion, cambiarTokenRecuperacion] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get('restablecer') ?? '',
  );
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
  const [vista, cambiarVista] = useState(null);
  const [espacio, cambiarEspacio] = useState('ficha');
  const [motivoFechas, cambiarMotivoFechas] = useState('');
  const bloqueo = useRef(false);
  const editado = useRef(false);
  const inscripcionEditada = useRef(false);
  const tituloEditor = useRef(null);
  function recibir(valor) {
    establecerSesion(valor?.token, recibir);
    cambiarSesion(valor);
    if (!valor) {
      editado.current = false;
      inscripcionEditada.current = false;
      cambiarContenido(null);
      cambiarEntrada(null);
      cambiarTipo('area');
      cambiarDatos({});
      cambiarPrevia('');
      cambiarAuditoria(null);
      cambiarVista(null);
      cambiarEspacio('ficha');
      confirmarRevision(false);
    }
  }
  useEffect(() => {
    const recibirEnlace = () => {
      const parametros = new URLSearchParams(location.hash.slice(1));
      if (!parametros.has('restablecer')) return;
      cambiarTokenRecuperacion(parametros.get('restablecer') ?? '');
      cambiarError('');
      cambiarMensaje('');
      history.replaceState(null, '', location.pathname + location.search);
    };
    recibirEnlace();
    window.addEventListener('hashchange', recibirEnlace);
    return () => window.removeEventListener('hashchange', recibirEnlace);
  }, []);
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
      if (editado.current || inscripcionEditada.current) {
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
  function cerrarSesion() {
    return ejecutar(async () => {
      if (
        (editado.current || inscripcionEditada.current) &&
        !window.confirm('¿Cerrar sesión y descartar los cambios sin guardar?')
      )
        return;
      try {
        await consultarApi('/auth/salir', { metodo: 'POST', reintentar: false });
        cambiarMensaje('Inicia sesión para continuar.');
      } finally {
        recibir(null);
      }
    });
  }
  function descartarInscripcion() {
    if (
      inscripcionEditada.current &&
      !window.confirm('Hay cambios sin guardar en las inscripciones. ¿Quieres descartarlos?')
    )
      return false;
    inscripcionEditada.current = false;
    return true;
  }
  function mostrarEspacio(destino) {
    if (destino === espacio && !previa) return;
    if (!descartarInscripcion()) return;
    cambiarEspacio(destino);
    cambiarPrevia('');
    cambiarError('');
    cambiarMensaje('');
  }
  function seleccionar(item, nuevoTipo = tipo, destino = 'ficha') {
    if (editado.current && !window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?'))
      return false;
    if (!descartarInscripcion()) return false;
    cambiarTipo(nuevoTipo);
    cambiarEspacio(destino);
    cambiarMotivoFechas('');
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
    return true;
  }
  function campo(nombre, valor) {
    editado.current = true;
    cambiarDatos((actual) => ({ ...actual, [nombre]: valor }));
    confirmarRevision(false);
  }
  function abrirEditor(item) {
    if (seleccionar(item) && matchMedia('(max-width: 800px)').matches)
      requestAnimationFrame(() => tituloEditor.current?.focus());
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
  async function actualizarTaller() {
    inscripcionEditada.current = false;
    const actual = await cargar();
    seleccionar(
      actual.entradas.find((e) => e.id === entrada.id),
      tipo,
      espacio,
    );
    cambiarMensaje('Inscripción del taller actualizada.');
  }
  const publica = ['responsable', 'admin'].includes(sesion?.usuario?.rol);
  const gestionaTaller = tipo === 'taller' && publica;
  const espacios = [
    ['ficha', 'Ficha'],
    ...(imagenTipos.includes(tipo) ? [['imagenes', 'Imágenes']] : []),
    ...(gestionaTaller
      ? [
          ['inscripciones', 'Inscripciones'],
          ['operacion', 'Operación'],
        ]
      : []),
    ...(publica ? [['publicacion', 'Publicación']] : []),
    ['historial', 'Historial'],
  ];
  const vistaActual =
    sesion?.usuario?.rol === 'operador'
      ? 'operacion'
      : publica
        ? (vista ?? 'solicitudes')
        : vista === 'talleres'
          ? 'talleres'
          : 'contenido';
  function navegar(destino) {
    if (destino === vistaActual) return;
    if (destino === 'talleres' && tipo !== 'taller') {
      if (!seleccionar(null, 'taller')) return;
    } else if (destino === 'contenido' && tipo === 'taller') {
      if (!seleccionar(null, 'area')) return;
    } else if (!descartarInscripcion()) return;
    cambiarVista(destino);
    cambiarError('');
    cambiarMensaje('');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (destino === 'bitacora')
      ejecutar(async () => cambiarAuditoria(await consultarApi('/cms/auditoria')));
  }
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
  if (tokenRecuperacion)
    return (
      <RestablecerAcceso
        ocupado={ocupado}
        estado={estado}
        volver={async () => {
          await cerrarSesion();
          cambiarTokenRecuperacion('');
        }}
        ejecutar={(nueva, confirmacion) =>
          ejecutar(async () => {
            if (nueva !== confirmacion) throw new Error('Las contraseñas no coinciden.');
            await consultarApi('/auth/restablecer', {
              metodo: 'POST',
              datos: { token: tokenRecuperacion, nueva },
              reintentar: false,
            });
            recibir(null);
            cambiarTokenRecuperacion('');
            cambiarRecuperando(false);
            cambiarMensaje('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
          })
        }
      />
    );
  if (sesion === undefined)
    return (
      <main className="cms-acceso">
        <p role="status">Comprobando sesión…</p>
      </main>
    );
  if (!sesion)
    return recuperando ? (
      <RecuperarAcceso
        ocupado={ocupado}
        estado={estado}
        volver={() => {
          cambiarRecuperando(false);
          cambiarError('');
          cambiarMensaje('');
        }}
        ejecutar={(correo) =>
          ejecutar(async () => {
            const respuesta = await consultarApi('/auth/recuperar', {
              metodo: 'POST',
              datos: { correo },
            });
            cambiarMensaje(respuesta.mensaje);
          })
        }
      />
    ) : (
      <Acceso
        recibir={recibir}
        ejecutar={ejecutar}
        ocupado={ocupado}
        estado={estado}
        recuperar={() => {
          cambiarRecuperando(true);
          cambiarError('');
          cambiarMensaje('');
        }}
      />
    );
  if (sesion.usuario.debeCambiar)
    return (
      <CambioClave
        recibir={recibir}
        ejecutar={ejecutar}
        ocupado={ocupado}
        volver={cerrarSesion}
        estado={estado}
      />
    );
  if (location.pathname.includes('/prototipo'))
    return (
      <>
        <a href="/panel/">Volver al gestor</a>
        <Prototipo />
      </>
    );
  return (
    <PanelMarco
      usuario={sesion.usuario}
      vista={vistaActual}
      navegar={navegar}
      ocupado={ocupado}
      cerrarSesion={cerrarSesion}
    >
      {estado}
      {vistaActual === 'operacion' ? (
        <>
          <CatalogoOperativo
            administra={publica}
            avisar={cambiarMensaje}
            {...{ ejecutar, ocupado }}
          />
          <p>
            <a href="/panel/prototipo">Abrir prototipo operativo</a>
          </p>
        </>
      ) : ['solicitudes', 'participantes'].includes(vistaActual) ? (
        <SolicitudesPanel
          key={vistaActual}
          ejecutar={ejecutar}
          ocupado={ocupado}
          participantes={vistaActual === 'participantes'}
        />
      ) : vistaActual === 'bitacora' ? (
        <section className="cms-auditoria" aria-labelledby="titulo-auditoria">
          <div className="cms-bandeja-barra">
            <h2 id="titulo-auditoria">Actividad reciente</h2>
            <button
              type="button"
              className="secundario"
              disabled={ocupado}
              onClick={() =>
                ejecutar(async () => cambiarAuditoria(await consultarApi('/cms/auditoria')))
              }
            >
              Actualizar bitácora
            </button>
          </div>
          {auditoria?.length ? (
            <ol>
              {auditoria.map((evento) => (
                <li key={evento.id}>
                  <time dateTime={evento.momento}>{fechaPanel(evento.momento)}</time>
                  <strong>{evento.accion.toLowerCase().replaceAll('_', ' ')}</strong>
                  <small>
                    Recurso: {evento.recurso} · Cuenta: {evento.usuarioId}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p role="status">
              {ocupado ? 'Cargando actividad…' : 'No hay movimientos para mostrar.'}
            </p>
          )}
        </section>
      ) : (
        <div className="cms-columnas">
          <aside className="cms-listado">
            {vistaActual === 'talleres' ? (
              <h2>Convocatorias</h2>
            ) : (
              <label>
                Tipo de contenido
                <select
                  value={tipo}
                  disabled={ocupado}
                  onChange={(e) => seleccionar(null, e.target.value)}
                >
                  {Object.entries(nombres)
                    .filter(([clave]) => clave !== 'taller')
                    .map(([clave, nombre]) => (
                      <option value={clave} key={clave}>
                        {nombre}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <button type="button" disabled={ocupado} onClick={() => abrirEditor(null)}>
              {vistaActual === 'talleres' ? 'Crear taller' : 'Crear entrada'}
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
                      disabled={ocupado}
                      onClick={() => abrirEditor(item)}
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
            <h2 id="cms-titulo-editor" ref={tituloEditor} tabIndex={-1}>
              {entrada
                ? (entrada.borrador.nombre ?? entrada.borrador.titulo)
                : tipo === 'taller'
                  ? 'Nuevo taller'
                  : `Nueva entrada · ${nombres[tipo]}`}
            </h2>
            <nav className="cms-editor-navegacion" aria-label="Secciones de la entrada">
              {espacios.map(([id, etiqueta]) => (
                <button
                  key={id}
                  type="button"
                  className={espacio === id && !previa ? undefined : 'secundario'}
                  aria-current={espacio === id && !previa ? 'page' : undefined}
                  disabled={ocupado}
                  onClick={() => mostrarEspacio(id)}
                >
                  {etiqueta}
                </button>
              ))}
            </nav>
            {!previa && ['ficha', 'imagenes'].includes(espacio) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ejecutar(guardar);
                }}
              >
                <h3>
                  {espacio === 'ficha'
                    ? tipo === 'taller'
                      ? 'Ficha del taller'
                      : 'Ficha de contenido'
                    : 'Imágenes de la entrada'}
                </h3>
                {espacio === 'ficha' &&
                  ['nombre', 'descripcion', ...(especificos[tipo] ?? [])].map((nombre) => {
                    const valor = datos[nombre] ?? '';
                    if (nombre === 'areaId')
                      return (
                        <label key={nombre}>
                          {etiquetas[nombre]}
                          <select value={valor} onChange={(e) => campo(nombre, e.target.value)}>
                            <option value="">Galería general (sin área)</option>
                            {contenido?.entradas
                              .filter((e) => e.tipo === 'area')
                              .map((area) => (
                                <option key={area.id} value={area.id}>
                                  {area.borrador.nombre}
                                </option>
                              ))}
                          </select>
                        </label>
                      );
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
                      if (entrada?.inscripcion)
                        return (
                          <p key={nombre}>
                            {gestionaTaller
                              ? 'El cupo y el periodo se gestionan en «Inscripciones» y el cierre del taller en «Operación».'
                              : 'La cuenta responsable gestiona el estado y la disponibilidad del taller.'}
                          </p>
                        );
                      else
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
                {espacio === 'imagenes' && (
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
                {espacio === 'ficha' && (
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
                )}
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
            )}
            {espacio === 'publicacion' && (
              <>
                <h3>Publicación de la entrada</h3>
                {!entrada && <p>Guarda el borrador desde «Ficha» para poder publicarlo.</p>}
                {entrada && (
                  <div>
                    {tipo === 'taller' && entrada.inscripcion && (
                      <label>
                        Motivo de los cambios de fechas al publicar
                        <input
                          value={motivoFechas}
                          onChange={(e) => cambiarMotivoFechas(e.target.value)}
                          maxLength={500}
                        />
                      </label>
                    )}
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
                              datos: {
                                version: entrada.version,
                                confirmarRevision: true,
                                motivo: motivoFechas,
                              },
                            });
                            editado.current = false;
                            const actual = await cargar();
                            seleccionar(
                              actual.entradas.find((e) => e.id === entrada.id),
                              tipo,
                              espacio,
                            );
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
                            seleccionar(
                              actual.entradas.find((e) => e.id === entrada.id),
                              tipo,
                              espacio,
                            );
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
                <div className="cms-resumen">
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
                </div>
              </>
            )}
            {['inscripciones', 'operacion'].includes(espacio) && !entrada && (
              <>
                <h3>
                  {espacio === 'inscripciones'
                    ? 'Inscripciones del taller'
                    : 'Operación del taller'}
                </h3>
                <p>Guarda el borrador desde «Ficha» para habilitar esta sección.</p>
              </>
            )}
            {espacio === 'inscripciones' && entrada && (
              <InscripcionesTaller
                key={`${entrada.id}-${entrada.version}`}
                entrada={entrada}
                ejecutar={ejecutar}
                ocupado={ocupado || editado.current}
                alEditar={() => (inscripcionEditada.current = true)}
                actualizar={actualizarTaller}
              />
            )}
            {espacio === 'operacion' && entrada && (
              <OperacionTaller
                key={`${entrada.id}-${entrada.version}`}
                entrada={entrada}
                ejecutar={ejecutar}
                ocupado={ocupado || editado.current}
                actualizar={actualizarTaller}
              />
            )}
            {['inscripciones', 'operacion', 'historial'].includes(espacio) &&
              entrada &&
              editado.current && (
                <p>
                  Guarda el borrador desde «Ficha»
                  {imagenTipos.includes(tipo) ? ' o «Imágenes»' : ''} para continuar.
                </p>
              )}
            {espacio === 'historial' && (
              <>
                <h3>Versiones anteriores</h3>
                {entrada?.historial.length ? (
                  <div className="cms-acciones">
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
                  </div>
                ) : (
                  <p>Esta entrada todavía no tiene versiones anteriores.</p>
                )}
              </>
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
      )}
    </PanelMarco>
  );
}
