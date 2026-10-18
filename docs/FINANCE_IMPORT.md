# CSV de movimientos económicos — 2026-10-18

Versiones app/DB/schema/backup: `0.2.0-dev` / `2` / `1` / `1`, sin cambios.
Fase 10 parcial; donaciones CSV y JSON por módulos siguen pendientes.

## Formato y decisiones

`#imports` → Movimientos económicos. Campos estables:
`external_id,id,direction,date,category_id,category_code,concept,amount,
amount_minor,currency,animal_id,animal_code,animal_external_id,contact_id,
contact_external_id,status,source_type,source_id,correction_reason,
correction_date,notes`.

Altas independientes: `direction` (`income` / `expense`), fecha, categoría UUID
o código estable, concepto e importe. Relaciones opcionales por UUID/código/
mapas de la fuente elegida, nunca nombre. Categoría debe estar activa y ser
de la dirección correcta. Fechas ISO o interpretación DMY/MDY explícita.

El usuario elige punto o coma decimal; no se admiten separadores de miles.
`amount_minor` es entero positivo seguro. Si se indican ambos importes deben
coincidir exactamente. Se respeta precisión JPY 0 / EUR y otras 2 / KWD 3;
moneda ausente usa la de organización y otra moneda se rechaza sin convertir.
Identificadores siguen siendo texto. Se comprueba también la suma segura global.

UUID, identidad recordada y coincidencia de dirección/fecha/concepto/importe/
relaciones requieren decisión. Se puede crear separado, vincular sin cambios,
omitir o **crear corrección enlazada**. El hash identifica archivo repetido.
No se crean movimientos anulados o nuevos con origen vinculado mediante este
CSV: las donaciones y demás operaciones coordinadas usan sus propios flujos.
El CSV es intercambio de movimientos independientes, no reconstrucción histórica
de todos sus módulos relacionados. JSON/backup conservan mayor fidelidad.

## Correcciones

Actualizar nunca sobrescribe importe/fecha/dirección del original. Exige motivo,
fecha de corrección y consentimiento adicional tanto en UI como en servicio.
Reutiliza el constructor real de `finance.correct`:

- Anula original y enlaza sustituto, conservando ambos UUID, origen e importes.
- Crea sustituto en revisión 1; original avanza una revisión.
- Actualiza backlinks de donaciones, salud, adopciones y compras existentes.
- Conserva dirección. Solo corrige movimientos contabilizados sin sustituto.
- Identidad externa existente pasa al sustituto **solo** al confirmar la
  corrección del movimiento al que ya apuntaba. No hay reasignación libre.
- Fechas y origen vinculado deben ser coherentes. La corrección no crea otra
  donación ni otro ingreso independiente para representar el mismo hecho.

En vista previa `targetId` es el original seleccionado y `resultId` el sustituto
planificado. El informe CSV descargable añade `result_id` para distinguirlos.
Campos no mapeados se conservan en el sustituto. Ningún cambio entra en el lote
si la fila falla; relaciones/invariantes globales bloquean toda aplicación.

Mismas garantías de import-batches/import-workspace: revisión/dataset/lease,
idempotencia, confirmaciones de subconjuntos/columnas, una transacción hasta
1.000 registros resultantes; preparación separada con copia actual verificada
para mayores. Logs/mapas/correcciones también cuentan. Cancelar antes de activar
conserva activo, retirado y bytes. No modifica formatos persistidos ni secretos.

## Evidencia

Chrome/Edge **16/16 por motor**:
`finance-import-ui-2026-10-18-{chrome,edge}-first.json`.
97 fuentes intactas, file:// offline, perfiles sintéticos y servicios reales.
Fixture explícita: donante, animal, donación de 1.000 menores y TXT incorporado.

UI: plantilla, fechas DMY y coma elegidas, error de precisión, dos movimientos
independientes, vínculo a donación existente, subconjunto y doble envío sin
duplicación, archivo repetido, corrección de 1.230→2.050 con original conservado
e identidad trasladada, corrección del ingreso donado de 1.000→2.500 conservando
una donación y backlink, rechazo de origen nuevo incoherente, informe, revisión
concurrente con campos conservados y totales sin contar originales anulados.

**501 movimientos** por UI (1.003 registros con logs), copia/reselección/verificación,
cancelación por callback de servicio durante preparación real, después activación
única y 506 movimientos finales. Ingreso válido 5.051 y gasto 555 menores EUR,
conjunto anterior retirado con total previo 4.550/555 y bytes conservados.
EN/ES, anchos 360/768/1440, cierres propios completos y reapertura compara
registros, revisiones, identidades, digest y hashes reales de Blob.
Cero errores de página/consola o HTTP de página. Viewports no son dispositivos.

**202 pruebas Node** correctas, ocho nuevas (precisión/enteros, duplicados,
consentimiento/correcciones/backlinks, mapas, revisión/cancelación y overflow).
**747 estáticas** y diff sin errores. No acredita cuota física, Firefox actual,
plataformas físicas o aceptación comercial. Mantener solo datos sintéticos.
