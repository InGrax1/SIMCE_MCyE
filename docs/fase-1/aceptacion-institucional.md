# Revisión y aceptación institucional de Fase 1

Estado al 6 de noviembre de 2026: contenido aceptado por la institución, según confirmación expresa del usuario en esta conversación. La confirmación comprende textos, fotografías, identidad, contactos, asignaturas, programas y convocatorias del material presentado. Referencia del código del portal en este corte: `ab55cab`. Se registra la comunicación recibida; no se añade una firma ni un nombre de funcionario que no se haya proporcionado.

El usuario autoriza después el aviso y los roles mediante el mensaje «autorizo el aviso y los roles». El aviso `simce-2026-11-06-v1` se incorpora al portal y al entorno local. Por instrucción adicional se crea un administrador de pruebas local. La identidad del administrador institucional definitivo sigue pendiente. El 7 de noviembre, el usuario reporta que se probó la publicación en local y difiere el despliegue hasta completar el proyecto.

## Aceptación del contenido y seguimiento

| Contenido            | Revisión requerida                                                                                    | Estado                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Identidad y contacto | Nombre, adscripción, identidad visual, responsable y contactos del material presentado.               | Aceptado por la institución; comunicado por el usuario el 6 de noviembre.                                     |
| Redes sociales       | No se ha proporcionado una URL oficial adicional; el icono existente conduce al contacto aceptado.    | Se conserva el enlace actual.                                                                                 |
| Áreas y procesos     | Textos y descripciones del material presentado.                                                       | Aceptado.                                                                                                     |
| Prácticas            | Textos, asignaturas y vinculación académica del material presentado.                                  | Aceptado.                                                                                                     |
| Actividades          | Descripciones y asociaciones del material presentado.                                                 | Aceptado.                                                                                                     |
| Productos            | Textos y fotografías presentados. Se conserva la descripción de las imágenes ilustrativas como tales. | Aceptado.                                                                                                     |
| Servicio social      | Programas, textos y contactos presentados.                                                            | Aceptado.                                                                                                     |
| Talleres             | Convocatorias del material presentado; no se crean fechas ni cupos nuevos en este registro.           | Aceptado.                                                                                                     |
| Galería              | Uso del material fotográfico e identidad presentados.                                                 | Aceptado.                                                                                                     |
| Aviso de privacidad  | Aviso integral y simplificado `simce-2026-11-06-v1`.                                                  | Autorizado por el usuario; disponible en `/privacidad/simce-2026-11-06-v1.html`.                              |
| Cuentas y roles      | Responsable y administrador individuales; editor/operador al designarlos.                             | Roles autorizados; administrador de pruebas local creado. Administrador institucional pendiente de identidad. |

La cuenta de revisión local y las entradas sintéticas no deben trasladarse a producción. El material de referencia se describe en [contenido-animaciones.md](contenido-animaciones.md).

Documentos preparados: [aviso de privacidad](../privacidad/aviso-privacidad-simce.md), [roles y cuentas autorizados](../operacion/cuentas-institucionales.md) y [registro del ensayo de publicación](registro-publicacion-responsable.md). La aceptación del contenido no modifica los pendientes de alojamiento o báscula.

## Prueba por la responsable sin asistencia

El [registro de publicación](registro-publicacion-responsable.md) recoge la confirmación del usuario y conserva la consigna, las evidencias y el criterio de aprobación. El recorrido ampliado siguiente se conserva para capacitación y revisión. Se repetirá en el alojamiento institucional mediante HTTPS.

1. Iniciar sesión, cambiar la contraseña inicial y reconocer la diferencia entre borrador y versión publicada.
2. Crear un aviso, guardar un borrador y comprobar desde una ventana pública que todavía no aparece.
3. Abrir la vista previa, corregir el texto, revisar su fecha y publicarlo.
4. Confirmar su aparición en móvil y escritorio y en una carga sin JavaScript.
5. Preparar un taller con fechas y estado correctos, publicarlo y comprobar su información.
6. Subir una imagen autorizada, escribir un texto alternativo, recortarla y asociarla a una ficha. Revisar el resultado antes de publicarla.
7. Editar una entrada publicada y comprobar que el cambio permanece privado hasta volver a publicar.
8. Despublicar el aviso de prueba y comprobar que deja de aparecer. Revisar el registro de la acción en la bitácora.
9. Cerrar sesión y comprobar que el gestor exige volver a entrar.
10. Revisar la galería de cada área y asociar una fotografía autorizada desde el gestor.
11. Solicitar la recuperación de contraseña y comprobar el enlace de un solo uso; en el ensayo local se utiliza el buzón privado, sin envío externo.

La persona que observa no debe dirigir las acciones. Si necesita ayuda, registre el punto y repita la prueba tras ajustar la interfaz o la capacitación. Una prueba automatizada no sustituye este resultado.

## Registro a completar

| Dato                                                         | Resultado                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Entorno y versión desplegada                                 | Pendiente                                                           |
| Fecha y persona responsable                                  | Pendiente                                                           |
| Persona observadora                                          | Pendiente                                                           |
| Entradas y taller usados                                     | Pendiente                                                           |
| Resultado de cada paso / ayuda requerida                     | Pendiente                                                           |
| Evidencias autorizadas, sin credenciales ni datos personales | Pendiente                                                           |
| Observaciones y correcciones                                 | Pendiente                                                           |
| Aprobación institucional del contenido                       | Aceptado según confirmación del usuario del 6 de noviembre de 2026. |
| Resultado del recorrido humano                               | Prueba local reportada por el usuario el 7 de noviembre de 2026.    |

Las pruebas locales de MySQL, respaldo, accesibilidad y publicación se generan con [los comandos de validación](validacion-local.md). No sustituyen este recorrido humano. Antes de la entrega institucional se adjuntará también evidencia del origen HTTPS, cookies seguras, permisos, correo y respaldos del alojamiento y los informes del pipeline de esa versión. Alojamiento, subdominio/TLS y la báscula mantienen sus propios pendientes de Fase 0.
