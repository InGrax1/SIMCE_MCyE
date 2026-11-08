import { useEffect, useRef } from 'react';

export function BandejaOperacion({
  tituloLista,
  listado,
  detalle,
  claveDetalle,
  mostrarDetalle,
  volver,
  ocupado,
  textoVolver = 'Volver a la lista',
}) {
  const lista = useRef(null);
  const panel = useRef(null);

  useEffect(() => {
    if (mostrarDetalle && matchMedia('(max-width: 760px)').matches) panel.current?.focus();
  }, [mostrarDetalle, claveDetalle]);

  return (
    <div className="cms-bandeja-columnas" data-detalle={mostrarDetalle}>
      <section ref={lista} className="cms-bandeja-listado" aria-label={tituloLista} tabIndex={-1}>
        {listado}
      </section>
      <section
        ref={panel}
        className="cms-bandeja-detalle"
        aria-label="Detalle y acciones"
        tabIndex={-1}
      >
        {mostrarDetalle && (
          <button
            type="button"
            className="secundario cms-volver-lista"
            disabled={ocupado}
            onClick={() => {
              volver();
              requestAnimationFrame(() => {
                const seleccionado = lista.current?.querySelector('[aria-pressed="true"]');
                (seleccionado ?? lista.current)?.focus();
              });
            }}
          >
            {textoVolver}
          </button>
        )}
        {detalle}
      </section>
    </div>
  );
}
