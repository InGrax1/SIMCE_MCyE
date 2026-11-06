# Estado de Fase 1

- Fecha de seguimiento institucional: 6 de noviembre de 2026, America/Mexico_City. Se conservan los resultados del corte técnico del 28 de octubre, identificados más abajo.
- Alcance acordado: completar y verificar localmente; las comprobaciones del alojamiento quedan diferidas porque todavía no existe servidor.
- Estado: contenido aceptado según comunicación del usuario; aviso y roles autorizados. El aviso está disponible y conectado a los formularios locales. Se crea un administrador de pruebas. Pendientes: identidad del administrador institucional, alta de la responsable para su ensayo, publicación autónoma y despliegue.
- Referencia visual: [CEA, frame 1:3](https://www.figma.com/design/Rw9Bb37khwyJnL2wUEjK89/CEA?node-id=1-3).

## Implementación local

| Frente                     | Resultado                                                                                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portal y gestor            | React, Anime.js, diseño adaptable, roles, borradores, publicación/despublicación, vista previa, orden, versiones y auditoría. El cambio de contenido regenera el HTML público sin recompilar la aplicación.                                                 |
| Galerías por área          | Fotografías asociables a Rastro, Sala de Cortes o Embutidos desde el gestor. Cada área tiene su galería desplegable, accesible con teclado y sin JavaScript; la galería general conserva su composición.                                                    |
| Datos anteriores           | Adaptación de las imágenes de referencia al nuevo modelo de galerías sin sustituir cuentas, contraseñas ni borradores modificados. Las asociaciones de área se validan y se protegen contra eliminación/despublicación accidental.                          |
| Recuperación de acceso     | Solicitud desde el login, enlace de un solo uso de 30 minutos, token guardado como hash, límites de intentos y revocación de sesiones anteriores. El enlace se retira del fragmento visible al abrirlo.                                                     |
| Correo local               | Buzón privado de archivos en `.local/cms/correos/`, sin envío externo. Adaptador SMTP con TLS preparado para configurar después; su entrega real no se declara probada.                                                                                     |
| MySQL local                | Instancia nativa temporal y aislada, MySQL 8.0.44, en loopback y puerto libre; se comprueban migraciones, persistencia, bloqueo de escritores y reenvío idempotente. No se modifican los servicios ni bases instalados.                                     |
| Respaldo y restauración    | Volcado consistente de la base completa, imágenes con manifiesto SHA-256 y archivo cifrado AES-256-GCM. Ensayo en otra base `_test` y carpeta vacías; conciliación de folios, contenido e imágenes, revocación de sesiones/enlaces y regeneración del HTML. |
| Talleres y servicio social | Talleres con estados, fechas, requisitos y costo indicativo, avisos fechados, programas y formulario de interés condicionado al aviso autorizado. Las inscripciones corresponden a Fase 2.                                                                  |

La composición original de Figma se conserva: portada, paleta, decoraciones, separadores, tarjetas y catálogo de altura uniforme. Las áreas de las actividades siguen siendo indicadores, y la tarjeta de prácticas conserva su jerarquía legible. Las fuentes e imágenes optimizadas mantienen los recursos originales y sus licencias. Véanse [diseno-ui.md](diseno-ui.md) y [contenido-animaciones.md](contenido-animaciones.md).

## Comprobaciones reproducibles

```bash
npm run check
npm run build
npm run check:fase1
npm run check:mysql-local
npm run prototype
```

La guía [validacion-local.md](validacion-local.md) explica requisitos, archivos de evidencia y comandos de respaldo. La suite incluye permisos, sesiones, cambio inicial, retorno al login, recuperación, expiración y uso concurrente de enlaces, privacidad, imágenes, galerías, compatibilidad del estado anterior e integridad del respaldo. Las pruebas MySQL se ejecutan por separado con credenciales aleatorias y bases de prueba.

El recorrido del navegador usa datos sintéticos aislados y comprueba publicación, HTML sin JavaScript, talleres, galerías, teclado, tamaños móviles y recuperación mediante el buzón local. Ejecuta axe sobre los estados relevantes y Lighthouse con perfil móvil, red lenta 4G y CPU emuladas directamente mediante `throttlingMethod: devtools`. El límite sigue siendo LCP inferior a 2500 ms y cero infracciones graves o críticas de axe.

Los informes y capturas se conservan en `artifacts/fase-1/`, excluido de Git. Los resultados locales no acreditan una ejecución del pipeline remoto, una aprobación humana ni un despliegue real. La configuración de CI queda preparada para repetir los controles cuando se publique la versión.

En el corte técnico del 28 de octubre aprobaron 50 pruebas de API, dominio y panel, más las dos pruebas de integración MySQL. El ensayo de respaldo/restauración también aprobó. El recorrido de navegador no registró errores JavaScript ni infracciones graves/críticas de axe en ocho estados; Lighthouse registró LCP de 1980 ms, rendimiento 97/100 y accesibilidad 100/100. La auditoría de dependencias de aquel corte supera el umbral alto/crítico; permanecían los cuatro avisos bajos de la cadena de compilación PWA documentados entonces. El resultado técnico posterior, del 6 de noviembre, está en [el estado de Fase 2](../fase-2/estado.md).

## Seguimiento de la institución

- Contenido aceptado por la institución: el usuario lo confirma el 6 de noviembre de 2026 para textos, fotografías, identidad, contactos, asignaturas, programas y convocatorias del material presentado. El detalle queda en [aceptacion-institucional.md](aceptacion-institucional.md).
- Aviso de SIMCE autorizado por el usuario: [registro y texto](../privacidad/aviso-privacidad-simce.md), versión `simce-2026-11-06-v1`. Se incorpora el recurso público y el arranque local lo configura para ambos formularios. El alojamiento futuro lo servirá bajo su propio origen HTTPS.
- [Roles autorizados y cuentas](../operacion/cuentas-institucionales.md): se crea `admin.pruebas@example.test` por petición del usuario, con cambio inicial obligatorio y credencial fuera de Git. El administrador institucional definitivo queda pendiente de identidad; la responsable mantiene su ensayo para después.
- Publicación sin asistencia por la responsable: se realizará después, según decisión del usuario. Queda preparado el [registro local](registro-publicacion-responsable.md), sin resultados anticipados.

Los textos e imágenes de referencia no acreditan sesiones, existencias ni productos reales adicionales. No se inventan fechas de talleres, precios, disponibilidad ni una quinta especie de hamburguesa. La sustitución de referencias por material aprobado se realiza desde el gestor.

## Diferido hasta disponer de servidor

- Instalación y comprobación del alojamiento, subdominio, DNS y TLS con el origen definitivo.
- Pruebas de proxy, cookies seguras, permisos de base y volúmenes en la plataforma real; repetir con la versión MySQL elegida para el servidor (Compose propone 8.4).
- Configurar y comprobar la entrega real de correo SMTP, sin usar el buzón de archivo de desarrollo.
- Definir respaldo externo, custodia de claves, calendario, retención, monitoreo y restauración bajo las condiciones del alojamiento.
- Verificar publicación, imágenes y calidad en la dirección desplegada y completar la evidencia de entrega institucional.

No se intentó publicar ni conectar a un servidor de producción. Docker continúa sin motor disponible en esta máquina; esto ya no impide verificar MySQL nativo localmente, pero la imagen y los contenedores siguen sin arranque comprobado. Las instrucciones futuras están en [staging.md](../despliegue/staging.md).

El alojamiento/subdominio/TLS y la validación física de la báscula mantienen sus pendientes de [Fase 0](../fase-0/estado.md).
