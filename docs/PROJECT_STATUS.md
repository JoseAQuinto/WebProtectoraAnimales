# Estado del proyecto

Actualizado: 2026-10-16. Versión de trabajo: `0.2.0-dev`.
Entrada de relevo: [CONTINUE_HERE.md](CONTINUE_HERE.md).

## Fase actual

Desarrollo reanudado desde `c44831b`, incorporado con `git pull --ff-only`
antes de editar. Se conservan las correcciones R1–R4 y los servicios existentes.
Ahora hay pantallas operativas de animales, contactos, perfiles de acogida,
voluntariado y documentos. **Producto incompleto: utilizar datos sintéticos.**
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
- Servicios todavía sin CRUD completo de interfaz: acogidas/asignaciones,
  solicitudes/reservas/adopciones/devoluciones, salud/planes/tareas,
  finanzas/donaciones/inventario. La ficha animal ya consulta su historia real.

Contratos: CONTACTS_API.md, LIFECYCLE_API.md, VOLUNTEERS_API.md,
DOCUMENTS_API.md, HEALTH_API.md, RESOURCES_API.md, PEOPLE_UI.md y
ANIMAL_FORMS_UI.md. `index.html` carga servicios clásicos en orden explícito;
`documents.js` precede a `photos.js`. Las cadenas están en locales/en.js y es.js.

## Verificación del avance

- Node: **115 subpruebas correctas** (`node --test tests/unit/*.cjs`).
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
- Faltan UI y aceptación de asignar/finalizar acogidas; solicitudes, reservas,
  adopciones y devoluciones; salud, calendario/tareas; finanzas, donaciones e
  inventario; informes, buscador global, importación/exportación, demo y retirada.
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
2. Revisar el último workspace-ui JSON y RECOVERY_EVIDENCE.md y resolver cualquier
   caso no aprobado antes de extender interfaz. No declarar todas las fases completas.
3. Conectar asignación/finalización de acogidas y solicitudes/reservas/adopción/
   devolución a las secciones ya visibles de la ficha animal, usando los servicios
   existentes y decisiones explícitas de tareas/cierres. Ver LIFECYCLE_API.md.
4. Conectar salud/planes/tareas y calendario, después recursos/finanzas e informes;
   conservar las fases completas del prompt, importación/exportación y demo.
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
