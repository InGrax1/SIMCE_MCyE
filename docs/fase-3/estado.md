# Inicio de Fase 3

El primer incremento del núcleo operativo empieza el 7 de noviembre de 2026 con el catálogo privado del Módulo. El alcance de la fase abarca los requisitos M de RF-4 a RF-9 de la especificación v0.2. Sus hitos son el cierre de una remisión con PDF validado y una jornada completa sin conexión que se sincronice sin perder datos.

## Catálogo operativo y precios

Responsable y administrador pueden mantener líneas, especies, destinos, productos y precios. El operador puede consultar el catálogo desde Operación. La API permite lectura de productos a los roles internos y reserva la consulta por PLU a los roles operativos. Cada modificación registra autor y recurso en la bitácora.

| Ruta bajo `/api/v1`                       | Contrato                                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /catalogos-operativos`               | Devuelve líneas, especies y destinos con UUID, nombre, estado y versión.                                                                 |
| `POST /catalogos-operativos/:tipo`        | Recibe `nombre`. Los tipos son `lineas`, `especies` y `destinos`.                                                                        |
| `PATCH /catalogos-operativos/:tipo/:uuid` | Recibe `nombre`, `activo` y `version`.                                                                                                   |
| `GET /productos?fecha=AAAA-MM-DD`         | Lista productos e indica el precio aplicable en la fecha. Por defecto usa el día de Ciudad de México.                                    |
| `GET /productos/plu/:plu`                 | Devuelve el producto activo y su precio vigente, si existe.                                                                              |
| `POST /productos`                         | Recibe `nombre`, `linea_uuid`, `especie_uuid`, `presentacion` y `plu`. La unidad operativa es kg.                                        |
| `PATCH /productos/:uuid`                  | Recibe nombre, línea, especie, presentación, `activo` y `version`. Conserva el PLU.                                                      |
| `GET /productos/:uuid/precios`            | Lista vigencias históricas, actuales y futuras con sus UUID.                                                                             |
| `POST /productos/:uuid/precios`           | Recibe `precio_kg_centavos` entero positivo y `vigente_desde`. Para fechas pasadas requiere `motivo` y `revision_documentos` afirmativa. |

El PLU se conserva como texto para mantener ceros iniciales. La clave genérica `000000` queda reservada y se comprueban seis dígitos con el perfil inicial de fase 0. Un PLU queda asociado a su producto aunque se desactive. La fecha final de cada precio se deriva del siguiente inicio. Se admite una vigencia por producto y día. La fecha y el importe de un precio registrado permanecen fijos. En el panel, el precio vigente sirve como referencia de catálogo. El escaneo posterior deberá conservar la versión del precio de etiquetado verificado.

MySQL almacena el catálogo en tablas operativas relacionadas por UUID. Aplica las migraciones antes de iniciar una instancia MySQL. Cada escritura guarda el cambio y la auditoría en la misma transacción. La revisión local con `npm run dev:fase1` conserva los registros en el almacén de archivos de la instancia. Los datos se dan de alta desde **Operación** con una cuenta administradora o responsable. El catálogo operativo arranca vacío y se administra por separado de las fichas del portal público.

## Validación local

- `npm run check` y `npm run build` aprobaron 99 pruebas generales, análisis estático, formato y compilación.
- `npm run check:mysql-local -- --solo-integracion` aplicó las migraciones en una base temporal y verificó altas concurrentes de PLU y vigencias, consulta histórica, permisos y auditoría.
- En Chromium se comprobó el alta de líneas, especies, destinos y productos, el registro de precio como administrador y la consulta de solo lectura como operador. Se comprobó el panel a 1366 y 320 px sin desbordamiento ni infracciones graves o críticas de axe.
- La regresión de Fase 1 aprobó 13 recorridos y nueve controles de accesibilidad. La de Fase 2 aprobó 18 recorridos y 18 controles. `npm run prototype` conservó el folio al reintentar la sincronización del cierre sintético.

## Trabajo posterior

- Confirmar las claves, el modelo y formato de la báscula y el dispositivo de trabajo antes de probar lecturas físicas o exportar para el instrumento.
- Recibir del Módulo los productos, destinos, precios y existencias iniciales para la carga operativa.
- Continuar con lotes y movimientos de inventario, remisiones, escaneo, reportes y operación sin conexión. La aceptación del PDF oficial y los ensayos presenciales forman parte de los hitos de la fase.
