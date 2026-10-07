import { useEffect, useRef, useState } from 'react';
import {
  actividades,
  areas,
  correo,
  galeria,
  mapa,
  practicas,
  procesos,
  productos,
  programas,
  secciones,
} from './contenido.js';
import { Decoraciones, Etiqueta, Flecha, Imagen, Marca, Separador } from './componentes.jsx';

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
      <Decoraciones grupo="hero" />
      <div className="hero-contenido">
        <h1 id="titulo-inicio">
          Módulo de
          <br />
          <span className="color-carnes">Carnes</span> y<br />
          <span className="color-embutidos">Embutidos</span>
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
      </div>
      <aside className="hero-redes" aria-label="Enlaces de contacto">
        <a href={`mailto:${correo}`} aria-label="Enviar correo al módulo">
          <Imagen archivo="Vector.svg" nodo="47:605" />
        </a>
        <a href="#contacto" aria-label="Consultar contacto y redes del módulo">
          <Imagen archivo="Image1.png" nodo="47:606" />
        </a>
        <span>Síguenos En</span>
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
  return (
    <section
      id="el-modulo"
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
              <p>
                El Módulo de Carnes y Embutidos se ubica en Campo 4 de la FES Cuautitlán y está
                encargado de la obtención, manejo y procesamiento de carne de diferentes especies de
                abasto.
              </p>
            </article>
            <article>
              <Imagen archivo="Ellipse6.svg" className="cronologia-punto" nodo="5:245" />
              <p className="numero">02 - Objetivo</p>
              <h3>Apoyo a la docencia y a la investigación</h3>
              <div className="objetivo">
                <Imagen archivo="Line1.svg" className="objetivo-linea" nodo="5:201" />
                <p>
                  Brindar servicio de apoyo a la docencia e investigación a las diferentes
                  licenciaturas de la FESC, así como a otras dependencias de la UNAM e instituciones
                  académicas que así lo requieran.
                </p>
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

function Areas() {
  return (
    <section
      id="areas"
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
            con <em>tres áreas.</em>
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
      <Decoraciones grupo="practicas" />
      <div className="practicas-contenido">
        <h2 id="titulo-practicas">
          Prácticas académicas <em>que se atienden.</em>
        </h2>
        <p className="practicas-introduccion">
          Temas de formación vinculados con la docencia y la investigación del módulo. Consulta con
          la responsable cómo coordinar una práctica, asesoría o taller para tu grupo.
        </p>
        <div className="practicas-grid">
          {practicas.map((practica, i) => (
            <article
              className={i === 0 || i === 5 ? 'practica practica-ancha' : 'practica'}
              key={practica.nombre}
            >
              <div className="practica-texto">
                <span className="practica-carrera">{practica.carrera}</span>
                <h3>{practica.nombre}</h3>
                <p>{practica.descripcion}</p>
              </div>
              <Imagen
                className="practica-foto"
                archivo={practica.foto}
                alt={practica.alt}
                loading="lazy"
              />
            </article>
          ))}
          <a className="practica practica-explorar" href="#contacto">
            <span>Explora</span>
            <span>
              más <Imagen archivo="Frame4.svg" nodo="46:223" />
            </span>
            <span>Opciones</span>
          </a>
        </div>
        <p className="nota-referencia">
          Temas e imágenes de referencia; la programación se acuerda con el módulo.
        </p>
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
          </div>
          <article id="actividad-detalle" className="actividad-detalle" aria-live="polite">
            <p className="sobretitulo">Detalle de la Actividad</p>
            <h3>{actividad.nombre}</h3>
            <p className="actividad-descripcion">{actividad.descripcion}</p>
            <p className="actividad-donde">Dónde se realiza</p>
            <div className="chips">
              {areas.map((area) => (
                <a
                  key={area.nombre}
                  href="#areas"
                  className={actividad.areas.includes(area.nombre) ? 'chip elegida' : 'chip'}
                >
                  {area.nombre}
                </a>
              ))}
            </div>
            <div className="actividad-especies">
              <small>{actividad.especies ? 'Especies' : 'Enfoque académico'}</small>
              <p>{actividad.especies ?? actividad.enfoque}</p>
            </div>
            <div className="actividad-foto">
              <Imagen archivo={actividad.foto} alt={actividad.alt} loading="lazy" />
            </div>
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
      <Decoraciones grupo="productos" />
      <div className="productos-contenido">
        <Etiqueta centrada>Productos</Etiqueta>
        <h2 id="titulo-productos">
          Productos cárnicos y <em>embutidos.</em>
        </h2>
        <p className="introduccion">
          Conoce ocho líneas de productos cárnicos y su relación con los procesos de elaboración.
          Consulta con el módulo las especies, presentaciones y disponibilidad.
        </p>
        <div className="producto-destacado">
          <figure>
            <Imagen
              archivo={producto.foto}
              alt={`Imagen de referencia de ${producto.nombre.toLowerCase()}`}
              nodo={seleccion === 0 ? '47:366' : undefined}
              loading="lazy"
            />
            <figcaption>{producto.nombre} · imagen de referencia</figcaption>
          </figure>
          <article id="producto-detalle" aria-live="polite">
            <p className="sobretitulo">Producto Cárnico</p>
            <h3>{producto.nombre}</h3>
            <p className="producto-descripcion">{producto.descripcion}</p>
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
      <p>Un recorrido visual por el espacio académico y los procesos cárnicos.</p>
      <div className="galeria-grid">
        {galeria.map((foto, i) => (
          <figure key={foto.titulo} className={`galeria-espacio galeria-espacio-${i + 1}`}>
            <Imagen archivo={foto.foto} alt={foto.alt} loading="lazy" />
            <figcaption>{foto.titulo}</figcaption>
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
                <h3>Mtra. Janeli Solís Garfias</h3>
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
