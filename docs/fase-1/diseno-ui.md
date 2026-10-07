# Sistema visual del portal

El frame de Figma aporta la identidad y el contenido inicial. La disposición se adapta al contenido y al ancho disponible; las dimensiones del frame no son un requisito de implementación. Este criterio recoge la aclaración del usuario del 6 de octubre de 2026.

## Espaciado y estructura

- Unidad: 8 px. Los tokens de espaciado son 8, 16, 24, 32, 40, 48, 64 y 80 px.
- Contenedor compartido: hasta 1200 px. Márgenes laterales de 24 px y de 16 px en teléfonos.
- Cuadrícula: 12 columnas con separación de 24 px. Los bloques usan grupos de columnas; se apilan al reducirse el espacio.
- Separación entre título y texto: 8–16 px; entre bloques relacionados: 24–40 px; entre secciones: 48–80 px.
- Las secciones crecen con el texto. Las fotografías reservan espacio con `aspect-ratio` y usan `object-fit`; la posición absoluta se limita a la ilustración de portada y etiquetas superpuestas.
- Cambios principales a 640, 896 y 1120 px. El menú se compacta antes de que los enlaces de escritorio pierdan espacio.

Los grosores de borde y foco, proporciones de imagen, porcentajes y medidas tipográficas tienen funciones distintas del espaciado y no se fuerzan a ocho píxeles.

## Tipografía

Poppins se sirve desde el proyecto. La escala de encabezados aproxima una progresión de 1.25 con tamaños normalizados: 16, 20, 24, 32, 40 y 48 px. H1 usa 48 px en escritorio y 40 px en pantallas menores; H2 usa 32 px y H3 24 px. El texto de lectura usa 16 px y 150% de interlineado. Los encabezados usan 116–125%; las etiquetas cortas y metadatos usan 14 px.

Las medidas de fuente están en `rem` y respetan el tamaño base del navegador. Los párrafos amplios se limitan a 65–70 caracteres tipográficos; las columnas y teléfonos ajustan la longitud al espacio disponible. Los títulos no dependen de saltos de línea manuales.

## Color, forma y elevación

La distribución sigue el criterio 60/30/10 como guía de jerarquía: predominan superficies neutras cálidas, las superficies de soporte y las secciones oscuras agrupan información y el acento identifica acciones. No es una proporción de píxeles fija, porque cambia con el contenido y el viewport.

El vino de la marca se conserva como acento. Error, éxito, advertencia e información tienen tokens propios; el error usa un tono carmesí diferenciado del vino. Los textos secundarios mantienen contraste sobre sus superficies. Las tarjetas de áreas sitúan el texto sobre una superficie sólida, separado de la fotografía.

Los radios son 8 px para controles, 16 px para tarjetas y 24 px para destacados. Las sombras usan un tono oscuro de la paleta, desplazamiento hacia abajo y opacidad de 6% en tarjetas y 12% en el menú.

## Interacción

- Controles y enlaces accionables: mínimo 48 × 48 px, por encima del mínimo solicitado de 44 px.
- Estados: reposo, hover, active, foco visible y selección. El estado seleccionado combina color, borde y `aria-pressed`.
- Los estilos de `disabled` quedan definidos para controles nativamente deshabilitados. Los controles actuales no se deshabilitan sin una razón funcional.
- El menú móvil se cierra al elegir una sección, pulsar Escape, tocar fuera o ampliar a escritorio. Escape devuelve el foco al botón.
- Las anclas dejan margen para el encabezado persistente. El enlace para saltar al contenido aparece al recibir foco.
- En móvil hay enlaces al detalle para orientar después de elegir actividades o productos.
- Las listas de los programas se despliegan con `details`/`summary`, operables con teclado.
- Transiciones de color de 180 ms sin cambios de tamaño; se desactivan con movimiento reducido.

Las prácticas repetidas se consolidan en las dos entradas distintas proporcionadas. Las fotografías pendientes tienen una indicación explícita; no se inventa contenido institucional. La ficha de hamburguesa cuenta las cuatro especies realmente listadas, sin presentar el total de cinco variantes pendiente de aclaración. El icono social sin URL se sustituye por contacto.

Las comprobaciones realizadas y las limitaciones de la fase se registran en [estado.md](estado.md).
