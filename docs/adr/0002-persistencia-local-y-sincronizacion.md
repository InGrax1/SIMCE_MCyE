# ADR 0002: Persistencia local y sincronización por operaciones

- Estado: aceptada para Fase 0
- Fecha: 2026-09-06

## Contexto

El panel debe cerrar remisiones durante interrupciones de red. Un reintento puede ocurrir después de que el servidor aplicó la operación, aunque el cliente no haya recibido la respuesta.

## Decisión

El panel guarda la remisión cerrada y su operación en una sola transacción de IndexedDB. Cada operación tiene `operacionUuid`, `agregadoId` y `versionBase`.

El servidor registra la huella de la operación y su resultado bajo una clave única. Un reenvío idéntico devuelve el resultado almacenado. Un UUID reutilizado con contenido distinto produce conflicto. Otra operación basada en una versión anterior también produce conflicto. La resolución no usa la marca de tiempo del cliente como criterio de sobrescritura.

## Consecuencias

Una respuesta perdida no duplica remisiones ni folios. Las operaciones con conflicto permanecen visibles para resolución explícita. El repositorio MySQL ejecuta la asignación de folio y el registro de la operación dentro de una transacción.
