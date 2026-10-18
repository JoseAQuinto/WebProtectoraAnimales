# Asistente CSV de contactos — 2026-10-18

Versiones app/DB/schema/backup: `0.2.0-dev`/`2`/`1`/`1`, sin cambios.
Es una primera parte de fase 10: **no cubre todavía los otros tipos CSV ni JSON**.

## Flujo

`#imports`: seleccionar CSV, separador (automático/coma/punto y coma), codificación
(UTF-8/Windows-1252/ISO-8859-15), mapear columnas, validar y revisar por páginas
de 20, decidir duplicados/destino, descargar informe y confirmar alcance.
La plantilla usa nombres estables:
`external_id,id,type,name,phones,email,address,roles,notes`.
Se reconocen también encabezados legibles de la exportación propia de contactos.
Nuevos contactos requieren nombre; tipo omitido usa `person`. Roles son códigos
del enum separados por `|`. Teléfonos: texto único o JSON de hasta diez objetos
`label`/`original`; los normalizados se recalculan desde el original.

Los valores CSV nunca usan tipado automático. Identificadores externos y teléfonos
conservan ceros y prefijos. No se interpretan HTML/fórmulas/código. Se rechazan
encabezados peligrosos `__proto__`, `constructor`, `prototype` y claves peligrosas
del JSON de teléfonos. Se copian solo campos de destino permitidos.
Límites: 10 MiB, 10.000 filas de datos, 256 columnas, 200 caracteres por encabezado
y 20.000 por celda; los esquemas aplican además longitudes/tipos por campo.
UTF-8 inválido exige corregir/cambiar codificación, sin reemplazos silenciosos.
Las filas del informe son registros CSV lógicos, incluyendo el encabezado como
fila 1; un salto dentro de comillas no crea otra fila de datos.

## Decisiones y garantías

- UUID exacto, email/teléfono normalizados e identidad externa recordada:
  conflicto sin acción automática. Nombre igual: advertencia; no fusiona.
- Crear separado, actualizar destino, vincular sin modificar y omitir.
  Una actualización modifica **solo columnas mapeadas**; vacíos mapeados vacían
  campos opcionales, mientras datos y roles sin mapear permanecen.
- No crea dos veces un UUID, no actualiza contactos fusionados/en papelera ni
  el mismo contacto dos veces en un lote. No reasigna identidades externas
  existentes a otro contacto silenciosamente. Vincular puede reutilizar una
  creación anterior del mismo archivo gracias a IDs de planificación estables.
- Fuente + `external_id` puede conservarse por decisión explícita en
  `importIdentityMap`. El siguiente archivo propone vincular/actualizar y no
  vuelve a crear silenciosamente. El hash detecta archivos ya importados.
- Errores locales identifican fila/campo/motivo. Informe CSV descargable con
  códigos estables; los mensajes visibles están traducidos. Columnas sin mapear
  con contenido exigen reconocer su omisión. Excluir errores/conflictos/omitidas
  exige confirmar expresamente el subconjunto. Errores del conjunto combinado
  bloquean toda aplicación.
- Vista previa pura y cancelable por bloques, índices de email/teléfono/nombre
  en memoria y validación final del conjunto. El servicio guarda el plan privado;
  el informe público es inmutable y no permite construir una orden de escritura.
- Hasta 1.000 registros resultantes: `context.execute`/transacción única con
  lease/dataset/revisión/idempotencia. Una fila de identidad y el log también
  cuentan para determinar si el lote requiere preparación separada.
- Más de 1.000: exige copia completa verificada de la revisión actual; prepara
  otro dataset con registros y bytes existentes, valida/hash y activa atómicamente.
  El anterior queda retirado para recuperación. Cancelación antes de activar,
  cuota insuficiente o revisión cambiada no vacían el activo. Las preparaciones
  abortadas se conservan; no hay borrado automático. La cancelación deja de
  ofrecerse cuando comienza la activación.
- Revalidar después de un cambio de datos. Repetir la aplicación del mismo plan
  ya completado devuelve duplicado. Guardar confirma solo tras transacción o
  activación completas. Altas/mapas/log llevan `origin: import` y lote; actualizar
  conserva el origen/identidad/creación del contacto existente.

Componentes: `import-parser.js`, `import-contacts.js`, `contact-import.js` y
`modules/imports.js`. Estado de archivo/mapeo/vista previa es temporal de UI;
IndexedDB sigue siendo la única verdad de los registros guardados.

## Evidencia

Chrome y Edge **13/13 por motor**, file:// offline, en
`contact-import-ui-2026-10-18-{chrome,edge}-first.json`.
Fixture explícita: dos contactos y un animal con documento incorporado.
UI real: plantilla, archivo, mapeo, enlace por email, advertencia por nombre,
error email, omisión confirmada y columnas desconocidas, doble guardado único,
ceros/Unicode/comillas/saltos/texto HTML literal, informe descargado, identidades
recordadas y archivo repetido, revisión concurrente sin sobrescritura.

Lote de **1.001 contactos por UI**, rechazo sin backup actual, descarga y
reselección/verificación reales; cancelación inyectada por callback de servicio
durante preparación real (no equivale a hacer clic en el botón), activo intacto;
después aplicación por UI con exactamente una activación/revisión y 1.005
contactos totales. Se comprueban tablas/bytes del conjunto anterior retirado,
avance concurrente conservado, idioma/anchos y cierre/reapertura completos.
85 fuentes cargadas intactas; cero errores de página/consola o HTTP de página.

166 pruebas Node y 687 estáticas correctas. Nueve nuevas cubren parseo y límites,
claves peligrosas, codificación, pureza/subconjuntos, duplicados, actualizaciones
parciales, mapeos/repetición, errores por campo, revisión y cancelación/lote grande.
El harness Node no acredita IndexedDB; las rondas reales sí verifican transacciones
y preparación/activación/reapertura.

## Siguiente desarrollo

Extender el asistente a animales (microchip/código/episodios), solicitudes,
movimientos, voluntariado y donaciones con agrupación material; interpretación
explícita de fechas/importes y asociación de relaciones por ID/código, nunca
solo por nombre. Incorporar JSON v1 por módulo con revisión de referencias y
archivos ausentes. No reutilizar el planificador de contactos para cambiar
hechos financieros/stock sin sus invariantes y acciones coordinadas.
La importación de contactos y sus lotes grandes están acreditados; no repetirlos
como pendientes ni presentar fase 10 completa. Falta cuota real/volumen máximo
de navegador y plataformas físicas. Solo datos sintéticos.
