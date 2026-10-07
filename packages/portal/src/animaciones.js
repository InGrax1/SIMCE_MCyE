import { useEffect } from 'react';
import { animate, createScope, stagger } from 'animejs';

const preferencias = { reducirMovimiento: '(prefers-reduced-motion: reduce)' };

export function useAnimacionesPortal(raiz) {
  useEffect(() => {
    const elemento = raiz.current;
    const alcance = createScope({ root: elemento, mediaQueries: preferencias }).add((self) => {
      if (self.matches.reducirMovimiento) return;

      animate('.hero-contenido > *', {
        opacity: [0.6, 1],
        y: [16, 0],
        duration: 600,
        delay: stagger(100),
        ease: 'out(3)',
      });

      self.add('revelar', (tarjetas) => {
        animate(tarjetas, {
          opacity: [0.6, 1],
          y: [24, 0],
          duration: 550,
          delay: stagger(64),
          ease: 'out(3)',
        });
      });

      const observador = new IntersectionObserver(
        (entradas) => {
          const visibles = entradas.filter((entrada) => entrada.isIntersecting);
          if (!visibles.length) return;
          self.methods.revelar(visibles.map((entrada) => entrada.target));
          visibles.forEach((entrada) => observador.unobserve(entrada.target));
        },
        { threshold: 0.12 },
      );
      elemento
        .querySelectorAll(
          '.cronologia article, .area-card, .procesos-grid article, .practica, .programas-grid article, .galeria-espacio',
        )
        .forEach((tarjeta) => observador.observe(tarjeta));

      // Anime.js ejecuta esta limpieza al cambiar la preferencia o desmontar React.
      return () => observador.disconnect();
    });

    return () => alcance.revert();
  }, [raiz]);
}

export function useTransicionFicha(raiz, seleccion) {
  useEffect(() => {
    const alcance = createScope({ root: raiz.current, mediaQueries: preferencias }).add((self) => {
      if (self.matches.reducirMovimiento) return;
      animate(raiz.current, {
        opacity: [0.65, 1],
        y: [8, 0],
        duration: 300,
        ease: 'out(3)',
      });
    });
    return () => alcance.revert();
  }, [raiz, seleccion]);
}
