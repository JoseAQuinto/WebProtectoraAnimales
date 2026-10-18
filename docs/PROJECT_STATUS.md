# Estado del proyecto

Actualizado: 2026-10-18. Versión de trabajo: `0.2.0-dev`.
Versiones: `appVersion 0.2.0-dev`, `dbVersion 2`, `schemaVersion 1`,
`backupFormatVersion 1`. Este bloque no modifica el formato persistido.
Entrada de relevo: [CONTINUE_HERE.md](CONTINUE_HERE.md).

## Fase actual

Desarrollo reanudado desde `c44831b`, incorporado con `git pull --ff-only`
antes de editar. Se conservan las correcciones R1–R4 y los servicios existentes.
Ahora hay pantallas operativas de animales, contactos, perfiles/estancias de
acogida, adopciones, voluntariado, documentos, salud/planes y tareas/calendario,
finanzas y se añaden donaciones e inventario mediante los servicios existentes.
**Producto incompleto: utilizar datos sintéticos.**
No se han reducido los requisitos originales ni publicado un producto comercial.

Regla vigente del usuario: cuando quede **menos del 10 % de la ventana de
5 horas**, cerrar desarrollo y trabajo delegado, documentar, commit y push,
y preparar el relevo. Se conserva el límite semanal del 3 % restante de la
sesión anterior. No consumir reinicios de cuota sin petición expresa.

## Funciones disponibles

- Apertura directa `file://`, recursos locales, CSP sin conexiones, EN/ES.
  Organización, resumen derivado, ajustes, ayuda y copias/restauración.
- Núcleo de 28 tablas, validación relacional, IndexedDB, migración aditiva,
  revisión global/por fila, lease/token y operaciones idempotentes. Los commits
  de negocio confirman solo al completar su transacción. Sin LocalStorage.
- Backup completo de registros y Blob, manifiesto/SHA-256, validación de
  versiones/relaciones, preparación separada y activación atómica. Conserva
  el conjunto anterior. Reemplazar datos exige copia verificada de su revisión.
- Contactos: lista/búsqueda/filtros/paginación, ficha, múltiples teléfonos,
  roles, duplicados con evidencia y confirmación explícita, comparación/fusión,
  archivo/papelera/restauración según relaciones. Referencias históricas conservadas.
- Perfiles de acogida sobre contactos existentes, capacidad/compatibilidad,
  ocupación y estancias derivadas; perfiles voluntarios, actividades/horas,
  edición/papelera y totales por periodo. No duplican una agenda de personas.
- Animales: lista filtrada/paginada, ficha con siete secciones, alta/reentrada,
  edición, traslados/disponibilidad, pesos, fotografías/miniaturas, salidas y
  fallecimiento con cierre de relaciones y decisiones individuales de tareas.
  Archivo/papelera se rechazan bajo cuidado o con tareas pendientes.
- Fotografías: validación/decodificación real, reducción a 1600 px y miniatura
  de 320 px; logotipo mediante servicio. Sustituir conserva recursos anteriores.
- Documentos: incorporados y referencias externas, validación de firma/hash,
  descarga verificada, comparación por reselección externa, vínculos con animales,
  contactos, adopciones y registros sanitarios, archivo/papelera/restauración.
  Presupuesto acumulado de 64 MiB, incluidos recursos archivados/en papelera.
  Referencias externas explican que sus bytes no se incluyen en el backup.
- Recuperación local visible en Copias: inventario de conjuntos retirados y
  preparaciones interrumpidas. Solo un retirado se puede recuperar mediante
  preparación nueva y copia verificada; staging nunca se activa automáticamente.
  Restauración permite cancelación cooperativa antes de activar y conserva la
  revisión capturada al revisar la copia, sin actualizarla silenciosamente.
- Acogidas: asignación a perfiles existentes con ocupación/restricciones,
  excepciones explícitas y finalización con destino. Adopciones: solicitud,
  entrevista, aprobación, reserva/cierre, formalización con cuota opcional,
  motivos y decisiones de cada tarea, documentos y devolución con nuevo episodio.
- Salud/planes: actos realizados, condiciones, instrucciones humanas, programación
  finita y finalización clínica de la misma tarea. Gasto nuevo o factura existente
  explícitos, sin duplicar movimientos. No calcula ni recomienda dosis.
- Tareas y calendario globales comparten filas y filtros, con paginación de lista,
  navegación gregoriana sin UTC y vencimientos derivados sin ejecutar actos.
  Se conservan referencias históricas/inactivas al editar y la pareja hora/zona.
- Finanzas: alta de ingresos/gastos exactos, filtros/totales, anulación y
  corrección mediante sustituto enlazado, sin sobrescribir el importe original.
  Su aceptación específica está en FINANCE_UI_ACCEPTANCE.md; no atribuirle
  los recorridos anteriores.
- Donaciones: lista/búsqueda/filtros/paginación y ficha. Alta económica crea la
  donación y exactamente un ingreso en el mismo guardado; alta material admite
  1–1000 líneas, incorpora opcionalmente cada línea a un artículo con un único
  movimiento de existencias y conserva el valor estimado separado del ingreso.
  Anulación coordinada (monetaria anula el ingreso; material compensa cada
  línea incorporada). No hay segunda cifra editable independiente del ingreso.
- Inventario: lista de artículos con existencias derivadas, unidad, mínimo y
  niveles bajo/en el mínimo; alta de artículos; movimientos de saldo inicial,
  compra, consumo, devolución y ajuste con signo explícito, gasto opcional solo
  en compra, compensación de movimientos y archivo. Las donaciones de stock se
  crean desde Donaciones. Correcciones mediante movimientos compensatorios.

Contratos: CONTACTS_API.md, LIFECYCLE_API.md, VOLUNTEERS_API.md,
DOCUMENTS_API.md, HEALTH_API.md, RESOURCES_API.md, PEOPLE_UI.md,
ANIMAL_FORMS_UI.md, FOSTER_UI.md, ADOPTION_UI.md, HEALTH_UI.md, TASKS_UI.md,
FINANCE_UI.md y DONATIONS_INVENTORY_UI.md.
`index.html` carga servicios clásicos en orden explícito;
`documents.js` precede a `photos.js`. Las cadenas están en locales/en.js y es.js.

## Verificación del avance

- Node: **171 subpruebas correctas** (`node --test tests/unit/*.cjs`).
  Incluye 11 casos nuevos de medios/documentos y 2 de archivo animal;
  los servicios simulados no sustituyen las pruebas reales de IndexedDB.
- Estática: **702 comprobaciones correctas** al integrar los módulos actuales;
  sintaxis, CSP, recursos locales y ausencia de dependencias de red. `git diff
  --check` correcto. Los avisos LF/CRLF son normalización de finales de línea.
- Perfiles reales por `file://`: **9 internas + 6 externas** en Chrome y Edge;
  perfiles/ocupación, horas/replay/corrección/papelera/totales, backup/restauración
  y digest idéntico después de cierre completo y reapertura.
- Medios reales: **10 internas + 6 externas** en Chrome y Edge; canvas/decoder,
  fotografía/miniatura/logo, TXT/PDF, referencias externas/hash/vínculos,
  pesos, rechazos atómicos y restauración de bytes. El presupuesto de aplicación
  se inyecta para comprobarlo; no equivale a agotar el disco del navegador.
- Recuperación y cierre forzado: detalle, intentos fallidos y evidencia final
  en [RECOVERY_EVIDENCE.md](RECOVERY_EVIDENCE.md). No confundir cancelación,
  excepción inyectada y terminación real del proceso.
- QA de pantallas: ejecutor `tests/e2e/workspace-ui.cjs`, con formularios reales,
  archivos, descarga/reselección y reapertura. Consultar los últimos JSON
  `workspace-ui-2026-10-16-windows-wip-*` para el resultado de la ronda final.
- Evidencias en tests/results registran versiones, fuentes/huellas, fallos,
  cierres y perfiles sintéticos. Los primeros intentos fallidos por sandbox,
  ejecutable ausente o ejecutor se conservan; no cuentan como aceptación.
  Los cambios aditivos posteriores de idiomas/UI no actualizan retrospectivamente
  las huellas de rondas anteriores. UI final comprueba sus propias fuentes.

## Límites y pendientes

- **No utilizar información real todavía.** Falta aceptación integral,
  rendimiento, accesibilidad y escenarios adicionales de cada módulo.
- Persistencia y validación aún capturan el dataset completo por operación:
  O(N). La prueba Node de volumen no acredita tiempos/memoria en navegador.
  Listas UI paginan en memoria y fotografías se preparan al mostrarlas;
  migrar a índices/lecturas acotadas y carga diferida de binarios.
- Firefox actual pendiente por decisión previa del usuario: no descargar
  instalador sin nueva indicación. Evidencia Firefox anterior corresponde a
  fuentes anteriores. Nuevos recorridos solo Chrome/Edge en Windows.
- Un error QuotaExceededError inyectado no demuestra cuota real agotada.
  Documentar por separado ambas pruebas. Retención/limpieza explícita de
  conjuntos retirados y recursos sin uso aún pendiente; no borrar automáticamente.
- Faltan correcciones coordinadas de historia,
  importación de los otros tipos CSV/JSON, demo y retirada. Contactos CSV ya
  tiene aceptación en CONTACT_IMPORT.md. Exportaciones por módulo ya
  tienen aceptación en MODULE_EXPORTS.md. Finanzas
  tiene aceptación específica separada, con cualquier caso pendiente registrado
  en su informe. Donaciones e inventario ya tienen interfaz, pero su aceptación
  real por navegador tiene 12/12 en Chrome/Edge junto con informes (ver
  REVIEW_RESOURCES_REPORTS.md para alcance y límites).
- Buscador global e historial ya tienen navegación por origen, periodos,
  paginación y transiciones históricas. Ver SEARCH_HISTORY.md: 10/10 por motor
  Chrome/Edge, sin escrituras. Los comandos de corrección aún faltan.
- Pesos: alta/edición/papelera/restauración con aceptación real en
  WEIGHT_HISTORY.md. Logotipo ya tiene UI.
- Faltan correcciones de historias, guías completas EN/ES, impresión final,
  pruebas físicas móviles/tabletas y ZIP comercial. No hay aceptación real
  Android/iOS/iPadOS/macOS/Linux. Un viewport estrecho no es un dispositivo real.
- Licencia comercial pendiente de revisión; no publicar en Etsy.
- Tras recargar, la escritura puede tardar hasta 15 s en volver por el lease.
  No se confía en escrituras durante pagehide; otra pestaña puede tomar control.

## Siguiente acción concreta

1. Leer AGENTS.md, este documento y REQUIREMENTS.es.md completo; comprobar cupos.
2. Revisar UI_ACCEPTANCE.md, WORKFLOWS_UI_ACCEPTANCE.md y HEALTH_UI_ACCEPTANCE.md,
   distinguiendo rondas correctas, cadenas reanudadas e intentos de herramienta.
   No repetir como pendientes los recorridos acreditados ni declarar fases completas.
3. Leer REVIEW_RESOURCES_REPORTS.md: Donaciones/Inventario e Informes ya tienen
   aceptación real. Leer SEARCH_HISTORY.md y ADOPTION_REGISTER.md para lo ya probado.
4. Extender la importación CSV/JSON desde CONTACT_IMPORT.md y completar demo;
   exportaciones por módulo ya
   tienen aceptación en MODULE_EXPORTS.md. Configuración/catálogos
   ya tienen aceptación en CONFIGURATION.md.
   conservar todas las fases del prompt. Los informes ya descargan sus tablas.
5. Abordar O(N), cuota real, accesibilidad, retención explícita y aceptación de
   plataformas antes de habilitar datos reales o preparar distribución comercial.

## Continuidad

Repositorio: https://github.com/JoseAQuinto/WebProtectoraAnimales.git
Git transporta código/documentación, **no los datos del perfil del navegador**.
Para trasladar una organización: copia externa verificada y restauración.
`.tmp`, `.tools`, node_modules, perfiles y capturas temporales están ignorados;
son herramientas de desarrollo, no dependencias del producto. No dependa de
rutas privadas de un PC. Leer ENVIRONMENT_TESTS.md para ejecutar los verificadores.
La publicación del checkpoint se comprueba con git log/status/ls-remote.

## Cierre del checkpoint de pantallas (2026-10-16)

Runtime publicado en `47e6c11`. La ronda workspace-ui final-2 verifica los
recorridos de negocio en Chrome/Edge (contactos/duplicados, perfiles/horas,
animal/peso/foto, documento inválido sin escrituras, TXT/vínculos/externo,
descarga y backup/restauración de bytes). El informe global de UI **no está
aprobado**: el ejecutor encuentra dos encabezados Documents (h1 y h2) en un
selector estricto del siguiente paso. Ajustar ese selector y completar
reapertura/anchos sin repetir rondas opcionales. Consultar el JSON final-2
por motor: no convertir pasos aprobados en aceptación integral. Los defectos
reales encontrados (pestañas y ancho de tablas) se corrigieron antes del runtime
publicado. El helper de cierre de navegadores de pruebas también se corrigió
para reconocer signalCode y liberar CDP tras salida, con identidades verificadas.

## Aceptación posterior de pantallas (2026-10-17)

El selector del ejecutor ya exige encabezado de nivel 1. Los recorridos de
contactos, perfiles, animales y documentos han pasado **13/13 en Chrome y
Edge**, incluidos backup/restauración de bytes y cierre/reapertura. Después
se corrigieron filtros recortados y tablas demasiado comprimidas a 360 px;
**5/5 comprobaciones visuales dirigidas por motor**, sin modificar registros,
revisión ni bytes. Ver [UI_ACCEPTANCE.md](UI_ACCEPTANCE.md). Esta ronda no
acredita los módulos de acogida/adopción/salud/tareas conectados posteriormente.

## Flujos de cuidado y adopción (2026-10-17)

Acogida/adopción: **16 comprobaciones acreditadas por motor** en Chrome/Edge,
en una cadena de tres rondas (8+2+6 nuevas). Las aprobadas se heredan de su
evidencia anterior y se etiquetan; no se afirma haber ejecutado las 16 en una
sola ronda. Incluyen revisión obsoleta, excepción, vigencia inclusiva de reserva,
cierre coordinado/tareas/cuota, documentos, devolución, backup y reapertura.
Fuentes intactas y cierres propios verificados; los fallos de selección del
ejecutor se conservan. Ver WORKFLOWS_UI_ACCEPTANCE.md.

Salud/tareas: **12 comprobaciones correctas en Chrome y Edge**, incluyendo plan y
tarea clínica, acto/gasto/evento únicos, factura existente, referencias
inactivas, hora/zona y persistencia. La auditoría suplementaria de Chrome
coincide en sus 63 fuentes; Edge compara inicio/fin. Los intentos fallidos por
ruta o selección lógica del ejecutor se conservan en HEALTH_UI_ACCEPTANCE.md.
El calendario tiene dos
pruebas Node nuevas; la ronda conjunta suma **117 subpruebas correctas**.

## Finanzas y cierre del avance (2026-10-17)

**12/12 comprobaciones correctas en Chrome y Edge**, 64 fuentes cargadas sin
cambios durante las rondas, dos cierres completos por motor sin forzar ni
procesos restantes y digest/revisión conservados al reabrir. Incluye importes
exactos, rechazos sin escrituras con campos retenidos, filtros/totales,
anulación y sustituto enlazado, revisión antigua, controles estrechos y menú
desplazable a 360×640. Ver FINANCE_UI_ACCEPTANCE.md. Los dos primeros fallos
fueron de preparación/selector del ejecutor; se conservan sin contarlos como
aceptación. La lectura de tablas estrechas todavía necesita pulido.

Última verificación conjunta: **117 pruebas Node y 592 comprobaciones
estáticas correctas**, además de `git diff --check`. Solo quedaron perfiles y
capturas de prueba ignorados bajo `.tmp`; los navegadores propios se cerraron.
No se consumió ningún reinicio de cuota. Las evidencias y ejecutores viajan con
Git; los datos del perfil del navegador y herramientas externas no viajan.

## Donaciones e inventario (2026-10-18)

Se añaden las pantallas `#donations` y `#inventory` conectadas a los servicios
existentes `donations.js` e `inventory.js`, sin duplicar efectos de negocio.
`index.html` carga los dos módulos nuevos y el menú lateral los enlaza tras
Finanzas. Los servicios no cambiaron: la interfaz usa `createMonetary`,
`createMaterial`, `void`, `createItem`, `move`, `compensate`, `archive` y
`stock`. Traducciones `dn.*`/`iv.*` en EN y ES con paridad verificada.

Donaciones: alta económica (donación + un único ingreso), alta material con
1–1000 líneas (tipo de material, descripción, cantidad con precisión 0–3,
unidad, artículo opcional y valor estimado separado del ingreso), anulación
coordinada y ficha con ingreso/líneas vinculadas. Inventario: artículos con
existencias derivadas, mínimo y niveles bajo/en el mínimo, alta, movimientos
(saldo inicial, compra, consumo, devolución, ajuste con signo explícito, gasto
opcional solo en compra), compensación y archivo.

Verificado: sintaxis/estática 592, paridad EN/ES (core.cjs) y 117 subpruebas
Node correctas, incluidas las 10 de `resources.cjs`. **Aceptación real por
navegador pendiente**: no se han ejecutado recorridos `file://` de estas dos
pantallas; ver DONATIONS_INVENTORY_UI.md para el alcance de la comprobación.

## Registro global de adopciones (2026-10-18)

Solicitudes, reservas y adopciones en #adoptions con filtros, páginas y detalle
exacto que reutiliza los formularios existentes. Ciclo completo desde UI global
con aceptación Chrome/Edge 10/10 por motor, sin cambios de formatos; ver
ADOPTION_REGISTER.md. Última ronda conjunta: 142 pruebas Node y 632 estáticas.

## Configuración y catálogos (2026-10-18)

Preferencias reales de animales, impresión y recordatorios; logotipo con bytes
validados y retirada conservadora; mantenimiento de opciones/ubicaciones y
rechazo de ciclos. Chrome/Edge 13/13 por motor con descarga/verificación de
copia, umbral de escrituras y reapertura. Ver CONFIGURATION.md. Última ronda
conjunta: 151 pruebas Node y 652 estáticas correctas.

## Exportaciones por módulo (2026-10-18)

Centro de exportación con filtros/alcance explícitos para los nueve tipos
obligatorios. CSV con precisión y protección de fórmulas; JSON v1 con registros
y referencias, sin bytes y marcado como no backup. Chrome/Edge 10/10 por motor
con 18 descargas obligatorias más subconjuntos/vacíos y reapertura. Ver
MODULE_EXPORTS.md. Última ronda conjunta: 157 pruebas Node y 667 estáticas.

## Importación CSV de contactos (2026-10-18)

Asistente con plantilla/mapeo, revisión de duplicados, identidades externas,
actualización parcial, informes y subconjuntos explícitos. Lotes pequeños
atómicos y grandes con copia actual verificada, dataset separado y activación
atómica. Chrome/Edge 13/13 por motor con 1.001 contactos, cancelación real de
preparación, conjunto anterior y bytes conservados. Ver CONTACT_IMPORT.md.
Última ronda conjunta: 166 Node y 687 estáticas. Otros CSV y JSON aún pendientes.

## Filtros combinados de animales (2026-10-18)

Consulta pura y lista separada: especie/sexo/raza/situación/disponibilidad/
ubicación/familia/adoptante con OR dentro y AND entre filtros, periodos
inclusivos de última entrada y del mismo hecho de adopción, archivo/papelera,
valores retirables y paginación. Chrome/Edge 10/10 por motor, bytes/reapertura
conservados. ANIMAL_FILTERS.md; 171 Node y 697 estáticas correctas.

## Papelera de mediciones (2026-10-18)

UI paginada, confirmaciones y restauración del mismo UUID con último peso
derivado. Animales archivados conservan consulta sin escritura. Chrome/Edge
9/9 por motor y reapertura; WEIGHT_HISTORY.md. 171 Node y 702 estáticas.
