# Talleres e inscripciones

El gestor conserva la edición y publicación de talleres de Fase 1. La responsable y el administrador disponen de un bloque adicional «Inscripciones del taller» para configurar cupo y periodo, consultar asistentes y exportar listas. La inscripción pública funciona conectada y no exige crear cuenta.

## Preparar un taller

1. Compilar con `npm run build` e iniciar el entorno integrado con `npm run dev:fase1`. La cuenta local existente se conserva.
2. Entrar en `/panel/`, seleccionar «Talleres», crear el contenido y guardar el borrador con sus fechas de inicio y conclusión.
3. Completar el contenido temático, sede, cupo y apertura/cierre en «Inscripciones del taller». Las horas se presentan en Ciudad de México y la API recibe instantes UTC. Guardar la inscripción.
4. Revisar y publicar el contenido. Un editor prepara el contenido; solo responsable y administrador publican y administran inscripciones.
5. Abrir el taller en el portal y seleccionar «Consultar inscripción». El formulario aparece únicamente si el taller está publicado y programado, el periodo está abierto, existe plaza y está configurado el aviso autorizado.

Una edición del contenido continúa siendo borrador hasta publicarla. Los cambios de configuración de inscripción se aplican al guardarlos y actualizan el portal. Para cambiar fechas se solicita motivo. Si falla la regeneración, el cambio se conserva: recargar el taller y utilizar «Regenerar portal».

## Configurar el aviso

El aviso inicial `simce-2026-11-06-v1` fue autorizado por el usuario. La versión vigente es `simce-2026-11-06-v4`, disponible en `/privacidad/simce-2026-11-06-v4.html`, e incorpora las consultas y respuestas de talleres, el guardado de accesos, la copia por correo y el seguimiento privado de la inscripción con historial y acciones propias. El pie del portal y los formularios permiten consultar el aviso sin sesión ni JavaScript. Los HTML v1, v2 y v3 se conservan sin cambios para acreditar los consentimientos anteriores.

El lanzador `dev:fase1` usa la versión vigente por defecto para interés, consultas e inscripciones. `AVISO_TALLERES_URL` y `AVISO_TALLERES_VERSION` permiten sobrescribirla. Las rutas relativas se admiten únicamente con su respectiva versión incluida; los avisos externos mantienen la exigencia de HTTPS y no pueden contener credenciales. Una versión no puede reutilizarse con otra URL.

El archivo `.env.example` mantiene los valores vacíos para que cada alojamiento configure la activación. En producción, configure ambos valores con la ruta y versión indicadas; la ruta heredará el origen HTTPS real. Para deshabilitar un formulario local, establezca explícitamente su URL y versión vacías y reinicie. Si carga `.env` con `node --env-file=.env scripts/iniciar-fase-uno.mjs`, sus valores vacíos también deshabilitan el formulario. Los registros y las versiones anteriores no se borran. Un formulario abierto con una versión anterior se rechaza al enviar.

## Consultar asistentes

El botón «Solicitar información» utiliza el [formulario de consultas y respuestas dentro de la web](consultas-web.md). La consulta no reserva una plaza y la responsable la atiende desde el panel. El visitante recibe un enlace privado para leer la respuesta.

«Consultar asistentes» carga la lista privada. «Exportar CSV» y «Exportar PDF» descargan los mismos registros, incluidas inscripciones canceladas, identificadas por su estado. Los CSV protegen las celdas frente a fórmulas ejecutables al abrirlas en una hoja de cálculo; los PDF incluyen encabezados y numeración en cada página.

Para cancelar, reactivar o registrar asistencia se escribe el motivo de la acción. La reactivación exige confirmar que el participante aceptó el aviso vigente y vuelve a verificar cupo y periodo. La confirmación no viene marcada. La cancelación libera plaza, incluso si antes se mostraba cupo agotado; no permite crear otra alta pública con el mismo correo. La asistencia conserva la plaza.

Cancelar o concluir el taller exige motivo y confirmación. La cancelación afecta a las inscripciones confirmadas y mantiene el historial. El sistema impide borrar un taller con inscripciones. La lista, los archivos descargados y los historiales solo se entregan a responsable o administrador y sus consultas quedan en bitácora; la bitácora no copia nombres, correos ni teléfonos.

## Contrato incorporado

| Método y ruta bajo `/api/v1`               | Uso y autorización                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /publico/talleres`                    | Talleres publicados, disponibilidad calculada y aviso vigente; sin participantes.                                                          |
| `POST /publico/talleres/:id/inscripciones` | Alta pública con origen autorizado, límite de cinco intentos por IP y hora y consentimiento explícito. Devuelve únicamente folio y estado. |
| `PUT /talleres/:id`                        | Configura temario, sede, cupo y periodo; responsable/admin, versión del taller y motivo al cambiar fechas.                                 |
| `POST /talleres/:id/acciones`              | `cancelar` o `concluir`, con versión y motivo; responsable/admin.                                                                          |
| `GET /talleres/:id/inscripciones`          | Lista privada; `?formato=csv` o `?formato=pdf` exporta. Responsable/admin.                                                                 |
| `POST /inscripciones/:id/acciones`         | `cancelar`, `reactivar` o `asistencia`, con versión y motivo; responsable/admin. Reactivar requiere aceptación y versión de aviso.         |

La creación, borrador y publicación continúan usando `/cms/entradas` y sus acciones existentes. Las acciones centrales no se encolan sin conexión. Se aplican `CUPO_AGOTADO`, `INSCRIPCION_CERRADA`, `INSCRIPCION_DUPLICADA`, `AVISO_NO_ACEPTADO`, `AVISO_PENDIENTE` y `VERSION_DESACTUALIZADA` según el rechazo; ningún rechazo crea una inscripción parcial.

## Comprobar cambios

```bash
npm run check
npm run build
npm run check:fase2
npm run check:mysql-local -- --solo-integracion
```

La comprobación de navegador crea una cuenta temporal, un taller y un aviso sintéticos en un directorio aislado. No cambia las cuentas ni los datos de `.local/cms`. No envía mensajes externos. Las capturas, CSV, PDF y el informe JSON quedan en `artifacts/fase-2/`.
