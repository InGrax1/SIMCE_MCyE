# Cuentas y roles autorizados

Fecha: 6 de noviembre de 2026. El usuario autoriza expresamente el aviso y los roles en esta conversación. Se conserva el esquema de responsable y administrador individuales, con editor y operador al designar a las personas correspondientes. Ante la consulta sobre el administrador, el usuario indica «genera un usuario de pruebas»; se crea una cuenta administradora exclusivamente local. No se ha creado ningún buzón institucional.

## Asignación autorizada y altas

| Cuenta                            | Persona o asignación                                                                                  | Correo para acceso                                                                         | Permisos y propósito                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Responsable                       | Mtra. Janeli Solís Garfias; asignación autorizada por el usuario.                                     | `janelisolis@cuautitlan.unam.mx`; el alta se prepara al programar su prueba independiente. | Publicar y retirar contenido, gestionar talleres e inscripciones, consultar solicitudes, exportar listas y revisar auditoría.         |
| Administrador de pruebas          | Cuenta local creada por instrucción expresa del usuario. No identifica a una autoridad institucional. | `admin.pruebas@example.test`.                                                              | Rol `admin` para revisar el gestor. Cambio de contraseña obligatorio al entrar; no trasladar al alojamiento institucional.            |
| Administrador institucional       | Persona técnica que se designe para el alojamiento definitivo.                                        | Nombre y correo institucional pendientes de comunicar.                                     | Administración y soporte; alta administrativa de usuarios y relevo al concluir el proyecto.                                           |
| Editor, cuando se necesite        | Persona que prepara textos y fotografías.                                                             | Su propio correo institucional.                                                            | Preparar borradores y medios; no publicar ni consultar datos de participantes.                                                        |
| Operador, al iniciar la operación | Persona que registra y controla la operación del Módulo.                                              | Su propio correo institucional.                                                            | Acceso a la operación autorizada; sin publicación editorial ni consulta de asistentes. El alcance completo se desarrollará en Fase 3. |

El correo identifica una cuenta de SIMCE. Utilizar una dirección `@cuautitlan.unam.mx` no incorpora inicio de sesión único de la UNAM: el sistema actual usa su propia contraseña. No se solicita ni se reutiliza la contraseña del correo universitario.

Si se desea un buzón de contacto permanente, se puede solicitar a la institución un alias como `simce.mcye@cuautitlan.unam.mx`. Es únicamente un nombre propuesto, sujeto a disponibilidad y autorización; no se afirma que exista. El alias sirve para recibir comunicaciones y continuidad del servicio. Las cuentas de acceso deben seguir siendo personales para atribuir acciones en la bitácora.

## Alta y entrega

1. La institución designa a cada persona, su correo y su rol. Para empezar bastan responsable y administrador.
2. La administración crea la cuenta con `packages/api/scripts/crear-usuario.js correo rol`, en el entorno y base correctos. La contraseña temporal se proporciona por entrada estándar y no como argumento. Véase el [procedimiento de alta](../despliegue/staging.md#inicio-y-cuentas).
3. Se entrega el acceso temporal individualmente y se cambia la contraseña al primer ingreso. No se guarda en documentos, capturas ni Git.
4. La persona usa una contraseña propia de SIMCE y prueba el cierre y la recuperación de sesión. La recuperación por correo institucional se comprobará cuando exista SMTP; el buzón local de desarrollo no acredita entrega de correo real.
5. Se revisan los accesos al cambiar funciones o concluir el servicio social. La baja y el relevo se realizan por administración; no se prometen pantallas de gestión de usuarios que todavía no existen.

El rol `admin` del panel no equivale por sí mismo a administrar el servidor, las claves o la base de datos. Los accesos de infraestructura se custodian y asignan por separado. No se trasladan al alojamiento institucional las cuentas sintéticas de `.local/cms`.

La entrega privada del administrador de pruebas está en `.local/cms/acceso-admin-pruebas.json`, fuera de Git. Se comprobó el acceso, el rol y el cambio inicial obligatorio sin cambiar la contraseña en nombre del usuario. El alta conserva las cuentas y entradas anteriores y deja un evento de auditoría. No se envió correo externo.

## Cuenta para el ensayo local

Antes del recorrido humano se prepara una cuenta individual de rol `responsable` en el entorno local. Puede utilizarse una dirección sintética identificada como ensayo, sin enviar mensajes externos, si aún no se ha autorizado el alta del correo real. El observador conserva el identificador de cuenta en el registro de prueba y no conoce ni registra la contraseña elegida por la participante.

La creación de la cuenta de rol `responsable` se realizará al programar el ensayo, sin requerir otra aprobación del rol ya autorizado. La cuenta administradora de pruebas no sustituye la publicación autónoma por la responsable, que sigue pendiente para después.
