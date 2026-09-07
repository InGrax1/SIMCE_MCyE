# Revisión de la especificación SIMCE v0.1

Fecha de revisión: 5 de septiembre de 2026.

Fuente: `Especificacion_SIMCE_MCyE_v0.1.docx`, leído íntegramente, incluidas las tablas y los anexos. Las referencias §, RF, RN, CP y ADR corresponden a ese documento.

## Dictamen

**El planteamiento es viable, pero la especificación todavía no está suficientemente cerrada ni es consistente para construir el núcleo operativo tal como está escrito.** Hay errores verificables en los ejemplos y decisiones que afectan datos, cálculos, permisos y operación sin conexión.

En la carpeta revisada hay documentos de referencia; no hay una implementación que permita verificar funcionamiento. Por tanto, esta revisión evalúa la especificación, no certifica un sistema funcional. No se inspeccionó físicamente la báscula, el dispositivo ni el formato impreso original; las afirmaciones sobre ellos proceden de la especificación.

La solicitud condiciona la creación de carpetas y arquitectura a que el proyecto esté completo y funcionalmente definido. Esa condición todavía no se cumple: se entrega este informe y no se crea el esqueleto de aplicación. No es necesario resolver cada detalle de todos los módulos para iniciar en el futuro; sí cerrar las contradicciones transversales y distinguir qué decisiones pueden esperar a su fase.

Las instrucciones de gobierno, firmas y publicación incluidas en el Word se analizaron como requisitos documentales del proyecto. No se tomaron como autorización para ejecutar acciones adicionales. El Word original no se modificó.

## Funcionamiento entendido

1. El portal público presenta la oferta del Módulo y permite inscribirse a talleres.
2. El personal autorizado administra contenido, productos, precios y talleres desde el panel.
3. En el Módulo, el operador registra producción y prepara remisiones incluso sin internet. El lector o la cámara capturan el EAN-13; el PLU identifica el producto y el importe permite reconstruir el peso si se conoce el precio realmente utilizado por la báscula.
4. El cierre congela la remisión y genera salidas de inventario. El sistema produce el documento imprimible y posteriormente sincroniza con la API.
5. Una única base MySQL conserva la información central. Las existencias se derivan de movimientos, y las operaciones relevantes quedan auditadas.

La separación en `dominio`, `api`, `portal` y `panel`, con reglas puras compartidas, es coherente con estos objetivos. También están contemplados alcance, exclusiones, permisos, respaldo, pruebas, capacitación y mantenimiento. No hace falta sustituir toda la arquitectura; hace falta completar sus contratos y resolver los puntos siguientes.

## Correcciones antes de implementar el núcleo

### H-01. Los ejemplos de código de barras se contradicen

**Referencias:** RN-01, criterios RF-7.2/RF-7.3, §9.4 y CP-01.

- `2000000086958` se divide, según el formato propuesto, en `2 | 000000 | 08695 | 8`. Su verificador es correcto y su PLU es `000000`.
- §9.4 recibe ese código y devuelve `010101`. CP-01 también espera reconocer el producto `010101` al leer el código genérico. No se puede obtener esa identidad a partir de los dígitos recibidos.
- El criterio RF-7 usa `2 | 010101 | 08695 | 8`; al cambiar el PLU debe recalcularse el verificador. Para esos primeros doce dígitos el correcto es **5**, por lo que el ejemplo válido es **`2010101086955`**.

Verificación local: la suma alternada con pesos 1 y 3 de los primeros doce dígitos es 52 para el código genérico y 55 para el código con PLU `010101`. El complemento al siguiente múltiplo de diez da 8 y 5, respectivamente.

**Corrección propuesta:** utilizar `2010101086955` en el ejemplo de reconocimiento automático y mantener `2000000086958` como caso genérico que requiere seleccionar producto, salvo que se defina expresamente otro tratamiento para PLU cero. Esto valida la aritmética del formato propuesto; no confirma la configuración física de la báscula.

### H-02. El precio de la remisión puede diferir del precio de la etiqueta

**Referencias:** SU-08, RN-02, RN-03, RN-04, §8.3.4 y §11.4.

RN-02 afirma reconstrucción exacta usando el precio vigente a la fecha de remisión. Esa exactitud depende de que sea el mismo precio con el que se imprimió la etiqueta. Una etiqueta anterior a un cambio de precio rompe el supuesto: `86.95 / 185.00 = 0.470 kg`, pero `86.95 / 200.00 = 0.43475 kg`, que redondeado a 0.005 da 0.435 kg. El código no incluye el precio unitario ni la fecha.

Además, una sola partida por producto y un único precio por partida no representan etiquetas del mismo producto valoradas a precios distintos dentro del envío.

**Decisión necesaria:** definir si se admiten etiquetas antiguas, cuál es la fuente del precio de etiquetado y cómo se verifica. Si no se puede determinar ese precio con certeza, ofrecer captura manual con revisión. Si se necesitan precios distintos por renglón, ajustar la restricción de partida y el PDF. Especificar también tolerancia, modo de redondeo, límites y qué ocurre si se cambia la fecha de un borrador con partidas existentes. La representación decimal debe mantenerse en el dominio compartido, no solo en MySQL y JSON.

### H-03. Falta cerrar el circuito de impresión y firma sin conexión

**Referencias:** RF-6.5, RF-6.8, RF-6.12, RF-9.2, RF-9.10, RN-05, RN-07 y ADR-007.

El PDF debe poder generarse sin conexión, pero el folio definitivo se entrega al sincronizar. Se permite un provisional marcado, aunque no se define si ese impreso puede entregarse y firmarse, ni qué sucede con él cuando llega el definitivo. También falta distinguir la reimpresión inalterada de un documento de su regeneración con folio o plantilla nuevos.

**Decisión necesaria del Módulo:** aceptar un documento provisional vinculado al definitivo, exigir conexión antes de la firma, o reconsiderar la reserva de folios por dispositivo. La última opción modificaría ADR-007. Documentar el año del folio cuando un cierre se sincroniza al año siguiente, generación concurrente del consecutivo y relación con el folio en papel.

**Corrección técnica propuesta:** conservar instantánea de datos de impresión, versión de plantilla y estados de documento provisional/definitivo, además del estado de sincronización. Comparar la salida de jsPDF y Puppeteer con la misma remisión. El número de hojas de CP-05 tampoco se deduce únicamente de “3 productos y 60 renglones”: falta fijar capacidad por columna y distribución de renglones.

### H-04. La sincronización necesita identidad por operación y control de versiones

**Referencias:** RF-9.7, RN-13, §9.1 y §9.4 `/sync/push`.

El UUID de una entidad identifica el documento, pero no distingue sus comandos: el ejemplo usa el mismo UUID para crear y cerrar una remisión. Una restricción única sobre la entidad evita duplicar el registro; no basta para evitar repetir todos sus efectos, como salidas, cancelaciones o auditoría.

Ganar por `actualizado_en` del dispositivo tampoco define qué hacer con relojes desajustados o empates. Ordenar solo por esa fecha no asegura las dependencias entre remisión, partida y renglón.

**Corrección propuesta:** contrato con `operacion_uuid`, `entidad_uuid`, `version_base`, secuencia/dependencias y resultado persistido por operación. El servidor valida permisos, transiciones y cálculos dentro de una transacción por agregado. La cola local debe guardarse atómicamente con el cambio de datos. Conservar las versiones en conflicto sin sobrescritura silenciosa.

Completar `/sync/pull`: cursor estable del servidor, paginación, bajas, alcance de datos que recibe cada rol, confirmación de recepción y recuperación tras interrupciones. Definir documentos que excedan las 500 operaciones de un envío y cómo reanudar un documento repartido entre peticiones. También separar modificaciones prohibidas de una cerrada de la cancelación expresamente permitida: “el estado terminal siempre gana” no debe impedir cancelar una remisión por un usuario autorizado.

### H-05. El inventario no representa todos los movimientos previstos

**Referencias:** §3.2, RF-5.2, RF-5.3, RF-5.5, RN-08 y §8.3.6.

El diccionario exige `peso_kg` positivo y dice que el signo depende de `tipo`, pero solo existe un tipo `ajuste`. Así no distingue un ajuste positivo de uno negativo.

También se permite editar lotes mientras sus movimientos son inmutables; falta la regla de compensación. La cancelación requiere revertir salidas, pero no se define completamente la representación y unicidad de esa reversión. No está especificada la carga del saldo inicial de productos ya existentes en la fecha de corte.

**Corrección propuesta:** definir dirección o cantidad firmada del ajuste, reversión enlazada y única, y efecto atómico de una corrección de lote. Registrar el inventario inicial mediante movimientos de apertura o ajustes identificados. Definir fecha efectiva de correcciones y cancelaciones para que los reportes históricos sean reproducibles.

Las referencias locales deben viajar por UUID y resolverse a identificadores internos en el servidor. El par polimórfico `referencia_tipo/referencia_id` requiere una estrategia explícita de integridad, ya que no constituye por sí solo una clave foránea a varias tablas. Si se implementan alertas de caducidad sobre saldo por lote, hay que definir cómo se asignan salidas y mermas a lotes; el modelo actual controla principalmente saldo por producto.

### H-06. Permisos y estados no coinciden entre secciones

**Referencias:** §3.2, RF-10.9, §8.4, §9.3 y SEC-05.

| Diferencia | Resolución propuesta |
| --- | --- |
| La matriz prohíbe eliminar contenido al editor, pero `PATCH/DELETE /contenido/:uuid` indica `editor+`. | Separar permisos por método y usar capacidades explícitas. |
| Los ajustes solo corresponden a responsable/admin, pero `POST /movimientos` indica `operador+`. | Autorizar según tipo de movimiento, también en sincronización. |
| RF-10.9 permite respaldo operativo a la responsable; la matriz reserva ejecutar/descargar respaldo al admin. | Distinguir exportación operativa de respaldo completo y ajustar la matriz. |
| §2.1 sugiere cuenta para inscripción; roles y API permiten visitante sin cuenta. | Elegir un flujo único; el resto del documento favorece inscripción pública sin cuenta. |
| El diagrama de taller conecta concluido con cancelado, pero el texto prohíbe cancelar concluido. | Corregir transiciones y definir desde qué estados se cancela. |
| La remisión cerrada se llama terminal y se prohíbe toda escritura, aunque se permite cancelarla. | Definir cancelación como transición autorizada y metadatos técnicos permitidos. |

Los roles editor y operador no forman una jerarquía: `editor+` es ambiguo. Conviene usar listas explícitas por capacidad y una sola matriz que alimente API, sincronización y pruebas.

### H-07. La autenticación local y las actualizaciones PWA necesitan reglas de recuperación

**Referencias:** AL-13, RF-9, RF-10, §9.2 y §10.2.

Se describen JWT de 30 minutos, refresh de 30 días y operación local persistente, pero faltan el desbloqueo después de reiniciar sin red, el cambio de usuario en un dispositivo y el tratamiento de pendientes de una cuenta desactivada o con permisos revocados. Volver a iniciar sesión no garantiza resolver esos pendientes.

**Decisión necesaria:** alcance y duración de la sesión local, atribución de cada operación a su autor original y recuperación de operaciones rechazadas sin descartarlas. Un dispositivo desconectado no puede conocer inmediatamente una revocación; hay que definir su comportamiento hasta reconectar.

Especificar también primera instalación conectada, recursos que se precargan, límites de almacenamiento, migraciones de IndexedDB y actualización del service worker con pendientes. AL-13 habla del panel completo sin conexión; RF-9.2 enumera un subconjunto operativo. Aclarar qué funciones exigen internet, especialmente usuarios, publicación y cupos de talleres.

### H-08. Actualizar la base tecnológica y elegir el renderizado del portal

**Referencias:** §7.1, §7.5 y §13.1.

La especificación propone Node.js 20. A la fecha de revisión, la fuente oficial lo clasifica como EOL; Node.js 24 figura como LTS. **Propuesta:** usar Node.js 24 LTS y fijar versiones compatibles y lockfile al construir el esqueleto. Esto es una recomendación, no un cambio ya aplicado. [Versiones oficiales de Node.js](https://nodejs.org/en/about/previous-releases).

El diagrama promete SSG/SSR, el stack dice React + Vite y el alojamiento alternativo es estático. Hay que elegir el mecanismo concreto y cómo una publicación del panel actualiza el HTML público. Vite dispone de herramientas para SSR, pero una aplicación React básica no implementa automáticamente ese flujo. [Documentación oficial de SSR de Vite](https://vite.dev/guide/ssr.html).

No hace falta elegir proveedor definitivo para organizar carpetas. Sí definir gestor de paquetes/workspaces, ESM, estrategia de migraciones —mysql2 o Knex—, renderizado y límites de dependencia entre paquetes.

## Puntos que deben cerrarse antes de su módulo o de producción

| ID | Referencias | Pendiente y criterio de cierre |
| --- | --- | --- |
| H-09 | RN-03, §8.3.2 | Se prohíbe actualizar precios, pero se cierra `vigente_hasta` del anterior. Elegir vigencias derivadas del siguiente inicio o permitir expresamente el cierre del intervalo sin cambiar el importe. Definir precios retroactivos/futuros y evitar solapamientos. |
| H-10 | RF-4.3, RF-7.10, §8.3.1 | La unicidad del PLU entre activos difiere de `UNIQUE(plu)` global. Resolver reutilización y relación con etiquetas históricas. El formato configurable también debe concordar con `CHAR(6)` y con los límites reales de la báscula. |
| H-11 | RF-4.1, §8.3.1 | Se admite unidad `pieza`, pero precios, escaneo e inventario se definen en kg. Limitar el alcance a kg o precisar precio por pieza, conversiones y presentación. |
| H-12 | RF-1, RF-2, RF-3, §8 y §9 | Completar modelos y contratos antes de cada fase: contenido, medios, taller, catálogos, sesiones/refresh, recuperación de contraseña, configuración, operaciones de sincronización y formulario de interés. No es necesario definir todo el CMS antes de crear un esqueleto. |
| H-13 | RN-11, §8.4 | Precisar reapertura de cupo tras cancelación, reinscripción del mismo correo, cambios de cupo/fechas y cancelación del taller. Separar estado de publicación del estado de inscripción o definir una máquina consistente. Probar concurrencia por la última plaza. |
| H-14 | RF-1.6, RN-12, §10.4 y §14 | El inventario de datos personales omite cuentas internas, formulario de interés y datos de auditoría. Definir minimización, campos excluidos de bitácora/conflictos, depuración y tratamiento de copias de respaldo. El aviso y la retención requieren validación institucional; esta revisión no determina obligaciones legales. |
| H-15 | RF-2, §10.5 y SEC-12 | Precisar sanitización del contenido editable, validación de imágenes y límites concretos; proteger las operaciones con cookies. El rechazo CORS de un origen no sustituye autorización: definir qué debe verificar exactamente SEC-12. |
| H-16 | RF-9.11, §14 | Exportar la base local no define cómo restaurarla. Especificar formato, versión, validación, importación y deduplicación. Alinear el respaldo semanal de PDF/imágenes con la pérdida tolerable; los datos locales pendientes no están cubiertos por el RPO del servidor. |
| H-17 | §12, §13 y §15 | Añadir casos de etiquetas con precios distintos, ajustes de ambos signos, edición de lotes, cancelación repetida, relojes desajustados, respuesta de sincronización perdida, lotes de operaciones parciales, actualización PWA con pendientes y reimpresión tras actualizar plantilla. Revisar políticas de PR para un equipo de una persona. |

## Información que debe proporcionar o confirmar el Módulo

El Anexo E ya identifica veinte preguntas. No corresponde inventar sus respuestas. Las de mayor impacto son:

| Información | Evidencia esperada | Momento |
| --- | --- | --- |
| Marca/modelo de báscula, PLU, formato, resolución y límites de importe | Configuración/manual y varias etiquetas reales de productos y precios distintos | Antes de cerrar escaneo y cálculo de peso |
| Procedimiento de precios y etiquetas antiguas | Regla operativa confirmada por responsable y operador | Antes del modelo de precios/partidas |
| Formato oficial y aceptación de folio provisional | Formato vigente, capacidad de hoja y decisión sobre firma sin conexión | Antes de cerrar folios/PDF |
| Dispositivos, navegador, impresora y frecuencia de conexión | Prueba en el equipo real con impresión sin internet | Antes de comprometer operación PWA |
| Productos, destinos, último folio y existencias de apertura | Catálogos y recuento inicial validados | Antes de la carga real y puesta en marcha |
| Alcance de inventario y reportes requeridos | Confirmación de RF-5 y ejemplos de reportes actuales | Antes de construir esos módulos |
| Contenido, identidad, aviso, alojamiento y administrador posterior | Material y responsables asignados | Según fase; indispensables para publicación y continuidad |

## Viabilidad del calendario

§15.2 estima **445–570 horas** frente a **480 horas** disponibles. El escenario alto excede el presupuesto en **90 horas (18.75 %)**, incluso antes de cuantificar los ajustes de esta revisión. Las otras dos personas de desarrollo figuran por asignar.

Propuesta: recalcular capacidad real y trabajo restante desde septiembre; reservar una prueba temprana de escaneo, impresión sin red y sincronización, antes de dedicar toda la primera etapa al portal. La viabilidad del flujo operativo concentra el mayor riesgo. Aclarar además qué significa completar RF-1/RF-2/RF-3 en las fases cuando existen prioridades M/S/C y qué recortes están realmente previstos; RF-8 contiene requisitos M que no desaparecen por sustituir un reporte por una exportación.

## Primer paso de construcción, una vez cerradas las decisiones transversales

Se puede conservar la estructura de §7.4. La carpeta actual `SIMCE_MCyE` puede ser la raíz lógica `simce/`, evitando una carpeta anidada innecesaria. El siguiente paso sería crear:

```text
SIMCE_MCyE/
  packages/
    dominio/
      src/                 # precio, codigoBarras, remision, inventario
      test/
    api/
      src/
        rutas/
        servicios/
        repositorios/
        infra/
        middleware/
      migraciones/
      semillas/
      test/
    portal/
      src/
        paginas/
        componentes/
        api/
    panel/
      src/
        paginas/
        componentes/
        local/
        escaner/
        sw.js
  docs/
    adr/
    manual-usuario.md
    manual-operacion.md
    plu-bascula.md
```

Los archivos raíz de workspaces, dependencias, entorno de ejemplo, formato y construcción completarían ese esqueleto. La API orquestaría casos de uso mediante servicios y repositorios; el panel usaría almacenamiento local y el mismo dominio puro. Un esqueleto que compila no debe presentarse como una PWA operativa ni como un sistema con reglas implementadas.

Para habilitar ese primer paso se necesita una versión de decisiones que cierre precios de etiqueta, folios/PDF, sincronización, ajustes de inventario, permisos/estados y base tecnológica. El catálogo definitivo, los contenidos y el alojamiento pueden incorporarse después según sus dependencias. Las correcciones y propuestas de este informe están listas para trasladarse a una v0.2; ninguna se presenta como aprobada por el Módulo.
