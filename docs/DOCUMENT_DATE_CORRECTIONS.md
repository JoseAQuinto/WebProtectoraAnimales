# Fecha documental e historiales compartidos — 2026-10-19

Versiones sin cambios: app 0.2.0-dev / DB 2 / schema 1 / backup 1.

## Corrección explícita

La ficha de Documentos ofrece **Corregir fecha documental**. Editar metadatos
ordinarios conserva título/tipo/notas y descripción externa, pero ya no cambia
fecha sin revisión histórica. El servicio update también bloquea ese cambio.

La revisión muestra documento/fecha y todos sus hechos vigentes en animales,
con fecha anterior e instante de registro, paginados de 20 en 20. Exige fecha
válida no futura, motivo y confirmación del alcance completo. Actualiza el mismo
documento y sustituye solo los eventos cuya fecha difiere. Mantiene archivos,
vínculos, referencias externas y demás metadatos. No elimina hechos repetidos de
incorporación/vinculación del mismo archivo: cada evento conserva su versión.

La fecha del documento es distinta del instante en que se incorporó o vinculó.
Los eventos anteriores conservan sus instantes y fechas; el sustituto registra
cuándo se hizo la corrección. El servicio considera todos los animales, no solo
la ficha desde la que se abrió el documento.

Si una edición antigua dejó fechas distintas, la revisión lo advierte y permite
normalizarlas expresamente, incluso conservando la fecha actual del documento.
No corrige diferencias antiguas en segundo plano. Un documento sin historial
animal solo cambia sus metadatos y añade actividad de corrección, sin inventar
eventos. Archivo/papelera requieren restauración previa.

## Barreras y API

documentDates.inspect(tables,id) es puro. documentDates.correct(id,
{date,reason,confirmed:true},command) reconstruye alcance en el snapshot actual;
documento, versiones y actividad se confirman en una sola transacción protegida
por lease/dataset/revisión/idempotencia. El informe antiguo no acepta un vínculo
añadido por otra operación sin revisión nueva.

El repositorio exige que un cambio de fecha documental deje coherentes sus
hechos vigentes: conserva los que ya tengan la fecha nueva o exige sustitutos
recíprocos válidos. No invalida globalmente datasets antiguos por su divergencia.
JSON por módulo tampoco puede cambiar date de un documento existente mediante
actualización de perfil: debe enlazar/conservar el local o usar esta corrección.
Los documentos nuevos y la restauración completa siguen reconstruyendo su grafo
sin ejecutar efectos. El editor ordinario retira el campo fecha en documentos
existentes; las altas mantienen su campo normal de fecha.

## Evidencia

`document-dates-ui-2026-10-19-{chrome,edge}-reopen-lease.json`: **17/17 por motor**,
117 fuentes intactas por file:// offline. Fixture de 23 animales con un TXT
compartido, referencia sin historial y un caso antiguo con fecha distinta.
Este último se prepara expresamente como dataset validado con staging/activación
reales, tras verificar una copia generada del fixture; no es un camino de edición
del producto ni una base simulada. La prueba final de copia sí descarga al disco,
reselecciona/verifica y restaura el archivo completo mediante UI.

Prueba paginación 20+3 sin escritura; AbortError en la adición del sustituto 23
de una transacción real deja documento/23 hechos intactos. UI doble envío crea
una única revisión y 23 sustitutos, conserva fechas/instantes originales y
bytes/vínculos. Incluye replay, formulario antiguo/contacto concurrente, rechazo
de bypass por servicio/repositorio/JSON staging, normalización explícita de legado,
externo sin eventos ni bytes incorporados y edición ordinaria de título sin fecha.

EN/ES y 360/768/1440 sin desbordamiento, captura ES inspeccionada, copia/restauración
y dos cierres/reapertura conservan digest/revisiones/todas las versiones y hashes
reales del archivo. Sin errores ni HTTP de página. No acredita hardware o cuota real.

Las rondas first conservadas pasaron negocio/restauración pero intentaron abrir
edición inmediatamente después de reabrir, aún sin control por el lease anterior.
El ejecutor final espera la recuperación normal de control (hasta unos 15 s)
antes de abrir el formulario; no fuerza ni simula la propiedad de escritura.

Cinco pruebas Node documentales y otra contra actualización JSON por staging:
**277 Node / 847 estáticas**. La prueba Node usa contexto simulado; el rollback
y las copias/bytes se acreditan en navegadores reales. Límites de rendimiento,
limpieza, impresión, accesibilidad/plataformas y aceptación comercial siguen.
