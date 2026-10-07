import { useEffect, useRef, useState } from 'react';
import {
  actividades,
  areas,
  correo,
  mapa,
  procesos,
  productos,
  programas,
  secciones,
} from './contenido.js';
import { Decoraciones, Etiqueta, Flecha, IconoFoto, Imagen, Marca } from './componentes.jsx';

function Encabezado() {
  const [abierto, cambiarMenu] = useState(false);
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
    if (!abierto) return;
    const cerrarFuera = (evento) => {
      if (!cabecera.current.contains(evento.target)) cambiarMenu(false);
    };
    const escritorio = window.matchMedia('(min-width: 1120px)');
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
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && abierto) {
          cambiarMenu(false);
          botonMenu.current.focus();
        }
      }}
    >
      <div className="encabezado-contenido">
        <Marca />
        <button
          ref={botonMenu}
          type="button"
          className="boton-menu"
          aria-expanded={abierto}
          aria-controls="navegacion"
          onClick={() => cambiarMenu(!abierto)}
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
        <nav
          id="navegacion"
          className={abierto ? 'navegacion abierta' : 'navegacion'}
          aria-label="Navegación principal"
        >
          {secciones.map(([id, nombre]) => (
            <a key={id} href={`#${id}`} onClick={() => cambiarMenu(false)}>
              {nombre}
            </a>
          ))}
          <a className="boton boton-contacto" href="#contacto" onClick={() => cambiarMenu(false)}>
            Contáctanos <Flecha />
          </a>
        </nav>
      </div>
    </header>
  );
}

function Inicio() {
  return (
    <section
      id="inicio"
      className="hero seccion"
      aria-labelledby="titulo-inicio"
      data-node-id="47:496"
    >
      <div className="hero-grid">
        <div className="hero-contenido">
          <p className="hero-sobretitulo">CEA · FES Cuautitlán</p>
          <h1 id="titulo-inicio">
            Módulo de <span className="hero-nombre">Carnes y Embutidos</span>
          </h1>
          <p className="hero-descripcion">
            Encargado de la obtención, manejo y procesamiento de carne de diferentes especies de
            abasto, como apoyo a la docencia y la investigación de la UNAM.
          </p>
          <div className="hero-botones">
            <a className="boton boton-areas" href="#areas">
              Conoce las áreas <Flecha />
            </a>
            <a className="boton boton-borde" href="#servicio-social">
              Servicio Social
            </a>
          </div>
          <aside className="hero-redes" aria-label="Enlaces de contacto">
            <a href={`mailto:${correo}`} aria-label="Enviar correo al módulo">
              <Imagen archivo="Vector.svg" nodo="47:605" />
            </a>
            <a href="#contacto">Contactar al módulo</a>
          </aside>
        </div>
        <div className="hero-visual">
          <div className="hero-ilustracion">
            <Decoraciones grupo="hero" />
          </div>
          <div className="hero-institucion">
            <Imagen archivo="LogoFesc2.png" alt="Escudo de la FES Cuautitlán" nodo="47:610" />
            <div>
              <p>FES Cuautitlán</p>
              <small>Centro de Enseñanza Agropecuaria</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Modulo() {
  return (
    <section
      id="el-modulo"
      className="modulo seccion"
      aria-labelledby="titulo-modulo"
      data-node-id="5:268"
    >
      <div className="contenido modulo-contenido">
        <Etiqueta>El Módulo</Etiqueta>
        <h2 id="titulo-modulo">
          Docencia e investigación con <em>estándares de rastro.</em>
        </h2>
        <div className="modulo-grid">
          <div className="cronologia">
            <article>
              <p className="numero">01 - Qué es</p>
              <h3>Un módulo de la Unidad Pecuaria del CEA</h3>
              <p>
                El Módulo de Carnes y Embutidos se ubica en Campo 4 de la FES Cuautitlán y está
                encargado de la obtención, manejo y procesamiento de carne de diferentes especies de
                abasto.
              </p>
            </article>
            <article>
              <p className="numero">02 - Objetivo</p>
              <h3>Apoyo a la docencia y a la investigación</h3>
              <div className="objetivo">
                <p>
                  Brindar servicio de apoyo a la docencia e investigación a las diferentes
                  licenciaturas de la FESC, así como a otras dependencias de la UNAM e instituciones
                  académicas que así lo requieran.
                </p>
              </div>
            </article>
            <article>
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

function Areas() {
  return (
    <section
      id="areas"
      className="areas seccion oscura"
      aria-labelledby="titulo-areas"
      data-node-id="5:271"
    >
      <div className="contenido">
        <Etiqueta>Áreas</Etiqueta>
        <div className="areas-introduccion">
          <h2 id="titulo-areas">
            El módulo cuenta con <em>tres áreas.</em>
          </h2>
          <p>
            Cada una cubre una etapa del proceso, desde la matanza y el faenado hasta la elaboración
            de productos cárnicos terminados.
          </p>
        </div>
        <div className="areas-grid">
          {areas.map((area, i) => (
            <article className={`area-card area-card-${i + 1}`} key={area.nombre}>
              <Imagen archivo={area.foto} alt={area.nombre} nodo={area.nodo} loading="lazy" />
              <span className="area-numero">0{i + 1}</span>
              <span className="area-etiqueta">{area.etiqueta}</span>
              <div className="area-texto">
                <h3>{area.nombre}</h3>
                <p>{area.descripcion}</p>
              </div>
            </article>
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
  return (
    <section
      id="practicas"
      className="practicas seccion oscura"
      aria-labelledby="titulo-practicas"
      data-node-id="7:2"
    >
      <div className="practicas-contenido">
        <Etiqueta>Prácticas académicas</Etiqueta>
        <h2 id="titulo-practicas">
          Aprendizaje <em>en el módulo.</em>
        </h2>
        <p className="introduccion">
          Consulta con la responsable las prácticas y el apoyo académico del módulo.
        </p>
        <div className="practicas-grid">
          {[
            ['TMIA', 'Procesos tecnológicos de productos cárnicos'],
            ['MVZ', 'Anatomía veterinaria aplicada'],
          ].map(([carrera, nombre]) => (
            <article className="practica" key={nombre}>
              <div
                className="foto-pendiente"
                role="img"
                aria-label="Fotografía de práctica pendiente"
              >
                <IconoFoto />
                <span>Fotografía por incorporar</span>
              </div>
              <div className="practica-texto">
                <span className="practica-carrera">{carrera}</span>
                <h3>{nombre}</h3>
              </div>
            </article>
          ))}
          <article className="practica practica-explorar">
            <p className="sobretitulo">Apoyo académico</p>
            <h3>Encuentra la práctica que necesitas.</h3>
            <p>Solicita información sobre otras opciones a la responsable del módulo.</p>
            <a className="boton" href="#contacto">
              Consultar prácticas <Flecha />
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

function Actividades() {
  const [seleccion, seleccionar] = useState(1);
  const actividad = actividades[seleccion];
  return (
    <section
      id="actividades"
      className="actividades seccion"
      aria-labelledby="titulo-actividades"
      data-node-id="40:55"
    >
      <div className="contenido contenido-estrecho">
        <Etiqueta>Actividades</Etiqueta>
        <div className="actividades-introduccion">
          <h2 id="titulo-actividades">
            Actividades que <em>se realizan.</em>
          </h2>
          <p>Selecciona una actividad para conocer el detalle y ver el área donde se realiza.</p>
        </div>
        <div className="actividades-grid">
          <div className="actividad-selector" aria-label="Seleccionar actividad">
            {actividades.map((item, i) => (
              <button
                type="button"
                key={item.nombre}
                aria-pressed={seleccion === i}
                aria-controls="actividad-detalle"
                onClick={() => seleccionar(i)}
              >
                <span>0{i + 1}</span>
                {item.nombre}
                <Imagen archivo={seleccion === i ? 'Frame6.svg' : 'Frame5.svg'} />
              </button>
            ))}
            <a className="ver-detalle-movil" href="#actividad-detalle">
              Ver detalle de la actividad <Flecha />
            </a>
          </div>
          <article id="actividad-detalle" className="actividad-detalle" aria-live="polite">
            <p className="sobretitulo">Detalle de la Actividad</p>
            <h3>{actividad.nombre}</h3>
            {actividad.descripcion ? (
              <>
                <p className="actividad-descripcion">{actividad.descripcion}</p>
                <p className="actividad-donde">Dónde se realiza</p>
                <div className="chips">
                  {areas.map((area) => (
                    <a
                      key={area.nombre}
                      href="#areas"
                      className={area.nombre === actividad.area ? 'chip elegida' : 'chip'}
                    >
                      {area.nombre}
                    </a>
                  ))}
                </div>
                <div className="actividad-especies">
                  <small>Especies</small>
                  <p>{actividad.especies}</p>
                </div>
                <div className="actividad-foto">
                  <Imagen
                    archivo={actividad.foto}
                    alt="Trabajo de matanza y faenado en el área de rastro"
                    nodo="47:406"
                    loading="lazy"
                  />
                </div>
              </>
            ) : (
              <>
                <p className="actividad-descripcion">
                  Solicita a la responsable del módulo información sobre esta actividad.
                </p>
                <a
                  className="boton boton-pequeno"
                  href={`mailto:${correo}?subject=${encodeURIComponent(actividad.nombre)}`}
                >
                  Solicitar información <Flecha correo />
                </a>
              </>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

function Productos() {
  const [seleccion, seleccionar] = useState(0);
  const producto = productos[seleccion];
  return (
    <section
      id="productos"
      className="productos seccion"
      aria-labelledby="titulo-productos"
      data-node-id="47:290"
    >
      <div className="productos-contenido">
        <Etiqueta centrada>Productos</Etiqueta>
        <h2 id="titulo-productos">
          Productos cárnicos y <em>embutidos.</em>
        </h2>
        <p className="introduccion">
          Conoce las líneas de producto elaboradas en el área de embutidos y consulta sus
          presentaciones.
        </p>
        <div className="producto-destacado">
          <figure>
            <Imagen
              archivo={producto.foto}
              alt={producto.nombre}
              nodo={seleccion === 0 ? '47:366' : undefined}
              loading="lazy"
            />
          </figure>
          <article id="producto-detalle" aria-live="polite">
            <p className="sobretitulo">Producto Cárnico</p>
            <h3>{producto.nombre}</h3>
            {producto.especies ? (
              <>
                <p className="producto-variantes">
                  <strong>{producto.especies.length}</strong> especies en esta ficha
                </p>
                <p>Se elabora con:</p>
                <div className="chips">
                  {producto.especies.map((especie) => (
                    <span className="chip" key={especie}>
                      <Imagen archivo="Frame7.svg" />
                      {especie}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <a
                className="consulta-producto"
                href={`mailto:${correo}?subject=${encodeURIComponent(`Información sobre ${producto.nombre}`)}`}
              >
                Consultar especies y presentaciones disponibles
              </a>
            )}
            <div className="producto-nota">
              <small>
                Elaborado con buenas prácticas de higiene, empacado y etiquetado en el módulo.
              </small>
            </div>
          </article>
        </div>
        <div className="productos-navegacion">
          <p>Selecciona un producto para conocer su detalle.</p>
          <a className="ver-detalle-movil" href="#producto-detalle">
            Ver detalle de {producto.nombre} <Flecha />
          </a>
        </div>
        <div className="productos-selector" aria-label="Seleccionar producto">
          {productos.map((item, i) => (
            <button
              type="button"
              key={item.nombre}
              aria-pressed={seleccion === i}
              aria-controls="producto-detalle"
              onClick={() => seleccionar(i)}
            >
              <Imagen archivo={item.foto} nodo={item.nodo} loading="lazy" />
              <span className="producto-numero">0{i + 1}</span>
              <span className="producto-nombre">{item.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicioSocial() {
  return (
    <section
      id="servicio-social"
      className="social seccion"
      aria-labelledby="titulo-social"
      data-node-id="47:432"
    >
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
              <details className="programa-actividades">
                <summary>Actividades para Ing. en Alimentos</summary>
                <ul>
                  {programa.actividades.map((texto) => (
                    <li key={texto}>{texto}</li>
                  ))}
                </ul>
              </details>
              <a
                className="boton boton-pequeno"
                href={`mailto:${correo}?subject=${encodeURIComponent(`Servicio social ${programa.codigo}`)}`}
              >
                Solicitar Información <Flecha correo />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Galeria() {
  return (
    <section
      id="galeria"
      className="galeria seccion oscura"
      aria-labelledby="titulo-galeria"
      data-node-id="47:483"
    >
      <Etiqueta centrada>Galería</Etiqueta>
      <h2 id="titulo-galeria">
        El módulo <em>por dentro</em>
      </h2>
      <p>Instalaciones, prácticas y productos del Módulo de Carnes y Embutidos.</p>
      <div className="galeria-grid">
        {['Instalaciones', 'Prácticas académicas', 'Procesos', 'Productos'].map((nombre) => (
          <div
            key={nombre}
            className="galeria-espacio"
            role="img"
            aria-label={`Fotografía de ${nombre.toLowerCase()} pendiente de contenido institucional`}
          >
            <IconoFoto />
            <span>{nombre}</span>
            <small>Fotografía por incorporar</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Contacto() {
  return (
    <section
      id="contacto"
      className="contacto seccion"
      aria-labelledby="titulo-contacto"
      data-node-id="47:679"
    >
      <div className="contenido contenido-estrecho">
        <Etiqueta>Contacto</Etiqueta>
        <div className="contacto-grid">
          <div>
            <h2 id="titulo-contacto">
              ¿Necesitas apoyo del <em>módulo?</em>
            </h2>
            <p className="contacto-descripcion">
              Escríbenos para solicitar prácticas académicas, asesorías, talleres o información
              sobre los programas de servicio social.
            </p>
            <a className="boton" href={`mailto:${correo}`}>
              Enviar Correo <Flecha correo />
            </a>
            <div className="contacto-logos">
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
                <span>JS</span>
              </div>
              <div>
                <h3>Mtra. Janeli Solís Garfias</h3>
                <p>Responsable del Módulo de Carnes y Embutidos</p>
              </div>
            </div>
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
                <span>Campo 4, FES Cuautitlán · Unidad Pecuaria, CEA</span>
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
  return (
    <footer className="pie seccion" data-node-id="47:734">
      <div className="pie-contenido">
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
        </div>
        <div>
          <h2>Contacto</h2>
          <a href={`mailto:${correo}`}>{correo}</a>
          <p>Campo 4, FES Cuautitlán · Unidad Pecuaria, CEA</p>
          <p>Mtra. Janeli Solís Garfias · Responsable del módulo</p>
        </div>
        <div>
          <h2>Información</h2>
          <a href="#productos">Productos y embutidos</a>
          <a href="#servicio-social">Servicio social</a>
          <a href="#contacto">Contacto</a>
        </div>
      </div>
    </footer>
  );
}

export function App() {
  return (
    <>
      <a className="saltar-contenido" href="#contenido-principal">
        Saltar al contenido
      </a>
      <Encabezado />
      <main id="contenido-principal" tabIndex={-1}>
        <Inicio />
        <Modulo />
        <Areas />
        <Procesos />
        <Practicas />
        <Actividades />
        <Productos />
        <ServicioSocial />
        <Galeria />
        <Contacto />
      </main>
      <Pie />
    </>
  );
}
