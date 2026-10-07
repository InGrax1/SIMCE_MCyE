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

El ancho máximo sigue siendo 1440 px. Las cuadrículas de áreas y prácticas usan doce columnas, agrupadas para conservar las tres tarjetas de áreas y las cuatro columnas del mosaico en escritorio. El espaciado entre controles y bloques relacionados se normaliza a 8, 16, 24, 32, 48 o 64 px donde no altera la composición.

Se mantienen los tamaños expresivos de portada y títulos. El texto de lectura usa al menos 16 px con interlineado de 150%; las notas y etiquetas cortas usan al menos 14 px. Las fuentes están en `rem`. Los párrafos dejan de justificarse para evitar espacios irregulares, y las tarjetas crecen cuando aumenta el texto. Las sombras del catálogo y contacto usan vino oscuro con baja opacidad.

Las áreas conservan el texto sobre la imagen, con un degradado oscuro detrás para asegurar legibilidad. Las miniaturas mantienen sus fotografías y números, con soporte oscuro detrás del texto. Se ajustan los contrastes que detecta axe usando los colores de la misma paleta. Los colores semánticos tienen tokens separados del acento de marca; la regla de distribución de color no sustituye los fondos originales.

Los botones y enlaces accionables tienen áreas de al menos 48 × 48 px. Se definen hover, active, foco y selección sin mover el layout, además del estilo de controles nativamente deshabilitados. La selección se expone con `aria-pressed`, borde reforzado y color. Las transiciones de 180 ms se desactivan con movimiento reducido.

El menú móvil se cierra al navegar, pulsar Escape, tocar fuera o volver a escritorio; Escape devuelve el foco al botón. El encabezado persistente publica su altura real para que las anclas y el foco no queden detrás de él. El enlace para saltar al contenido aparece al navegar con teclado.

## Adaptación de pantallas pequeñas

Hasta 1100 px se compacta el menú y se reorganizan las cuadrículas. Hasta 800 px la portada pone el texto, ilustración, enlaces y bloque institucional en filas independientes; esto evita que el crecimiento del texto se solape con la imagen. Áreas, actividades, programas y contacto se apilan cuando falta espacio. En teléfonos, las prácticas se presentan en una columna y el catálogo en dos, conservando sus estilos.

Las pruebas cubren 320–1920 px y texto ampliado al 200% en móvil, tableta y escritorio. El informe y las capturas están en `artifacts/`, excluido de Git. No se considera una auditoría manual completa de accesibilidad.

Las repeticiones y fotografías pendientes del frame siguen visibles hasta recibir contenidos institucionales. La ficha de hamburguesa cuenta las cuatro especies listadas; el total de cinco variantes de la referencia queda pendiente de aclaración. Los demás pendientes funcionales se detallan en [estado.md](estado.md).
