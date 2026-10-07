import { useEffect } from 'react';
import { animate, createAnimatable, createScope, createTimeline, stagger } from 'animejs';

const preferencias = { reducirMovimiento: '(prefers-reduced-motion: reduce)' };

export function useAnimacionesPortal(raiz) {
  useEffect(() => {
    const elemento = raiz.current;
    const alcance = createScope({ root: elemento, mediaQueries: preferencias }).add((self) => {
      if (self.matches.reducirMovimiento) return;

      const compacto = () => window.matchMedia('(max-width: 800px)').matches;
      createTimeline({ defaults: { ease: 'outCubic' } })
        .add(
          '.hero-contenido h1',
          {
            opacity: [0.35, 1],
            y: [compacto() ? 16 : 24, 0],
            scale: [0.99, 1],
            duration: 850,
          },
          0,
        )
        .add(
          '.hero-descripcion',
          {
            opacity: [0.45, 1],
            y: [16, 0],
            duration: 750,
          },
          120,
        )
        .add(
          '.hero-botones > a',
          {
            opacity: [0.5, 1],
            y: [16, 0],
            duration: 700,
            delay: stagger(100),
          },
          240,
        )
        .add(
          '.hero-carne',
          {
            opacity: [0.35, 1],
            scale: [0.96, 1],
            y: [16, 0],
            duration: 1050,
          },
          80,
        );

      self.add('revelar', (tarjetas) => {
        animate(tarjetas, {
          opacity: [0.5, 1],
          y: [compacto() ? 16 : 32, 0],
          scale: [0.985, 1],
          duration: 750,
          delay: (_, i) => Math.min(i, 3) * 90,
          ease: 'outCubic',
        });
        const fotos = tarjetas.flatMap((tarjeta) => [
          ...tarjeta.querySelectorAll('.area-card > img, .galeria-espacio > img'),
        ]);
        if (fotos.length)
          animate(fotos, {
            scale: [1.035, 1],
            duration: 1050,
            ease: 'outCubic',
          });
      });

      self.add('presentarTitulos', (titulos) => {
        animate(titulos, {
          opacity: [0.6, 1],
          y: [-8, 0],
          duration: 700,
          ease: 'outCubic',
        });
      });

      const observador = new IntersectionObserver(
        (entradas) => {
          const visibles = entradas.filter((entrada) => entrada.isIntersecting);
          if (!visibles.length) return;
          const titulos = visibles.filter((entrada) => entrada.target.tagName === 'H2');
          const tarjetas = visibles.filter((entrada) => entrada.target.tagName !== 'H2');
          if (titulos.length)
            self.methods.presentarTitulos(titulos.map((entrada) => entrada.target));
          if (tarjetas.length) self.methods.revelar(tarjetas.map((entrada) => entrada.target));
          visibles.forEach((entrada) => observador.unobserve(entrada.target));
        },
        { threshold: 0.12 },
      );
      elemento
        .querySelectorAll(
          '.seccion h2, .cronologia article, .area-card, .procesos-grid article, .practica, .programas-grid article, .galeria-espacio, .contacto-tarjeta',
        )
        .forEach((tarjeta) => observador.observe(tarjeta));

      const limpiarBotones = [...elemento.querySelectorAll('.boton')].flatMap((boton) => {
        const icono = boton.querySelector('.flecha, .flecha-correo');
        if (!icono) return [];
        const flecha = createAnimatable(icono, { x: 240, ease: 'outCubic' });
        const actualizar = () => {
          const cursor =
            window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
            boton.matches(':hover');
          flecha.x(cursor || boton.matches(':focus-visible') ? 4 : 0);
        };
        const eventos = ['pointerenter', 'pointerleave', 'focus', 'blur'];
        eventos.forEach((evento) => boton.addEventListener(evento, actualizar));
        return [() => eventos.forEach((evento) => boton.removeEventListener(evento, actualizar))];
      });

      // Anime.js ejecuta esta limpieza al cambiar la preferencia o desmontar React.
      return () => {
        observador.disconnect();
        limpiarBotones.forEach((limpiar) => limpiar());
      };
    });

    return () => alcance.revert();
  }, [raiz]);
}

export function useTransicionFicha(raiz, seleccion) {
  useEffect(() => {
    const alcance = createScope({ root: raiz.current, mediaQueries: preferencias }).add((self) => {
      if (self.matches.reducirMovimiento) return;
      animate(raiz.current, {
        opacity: [0.6, 1],
        y: [12, 0],
        duration: 450,
        ease: 'outCubic',
      });
      const foto =
        raiz.current.querySelector('.actividad-foto img') ??
        raiz.current.closest('.producto-destacado')?.querySelector('figure > img');
      if (foto)
        animate(foto, {
          opacity: [0.5, 1],
          scale: [1.025, 1],
          duration: 700,
          ease: 'outCubic',
        });
    });
    return () => alcance.revert();
  }, [raiz, seleccion]);
}
