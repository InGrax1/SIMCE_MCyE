export function Imagen({ archivo, alt = '', className = '', nodo, ...props }) {
  return (
    <img
      src={`/figma/${archivo}`}
      alt={alt}
      className={className}
      data-node-id={nodo}
      decoding="async"
      {...props}
    />
  );
}

export function IconoFoto() {
  return (
    <svg
      className="icono-foto"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8" cy="9" r="1.5" />
      <path d="m3 17 5-5 4 4 4-6 5 7" strokeLinejoin="round" />
    </svg>
  );
}

export function Marca({ pie = false }) {
  return (
    <a
      className={`marca${pie ? ' marca-pie' : ''}`}
      href="#inicio"
      aria-label="Carnes y Embutidos, ir al inicio"
    >
      <span className="marca-icono">
        <Imagen archivo="Ellipse4.svg" nodo={pie ? '47:740' : '5:88'} />
        <Imagen archivo="LogoCea1.png" className="marca-logo" nodo={pie ? '47:741' : '47:735'} />
      </span>
      <span>
        Carnes y Embutidos<small>CEA - Unidad Pecuaria</small>
      </span>
    </a>
  );
}

export function Etiqueta({ children, centrada = false }) {
  return <p className={`etiqueta${centrada ? ' etiqueta-centrada' : ''}`}>{children}</p>;
}

export function Flecha({ correo = false }) {
  return (
    <Imagen
      archivo={correo ? 'Frame8.svg' : 'ConoceLasAreas.svg'}
      className={correo ? 'flecha-correo' : 'flecha'}
    />
  );
}

export function Separador({ archivo = 'PapelRasgadoHorizontalFigma2.svg', className = '', nodo }) {
  return (
    <div className={`separador ${className}`} aria-hidden="true" data-node-id={nodo}>
      <Imagen archivo={archivo} />
    </div>
  );
}

const decoraciones = {
  hero: [
    ['hero-decoration.png', 'hero-decoracion', '47:577'],
    ['PorterhouseSteakCorteResChoiceJc1.png', 'hero-carne', '47:578'],
  ],
  modulo: [
    ['Cilantro1.png', 'modulo-cilantro-1', '5:314'],
    ['Cilantro1.png', 'modulo-cilantro-2', '5:316'],
    ['Romero1600X6001.png', 'modulo-romero', '5:320'],
  ],
  areas: [
    ['PngtreeRibsRoastsBeefCutsPngImage117134921.png', 'areas-carne', '5:326'],
    ['Romero2600X6001.png', 'areas-romero', '5:324'],
    ['Up.svg', 'areas-luz-1', '5:260'],
    ['Up1.svg', 'areas-luz-2', '5:280'],
  ],
  practicas: [
    ['Up2.svg', 'practicas-luz-1', '46:276'],
    ['Up3.svg', 'practicas-luz-2', '7:6'],
  ],
  actividades: [['Romero2600X6001.png', 'actividades-romero', '46:280']],
  productos: [
    ['Ellipse9.svg', 'productos-luz-1', '47:433'],
    ['Ellipse10.svg', 'productos-luz-2', '47:434'],
  ],
  social: [
    ['Ellipse11.svg', 'social-luz-1', '47:436'],
    ['Ellipse12.svg', 'social-luz-2', '47:471'],
  ],
  pie: [['Ellipse14.svg', 'pie-luz', '47:781']],
};

export function Decoraciones({ grupo }) {
  return (
    <div className={`decoraciones decoraciones-${grupo}`} aria-hidden="true">
      {decoraciones[grupo].map(([archivo, clase, nodo]) => (
        <Imagen key={clase} archivo={archivo} className={clase} nodo={nodo} />
      ))}
    </div>
  );
}
