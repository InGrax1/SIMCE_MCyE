import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate } from 'animejs';

const consultaMovimiento = '(prefers-reduced-motion: reduce)';
const duracion = { entrada: 240, salida: 160 };

export function permiteAnimar() {
  return (
    !window.matchMedia(consultaMovimiento).matches &&
    document.documentElement.dataset.entrada !== 'teclado'
  );
}

function limpiarFicha(elemento) {
  elemento.removeAttribute('data-saliendo');
  elemento.style.removeProperty('opacity');
  elemento.style.removeProperty('transform');
}

export function useInteraccionesPortal() {
  useEffect(() => {
    const raiz = document.documentElement;
    const entradaAnterior = raiz.dataset.entrada;
    const usarTeclado = () => {
      raiz.dataset.entrada = 'teclado';
    };
    const usarPuntero = () => {
      raiz.dataset.entrada = 'puntero';
    };
    document.addEventListener('keydown', usarTeclado, true);
    document.addEventListener('pointerdown', usarPuntero, true);
    return () => {
      document.removeEventListener('keydown', usarTeclado, true);
      document.removeEventListener('pointerdown', usarPuntero, true);
      if (entradaAnterior === undefined) delete raiz.dataset.entrada;
      else raiz.dataset.entrada = entradaAnterior;
    };
  }, []);
}

export function useTransicionFicha(raiz, seleccion) {
  const anterior = useRef(seleccion);
  const capas = useRef(new Set());
  const animaciones = useRef(new Map());
  useLayoutEffect(() => {
    const actual = raiz.current;
    if (!actual) return;
    const cambio = anterior.current !== seleccion;
    anterior.current = seleccion;
    animaciones.current.forEach((animacion) => animacion.cancel());
    animaciones.current.clear();
    if (!cambio || !permiteAnimar()) {
      capas.current.forEach(limpiarFicha);
      capas.current = new Set([actual]);
      limpiarFicha(actual);
      return;
    }

    // Cancelar conserva los valores actuales: una segunda selección no vuelve al inicio.
    const retomar = capas.current.has(actual);
    capas.current.forEach((capa) => {
      if (capa === actual) return;
      capa.dataset.saliendo = '';
      animaciones.current.set(
        capa,
        animate(capa, {
          opacity: 0,
          y: -4,
          duration: duracion.salida,
          ease: 'outCubic',
          onComplete: () => {
            limpiarFicha(capa);
            capas.current.delete(capa);
            animaciones.current.delete(capa);
          },
        }),
      );
    });
    actual.removeAttribute('data-saliendo');
    if (!retomar) {
      actual.style.opacity = '0';
      actual.style.transform = 'translateY(6px)';
    }
    capas.current.add(actual);
    animaciones.current.set(
      actual,
      animate(actual, {
        opacity: 1,
        y: 0,
        duration: duracion.entrada,
        ease: 'outCubic',
        onComplete: () => {
          limpiarFicha(actual);
          animaciones.current.delete(actual);
        },
      }),
    );
  }, [raiz, seleccion]);

  useEffect(() => {
    const preferencia = window.matchMedia(consultaMovimiento);
    const terminar = () => {
      animaciones.current.forEach((animacion) => animacion.cancel());
      animaciones.current.clear();
      capas.current.forEach(limpiarFicha);
      capas.current.clear();
      if (raiz.current) capas.current.add(raiz.current);
    };
    preferencia.addEventListener('change', terminar);
    return () => {
      preferencia.removeEventListener('change', terminar);
      terminar();
    };
  }, [raiz]);
}

export function usePanelAnimado(raiz, abierto, alCerrar) {
  const animacion = useRef(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;
  useLayoutEffect(() => {
    const panel = raiz.current;
    if (!panel) return;
    const retomar = Boolean(animacion.current);
    animacion.current?.cancel();
    if (!permiteAnimar()) {
      limpiarFicha(panel);
      animacion.current = null;
      if (!abierto) cerrar.current?.();
      return;
    }
    if (abierto && !retomar) {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(-6px) scale(0.98)';
    }
    animacion.current = animate(panel, {
      opacity: abierto ? 1 : 0,
      y: abierto ? 0 : -4,
      scale: abierto ? 1 : 0.98,
      duration: abierto ? 220 : duracion.salida,
      ease: 'outCubic',
      onComplete: () => {
        animacion.current = null;
        limpiarFicha(panel);
        if (!abierto) cerrar.current?.();
      },
    });
  }, [raiz, abierto]);

  useEffect(() => {
    const panel = raiz.current;
    const preferencia = window.matchMedia(consultaMovimiento);
    const terminar = () => {
      animacion.current?.complete();
    };
    preferencia.addEventListener('change', terminar);
    return () => {
      preferencia.removeEventListener('change', terminar);
      animacion.current?.cancel();
      if (panel) limpiarFicha(panel);
    };
  }, [raiz]);
}

export function useGaleriaAnimada() {
  const raiz = useRef(null);
  const animacion = useRef(null);
  const destino = useRef(false);
  const terminar = () => {
    const elemento = raiz.current;
    if (!elemento) return;
    elemento.open = destino.current;
    elemento.style.removeProperty('height');
    elemento.style.removeProperty('overflow');
    elemento.querySelector('summary').removeAttribute('aria-expanded');
    const fotos = elemento.querySelector('.area-galeria-fotos');
    fotos.inert = false;
    fotos.style.removeProperty('opacity');
    animacion.current = null;
  };
  const alternar = (evento) => {
    evento.preventDefault();
    const elemento = raiz.current;
    destino.current = !(animacion.current ? destino.current : elemento.open);
    const altoActual = elemento.getBoundingClientRect().height;
    animacion.current?.cancel();
    if (!permiteAnimar()) {
      terminar();
      return;
    }
    const resumen = elemento.querySelector('summary');
    const fotos = elemento.querySelector('.area-galeria-fotos');
    elemento.open = true;
    elemento.style.height = 'auto';
    const bordes =
      parseFloat(getComputedStyle(elemento).borderTopWidth) +
      parseFloat(getComputedStyle(elemento).borderBottomWidth);
    const altoDestino = destino.current
      ? elemento.getBoundingClientRect().height
      : resumen.getBoundingClientRect().height + bordes;
    elemento.style.height = `${altoActual}px`;
    elemento.style.overflow = 'hidden';
    resumen.setAttribute('aria-expanded', String(destino.current));
    fotos.inert = !destino.current;
    // Solo el acordeón anima altura: mantiene el contenido real y el scroll del documento.
    animacion.current = animate(elemento, {
      height: altoDestino,
      duration: destino.current ? 240 : 180,
      ease: 'outCubic',
      onComplete: terminar,
    });
  };
  useEffect(() => {
    const preferencia = window.matchMedia(consultaMovimiento);
    const finalizar = () => {
      if (animacion.current) {
        animacion.current.cancel();
        terminar();
      }
    };
    preferencia.addEventListener('change', finalizar);
    return () => {
      preferencia.removeEventListener('change', finalizar);
      animacion.current?.cancel();
    };
  }, []);
  return { raiz, alternar };
}
