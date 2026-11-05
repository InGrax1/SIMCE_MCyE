# Ajustes de UI sobre el diseño de Figma

La referencia es [CEA, frame 1:3](https://www.figma.com/design/Rw9Bb37khwyJnL2wUEjK89/CEA?node-id=1-3). El usuario aclaró que requiere corregir y adaptar ese diseño, conservando su identidad y composición. La implementación recupera la primera versión y sustituye el rediseño que había cambiado sus superficies, proporciones y tarjetas.

## Identidad que se conserva

- Portada negra, título grande de tres líneas, tonos rojo/naranja, ilustración, hierbas y bloque de FES Cuautitlán.
- Encabezado vino y fuentes Poppins.
- Separadores de papel rasgado y alternancia original de fondos claros y oscuros.
- Texto superpuesto a fotografías en áreas, panel vino de procesos y tarjetas blancas.
- Mosaico de prácticas con tarjetas anchas, miniaturas fotográficas del catálogo y galería de ocho espacios con la distribución original.
- Tarjetas de servicio social con sus listas visibles y composición original de contacto y pie.

Las imágenes y SVG originales permanecen como recursos locales. La decoración mantiene sus proporciones; sus medidas no se fuerzan a una cuadrícula de espaciado.

## Mejoras limitadas

La composición del contenido conserva un ancho máximo de 1440 px; los fondos, separadores y encabezado cubren toda la pantalla para evitar franjas laterales blancas en monitores grandes. Los márgenes adicionales centran las áreas de lectura, tarjetas y elementos de portada. Las luces ambientales se extienden hasta los bordes sin cortes en el límite del contenido. Las cuadrículas de áreas y prácticas usan doce columnas, agrupadas para conservar las tres tarjetas de áreas y las cuatro columnas del mosaico en escritorio. El espaciado entre controles y bloques relacionados se normaliza a 8, 16, 24, 32, 48 o 64 px donde no altera la composición.

Se mantienen los tamaños expresivos de portada y títulos. El texto de lectura usa al menos 16 px con interlineado de 150%; las notas y etiquetas cortas usan al menos 14 px. Las fuentes están en `rem`. Los párrafos dejan de justificarse para evitar espacios irregulares, y las tarjetas crecen cuando aumenta el texto. Las sombras del catálogo y contacto usan vino oscuro con baja opacidad.

Las áreas conservan el texto sobre la imagen, con un degradado oscuro detrás para asegurar legibilidad. Las miniaturas mantienen sus fotografías y números, con soporte oscuro detrás del texto. Se ajustan los contrastes que detecta axe usando los colores de la misma paleta. Los colores semánticos tienen tokens separados del acento de marca; la regla de distribución de color no sustituye los fondos originales.

Los botones y enlaces accionables tienen áreas de al menos 48 × 48 px. Se definen hover, active, foco y selección sin mover el layout, además del estilo de controles nativamente deshabilitados. La selección se expone con `aria-pressed`, borde reforzado y color. Las transiciones de 180 ms se desactivan con movimiento reducido.

Las áreas de cada actividad son indicadores estáticos en una lista, sin enlaces ni foco de teclado. Se resaltan únicamente las áreas asociadas a la actividad seleccionada mediante color, peso tipográfico y una marca de verificación; el texto para lectores de pantalla identifica «Se realiza en». La decoración lateral se aparta de los textos de actividades en escritorio.

Las fichas de productos comparten una cuadrícula que reserva el espacio del contenido más alto, incluyendo el efecto de ancho disponible y tamaño de fuente. Solo la ficha seleccionada es visible y accesible; las otras permanecen con `visibility: hidden`, `aria-hidden` e `inert` para conservar la medida sin exponer enlaces al teclado. La imagen ocupa un marco independiente de su proporción natural, con `object-fit: cover`. Cambiar de producto mantiene estables la altura de la tarjeta y la posición del selector, sin recortar textos ni usar scroll interno. En móvil el marco fotográfico se adapta entre 192 y 320 px y el detalle crece con el texto.

«Explora más opciones» conserva su tarjeta del mosaico, con un título de 24 px, una descripción de 16 px y una línea de contacto con flecha de 32 px. El texto se lee como una frase, con alineación a la izquierda y espaciado uniforme; toda la tarjeta sigue enlazando a contacto.

El menú móvil se cierra al navegar, pulsar Escape, tocar fuera o volver a escritorio; Escape devuelve el foco al botón. El encabezado persistente publica su altura real para que las anclas y el foco no queden detrás de él. El enlace para saltar al contenido aparece al navegar con teclado.

## Adaptación de pantallas pequeñas

Hasta 1100 px se compacta el menú y se reorganizan las cuadrículas. Hasta 800 px la portada pone el texto, ilustración, enlaces y bloque institucional en filas independientes; esto evita que el crecimiento del texto se solape con la imagen. Áreas, actividades, programas y contacto se apilan cuando falta espacio. En teléfonos, las prácticas se presentan en una columna y el catálogo en dos, conservando sus estilos.

Las pruebas cubren 320–1920 px y texto ampliado al 200% en móvil, tableta y escritorio. La revisión del 2026-10-07 comprueba los ocho productos en once anchos y ambos tamaños de texto: la tarjeta y el selector mantienen sus medidas y posiciones al cambiar de producto, sin desbordamiento. También se verifica que solo una ficha sea visible/accesible y que los indicadores de áreas no contengan controles. El informe y las capturas están en `artifacts/`, excluido de Git. No se considera una auditoría manual completa de accesibilidad.

Los espacios vacíos de prácticas y galería se completan con imágenes de referencia y leyendas; las nueve prácticas tienen temas y descripciones diferentes, conservando el mosaico. Los selectores de actividades y productos presentan fichas completas con contenido orientativo para revisión institucional. La ficha de hamburguesa cuenta las cuatro especies listadas; el total de cinco variantes de la referencia queda pendiente de aclaración.

Las animaciones de Anime.js 4.5.0 coordinan la entrada de título, descripción, botones e imagen de portada en una secuencia de aproximadamente 1,1 segundos. Los títulos de sección aparecen con un desplazamiento de 8 px desde arriba que conserva la separación con sus párrafos. Las tarjetas combinan opacidad, escala de 98,5% a 100% y desplazamiento de 32 px en escritorio o 16 px en móvil; el escalonado tiene un máximo de 270 ms para evitar esperas largas. Las fotografías de áreas y galería se acercan ligeramente y vuelven a su tamaño original durante 1050 ms.

Las fichas cambian durante 450 ms y sus imágenes acompañan la transición con un zoom de 2,5% durante 700 ms. Las flechas de los botones recorren 4 px al pasar el cursor o navegar con teclado, usando Anime.js; el hover se limita a punteros precisos. Las curvas `outCubic` desaceleran de forma continua, sin rebotes. Las entradas ocurren una vez al entrar en pantalla y no hay bucles decorativos. React limpia los efectos y eventos al desmontar o cambiar de ficha; activar movimiento reducido durante la sesión cancela los efectos y restaura sus estilos. El contenido sigue visible sin JavaScript.

El detalle del contenido y la imagen generada está en [contenido-animaciones.md](contenido-animaciones.md). Los demás pendientes funcionales se detallan en [estado.md](estado.md).

## Refinamientos visuales con skills — 2026-11-05

El experimento se realiza en `refactor/ajustes-visuales-skills`, desde `f846a13`, conservando la rama `main`. El árbol de trabajo estaba limpio al iniciar y el remoto no tenía commits pendientes de incorporar.

Se consultaron `emil-design-eng` y la guía de UI de [Emil Kowalski](https://github.com/emilkowalski/skills/tree/c8a79627b59d72d764d6ab6f2c87c09a48169833), junto con `design-taste-frontend` 2.5.0 y sus referencias de sistema y tipografía de [Taste](https://github.com/Leonxlnx/taste-skill/tree/9b4bf937a1f69348126959c15d2f99a73e65699b). La conservación del diseño existente tiene prioridad frente a las reglas de esas referencias que exigen sustituir fuentes, colores, composición, componentes o animaciones.

Los cambios quedan limitados al CSS del portal:

- Los títulos de sección usan un espaciado entre letras de `-0.015em`, conservando sus tamaños, pesos e interlineados. La portada y los títulos del pie mantienen su tratamiento anterior.
- La descripción de portada se separa por 24 px; sus botones usan 32 px entre sí y 48 px respecto al texto en escritorio. Se mantienen los ajustes específicos de pantallas pequeñas.
- Los títulos de la cronología ganan 8 px arriba y abajo. La descripción de actividad se separa 16 px de su título. Ambos programas de servicio social usan 32 px entre cabecera y título, y 8 px entre subtítulos y listas.
- Los párrafos extensos de procesos, prácticas, talleres y las introducciones centradas de productos y galería tienen un máximo de `65ch`. La galería conserva 24 px de margen interior para su descripción en móvil.

Se conservan textos, imágenes, enlaces, estructura, componentes, paleta, familia tipográfica, navegación, selectores y animaciones. Las alturas de las secciones pueden crecer con los saltos de línea, como ya permite el diseño adaptable.

La revisión compara la estructura y la identidad antes y después, mide diez anchos entre 320 y 1920 px con texto al 100% y 200%, y comprueba las ocho fichas de productos a 390, 768 y 1440 px. El catálogo mantiene exactamente sus alturas iniciales y el menú conserva el cierre con Escape y la devolución del foco. Las capturas de Taste se interpretan junto con la visibilidad real de las imágenes: los recursos de fichas ocultas con carga diferida no se consideran imágenes visibles rotas.

La verificación general, el formato y la compilación pasan con Node 24.22.1: 50 pruebas aprobadas y dos pruebas de integración MySQL omitidas por su configuración condicional. La validación integrada de Fase 1 pasa sus flujos y ocho revisiones de accesibilidad sin incidencias graves o críticas. Lighthouse registra LCP de 1941 ms, rendimiento de 97/100 y accesibilidad de 100/100 en la simulación móvil/4G local. Estas mediciones corresponden al equipo de revisión, sin validar el alojamiento institucional.
