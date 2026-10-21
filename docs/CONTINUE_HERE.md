# Continuar desde otro PC o con otra IA

Checkpoint: **2026-10-21**, rama **main**, app **0.2.0-dev**.
DB **2**, schema **1**, backup **1**, sin cambios de formato.
Repositorio: https://github.com/JoseAQuinto/WebProtectoraAnimales.git
**Producto incompleto: solo datos sintéticos. Este chat no es necesario.**

**Avance del 2026-10-21.** Se comprobaron cambios locales/remoto: checkout limpio
y fetch/pull --ff-only sin diferencias desde 76abad3. Inspección estructural
sin duplicación y esquemas compilados: VALIDATION_PERFORMANCE.md. 303 Node /
917 estáticas; regresión actual 66 rondas / 918 comprobaciones, 0 fallos,
más volumen 17/17 por motor a 50k + 32 MiB (VOLUME.md). Las validaciones de
campos y relaciones siguen completas. Ver git log para commits de este bloque.

**Relevo histórico del 2026-10-20 (parada por indicación del usuario).** Último commit: ver
`git log -1`; árbol limpio y remoto igual tras subirlo. Cupo al cerrar: 11 % de
la ventana de cinco horas y 39 % semanal consumidos; no se usaron créditos de
reinicio. No queda trabajo a medio aplicar fuera de Git.

Hecho hoy (no repetir como pendiente), cada bloque con su documento y evidencia:

- Archivos incorporados sin referencias del activo: ASSET_RETENTION.md.
- Papelera con eliminación definitiva revisada por raíz: TRASH_PURGE.md.
- Ficha imprimible del animal con datos personales opcionales: ANIMAL_PRINT.md.
- Volumen/latencia hasta 50k registros y una sola instantánea por escritura: VOLUME.md.
- Auditoría automática de accesibilidad (0 incidencias): ACCESSIBILITY.md.
- ZIP de desarrollo reproducible verificado extraído: PACKAGE.md (no publicar).
- Prueba integral con restauración en otro perfil: INTEGRAL_ACCEPTANCE.md.
- Navegación agrupada (req. 31) y diagnóstico técnico local (req. 36):
  NAVIGATION_DIAGNOSTICS.md. Última regresión completa con las fuentes finales:
  `*-2026-10-20-{chrome,edge}-nav-diagnostics.json`, **68 rondas, 926 comprobaciones,
  0 fallos**, más `help-ui-2026-10-20-nav-diagnostics-*`.

**Siguiente acción concreta:** validación incremental por tablas afectadas (la
validación completa cuesta ~0,54–0,66 s a 50k registros, VOLUME.md) y listas por índices
o cursor con binarios diferidos; repetir `volume-ui` y la regresión completa.
Después: plurales con `Intl.PluralRules` en textos «archivo(s)»/«grupo(s)» nuevos,
revisión manual de accesibilidad con lector de pantalla, aceptación en dispositivos
físicos y Firefox actual (aplazado por decisión del usuario; no descargar sin
indicación), y revisión de licencia por el titular antes de cualquier publicación.

## Inicio

Clonar el repositorio y abrir index.html directamente para usar la aplicación.
Para desarrollar, ejecutar git status y git log -12 --oneline. En un checkout
limpio, git pull --ff-only. Si existen cambios locales, revisarlos y conservar
los válidos; no resetear ni sobrescribirlos. No modificar .env, secretos ni
credenciales. Commits/push autorizados sobre la rama actual, sin force.

Leer completos AGENTS.md, PROJECT_STATUS.md y REQUIREMENTS.es.md. Los requisitos
originales permanecen íntegros. El trabajo local de DeepSeek se revisó y conservó:
18e79a9 y correcciones de informes 21f9f56. No repetir esa revisión como pendiente.

Regla de continuidad: cuando quede **menos del 10 % de la ventana de 5 horas**
o **3 % o menos semanal**, cerrar desarrollo, documentar, commit y push.
No consumir créditos de reinicio sin indicación expresa. Desarrollo reanudado
el 2026-10-19 con cupo ordinario renovado; el corte del día anterior es histórico.

## Bloques recientes ya publicados

- ad8e26a: CSV de animales, entradas e identidades revisadas.
- c4e4d37: CSV de perfiles voluntarios y solicitudes coordinadas.
- ed49d52: CSV económico con importes exactos y correcciones enlazadas.
- 4ce3339: CSV de donaciones agrupadas con ingresos/existencias únicos.
- c041b9b: JSON por módulos, relaciones y archivos sin repetir efectos.
- c97fd8c: demo opcional EN/ES y retirada/conversión que protege trabajo real.
- 0415754: guía interna EN/ES, inicio rápido y traslado/actualización seguros.
- 4ba35ba: fechas de entrada/devolución y protección de eventos originales.
- 54d1fb1: fechas de acogidas y salud, tarea/esterilización coordinadas.
- ff33589: fecha de adopción con decisiones de cierres relacionados.
- 272d678: fechas de solicitudes/reservas y cierres automáticos con evento.
- 85dce36: fechas de traslado/salida/muerte conservando su historia.
- 2b162dd: fecha documental y todos sus historiales animales coordinados.
- eacd40c: limpieza revisada de retired/staging con copias verificadas.
- 2026-10-20: archivos incorporados sin referencias del activo (ver git log).
- Consultar git log para guía sincronizada y último relevo documental.

## Estado funcional y evidencia

| Área | Documento | Aceptación Chrome/Edge |
|---|---|---|
| Personas, animales, medios y documentos | UI_ACCEPTANCE.md | 13 + 5 dirigidas por motor |
| Acogida/adopción coordinada | WORKFLOWS_UI_ACCEPTANCE.md | 16 por motor, cadena documentada |
| Salud, planes, tareas y calendario | HEALTH_UI_ACCEPTANCE.md | 12/12 por motor |
| Finanzas, anulación y sustitutos | FINANCE_UI_ACCEPTANCE.md | 12/12 por motor |
| Donaciones, inventario e informes | REVIEW_RESOURCES_REPORTS.md | 12/12 por motor |
| Buscador y origen del historial | SEARCH_HISTORY.md | 10/10 por motor |
| Registro global solicitudes/reservas/adopciones | ADOPTION_REGISTER.md | 10/10 por motor |
| Configuración, catálogos, ubicaciones, logo, copias | CONFIGURATION.md | 13/13 por motor |
| Exportaciones CSV/JSON de los 9 tipos obligatorios | MODULE_EXPORTS.md | 10/10 por motor |
| Asistente CSV **de contactos** y lotes grandes | CONTACT_IMPORT.md | 13/13 por motor |
| Asistente CSV de animales/entradas | ANIMAL_IMPORT.md | 15/15 por motor |
| CSV de perfiles voluntarios y solicitudes | RELATED_IMPORT.md | 16/16 por motor |
| CSV económico/correcciones enlazadas | FINANCE_IMPORT.md | 16/16 por motor |
| CSV donaciones/materiales agrupados | DONATION_IMPORT.md | 16/16 por motor |
| JSON por módulos/archivos/reconstrucción | MODULE_JSON_IMPORT.md | 22 funcionales + 4 dirigidas por motor |
| Demostración EN/ES y retirada/conversión | DEMO.md | 15/15 por motor |
| Corrección de entrada/devolución | HISTORY_CORRECTIONS.md | 17/17 por motor |
| Corrección de acogidas y actos sanitarios | HISTORY_LINKED_FACTS.md | 17/17 por motor |
| Corrección de formalización/cierres elegidos | HISTORY_ADOPTION.md | 17/17 por motor |
| Fechas de solicitudes/reservas | HISTORY_WORKFLOW.md | 18/18 por motor |
| Fechas de traslado/salida/fallecimiento | HISTORY_DEPARTURE.md | 18/18 por motor |
| Fecha documental con todos sus historiales | DOCUMENT_DATE_CORRECTIONS.md | 17/17 por motor |
| Limpieza de conjuntos retirados/staging | RETENTION.md | 18/18 por motor |
| Archivos incorporados sin referencias del activo | ASSET_RETENTION.md | 19/19 por motor |
| Papelera: eliminación definitiva revisada | TRASH_PURGE.md | 19/19 por motor |
| Ficha imprimible del animal | ANIMAL_PRINT.md | 11/11 por motor |
| Volumen/latencia hasta 50k registros + 32 MiB | VOLUME.md | 17/17 por motor (medición) |
| Auditoría automática de accesibilidad | ACCESSIBILITY.md | 11/11 por motor, 0 incidencias |
| ZIP de desarrollo reproducible y extraído | PACKAGE.md | 8/8 por motor |
| Integral: todos los módulos, restauración en otro perfil | INTEGRAL_ACCEPTANCE.md | 9/9 por motor |
| Regresión completa tras reutilizar la captura | VOLUME.md | 63 rondas / 889 comprobaciones |
| Navegación agrupada y diagnóstico técnico local | NAVIGATION_DIAGNOSTICS.md | 10/10 por motor |
| Regresión completa con fuentes finales del día | NAVIGATION_DIAGNOSTICS.md | 68 rondas / 926 comprobaciones |
| Guía interna offline EN/ES | HELP.md | 4/4 dirigidas por motor |
| Filtros OR/AND de animales | ANIMAL_FILTERS.md | 10/10 por motor |
| Mediciones: edición/papelera/restauración | WEIGHT_HISTORY.md | 9/9 por motor |
| Panel, 17 tarjetas/listas y tres gráficos | DASHBOARD.md | 10/10 por motor |

Las rondas e intentos anteriores están en tests/results y explicados en cada
documento. No borrar intentos fallidos ni atribuir nuevas huellas a rondas viejas.
Última demo: 108 fuentes, 15/15 por motor, archivos/revisiones/digest conservados
tras dos cierres propios. Guía original: 109 fuentes, 4/4 por motor; recorrido de
19 capítulos EN/ES, foco, ruta, anchos y visibilidad print, sin escribir negocio.
Guía sincronizada del 2026-10-19: 120 fuentes, 4/4 por motor en
help-ui-2026-10-19-current-{chrome,edge}.json. Explica las funciones nuevas
sin alterar negocio. La prueba dirigida no repite ni sustituye la aceptación
de los módulos. Las rondas funcionales mantienen sus hashes originales.
Emular viewport no acredita un dispositivo físico. Firefox actual sigue aplazado
por decisión previa; no descargar instaladores sin nueva indicación.

Verificación conjunta: **303 pruebas Node / 917 estáticas**, diff sin errores:

```powershell
node tests/static-checks.cjs
node --test --test-reporter=spec tests/unit/*.cjs
git diff --check
```

Ejecutores persistentes en tests/e2e: contact-import-ui, animal-import-ui,
related-import-ui, finance-import-ui, donation-import-ui, module-import-ui,
module-import-layout, demo-ui, asset-retention-ui, trash-purge-ui, animal-print-ui, volume-ui, a11y-ui, package-ui, integral-ui y nav-diagnostics-ui, además de los anteriores por módulo.
Usar tests/e2e/regression.cjs para la selección de suites; consultar
ENVIRONMENT_TESTS.md y sus argumentos --browser, --machine, --output
con nombre nuevo y --executable opcional. No sobrescribir evidencia.
La guía usó una comprobación puntual descrita en HELP.md, sin suite nueva de negocio.
Node/Playwright son herramientas de desarrollo: no son requisitos del comprador.

## Siguiente acción concreta

Prioridad vigente: la indicada en el avance del 2026-10-21 al principio de este
documento. La lista siguiente conserva el contexto de cada área pendiente.

1. Leer los cinco documentos HISTORY_*.md: entrada/devolución, acogida/salud,
   formalización, solicitudes/reservas y traslados/salidas/muerte ya tienen UI
   y evidencia. No volver a enumerarlos como inexistentes. Son correcciones
   fechadas, no edición libre de contenido ni reversión de estados. Fecha documental ya tiene revisión global y aceptación en
   DOCUMENT_DATE_CORRECTIONS.md. Revisar aún casos históricos ambiguos/mal enlazados. No inventar causalidad ni fechas, ni reproducir dinero,
   stock o tareas. Los eventos originales son inmutables en el repositorio.
2. Leer RETENTION.md y ASSET_RETENTION.md: retired/staging y archivos sin
   referencias del activo ya tienen UI, copias, guardias, cancelación, replay y
   aceptación. No repetirlos como pendientes. La papelera tiene eliminación
   definitiva revisada por raíz (TRASH_PURGE.md); no hay vaciado masivo ni borrado
   de archivados. No repetirlos como pendientes.
3. Reducir snapshots/validaciones O(N) (cifras reales en VOLUME.md: dos instantáneas
   por escritura), lecturas por índices y binarios diferidos.
   Importación JSON también tiene búsquedas de candidatos O(N*M). Los límites de
   seguridad del parser no acreditan rendimiento a esos máximos. Probar memoria,
   volumen y cuota física por separado de errores inyectados.
4. Ficha imprimible del animal con datos personales opcionales ya existe
   (ANIMAL_PRINT.md). Completar accesibilidad integral, impresión física y
   aceptación por plataformas físicas. La guía EN/ES y README bilingües
   ya existen (HELP.md); no enumerarlos como inexistentes. Revisar contenido y
   recorridos con la aceptación final. No hay aceptación Android/iOS/iPadOS,
   macOS/Linux ni Firefox actual sobre las fuentes actuales.
5. Revisión comercial/licencias y aceptación completa fases 0–12. El ZIP de
   desarrollo ya se construye y verifica (PACKAGE.md); no publicarlo.
   No publicar Etsy ni inventar términos legales. No declarar producto final.

## Decisiones de implementación

- file://, vanilla, IIFE, scripts defer y recursos locales. Sin servidor, CDN,
  fetch local, módulos ES en navegador ni LocalStorage.
- UI de negocio usa servicios. IndexedDB es la verdad; toda escritura comprueba
  lease/dataset/revisión/idempotencia y confirma solo al completar transacción.
- Planes de importación privados, previsualización pura. CSV simple puede usar
  transacción; complejo/grande, JSON y demo siempre preparan conjunto separado,
  validan y activan atómicamente con copia actual verificada. Nunca vaciar primero.
- CSV crea/transiciona mediante comandos coordinados; JSON reconstruye el grafo
  sin ejecutar otra vez efectos. Exportación cierre v2 conserva formato módulo 1;
  lector admite v1/v2 con validación. JSON parcial no es backup y no contiene bytes.
- Demo marca todas sus filas con lote. Retirada protege componentes conectados
  referidos desde trabajo real, exige consentimiento para convertirlos y conserva
  UUID, hechos y bytes. No modificar ni eliminar filas reales externas al lote.
- Dinero/cantidades enteros seguros, fechas ISO civiles; datos de usuario textContent.
- Mantener UTF-8 sin BOM. No usar Get-Content/Set-Content para reescribir fuentes
  con PowerShell 5.1. apply_patch o fs.writeFileSync de Node preservan Unicode.

## Guardar y trasladar

Cerrar solo procesos/perfiles de QA propios. Actualizar estado/changelog/evidencia,
commit/push sin force, comparar HEAD con refs/heads/main remota y dejar árbol limpio.
.tmp, .tools, node_modules y perfiles/capturas se ignoran; no son parte del producto.

Git transporta código/documentación, **no los datos del perfil del navegador**.
Para trasladar una organización, generar/descargar/reseleccionar una copia completa
verificada, conservarla externamente y restaurar en el otro PC. Llevar aparte los
originales de documentos externos. No retirar el origen hasta verificar el destino.
