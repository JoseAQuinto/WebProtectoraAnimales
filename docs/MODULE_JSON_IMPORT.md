# Importación JSON por módulos — 2026-10-18

Versiones app/DB/schema/backup: `0.2.0-dev` / `2` / `1` / `1`, sin cambios.
Formatos de exportación de módulo `1`; políticas de referencias `v1` y `v2`.

## Flujo

`#moduleImport` (también enlazado desde CSV): seleccionar exportación propia,
seleccionar archivos referenciados si hacen falta, validar, revisar las tablas,
resolver conflictos, comparar valores y confirmar. Cubre los nueve tipos:
animales, contactos, solicitudes, adopciones, gastos, ingresos, voluntarios,
horas y donaciones. La UI muestra organización/moneda/fecha/alcance de origen,
hash, registros principales y total con relaciones; no oculta otros módulos.

Lectura estricta UTF-8, hasta 128 MiB / 100.000 registros con relaciones,
profundidad 40 y cadenas 20.000 (el esquema impone sus límites menores).
Rechaza claves repetidas/peligrosas, tipos o campos ajenos al esquema, UUID
duplicados por tabla, datasets mezclados, versiones futuras, cuerpos con bytes
y módulos desconocidos. Se reutiliza el parser estricto del backup; `parseStrict`
se expone sin alterar el formato de copia. Contenedor y paquete de lectura
inmutables; solo paquetes generados por ese lector pueden producir un plan.

No ejecuta comandos de donación, adopción, salud, tareas o stock al reconstruir
el archivo. Copia los registros y sus referencias; no crea un segundo ingreso,
administración, episodio, movimiento o evento para representar el mismo hecho.
Los UUID nuevos conservan el UUID de origen. Creación/fechas de los hechos se
conservan, revisión local inicia en 1 y origen/lote pasa a `import`.

## Revisión y relaciones

- Registro idéntico por UUID: vincular conservando el actual, sin escribir.
  Se comparan campos de negocio y se separan metadatos de revisión/origen.
- UUID con contenido distinto o coincidencias de código/microchip/email/teléfono,
  perfil por contacto o hecho natural: decisión explícita. Nombre solo advierte.
- Crear, vincular/conservar actual, actualizar ficha permitida u omitir. Todas
  las relaciones UUID, fuentes, vínculos de documentos y mapas externos se
  traducen según las asociaciones elegidas dentro del mismo conjunto.
- Botones de asociación en lote solo reutilizan catálogos por código estable
  y recursos por metadatos/hash compatibles, por decisión explícita. Contactos
  y animales no se fusionan automáticamente. Catálogos locales conservan ajustes.
- Comparación por campos, filtros por tabla/resultado/texto y páginas de 20.
  La tabla tiene columnas legibles y desplazamiento horizontal contenido.
- Si un registro que se crearía/actualizaría depende de otro omitido, fallido
  o sin resolver, el grafo se bloquea aunque su UUID exista localmente. Evita
  reutilizar silenciosamente otros bytes/valores bajo una identidad coincidente.
- Informe JSON descargable con todas las filas y errores, identificador/campo
  y código. No tiene el límite de filas del informe CSV ni incluye Blob.

Actualización elegible: datos de ficha de contactos/animales, perfiles de
acogida/voluntariado, ubicaciones, opciones de catálogo permitidas, metadatos
documentales y mediciones. Solo cambia su lista cerrada de campos. Preserva
UUID local, creación, origen y archivo/papelera; una revisión y consentimiento
adicional. No actualiza destinos archivados, en papelera, fusionados o repetidos.

**No sobrescribe dinero, stock, eventos, adopciones, episodios, reservas,
solicitudes ni hechos clínicos/tareas.** Cambios de historia o de ciclo de vida
existentes requieren su operación coordinada; vincular mantiene el hecho local.
Se comprueban todas las invariantes del conjunto combinado antes de activar.
Dinero o estimaciones de otra moneda se rechazan sin convertir ni reinterpretar.

## Archivos y aplicación

JSON de módulo no contiene bytes ni es backup. Recursos nuevos requieren
reseleccionar los bytes exactos por hash; no se sustituye una foto optimizada
por otro original. Se comprueba firma/MIME, nombre, dimensiones, decodificación
real de imagen y SHA-256. PDF/TXT/imagen: hasta 8 MiB por archivo incorporado;
foto/miniatura/logo máximo 1 MiB como exige el lector de backup, y 64 MiB total.
El límite específico de imágenes evita importar datos que después no pudieran
respaldarse. Un recurso existente solo se reutiliza si sus bytes reales y
metadatos son compatibles. Ausentes/incompatibles bloquean dependencias; no se
fabrican placeholders ni se borran documentos/fotos para aparentar éxito.

Todo JSON es importación compleja: copia completa actual verificada, preparación
separada con registros y Blob, validación/hashes y activación atómica. Revisión,
dataset y lease guardados; cancelación antes de activar y retirado conservado.
Un plan ya aplicado devuelve duplicado. Reimportar un grafo idéntico vinculado
no escribe ni activa, y no necesita otra copia. Actualizaciones de fichas y
subconjuntos requieren consentimiento propio. Ninguna fila válida se aplica
parcialmente si la preparación/validación falla.

Componentes: module-import-codec/assets/planificador, módulo de UI y aplicación
compartida `import-batches`. Archivo/decisiones/selecciones son memoria temporal
de UI; los datos persistidos siguen exclusivamente en IndexedDB.

## Cierre de referencias v2

La exportación mantiene formato `1` y añade política
`selected-related-and-forward-v2`: además del cierre directo anterior incluye
episodios/acogidas/reservas/adopciones de animales referenciados, todas las líneas
de donaciones y el libro de movimientos de cada artículo referido. Es necesario
para reconstruir devoluciones y stocks sin perder registros inversos.
V1 sigue leyéndose; un grafo V1 incompleto debe completarse con relaciones
existentes válidas o mediante backup. No se inventan hechos que falten.

## Evidencia y límites

Suite funcional: **22/22 por motor** Chrome/Edge en
`module-import-ui-2026-10-18-{chrome,edge}-wrap-fix.json`:

- Fixture declarada por servicios: 23 animales, adopción devuelta, foto/miniatura
  optimizadas, TXT, gasto clínico, voluntario/horas y donaciones/stock consumido.
- Nueve descargas JSON reales por UI y nueve importaciones por UI en destinos
  sintéticos nuevos. Fixture de destinos usa datasets reales; no se presenta
  como una acción del comprador. Catálogos asociados explícitamente, copia
  descargada/reseleccionada antes de cada aplicación, una activación cada vez.
- Compara todos los registros de negocio, cantidades, UUID, relaciones y bytes
  contra los archivos. Comprueba que no reaparecen ingresos/stock/eventos extra.
- Fotos/TXT ausentes o archivo equivocado bloquean. Reimportación idéntica no
  escribe. Lectura corrupta/futura no escribe. Comparación/actualización de
  contacto, revisión concurrente y revalidación preservan trabajo válido.
- Finanzas no ofrece sobrescritura de importes; cancelación por callback de
  servicio durante preparación real, seguida de aplicación UI única y origen
  retirado intacto. Reporte, EN/ES, anchos y dos cierres/reapertura con digest
  y hashes reales de archivos. 102 fuentes intactas en cada ronda.

Después se mejora solo presentación de tabla/acciones. Ronda dirigida **4/4
por motor** `module-import-layout-2026-10-18-{chrome,edge}-actions-fit.json`:
reabre el perfil sintético aprobado, verifica el mismo digest/revisión/bytes,
columnas de al menos 150 px, acciones completas en el viewport desplazable
móvil, comparación accesible y cierre propio. Comprueba las cuatro fuentes
de presentación cambiadas y las huellas actuales; no reejecuta ni se atribuye
los nueve flujos previos. Capturas estrechas inspeccionadas visualmente.

Intentos conservados: `...first.json` falló por selector del título de Copias
del ejecutor; `...backup-heading.json` completó negocio y detectó desbordamiento
real por hashes/diagnósticos largos. Se corrigió la UI. Primer layout dirigido
`...readable.json` midió DOM durante cambio de idioma; se corrige la espera.
`...visible.json` pasó dimensiones, pero revisión visual detectó acciones
parcialmente recortadas; `...actions-fit.json` acredita su ancho completo.

Verificación final: **221 Node / 772 estáticas**. Diez pruebas nuevas JSON,
incluido límite adicional de fotografía para compatibilidad con backup, v1,
archivo/papelera, dependencias y rechazo de bytes con UUID coincidente.
Ese endurecimiento del límite fotográfico es posterior a la ronda funcional
y está cubierto por su prueba Node específica; no se atribuye retroactivamente
su huella a los informes anteriores.

Persisten capturas completas O(N) y consultas de coincidencias en memoria;
los máximos anunciados son límites de seguridad, no rendimiento acreditado.
Faltan volumen/cuota físicos, accesibilidad integral y plataformas físicas.
Un viewport no acredita dispositivos, ni Chrome/Edge de Windows acredita
Firefox actual. Producto de desarrollo: solo datos sintéticos.

Actualización posterior (2026-10-19): date de un documento existente deja de ser
un campo actualizable por JSON. Usar la corrección documental con revisión de
todos sus eventos (DOCUMENT_DATE_CORRECTIONS.md). Título/tipo/notas y campos
externos admitidos mantienen su alcance. Se conserva el grafo de nuevos documentos
y la restauración de versiones anteriores; no se declara nueva aceptación de las
rondas viejas sobre fuentes modificadas.
