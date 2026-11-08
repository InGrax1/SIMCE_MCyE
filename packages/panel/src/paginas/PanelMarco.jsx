const vistas = {
  solicitudes: ['Solicitudes', 'Responde consultas de talleres y solicitudes de servicio social.'],
  participantes: ['Participantes', 'Revisa inscripciones, asistencia e historial por taller.'],
  talleres: ['Talleres', 'Edita las convocatorias y configura fechas, sede y cupo.'],
  contenido: ['Contenido', 'Edita, revisa y publica la información del portal.'],
  bitacora: ['Bitácora', 'Consulta los últimos movimientos del panel.'],
  operacion: ['Operación', 'Registra producción y remisiones y consulta existencias del Módulo.'],
};
const roles = {
  admin: 'Administrador',
  responsable: 'Responsable',
  editor: 'Editor',
  operador: 'Operador',
};
const iconos = {
  solicitudes: (
    <>
      <path d="M4 4h16v12H8l-4 4V4Z" />
      <path d="M8 8h8m-8 4h5" />
    </>
  ),
  participantes: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m3 9v-2a5 5 0 0 0-2-4" />
    </>
  ),
  talleres: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 10h18m-13 5h4" />
    </>
  ),
  contenido: <path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h6m-6 4h6" />,
  operacion: <path d="m3 8 9-5 9 5v8l-9 5-9-5zm0 0 9 5 9-5m-9 5v8M7.5 5.5l9 5" />,
  bitacora: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export function PanelMarco({
  usuario,
  vista,
  navegar,
  ocupado,
  cerrarSesion,
  children,
  modoLocal,
}) {
  const secciones = modoLocal
    ? ['operacion']
    : ['responsable', 'admin'].includes(usuario.rol)
      ? ['solicitudes', 'participantes', 'talleres', 'contenido', 'operacion', 'bitacora']
      : usuario.rol === 'editor'
        ? ['talleres', 'contenido']
        : ['operacion'];
  return (
    <div className="cms cms-shell">
      <aside className="cms-menu">
        <div className="cms-identidad">
          <span aria-hidden="true">SC</span>
          <div>
            <strong>SIMCE</strong>
            <small>Módulo de Carnes y Embutidos</small>
          </div>
        </div>
        {secciones.length > 0 && (
          <nav aria-label="Navegación del panel" className="cms-navegacion">
            {secciones.map((clave) => (
              <button
                type="button"
                key={clave}
                aria-current={vista === clave ? 'page' : undefined}
                disabled={ocupado}
                onClick={() => navegar(clave)}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {iconos[clave]}
                </svg>
                {vistas[clave][0]}
              </button>
            ))}
          </nav>
        )}
        <div className="cms-menu-pie">
          <a href="/" target="_blank" rel="noreferrer">
            Ver portal público <span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>
      <div className="cms-superficie">
        <header className="cms-pagina-cabecera">
          <div>
            <p className="cms-ruta">Panel del módulo</p>
            <h1>{vistas[vista][0]}</h1>
            <p>{vistas[vista][1]}</p>
          </div>
          <div className="cms-perfil">
            <div>
              <strong>{roles[usuario.rol]}</strong>
              <small>{usuario.correo}</small>
            </div>
            <button type="button" className="secundario" disabled={ocupado} onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="cms-marco cms-marco-vista" id="contenido-panel" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
