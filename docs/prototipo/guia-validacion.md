# Guía de validación del prototipo

## Caso de referencia

| Dato                   | Valor           |
| ---------------------- | --------------- |
| Etiqueta EAN-13        | `2010101086955` |
| PLU                    | `010101`        |
| Importe codificado     | `$86.95`        |
| Precio verificado      | `$185.00/kg`    |
| Resolución provisional | `5 g`           |
| Peso esperado          | `0.470 kg`      |

La etiqueta se compone de prefijo `2`, PLU de seis posiciones, importe de cinco posiciones en centavos y dígito de control EAN-13.

## Validación automática

Ejecute:

```bash
npm ci
npm run prototype
```

La prueba realiza estos pasos:

1. Valida el dígito de control y extrae PLU e importe.
2. Reconstruye el peso con el precio verificado y la resolución configurada.
3. Cierra la remisión y guarda remisión más operación en IndexedDB.
4. Genera un PDF marcado como provisional.
5. Envía la operación a una API real levantada en un puerto temporal.
6. Simula la pérdida de la primera respuesta una vez aplicada la operación.
7. Reenvía el mismo UUID y comprueba que conserva el folio y deja la cola vacía.

Los resultados se escriben en `artifacts/resultado-prototipo.json` y `artifacts/PROV-11111111.pdf`. La carpeta está excluida por `.gitignore`.

## Validación manual del panel

1. Ejecute `npm run dev:api`.
2. Ejecute `npm run dev:panel` en otra terminal.
3. Abra la dirección indicada por Vite.
4. Mantenga el código y precio del caso de referencia.
5. Confirme el precio, añada la etiqueta y cierre la remisión.
6. Descargue el PDF provisional.
7. Sincronice y compruebe que aparece un folio final.

La lectura por escáner HID funciona como entrada de teclado. La validación del formato real emitido por la báscula queda pendiente de disponer del equipo y su configuración.
