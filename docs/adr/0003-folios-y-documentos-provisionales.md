# ADR 0003: Folios y documentos provisionales

- Estado: aceptada para Fase 0
- Fecha: 2026-09-06

## Contexto

Sin conexión no existe una autoridad central capaz de reservar un consecutivo definitivo sin riesgo de colisión.

## Decisión

El cierre local recibe un identificador `PROV-XXXXXXXX` derivado del UUID de la remisión. El PDF generado fuera de línea muestra de forma visible que es provisional y que carece de folio oficial.

El servidor asigna el folio definitivo `REM-AAAA-NNNNNN` dentro de la misma transacción que aplica la operación. El resultado queda asociado al UUID de operación para que cualquier reenvío reciba el mismo folio.

## Consecuencias

El documento local puede imprimirse como comprobante provisional. El folio definitivo solo existe después de la confirmación del servidor. El formato institucional de impresión deberá validarse antes de usarse como documento oficial.
