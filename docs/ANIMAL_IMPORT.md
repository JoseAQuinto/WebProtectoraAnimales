# Importación CSV de animales — 2026-10-18

Versiones app/DB/schema/backup: `0.2.0-dev` / `2` / `1` / `1`, sin cambios.
Fase 10 continúa; **no declara completa la importación CSV/JSON**.

## Flujo y formato

`#imports` permite elegir Contactos o Animales. Plantilla propia, archivo de
hasta 10 MiB/10.000 filas, separador/codificación, mapeo, interpretación explícita
de fechas, vista previa paginada, decisiones, informe y confirmación.
Se conserva todo el flujo de contactos. La aplicación de planes privados se
comparte en `services/import-batches.js`; las reglas de cada tipo son distintas.

Las altas crean una ficha **bajo cuidado**, un episodio inicial y un evento
de entrada, con log, en el mismo conjunto confirmado. Se reutilizan los mismos
constructores de cambios que `animals.registerEntry` y `animals.update`.
Campos obligatorios: `name`, `species_id` o `species_code`, `entry_date`,
`entry_reason`, `location_kind`, `location_id` si es `shelter` o
`external_location_description` si es `temporary_external`, y `availability`
(`available` / `unavailable`). No se inventa una adopción o acogida histórica.
Esos estados requieren sus flujos coordinados o futuras estructuras JSON.

Otros campos de plantilla: `external_id`, `id`, `code`, `breed`, `sex`,
`birth_date`, `birth_precision`, `estimated_age_months`, `age_reference_date`,
`size_id`, `size_code`, `color`, `microchip`, `sterilization_status`,
`sterilization_date`, `description`, `character`, `behavior`, `special_needs`,
`notes`, `management_status`, `origin_description`, `episode_notes`.

Se aceptan UUID y códigos estables de catálogo, nunca nombres. Una sección
visible ofrece referencias activas de especies/tamaños/ubicaciones para copiar.
Si se aportan ID y código deben resolver la misma opción. Catálogos retirados
pueden conservarse en fichas existentes, pero no asignarse de nuevo.
Los encabezados legibles reconocidos no convierten nombres exportados de
especie/ubicación en relaciones: se deben mapear identificadores expresamente.

Fechas: ISO siempre; `DD/MM/YYYY` o `MM/DD/YYYY` solo tras elegir interpretación.
El modo inicial ISO rechaza fechas ambiguas. Se comprueban calendario, futuro,
precisión del nacimiento y nacimiento no posterior a entradas existentes/nuevas.
Código, UUID, microchip e identificador externo son texto, incluidos ceros
iniciales y microchips largos. Notas conservan saltos/comillas/Unicode/HTML
literal sin ejecución. Mismos límites del parser documentados en CONTACT_IMPORT.md.

## Decisiones e integridad

- Coincidencias de UUID, código, microchip normalizado o identidad externa
  exigen decisión. Nombre solo advierte; nunca fusiona.
- Crear / actualizar ficha / vincular sin cambios / omitir. Un UUID, código o
  microchip ya asignado no puede crearse de nuevo. Dos animales distintos con
  identificadores cruzados no se fusionan ni sobrescriben automáticamente.
- `code` vacío asigna secuencia libre considerando fichas y logs conservados.
  Un código A-numérico importado válido reserva su valor para las altas futuras.
  Se rechazan valores que agotarían la secuencia y cambios de código asignado.
- Actualizar modifica solo columnas de ficha mapeadas; conserva origen, UUID,
  creación y campos no mapeados. No altera episodios/ubicación/disponibilidad/
  situación: si esas columnas aparecen deben coincidir con el hecho existente.
  No actualiza fichas archivadas/en papelera ni dos veces un destino por lote.
- Vincular una fila a un alta anterior reutiliza su UUID estable sin crear otro
  episodio/evento. Identidades fuente + external_id son opcionales y no se
  reasignan silenciosamente. Se detecta hash de archivo ya importado.
- Errores no aportan episodios/eventos/mapas parciales al subconjunto válido.
  Omitir filas erróneas/no resueltas y columnas desconocidas requiere confirmación.
  La validación del conjunto completo bloquea referencias/invariantes rotas.
- Hasta 1.000 registros resultantes: una transacción con revisión, lease,
  dataset e idempotencia. También cuentan episodios, eventos, mapas y logs.
  Más: copia actual verificada, preparación separada y activación atómica;
  anterior retirado conservado. Cancelar antes de activar deja el activo intacto.

## Evidencia real

Chrome/Edge: **15/15 por motor**, informes
`animal-import-ui-2026-10-18-{chrome,edge}-event-count.json`.
Distribución real file:// offline, perfiles sintéticos, sin mocks del negocio.
Fixture explícita: dos animales y un TXT incorporado. UI: plantilla, referencias,
mapeo, rechazo de fechas ambiguas, elección DMY, duplicado de microchip, nombre
igual, fila inválida, columnas desconocidas/subconjunto, doble envío, informe,
identidades, archivo repetido, actualización parcial y revisión concurrente.

Importa **251 animales** por UI (1.005 registros nuevos con episodio/evento/log
por animal y log de lote). Comprueba bloqueo sin copia actual verificada,
descarga/reselección reales, cancelación por callback del servicio durante
preparación real y posterior activación única completa. Conserva conjunto
anterior, cambio concurrente y bytes. EN/ES y anchos 360/768/1440, dos cierres
propios por motor, revisión/recuentos/digest y hashes reales de Blob al reabrir.
93 fuentes intactas; cero errores de página/consola o HTTP desde la página.

Los primeros intentos `...-first.json` se conservan: nueve comprobaciones
pasaron y el ejecutor exigió 255 eventos totales, olvidando el evento de
documento creado por su propia fixture (correcto: 256). Se corrigió solo
el recuento del ejecutor; no cuenta como aceptación de esa ronda fallida.

Regresión completa de contactos: **13/13 por motor** en
`contact-import-ui-2026-10-18-{chrome,edge}-batches-regression.json`, incluidos
1.001 contactos por UI, cancelación, bytes y reapertura, con estas mismas fuentes.
Node: 184 pruebas correctas (nueve nuevas de animales); estática: 727.

## Pendiente

CSV de solicitudes, movimientos, perfiles voluntarios y donaciones agrupadas;
JSON v1 por módulos y relaciones. El CSV de animales importa entradas iniciales
y fichas; no reconstruye ciclos históricos completos. No hay aceptación de
cuota física, volumen máximo, plataformas físicas o Firefox actual. Solo datos
sintéticos hasta aceptación integral. No se modifica el alcance original.
