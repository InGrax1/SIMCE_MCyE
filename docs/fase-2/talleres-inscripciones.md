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

El usuario autoriza el aviso `simce-2026-11-06-v1` el 6 de noviembre de 2026. Se incorpora su página `/privacidad/simce-2026-11-06-v1.html` con versiones integral y simplificada. El pie del portal y el formulario permiten consultarla sin sesión ni JavaScript. Se conserva el archivo de esta versión; un cambio de texto requiere otra versión y otra ruta.

El lanzador `dev:fase1` usa este aviso por defecto para interés e inscripciones. `AVISO_TALLERES_URL` y `AVISO_TALLERES_VERSION` permiten sobrescribirlo. La ruta relativa se admite únicamente para esta página y versión incluidas; los avisos externos mantienen la exigencia de HTTPS y no pueden contener credenciales. La versión admite letras, números, puntos, guiones y guiones bajos, hasta 80 caracteres; no puede reutilizarse con otra URL.

El archivo `.env.example` mantiene los valores vacíos para que cada alojamiento configure la activación. En producción, configure ambos valores con la ruta y versión indicadas; la ruta heredará el origen HTTPS real. Para deshabilitar un formulario local, establezca explícitamente su URL y versión vacías y reinicie. Si carga `.env` con `node --env-file=.env scripts/iniciar-fase-uno.mjs`, sus valores vacíos también deshabilitan el formulario. Los registros y las versiones anteriores no se borran. Un formulario abierto con una versión anterior se rechaza al enviar.

## Consultar asistentes

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
