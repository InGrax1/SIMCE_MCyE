import { useEffect, useRef, useState } from 'react';
import { procesos, secciones } from './contenido.js';
import { ContenidoPortal, useContenidoPortal } from './contextoContenido.jsx';
import { Decoraciones, Etiqueta, Flecha, Imagen, Marca, Separador } from './componentes.jsx';
import { useGaleriaAnimada, useInteraccionesPortal, useTransicionFicha } from './animaciones.js';
import { SelectorSuave } from './SelectorSuave.jsx';

function SeccionSinEntradas({ id, titulo }) {
  return (
    <section id={id} tabIndex={-1} className="seccion talleres" aria-labelledby={`titulo-${id}`}>
      <div className="contenido">
        <h2 id={`titulo-${id}`}>{titulo}</h2>
        <p>No hay información publicada en esta sección por el momento.</p>
        <a href="#contacto">Consulta con el módulo</a>
      </div>
    </section>
  );
}

function Encabezado() {
  const [abierto, cambiarMenu] = useState(false);
  const [seccionActual, cambiarSeccion] = useState('inicio');
  const cabecera = useRef(null);
  const botonMenu = useRef(null);

  useEffect(() => {
    const raiz = document.documentElement;
    const observador = new ResizeObserver(() => {
      raiz.style.setProperty(
        '--altura-cabecera',
        `${Math.ceil(cabecera.current.getBoundingClientRect().height)}px`,
      );
    });
    observador.observe(cabecera.current);
    return () => {
      observador.disconnect();
      raiz.style.removeProperty('--altura-cabecera');
    };
  }, []);

  useEffect(() => {
    const seccionesPagina = [...document.querySelectorAll('main > section[id]')];
    let cuadro;
    const actualizarSeccion = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const limite = cabecera.current.getBoundingClientRect().bottom + 80;
        const actual = seccionesPagina.findLast(
          (seccion) => seccion.getBoundingClientRect().top <= limite,
        );
        cambiarSeccion(actual?.id ?? 'inicio');
      });
    };
    actualizarSeccion();
    window.addEventListener('scroll', actualizarSeccion, { passive: true });
    window.addEventListener('resize', actualizarSeccion);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('scroll', actualizarSeccion);
      window.removeEventListener('resize', actualizarSeccion);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (evento) => {
      if (!cabecera.current.contains(evento.target)) cambiarMenu(false);
    };
    const escritorio = window.matchMedia('(min-width: 1101px)');
    const cerrarAlAmpliar = (evento) => {
      if (evento.matches) cambiarMenu(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    escritorio.addEventListener('change', cerrarAlAmpliar);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      escritorio.removeEventListener('change', cerrarAlAmpliar);
    };
  }, [abierto]);

  return (
    <header
      className="encabezado"
      data-node-id="3:44"
      ref={cabecera}
      onClick={(evento) => {
        if (evento.target.closest('a')) cambiarMenu(false);
      }}
      onBlur={(evento) => {
        if (evento.relatedTarget && !evento.currentTarget.contains(evento.relatedTarget))
          cambiarMenu(false);
      }}
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && abierto) {
          cambiarMenu(false);
          botonMenu.current.focus();
        }
      }}
    >
      <Marca />
      <button
        ref={botonMenu}
        type="button"
        className="boton-menu"
        aria-expanded={abierto}
        aria-controls="navegacion"
        onClick={() => cambiarMenu(!abierto)}
      >
        <span className="icono-menu" aria-hidden="true">
          <span />
          <span />
        </span>
        {abierto ? 'Cerrar' : 'Menú'}
      </button>
      <nav
        id="navegacion"
        className={abierto ? 'navegacion abierta' : 'navegacion'}
        aria-label="Navegación principal"
      >
        {secciones.map(([id, nombre]) => (
          <a key={id} href={`#${id}`} aria-current={seccionActual === id ? 'location' : undefined}>
            {nombre}
          </a>
        ))}
        <a
          className="boton boton-contacto"
          href="#contacto"
          aria-current={seccionActual === 'contacto' ? 'location' : undefined}
        >
          Contáctanos <Flecha />
        </a>
      </nav>
    </header>
  );
}

function Inicio() {
  const { correo, institucion } = useContenidoPortal();
  return (
    <section
      id="inicio"
      tabIndex={-1}
      className="hero seccion"
      aria-labelledby="titulo-inicio"
      data-node-id="47:496"
    >
      <Decoraciones grupo="hero" />
      <div className="hero-contenido">
        <p className="hero-sobretitulo">FES Cuautitlán · UNAM</p>
        <h1 id="titulo-inicio">
          {institucion.nombre !== 'Módulo de Carnes y Embutidos' ? (
            institucion.nombre
          ) : (
            <>
              Módulo de
              <br />
              <span className="color-carnes">Carnes</span> y<br />
              <span className="color-embutidos">Embutidos</span>
            </>
          )}
        </h1>
        <p className="hero-descripcion">{institucion.objetivo}</p>
        <div className="hero-botones">
          <a className="boton boton-areas" href="#areas">
            Conoce las áreas <Flecha />
          </a>
          <a className="boton boton-borde" href="#servicio-social">
            Servicio social
          </a>
        </div>
      </div>
      <aside className="hero-redes" aria-label="Enlaces de contacto">
        <a href={`mailto:${correo}`} aria-label="Enviar correo al módulo">
          <Imagen archivo="Vector.svg" nodo="47:605" />
        </a>
        <a href="#contacto" aria-label="Consultar contacto y redes del módulo">
          <Imagen archivo="Image1.png" nodo="47:606" />
        </a>
        <span>Contacto</span>
      </aside>
      <div className="hero-institucion">
        <Imagen archivo="LogoFesc2.png" alt="Escudo de la FES Cuautitlán" nodo="47:610" />
        <div>
          <p>FES Cuautitlán</p>
          <small>
            Centro de Enseñanza
            <br />
            Agropecuaria
          </small>
        </div>
      </div>
    </section>
  );
}

function Modulo() {
  const { institucion } = useContenidoPortal();
  return (
    <section
      id="el-modulo"
      tabIndex={-1}
      className="modulo seccion"
      aria-labelledby="titulo-modulo"
      data-node-id="5:268"
    >
      <Decoraciones grupo="modulo" />
      <div className="contenido modulo-contenido">
        <Etiqueta>El Módulo</Etiqueta>
        <h2 id="titulo-modulo">
          Docencia e investigación
          <br />
          con <em>estándares de rastro.</em>
        </h2>
        <div className="modulo-grid">
          <div className="cronologia">
            <Imagen archivo="Line2.svg" className="cronologia-linea" nodo="5:249" />
            <article>
              <Imagen archivo="Ellipse6.svg" className="cronologia-punto" nodo="5:244" />
              <p className="numero">01 - Qué es</p>
              <h3>Un módulo de la Unidad Pecuaria del CEA</h3>
              <p>{institucion.descripcion}</p>
            </article>
            <article>
              <Imagen archivo="Ellipse6.svg" className="cronologia-punto" nodo="5:245" />
              <p className="numero">02 - Objetivo</p>
              <h3>Apoyo a la docencia y a la investigación</h3>
              <div className="objetivo">
                <Imagen archivo="Line1.svg" className="objetivo-linea" nodo="5:201" />
                <p>{institucion.objetivo}</p>
              </div>
            </article>
            <article>
              <Imagen archivo="Ellipse6.svg" className="cronologia-punto" nodo="5:247" />
              <p className="numero">03 - A Quién Atiende</p>
              <h3>Comunidad universitaria e instituciones externas</h3>
              <ul className="destinatarios">
                {[
                  'Apoyo a licenciaturas de la FES Cuautitlán',
                  'Servicio a otras dependencias de la UNAM',
                  'Colaboración con instituciones académicas externas',
                ].map((texto, i) => (
                  <li key={texto}>
                    <Imagen archivo="Group1.svg" nodo={['5:220', '5:221', '5:226'][i]} />
                    {texto}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <div className="modulo-foto">
            <Imagen
              archivo="Image2.png"
              alt="Edificio del Módulo de Carnes y Embutidos"
              nodo="47:429"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TarjetaArea({ area, indice }) {
  const galeriaAnimada = useGaleriaAnimada();
  const { galeria } = useContenidoPortal();
  const relacionadas = galeria.filter(
    (foto) => (area.id && foto.areaId === area.id) || foto.areaId === area.nombre,
  );
  const fotos = [
    { foto: area.foto, alt: area.alt ?? area.nombre, titulo: area.nombre },
    ...relacionadas.filter((foto) => foto.foto !== area.foto),
  ];
  return (
    <div className="area-conjunto">
      <article className={`area-card area-card-${indice + 1}`}>
        <Imagen archivo={area.foto} alt={area.alt ?? area.nombre} nodo={area.nodo} loading="lazy" />
        <span className="area-numero">{String(indice + 1).padStart(2, '0')}</span>
        <span className="area-etiqueta">{area.etiqueta}</span>
        <div className="area-texto">
          <h3>{area.nombre}</h3>
          <p>{area.descripcion}</p>
        </div>
      </article>
      {relacionadas.length > 0 && (
        <details className="area-galeria" ref={galeriaAnimada.raiz}>
          <summary onClick={galeriaAnimada.alternar}>Ver galería de {area.nombre}</summary>
          <div className="area-galeria-fotos">
            {fotos.map((foto) => (
              <figure key={foto.id ?? foto.foto}>
                <Imagen archivo={foto.foto} alt={foto.alt} loading="lazy" />
                <figcaption>{foto.titulo ?? foto.nombre}</figcaption>
              </figure>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Areas() {
  const { areas } = useContenidoPortal();
  return (
    <section
      id="areas"
      tabIndex={-1}
      className="areas seccion oscura"
      aria-labelledby="titulo-areas"
      data-node-id="5:271"
    >
      <Decoraciones grupo="areas" />
      <div className="contenido">
        <Etiqueta>Áreas</Etiqueta>
        <div className="areas-introduccion">
          <h2 id="titulo-areas">
            El módulo cuenta
            <br />
            con <em>{areas.length === 3 ? 'tres' : areas.length} áreas.</em>
          </h2>
          <p>
            Cada una cubre una etapa del proceso, desde la matanza y el faenado hasta la elaboración
            de productos cárnicos terminados.
          </p>
        </div>
        <div className="areas-grid">
          {areas.map((area, i) => (
            <TarjetaArea area={area} indice={i} key={area.id ?? area.nombre} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Procesos() {
  return (
    <section className="procesos seccion" aria-labelledby="titulo-procesos" data-node-id="47:618">
      <Etiqueta centrada>Cómo se trabaja</Etiqueta>
      <div className="procesos-contenido">
        <h2 id="titulo-procesos">
          Procesos con respaldo <em>académico</em> y <em>normativo.</em>
        </h2>
        <p>
          Todo lo que sale del módulo pasa por las mismas reglas de trabajo, desde la recepción del
          animal hasta el producto empacado.
        </p>
        <div className="procesos-grid">
          {procesos.map(([titulo, texto, icono, nodo]) => (
            <article key={titulo}>
              <h3>{titulo}</h3>
              <p>{texto}</p>
              <Imagen archivo={icono} nodo={nodo} loading="lazy" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Practicas() {
  const { practicas } = useContenidoPortal();
  const [licenciatura, filtrar] = useState('Todas');
  const licenciaturas = [
    ...new Set(practicas.flatMap((p) => (p.licenciaturas?.length ? p.licenciaturas : [p.carrera]))),
  ].filter(Boolean);
  const visibles = practicas.filter(
    (p) =>
      licenciatura === 'Todas' ||
      (p.licenciaturas?.length ? p.licenciaturas : [p.carrera]).includes(licenciatura),
  );
  return (
    <section
      id="practicas"
      tabIndex={-1}
      className="practicas seccion oscura"
      aria-labelledby="titulo-practicas"
      data-node-id="7:2"
    >
      <Decoraciones grupo="practicas" />
      <div className="practicas-contenido">
        <h2 id="titulo-practicas">
          Prácticas académicas <em>que se atienden.</em>
        </h2>
        <p className="practicas-introduccion">
          Temas de formación vinculados con la docencia y la investigación del módulo. Consulta con
          la responsable cómo coordinar una práctica, asesoría o taller para tu grupo.
        </p>
        <div className="filtro-practicas">
          <label htmlFor="filtro-licenciatura">Filtrar por licenciatura</label>
          <SelectorSuave
            id="filtro-licenciatura"
            valor={licenciatura}
            alCambiar={filtrar}
            opciones={['Todas', ...licenciaturas].map((nombre) => ({
              value: nombre,
              label: nombre,
            }))}
          />
          <span role="status" aria-atomic="true">
            {visibles.length}{' '}
            {visibles.length === 1 ? 'práctica disponible' : 'prácticas disponibles'}
          </span>
          <button
            type="button"
            className="restablecer-filtro"
            disabled={licenciatura === 'Todas'}
            onClick={() => filtrar('Todas')}
          >
            Mostrar todas
          </button>
        </div>
        <div className="practicas-grid">
          {visibles.map((practica) => (
            <article className="practica" key={practica.nombre}>
              <Imagen
                className="practica-foto"
                archivo={practica.foto}
                alt={practica.alt}
                loading="lazy"
              />
              <div className="practica-texto">
                <span className="practica-carrera">{practica.carrera}</span>
                <h3>{practica.nombre}</h3>
                <p>{practica.descripcion}</p>
                {practica.asignatura && (
                  <p className="practica-asignatura">Asignatura: {practica.asignatura}</p>
                )}
              </div>
            </article>
          ))}
          <a className="practica practica-explorar" href="#contacto">
            <span className="practica-explorar-titulo">Explora más opciones</span>
            <p>Consulta prácticas, asesorías y talleres para tu grupo.</p>
            <span className="practica-explorar-enlace">
              Contacta al módulo <Imagen archivo="Frame4.svg" nodo="46:223" />
            </span>
          </a>
        </div>
        <p className="nota-referencia">
          Temas e imágenes de referencia; confirma la asignatura y la programación con el módulo.
        </p>
      </div>
    </section>
  );
}

function Actividades() {
  const { actividades, areas } = useContenidoPortal();
  const [seleccion, seleccionar] = useState(1);
  const ficha = useRef(null);
  useTransicionFicha(ficha, seleccion);
  const indice = actividades[seleccion] ? seleccion : 0;
  const actividad = actividades[indice];
  if (!actividad) return <SeccionSinEntradas id="actividades" titulo="Actividades" />;
  return (
    <section
      id="actividades"
      tabIndex={-1}
      className="actividades seccion"
      aria-labelledby="titulo-actividades"
      data-node-id="40:55"
    >
      <Decoraciones grupo="actividades" />
      <div className="contenido contenido-estrecho">
        <Etiqueta>Actividades</Etiqueta>
        <div className="actividades-introduccion">
          <h2 id="titulo-actividades">
            Además, se realizan
            <br />
            <em>actividades como.</em>
          </h2>
          <p>Selecciona una actividad para conocer el detalle y ver el área donde se realiza.</p>
        </div>
        <div className="actividades-grid">
          <div className="actividad-selector" role="group" aria-label="Seleccionar actividad">
            {actividades.map((item, i) => (
              <button
                type="button"
                key={item.nombre}
                aria-pressed={indice === i}
                aria-controls="actividad-detalle"
                onClick={() => seleccionar(i)}
              >
                <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {item.nombre}
                <Imagen archivo={indice === i ? 'Frame6.svg' : 'Frame5.svg'} />
              </button>
            ))}
          </div>
          <div className="actividades-fichas" aria-live="polite" aria-atomic="true">
            {actividades.map((actividad, i) => (
              <article
                key={actividad.id ?? actividad.nombre}
                id={indice === i ? 'actividad-detalle' : undefined}
                className={`actividad-detalle ficha-animada${indice === i ? ' es-visible' : ''}`}
                aria-hidden={indice !== i}
                inert={indice !== i}
                ref={indice === i ? ficha : undefined}
              >
                <p className="sobretitulo">Detalle de la Actividad</p>
                <h3>{actividad.nombre}</h3>
                <p className="actividad-descripcion">{actividad.descripcion}</p>
                <p className="actividad-donde">Dónde se realiza</p>
                <ul className="chips areas-indicadores" aria-label="Áreas de la actividad">
                  {areas.map((area) => {
                    const relacionada =
                      actividad.areas?.includes(area.id) || actividad.areas?.includes(area.nombre);
                    return (
                      <li key={area.nombre} className={relacionada ? 'chip elegida' : 'chip'}>
                        {relacionada && (
                          <>
                            <span className="solo-lectores">Se realiza en: </span>
                            <span aria-hidden="true">✓</span>
                          </>
                        )}
                        {area.nombre}
                      </li>
                    );
                  })}
                </ul>
                <div className="actividad-especies">
                  <small>{actividad.especies ? 'Especies' : 'Enfoque académico'}</small>
                  <p>{actividad.especies ?? actividad.enfoque}</p>
                </div>
                <div className="actividad-foto">
                  <Imagen archivo={actividad.foto} alt={actividad.alt} loading="lazy" />
                </div>
                <a className="actividad-consulta" href="#contacto">
                  Consultar esta actividad <Flecha />
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FichaProducto({ producto, activa, referencia }) {
  const { correo } = useContenidoPortal();
  return (
    <article
      id={activa ? 'producto-detalle' : undefined}
      className={
        activa ? 'producto-ficha ficha-animada es-visible' : 'producto-ficha ficha-animada'
      }
      aria-hidden={!activa}
      inert={!activa}
      ref={activa ? referencia : undefined}
    >
      <p className="sobretitulo">Producto Cárnico</p>
      <h3>{producto.nombre}</h3>
      <p className="producto-descripcion">{producto.descripcion}</p>
      {producto.mostrarPrecio && producto.precio && (
        <p>
          {Number(producto.precio).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}{' '}
          / kg
        </p>
      )}
      {producto.especies?.length ? (
        <>
          <p className="producto-variantes">
            <strong>{producto.especies.length}</strong> especies en esta ficha
          </p>
          <p>Se elabora con:</p>
          <div className="chips">
            {producto.especies.map((especie) => (
              <span className="chip" key={especie}>
                {especie}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="producto-enfoque">
          <p className="sobretitulo">Proceso relacionado</p>
          <p>{producto.enfoque}</p>
        </div>
      )}
      <a
        className="consulta-producto"
        href={`mailto:${correo}?subject=${encodeURIComponent(`Información sobre ${producto.nombre}`)}`}
      >
        Consultar especies y presentaciones disponibles
      </a>
      <div className="producto-nota">
        <Imagen archivo="Line3.svg" nodo="47:337" />
        <small>
          Elaborado con buenas prácticas de higiene, empacado y etiquetado en el módulo.
        </small>
      </div>
    </article>
  );
}

function Productos() {
  const { productos } = useContenidoPortal();
  const [seleccion, seleccionar] = useState(0);
  const ficha = useRef(null);
  const foto = useRef(null);
  useTransicionFicha(ficha, seleccion);
  useTransicionFicha(foto, seleccion);
  const producto = productos[seleccion] ?? productos[0];
  if (!producto) return <SeccionSinEntradas id="productos" titulo="Productos" />;
  return (
    <section
      id="productos"
      tabIndex={-1}
      className="productos seccion"
      aria-labelledby="titulo-productos"
      data-node-id="47:290"
    >
      <Decoraciones grupo="productos" />
      <div className="productos-contenido">
        <Etiqueta centrada>Productos</Etiqueta>
        <h2 id="titulo-productos">
          Productos cárnicos y <em>embutidos.</em>
        </h2>
        <p className="introduccion">
          Conoce los productos cárnicos y su relación con los procesos de elaboración. Consulta con
          el módulo las especies, presentaciones y disponibilidad.
        </p>
        <div className="producto-destacado">
          <figure>
            {productos.map((item) => (
              <Imagen
                key={item.id ?? item.nombre}
                archivo={item.foto}
                className={`producto-imagen ficha-animada${producto === item ? ' es-visible' : ''}`}
                ref={producto === item ? foto : undefined}
                aria-hidden={producto !== item}
                alt={
                  producto === item
                    ? (item.alt ?? `Imagen de referencia de ${item.nombre.toLowerCase()}`)
                    : ''
                }
                nodo={producto === item && seleccion === 0 ? '47:366' : undefined}
                loading="lazy"
              />
            ))}
            <figcaption>
              {producto.nombre}
              {!producto.foto?.startsWith('/medios/') && ' · imagen de referencia'}
            </figcaption>
          </figure>
          <div className="producto-fichas" aria-live="polite" aria-atomic="true">
            {productos.map((item) => (
              <FichaProducto
                producto={item}
                activa={producto === item}
                referencia={ficha}
                key={item.nombre}
              />
            ))}
          </div>
        </div>
        <p className="productos-ayuda">Selecciona un producto para conocer su elaboración.</p>
        <div className="productos-selector" role="group" aria-label="Seleccionar producto">
          {productos.map((item, i) => (
            <button
              type="button"
              key={item.nombre}
              aria-pressed={seleccion === i}
              aria-controls="producto-detalle"
              onClick={() => seleccionar(i)}
            >
              <Imagen archivo={item.foto} nodo={item.nodo} loading="lazy" />
              <span className="producto-seleccion" aria-hidden="true">
                ✓
              </span>
              <span className="producto-nombre">{item.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function InteresServicioSocial() {
  const { programas, correo, avisoInteres } = useContenidoPortal();
  const [estado, cambiarEstado] = useState('');
  const [ocupado, cambiarOcupado] = useState(false);
  const [error, cambiarError] = useState(false);
  if (!avisoInteres)
    return (
      <p className="interes-consulta">
        Para consultar los programas de servicio social,{' '}
        <a href={`mailto:${correo}`}>escribe al módulo</a>.
      </p>
    );
  return (
    <section className="interes-social" aria-labelledby="titulo-interes">
      <h3 id="titulo-interes">Cuéntanos qué programa te interesa</h3>
      <form
        method="post"
        action="/api/v1/publico/intereses"
        onSubmit={async (e) => {
          e.preventDefault();
          const formulario = e.currentTarget;
          const valores = Object.fromEntries(new FormData(formulario));
          cambiarOcupado(true);
          cambiarError(false);
          cambiarEstado('');
          try {
            const respuesta = await fetch(
              `/api/v1/publico/programas/${encodeURIComponent(valores.programa)}/intereses`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...valores,
                  aceptoAviso: valores.aceptoAviso === 'on',
                  versionAviso: avisoInteres.version,
                }),
              },
            );
            const datos = await respuesta.json();
            if (!respuesta.ok) throw new Error(datos.mensaje);
            cambiarEstado('Recibimos tu interés. El módulo podrá contactarte con más información.');
            formulario.reset();
          } catch (err) {
            cambiarError(true);
            cambiarEstado(
              err.message || 'No se pudo enviar. Inténtalo de nuevo o escribe al módulo.',
            );
          } finally {
            cambiarOcupado(false);
          }
        }}
      >
        <input type="hidden" name="versionAviso" value={avisoInteres.version} />
        <div className="interes-campo">
          <label htmlFor="programa-interes">Programa</label>
          <SelectorSuave
            id="programa-interes"
            nombre="programa"
            requerido
            opciones={programas.map((p) => ({ value: p.id, label: p.nombre }))}
          />
        </div>
        <label>
          Nombre
          <input name="nombre" autoComplete="name" required maxLength={160} />
        </label>
        <label>
          Correo
          <input name="correo" type="email" autoComplete="email" required maxLength={160} />
        </label>
        <label>
          Mensaje (opcional)
          <textarea name="mensaje" maxLength={1000} rows={3} />
        </label>
        <label className="interes-aceptacion">
          <input type="checkbox" name="aceptoAviso" required />
          Leí y acepto el{' '}
          <a href={avisoInteres.url} target="_blank" rel="noreferrer">
            aviso de privacidad
          </a>
          .
        </label>
        <button className="boton" disabled={ocupado}>
          {ocupado ? 'Enviando…' : 'Enviar interés'}
        </button>
        <p role={error ? 'alert' : 'status'}>{estado}</p>
      </form>
    </section>
  );
}

function ServicioSocial() {
  const { programas, correo } = useContenidoPortal();
  return (
    <section
      id="servicio-social"
      tabIndex={-1}
      className="social seccion"
      aria-labelledby="titulo-social"
      data-node-id="47:432"
    >
      <Decoraciones grupo="social" />
      <div className="contenido contenido-estrecho">
        <Etiqueta>Servicio Social</Etiqueta>
        <h2 id="titulo-social">
          Dos programas <em>registrados</em>
        </h2>
        <p className="introduccion">Para las licenciaturas de Ingeniería en Alimentos y MVZ.</p>
        <div className="programas-grid">
          {programas.map((programa, i) => (
            <article key={programa.codigo}>
              <div className="programa-cabecera">
                <span>Programa 0{i + 1}</span>
                <small>{programa.codigo}</small>
              </div>
              <h3>{programa.nombre}</h3>
              <div className="programa-actividades">
                <h4>Actividades para Ing. en Alimentos</h4>
                <ul>
                  {programa.actividades.map((texto) => (
                    <li key={texto}>{texto}</li>
                  ))}
                </ul>
              </div>
              <a
                className="boton boton-pequeno"
                href={`mailto:${correo}?subject=${encodeURIComponent(`Servicio social ${programa.codigo}`)}`}
              >
                Solicitar Información <Flecha correo />
              </a>
            </article>
          ))}
        </div>
        <InteresServicioSocial />
      </div>
    </section>
  );
}

function Galeria() {
  const { galeria } = useContenidoPortal();
  return (
    <section
      id="galeria"
      tabIndex={-1}
      className="galeria seccion oscura"
      aria-labelledby="titulo-galeria"
      data-node-id="47:483"
    >
      <Etiqueta centrada>Galería</Etiqueta>
      <h2 id="titulo-galeria">
        El módulo <em>por dentro</em>
      </h2>
      <p>Un recorrido visual por el espacio académico y los procesos cárnicos.</p>
      <div className="galeria-grid">
        {galeria.map((foto, i) => (
          <figure
            key={foto.id ?? foto.titulo ?? foto.nombre}
            className={`galeria-espacio galeria-espacio-${i + 1}`}
          >
            <Imagen archivo={foto.foto} alt={foto.alt} loading="lazy" />
            <figcaption>{foto.titulo ?? foto.nombre}</figcaption>
          </figure>
        ))}
      </div>
      <p className="nota-referencia">
        Imágenes de referencia del diseño para ilustrar instalaciones, procesos y productos.
      </p>
    </section>
  );
}

function Contacto() {
  const { correo, mapa, institucion } = useContenidoPortal();
  return (
    <section
      id="contacto"
      tabIndex={-1}
      className="contacto seccion"
      aria-labelledby="titulo-contacto"
      data-node-id="47:679"
    >
      <div className="contenido contenido-estrecho">
        <Etiqueta>Contacto</Etiqueta>
        <div className="contacto-grid">
          <div>
            <h2 id="titulo-contacto">
              ¿Necesitas apoyo del
              <br />
              <em>módulo?</em>
            </h2>
            <p className="contacto-descripcion">
              Escríbenos para solicitar prácticas académicas, asesorías, talleres o información
              sobre los programas de servicio social.
            </p>
            <a className="boton" href={`mailto:${correo}`}>
              Enviar Correo <Flecha correo />
            </a>
            <div className="contacto-logos">
              <Imagen archivo="Line4.svg" className="contacto-linea" nodo="47:692" />
              <Imagen archivo="LogoUnam1.png" alt="UNAM" nodo="47:693" loading="lazy" />
              <Imagen
                archivo="LogoCea1.png"
                alt="Centro de Enseñanza Agropecuaria"
                nodo="47:694"
                loading="lazy"
              />
            </div>
          </div>
          <address className="contacto-tarjeta">
            <div className="responsable">
              <div className="avatar">
                <Imagen archivo="Ellipse13.svg" nodo="47:695" />
                <span>JS</span>
              </div>
              <div>
                <h3>{institucion.responsable}</h3>
                <p>Responsable del Módulo de Carnes y Embutidos</p>
              </div>
            </div>
            <Imagen archivo="Line5.svg" className="contacto-tarjeta-linea" nodo="47:703" />
            <div className="contacto-dato">
              <Imagen archivo="Frame9.svg" nodo="47:704" />
              <div>
                <p>Correo</p>
                <a href={`mailto:${correo}`}>{correo}</a>
              </div>
            </div>
            <div className="contacto-dato">
              <Imagen archivo="Frame10.svg" nodo="47:711" />
              <div>
                <p>Ubicación</p>
                <span>{institucion.ubicacion}</span>
                <a className="enlace-mapa" href={mapa} target="_blank" rel="noreferrer">
                  Ver en el mapa <Imagen archivo="Frame12.svg" nodo="47:725" />
                </a>
              </div>
            </div>
            <div className="contacto-dato">
              <Imagen archivo="Frame11.svg" nodo="47:714" />
              <div>
                <p>Adscripción</p>
                <span>Centro de Enseñanza Agropecuaria · UNAM</span>
              </div>
            </div>
          </address>
        </div>
      </div>
    </section>
  );
}

function Pie() {
  const { correo, institucion } = useContenidoPortal();
  return (
    <footer className="pie seccion" data-node-id="47:734">
      <Decoraciones grupo="pie" />
      <div className="pie-marca">
        <Marca pie />
        <p>
          Unidad Pecuaria del Centro de Enseñanza Agropecuaria, Facultad de Estudios Superiores
          Cuautitlán, Universidad Nacional Autónoma de México.
        </p>
      </div>
      <div>
        <h2>Secciones</h2>
        {secciones.slice(0, 4).map(([id, nombre]) => (
          <a key={id} href={`#${id}`}>
            {nombre === 'Prácticas' ? 'Prácticas Académicas' : nombre}
          </a>
        ))}
        <a href="#galeria">Galería</a>
        <a href="#talleres">Talleres</a>
      </div>
      <div>
        <h2>Contacto</h2>
        <a href={`mailto:${correo}`}>{correo}</a>
        <p>{institucion.ubicacion}</p>
        <p>{institucion.responsable} · Responsable del módulo</p>
      </div>
      <div>
        <h2>Información</h2>
        <a href="#productos">Productos y embutidos</a>
        <a href="#servicio-social">Servicio social</a>
        <a href="#contacto">Contacto</a>
      </div>
    </footer>
  );
}

function Talleres() {
  const { talleres, avisos, correo } = useContenidoPortal();
  return (
    <section
      id="talleres"
      tabIndex={-1}
      className="talleres seccion"
      aria-labelledby="titulo-talleres"
    >
      <div className="contenido">
        <Etiqueta>Talleres y avisos</Etiqueta>
        <h2 id="titulo-talleres">
          Aprende y participa <em>con el módulo.</em>
        </h2>
        <p>
          Consulta las convocatorias y su estado. Para conocer los requisitos de participación,
          comunícate con la responsable del módulo.
        </p>
        {talleres.length ? (
          <div className="talleres-grid">
            {talleres.map((t) => (
              <article key={t.id}>
                <span className="chip">
                  {
                    {
                      informativo: 'Información',
                      abierto: 'Convocatoria abierta',
                      cerrado: 'Cerrado',
                      concluido: 'Concluido',
                    }[t.estadoTaller]
                  }
                </span>
                <h3>{t.nombre ?? t.titulo}</h3>
                <p>{t.descripcion}</p>
                {t.inicio && (
                  <p>
                    <time dateTime={t.inicio}>{t.inicio}</time>
                    {t.fin && ` al ${t.fin}`}
                  </p>
                )}
                {t.requisitos && <p>Requisitos: {t.requisitos}</p>}
                {t.costo && <p>Costo indicativo: {t.costo}</p>}
                <a
                  className="boton"
                  href={`mailto:${correo}?subject=${encodeURIComponent(t.nombre ?? t.titulo)}`}
                >
                  Solicitar información
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="talleres-vacio">
            Por ahora no hay talleres publicados. Escríbenos para consultar próximas actividades.
          </p>
        )}
        {avisos.map((aviso) => (
          <article className="aviso" key={aviso.id}>
            <h3>{aviso.nombre ?? aviso.titulo}</h3>
            {aviso.fecha && <time dateTime={aviso.fecha}>{aviso.fecha}</time>}
            <p>{aviso.descripcion}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PaginaPortal() {
  const contenido = useRef(null);
  useInteraccionesPortal();
  return (
    <>
      <a className="saltar-contenido" href="#contenido-principal">
        Saltar al contenido
      </a>
      <Encabezado />
      <main id="contenido-principal" tabIndex={-1} ref={contenido}>
        <Inicio />
        <Separador
          archivo="PapelRasgadoHorizontalFigma1.svg"
          className="separador-hero"
          nodo="2:20"
        />
        <Modulo />
        <Separador className="separador-a-oscuro" nodo="5:251" />
        <Areas />
        <Separador className="separador-a-claro" nodo="10:10" />
        <Procesos />
        <Separador
          archivo="PapelRasgadoHorizontalFigma3.svg"
          className="separador-practicas"
          nodo="23:22"
        />
        <Practicas />
        <Separador
          archivo="PapelRasgadoHorizontalFigma4.svg"
          className="separador-a-claro"
          nodo="36:51"
        />
        <Actividades />
        <Productos />
        <ServicioSocial />
        <Talleres />
        <Separador
          archivo="PapelRasgadoHorizontalFigma5.svg"
          className="separador-a-oscuro"
          nodo="47:650"
        />
        <Galeria />
        <Contacto />
      </main>
      <Pie />
    </>
  );
}

export function App({ contenido }) {
  return (
    <ContenidoPortal contenido={contenido}>
      <PaginaPortal />
    </ContenidoPortal>
  );
}
