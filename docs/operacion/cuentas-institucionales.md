# Propuesta de cuentas institucionales

Fecha: 6 de noviembre de 2026. Estado: propuesta solicitada por el usuario; no se han creado cuentas ni buzones institucionales. Se recomienda iniciar con dos cuentas individuales y añadir editor y operador cuando se designen las personas que desempeñarán esas funciones.

## Asignación propuesta

| Cuenta                            | Persona propuesta                                                                                                                       | Correo para acceso                                                                                                 | Permisos y propósito                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsable                       | Mtra. Janeli Solís Garfias                                                                                                              | `janelisolis@cuautitlan.unam.mx`, contacto ya presente en el contenido aceptado, propuesto también para su acceso. | Publicar y retirar contenido, gestionar talleres e inscripciones, consultar solicitudes, exportar listas y revisar auditoría. Uso habitual del Módulo.          |
| Administrador                     | Una persona técnica designada por la institución. Durante el desarrollo, puede ser el desarrollador con autorización y relevo definido. | Correo institucional individual de la persona designada, pendiente de comunicar.                                   | Administración y soporte del sistema; alta de usuarios por el procedimiento administrativo. Mantener una persona institucional a cargo al concluir el proyecto. |
| Editor, cuando se necesite        | Persona que prepara textos y fotografías.                                                                                               | Su propio correo institucional.                                                                                    | Preparar borradores y medios; no publicar ni consultar datos de participantes.                                                                                  |
| Operador, al iniciar la operación | Persona que registra y controla la operación del Módulo.                                                                                | Su propio correo institucional.                                                                                    | Acceso a la operación autorizada; sin publicación editorial ni consulta de asistentes. El alcance completo se desarrollará en Fase 3.                           |

El correo identifica una cuenta de SIMCE. Utilizar una dirección `@cuautitlan.unam.mx` no incorpora inicio de sesión único de la UNAM: el sistema actual usa su propia contraseña. No se solicita ni se reutiliza la contraseña del correo universitario.

Si se desea un buzón de contacto permanente, se puede solicitar a la institución un alias como `simce.mcye@cuautitlan.unam.mx`. Es únicamente un nombre propuesto, sujeto a disponibilidad y autorización; no se afirma que exista. El alias sirve para recibir comunicaciones y continuidad del servicio. Las cuentas de acceso deben seguir siendo personales para atribuir acciones en la bitácora.

## Alta y entrega

1. La institución designa a cada persona, su correo y su rol. Para empezar bastan responsable y administrador.
2. La administración crea la cuenta con `packages/api/scripts/crear-usuario.js correo rol`, en el entorno y base correctos. La contraseña temporal se proporciona por entrada estándar y no como argumento. Véase el [procedimiento de alta](../despliegue/staging.md#inicio-y-cuentas).
3. Se entrega el acceso temporal individualmente y se cambia la contraseña al primer ingreso. No se guarda en documentos, capturas ni Git.
4. La persona usa una contraseña propia de SIMCE y prueba el cierre y la recuperación de sesión. La recuperación por correo institucional se comprobará cuando exista SMTP; el buzón local de desarrollo no acredita entrega de correo real.
5. Se revisan los accesos al cambiar funciones o concluir el servicio social. La baja y el relevo se realizan por administración; no se prometen pantallas de gestión de usuarios que todavía no existen.

El rol `admin` del panel no equivale por sí mismo a administrar el servidor, las claves o la base de datos. Los accesos de infraestructura se custodian y asignan por separado. No se trasladan al alojamiento institucional las cuentas sintéticas de `.local/cms`.

## Cuenta para el ensayo local

Antes del recorrido humano se prepara una cuenta individual de rol `responsable` en el entorno local. Puede utilizarse una dirección sintética identificada como ensayo, sin enviar mensajes externos, si aún no se ha autorizado el alta del correo real. El observador conserva el identificador de cuenta en el registro de prueba y no conoce ni registra la contraseña elegida por la participante.

La creación de esa cuenta se realizará al programar el ensayo. No se cambia ahora una cuenta existente ni se comparte una cuenta administradora para demostrar autonomía.
