# Estado del proyecto

Actualizado: 2026-10-17. Versión de trabajo: `0.2.0-dev`.
Entrada de relevo: [CONTINUE_HERE.md](CONTINUE_HERE.md).

## Fase actual

Desarrollo reanudado desde `c44831b`, incorporado con `git pull --ff-only`
antes de editar. Se conservan las correcciones R1–R4 y los servicios existentes.
Ahora hay pantallas operativas de animales, contactos, perfiles/estancias de
acogida, adopciones, voluntariado, documentos, salud/planes y tareas/calendario.
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
- Donaciones e inventario aún sin CRUD de interfaz; finanzas en integración.

Contratos: CONTACTS_API.md, LIFECYCLE_API.md, VOLUNTEERS_API.md,
DOCUMENTS_API.md, HEALTH_API.md, RESOURCES_API.md, PEOPLE_UI.md,
ANIMAL_FORMS_UI.md, FOSTER_UI.md, ADOPTION_UI.md, HEALTH_UI.md y TASKS_UI.md.
`index.html` carga servicios clásicos en orden explícito;
`documents.js` precede a `photos.js`. Las cadenas están en locales/en.js y es.js.

## Verificación del avance

- Node: **117 subpruebas correctas** (`node --test tests/unit/*.cjs`).
  Incluye 11 casos nuevos de medios/documentos y 2 de archivo animal;
  los servicios simulados no sustituyen las pruebas reales de IndexedDB.
- Estática: **541 comprobaciones correctas** al integrar módulos y recuperación;
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
- Faltan vistas globales de solicitudes/adopciones, correcciones de historia,
  interfaz de donaciones/inventario, informes, buscador global,
  importación/exportación, demo y retirada. Finanzas en integración.
- El historial animal aún no enlaza cada evento con su origen ni distingue
  todos los parámetros de estado de las solicitudes. No equivale a pérdida
  de registros: estos se conservan y consultan en sus secciones específicas.
- Pesos permiten alta/edición en interfaz; papelera/restauración existen en
  servicio pero todavía no tienen recorrido visible completo. Logotipo solo API.
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
3. Cerrar la aceptación de finanzas y conectar donaciones/inventario usando los
   servicios existentes, sin duplicar efectos de negocio al vincular operaciones.
4. Completar navegación/correcciones del historial, vistas globales e informes,
   importación/exportación y demo; conservar todas las fases del prompt.
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
