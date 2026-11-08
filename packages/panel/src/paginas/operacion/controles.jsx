import { formatearDinero, formatearKilogramos } from '@simce/dominio';

export const kg = (gramos) => `${gramos < 0 ? '-' : ''}${formatearKilogramos(Math.abs(gramos))} kg`;
export const mxn = (centavos) => `$${formatearDinero(centavos)} MXN`;
export const opciones = (registros, { soloActivos = false } = {}) =>
  registros
    .filter((r) => !soloActivos || r.activo)
    .map((r) => [r.uuid, `${r.nombre}${r.activo === false ? ' (inactivo)' : ''}`]);

export function Selector({ nombre, titulo, valores, vacio = 'Selecciona', ...props }) {
  return (
    <label>
      <span>{titulo}</span>
      <select name={nombre} {...props}>
        {vacio !== null && <option value="">{vacio}</option>}
        {valores.map(([id, etiqueta]) => (
          <option key={id} value={id}>
            {etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Campo({ titulo, nombre, ...props }) {
  return (
    <label>
      {titulo}
      <input name={nombre} {...props} />
    </label>
  );
}

export function Motivo({ titulo = 'Motivo', nombre = 'motivo', requerido = true }) {
  return (
    <label>
      {titulo}
      <textarea name={nombre} required={requerido} maxLength={500} rows={2} />
    </label>
  );
}

export function FormularioOperacion({ accion, ocupado, boton, children, limpiar = false }) {
  return (
    <form
      className="cms-form-gestion"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if ((await accion(Object.fromEntries(new FormData(form)))) && limpiar) form.reset();
      }}
    >
      {children}
      <button disabled={ocupado}>{boton}</button>
    </form>
  );
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
