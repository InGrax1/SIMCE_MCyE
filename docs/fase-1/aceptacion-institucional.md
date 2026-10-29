# Revisión y aceptación institucional de Fase 1

Estado al 2026-10-28: pendiente de revisión. Este documento es un guion de trabajo; no registra autorizaciones ni resultados institucionales. La validación técnica se realiza localmente; las pruebas del alojamiento quedan diferidas hasta disponer de servidor.

## Contenido que debe confirmar la institución

| Contenido            | Revisión requerida                                                                                                                                                                             | Estado    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Identidad y contacto | Nombre oficial, relación CEA/FESC/UNAM, logotipos autorizados, responsable, correo, ubicación y mapa.                                                                                          | Pendiente |
| Redes sociales       | URL oficial y autorización de uso; el icono actual lleva al contacto.                                                                                                                          | Pendiente |
| Áreas y procesos     | Nombres, descripciones, capacidades y normativa aplicable.                                                                                                                                     | Pendiente |
| Prácticas            | Nombre, asignatura, licenciatura, descripción y vinculación académica de cada práctica. Los datos sin confirmar están señalados.                                                               | Pendiente |
| Actividades          | Descripciones y áreas donde se realizan; validar expresiones sobre matanza, faenado y su normativa.                                                                                            | Pendiente |
| Productos            | Fotografías, especies, presentaciones, descripciones y autorización de cualquier precio visible. No se afirma disponibilidad. Aclarar la variante de hamburguesa no identificada en el diseño. | Pendiente |
| Servicio social      | Claves vigentes, licenciaturas, actividades, procedimiento de contacto y persona que atenderá los intereses.                                                                                   | Pendiente |
| Talleres             | Convocatorias reales, estados, fechas, requisitos, costo autorizado y canal de atención.                                                                                                       | Pendiente |
| Galería              | Sustituir o autorizar fotografías de referencia; derechos y consentimiento de las personas identificables.                                                                                     | Pendiente |
| Aviso de privacidad  | URL y versión autorizadas, responsable del tratamiento, finalidad, atención y conservación/eliminación de intereses. Mantener el formulario deshabilitado hasta obtenerlos.                    | Pendiente |

La cuenta de revisión local y las entradas sintéticas no deben trasladarse a producción. El material de referencia se describe en [contenido-animaciones.md](contenido-animaciones.md).

## Prueba por la responsable sin asistencia

El recorrido puede ensayarse en el entorno local integrado, con una cuenta individual y el contenido autorizado. Cuando exista servidor, se repite sobre su dirección HTTPS:

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

| Dato                                                         | Resultado |
| ------------------------------------------------------------ | --------- |
| Entorno y versión desplegada                                 | Pendiente |
| Fecha y persona responsable                                  | Pendiente |
| Persona observadora                                          | Pendiente |
| Entradas y taller usados                                     | Pendiente |
| Resultado de cada paso / ayuda requerida                     | Pendiente |
| Evidencias autorizadas, sin credenciales ni datos personales | Pendiente |
| Observaciones y correcciones                                 | Pendiente |
| Aprobación institucional del contenido y del recorrido       | Pendiente |

Las pruebas locales de MySQL, respaldo, accesibilidad y publicación se generan con [los comandos de validación](validacion-local.md). No sustituyen este recorrido humano. Antes de la entrega institucional se adjuntará también evidencia del origen HTTPS, cookies seguras, permisos, correo y respaldos del alojamiento y los informes del pipeline de esa versión. Alojamiento, subdominio/TLS y la báscula mantienen sus propios pendientes de Fase 0.
