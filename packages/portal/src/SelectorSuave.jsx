import { useEffect, useRef, useState } from 'react';
import { Select } from '@base-ui/react/select';
import { permiteAnimar, usePanelAnimado } from './animaciones.js';

function Opciones({ abierto, acciones, opciones, disparador, alCancelar }) {
  const panel = useRef(null);
  usePanelAnimado(panel, abierto, () => acciones.current?.unmount());
  return (
    <Select.Popup
      className="selector-panel"
      ref={panel}
      finalFocus={disparador}
      onKeyDown={alCancelar}
    >
      <Select.List className="selector-lista">
        {opciones.map(({ value, label }) => (
          <Select.Item className="selector-opcion" value={value} key={value}>
            <Select.ItemText>{label}</Select.ItemText>
            <Select.ItemIndicator className="selector-marca">
              <span aria-hidden="true">✓</span>
            </Select.ItemIndicator>
          </Select.Item>
        ))}
      </Select.List>
    </Select.Popup>
  );
}

export function SelectorSuave({ id, opciones, valor, alCambiar, nombre, valorInicial, requerido }) {
  const [abierto, abrir] = useState(false);
  const valorPorDefecto = valorInicial ?? opciones[0]?.value ?? null;
  const [seleccion, seleccionar] = useState(valorPorDefecto);
  const disparador = useRef(null);
  const acciones = useRef(null);
  const cancelar = (evento) => {
    if (evento.key !== 'Escape' || !abierto) return;
    evento.preventDefault();
    evento.stopPropagation();
    acciones.current?.close();
    disparador.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (valor !== undefined) return;
    const formulario = disparador.current?.form;
    const restablecer = () => seleccionar(valorPorDefecto);
    formulario?.addEventListener('reset', restablecer);
    return () => formulario?.removeEventListener('reset', restablecer);
  }, [valor, valorPorDefecto]);
  return (
    <Select.Root
      items={opciones}
      value={valor === undefined ? seleccion : valor}
      onValueChange={(nuevo) => {
        if (valor === undefined) seleccionar(nuevo);
        if (nuevo !== null) alCambiar?.(nuevo);
      }}
      name={nombre}
      required={requerido}
      open={abierto}
      actionsRef={acciones}
      onOpenChange={(nuevo, detalles) => {
        if (!nuevo && permiteAnimar()) detalles.preventUnmountOnClose();
        abrir(nuevo);
      }}
    >
      <Select.Trigger id={id} ref={disparador} className="selector-trigger" onKeyDown={cancelar}>
        <Select.Value />
        <Select.Icon className="selector-icono" aria-hidden="true">
          ⌄
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="selector-posicion"
          sideOffset={8}
          align="start"
          alignItemWithTrigger={false}
        >
          <Opciones
            abierto={abierto}
            acciones={acciones}
            opciones={opciones}
            disparador={disparador}
            alCancelar={cancelar}
          />
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
