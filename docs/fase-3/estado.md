# Núcleo operativo de Fase 3

La implementación local del alcance obligatorio de RF-4 a RF-9 de la especificación v0.2 está integrada en `feature/fase-3`. El catálogo inició el 7 de noviembre de 2026. La revisión técnica del núcleo operativo se ejecutó el 8 de noviembre con datos sintéticos.

| Área                    | Disponible en el panel                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo y precios      | Alta y desactivación de productos, líneas, especies y destinos. PLU reservado de forma permanente. Precios inmutables por vigencia y aviso de precio faltante. Lista para programación manual y comprobación del PLU por lectura. |
| Producción e inventario | Lotes y correcciones, aperturas, mermas, ajustes y devoluciones. Cada corrección de peso conserva la entrada, su reversión y la cantidad corregida. La existencia por fecha se deriva del kardex.                                 |
| Remisiones              | Borrador con fecha, destino y folio en papel. Renglones por teclado, cámara o captura manual. Partidas por producto y versión de precio, cierre, cancelación con reversión y consulta histórica.                                  |
| Documentos              | PDF provisional descargable sin red. Confirmación del servidor con folio definitivo por año del envío. Ambos archivos se conservan con versión y SHA-256 y se pueden volver a descargar.                                          |
| Reportes                | Producción por producto, línea, especie o área. Salidas por destino, producto o línea. Existencias a la fecha, mermas por motivo y remisiones canceladas. Consulta, CSV y PDF con encabezado institucional.                       |
| Continuidad             | PWA, réplica por cuenta, cola por UUID, sincronización al reconectar, revisión de conflictos y respaldo local versionado de pendientes y PDF provisionales.                                                                       |

## Prueba local

1. Con Node.js 24, ejecuta `npm ci`, `npm run build` y `npm run dev:fase1`. Abre el panel en `http://127.0.0.1:3080/panel/`. Si el navegador ya tiene instalada la versión anterior, cierra sus pestañas y abre el panel con conexión para que se active la versión nueva.
2. Con una cuenta responsable o administradora, entra a **Operación → Catálogo** y crea una línea, una especie, un destino, un producto y un precio. El catálogo operativo se administra por separado del portal público. La base inicia vacía. Para un ensayo, usa el PLU `010101`, un precio de `185.00` MXN/kg y el código `2010101086955`. La lectura verificada produce `0.470 kg` y `$86.95`.
3. Desde **Operación**, espera la primera sincronización y elige **Preparar dispositivo**. Instala el panel desde el navegador si vas a usarlo en modo aplicación. La preparación admite el acceso local de esa cuenta durante 72 horas. El dispositivo debe estar bajo control de la persona operadora. Al cerrar sesión se bloquea el acceso local y se conserva la cola para el próximo ingreso autorizado.
4. En **Inventario**, registra un lote y verifica el kardex. Responsable y administrador también pueden registrar apertura al corte y ajustes de ambos signos. Para una merma, ajuste o cancelación se pide el motivo.
5. En **Remisiones**, crea un borrador y captura sus renglones. Enfoca el campo EAN-13 para usar el lector HID o elige **Leer con cámara**. Usa el precio verificado en la etiqueta o registro de etiquetado. Si conservas un peso e importe manuales con precio pendiente, completa la verificación antes de cerrar. Para la cámara se requiere un origen seguro y permiso del dispositivo.
6. Cierra la remisión y descarga el PDF provisional. Tras reconectar, comprueba el folio definitivo y las salidas en el kardex. En **Por revisar**, responsable y administrador pueden registrar la resolución conservando la versión del servidor y, cuando proceda, capturar un cambio nuevo desde la versión vigente.
7. En **Respaldo**, exporta las operaciones pendientes o rechazadas y sus PDF provisionales. Para restaurar, abre la misma cuenta con el catálogo descargado, selecciona el archivo y revisa la vista previa. El límite por archivo es de 20 MB. Los UUID idénticos se deduplican y las versiones distintas se conservan para revisión. El respaldo de pendientes se guarda en un lugar de acceso restringido.

## Persistencia e integración

El modo local integrado guarda en archivos y usa una sola instancia. Para MySQL se aplican las migraciones con `npm run migrate --workspace @simce/api` bajo el entorno configurado. Los registros operativos, recibos, conflictos, eventos de réplica y PDF tienen almacenamiento propio. Un cierre guarda el folio, los movimientos, los archivos y la bitácora en la misma transacción.

- `POST /api/v1/sync/push` recibe `operaciones`, hasta 500 por petición, y devuelve un resultado por UUID. El cliente usa lotes de 30. Cada comando lleva autor, dispositivo, agregado, versión base y secuencia. El cierre depende de que el servidor acepte los cambios previos del borrador.
- `GET /api/v1/sync/pull` devuelve páginas por cursor y la versión del catálogo. El dispositivo confirma el cursor después de guardar la página en IndexedDB. Los cambios del borrador transmiten altas y bajas de renglón sin repetir la remisión completa. Una remisión admite hasta 2 000 renglones.
- `POST /api/v1/escaneos/decodificar` identifica la etiqueta y valida la versión de precio verificada. `GET /api/v1/productos/:uuid/precios/:precioUuid` consulta esa versión histórica.
- `GET /api/v1/remisiones` filtra por fechas, destino, producto y estado. `GET /api/v1/operacion/documentos/:uuid/pdf` entrega el archivo conservado. `GET /api/v1/reportes/:tipo` consulta o exporta con `formato=csv` o `formato=pdf`.

El perfil de prueba usa EAN-13 con prefijo `2`, seis dígitos de PLU, cinco de importe y resolución de 5 g. Para aplicar otro perfil, configura `BASCULA_VERSION`, `BASCULA_PREFIJO`, `BASCULA_PLU_DIGITOS`, `BASCULA_IMPORTE_DIGITOS` y `BASCULA_RESOLUCION_GRAMOS`. Cada renglón escaneado identifica el perfil empleado. La plantilla carta `envio-carta-v1` usa 25 renglones por columna y hasta tres partidas por hoja. Un mismo generador versionado produce los archivos en el navegador y el servidor.

## Validación local del 8 de noviembre de 2026

- `npm run check` aprobó 104 pruebas generales, formato, análisis estático y revisión del repositorio. `npm run build` compiló API, panel y portal.
- `npm run check:fase3` probó una remisión y un lote sin red, EAN-13 por teclado y cámara sintética, captura manual, respaldo, recarga, reconexión, folio, dos salidas y reportes CSV/PDF. El SHA-256 del provisional del navegador coincidió con el archivo del servidor. Pasó axe sin incidencias graves o críticas a 320 y 1366 px.
- `npm run check:mysql-local` pasó 13 pruebas del conjunto de integración y restauró un respaldo cifrado verificando también los registros y archivos PDF operativos. La prueba de cola reanudó 511 operaciones simuladas después de perder una respuesta.
- Se revisaron las tres hojas de una remisión de prueba con partidas de 60, 40 y 20 renglones. Pasaron el prototipo y las regresiones de Fase 1 y 2, con 13 y 18 recorridos respectivamente.

## Aceptación institucional pendiente

- Recibir y validar el formato oficial de Lista de Envío y el procedimiento de firma durante la transición con el papel. El PDF actual usa una plantilla de prueba identificada en el documento.
- Confirmar la báscula, su perfil y resolución con etiquetas reales, y probar el lector, la cámara y la impresora del dispositivo de trabajo.
- Cargar el catálogo, destinos, precios, existencias de apertura y el corte autorizados por el Módulo. Verificar la numeración inicial si debe continuar una serie institucional.
- Ejecutar la prueba de volumen en staging y la jornada presencial en paralelo con el papel, incluyendo impresión, conciliación por renglón y sincronización después de operar sin red.
