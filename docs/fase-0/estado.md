# Estado de Fase 0

- Fecha de corte: 2026-10-06
- Referencia: `Especificacion_SIMCE_MCyE_v0.2.docx`
- Estado técnico: completo y verificado
- Estado institucional: condicionado a validaciones externas

## Entregables técnicos

| Entregable                  | Evidencia                                                                                 | Estado                |
| --------------------------- | ----------------------------------------------------------------------------------------- | --------------------- |
| Reglas de repositorio y Git | `AGENTS.md`, `.gitignore` y commits atómicos en rama de trabajo                           | Completo              |
| Monorepositorio             | npm workspaces para dominio, API, panel y portal; Node.js 24                              | Completo              |
| Calidad                     | ESLint, Prettier, Vitest, cobertura del dominio y verificación de archivos versionados    | Completo              |
| Dominio compartido          | EAN-13, PLU, importe, precio, peso, remisión e inventario con enteros                     | Completo              |
| API por capas               | Rutas, servicios, repositorios, errores e infraestructura                                 | Completo              |
| Esquema inicial             | Migración y semilla Knex para MySQL 8                                                     | Completo              |
| Portal                      | React/Vite con salida prerenderizada                                                      | Completo              |
| Panel                       | PWA React, service worker, IndexedDB, cola y PDF provisional                              | Completo              |
| Sincronización              | UUID de operación, versión base, huella, folio transaccional y reenvío idempotente        | Completo              |
| Prototipo                   | Caso `2010101086955`: `$86.95`, `$185.00/kg`, `0.470 kg`, cierre, PDF y reintento         | Completo              |
| Pipeline                    | Instalación reproducible, controles, compilación, prototipo, MySQL y análisis de secretos | Completo              |
| Staging                     | Compose de MySQL, API y Nginx; imágenes de API y web                                      | Verificado localmente |

## Comprobaciones ejecutadas

- Pruebas del dominio: 12 aprobadas.
- Cobertura observada del núcleo instrumentado: 100 % de líneas y 94.59 % de ramas.
- Pruebas de API: 6 aprobadas y prueba MySQL preparada para el pipeline.
- Pruebas del panel: 3 aprobadas.
- Compilación local: API, panel PWA y portal prerenderizado.
- Prototipo integral: folio preservado después de simular una respuesta perdida.
- Staging local: MySQL 8, API y Nginx levantados; portal, panel y salud de API respondieron HTTP 200.
- Persistencia MySQL: primer cierre aplicado y reenvío del mismo UUID reconocido sin crear otro folio.
- Auditoría npm: 0 vulnerabilidades conocidas al instalar el lockfile.

## Validaciones externas pendientes

| Decisión o validación                                                             | Responsable funcional                                 | Fecha compromiso                               | Condición para cerrar                                 |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Inicio del trámite de alojamiento, subdominio y TLS                               | Enlace institucional de infraestructura por confirmar | Por confirmar                                  | Proveedor y procedimiento autorizados                 |
| Modelo, formato EAN, posiciones del PLU e importe y resolución real de la báscula | Responsable de almacén por confirmar                  | Por confirmar                                  | Lecturas físicas comparadas con el perfil configurado |
| Aceptación del PDF y reglas de folio oficial                                      | Responsable administrativo por confirmar              | Antes del uso operativo                        | Plantilla, firmas y leyenda aprobadas                 |
| Aprobación de SU-01, SU-04, SU-08 y SU-10                                         | Propietarios institucionales de cada proceso          | Antes de iniciar trabajo dependiente de Fase 1 | Historias firmadas o registradas como aprobadas       |

El prototipo permanece utilizable con datos sintéticos y perfil configurable. Los valores reales de alojamiento y báscula se incorporarán cuando la institución los confirme; no están codificados como supuestos definitivos.

## Seguimiento del 6 de octubre de 2026

El usuario confirma que el trámite de alojamiento, subdominio y TLS y la validación física de la báscula siguen pendientes de respuesta de la institución. No se han comunicado responsables ni fechas compromiso para esas confirmaciones.

Sobre la aceptación del PDF y las reglas de folio, y sobre SU-01, SU-04, SU-08 y SU-10, el usuario indica que los puntos son correctos «al parecer». Se registra como revisión preliminar favorable; no equivale a una aprobación institucional ni aporta evidencia física de la báscula. Las condiciones de cierre de la tabla anterior permanecen abiertas hasta registrar la evidencia correspondiente.

La Fase 1 corresponde al portal público y la gestión de contenido (RF-1 y RF-2). Conforme a §15.4 de la especificación, su esqueleto técnico puede desarrollarse sin proveedor definitivo, conservando explícitos los pendientes institucionales. La aceptación de esa fase requiere contenido validado, identidad institucional, publicación autónoma por la responsable, verificaciones Lighthouse y axe y disponibilidad en staging (§15.1 y §15.2).

La Fase 1 no se registra como iniciada en esta actualización. La instrucción previa condicionaba su inicio al cierre de Fase 0; queda por aclarar si el usuario desea avanzar con el desarrollo técnico mientras se mantienen abiertas las validaciones institucionales.

## Resultado del hito

La construcción técnica comprometida para Fase 0 está lista para revisión. El hito institucional se cerrará cuando se registren las confirmaciones externas de la tabla anterior.
