import { createContext, useContext } from 'react';
import * as base from './contenido.js';

const Contexto = createContext(base);
export function ContenidoPortal({ contenido, children }) {
  const valor = {
    ...base,
    talleres: [],
    avisos: [],
    ...contenido,
    institucion: { ...base.institucion, ...contenido?.institucion },
  };
  valor.correo = contenido?.institucion?.correo ?? base.correo;
  valor.mapa = contenido?.institucion?.mapa ?? base.mapa;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
export function useContenidoPortal() {
  return useContext(Contexto);
}
