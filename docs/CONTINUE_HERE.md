# Continuar desde otro PC o con otra IA

Checkpoint: **2026-10-19**, rama **main**, app **0.2.0-dev**.
DB **2**, schema **1**, backup **1**, sin cambios de formato.
Repositorio: https://github.com/JoseAQuinto/WebProtectoraAnimales.git
**Producto incompleto: solo datos sintéticos. Este chat no es necesario.**

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
- Consultar git log para el último relevo documental.

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
| Guía interna offline EN/ES | HELP.md | 4/4 dirigidas por motor |
| Filtros OR/AND de animales | ANIMAL_FILTERS.md | 10/10 por motor |
| Mediciones: edición/papelera/restauración | WEIGHT_HISTORY.md | 9/9 por motor |
| Panel, 17 tarjetas/listas y tres gráficos | DASHBOARD.md | 10/10 por motor |

Las rondas e intentos anteriores están en tests/results y explicados en cada
documento. No borrar intentos fallidos ni atribuir nuevas huellas a rondas viejas.
Última demo: 108 fuentes, 15/15 por motor, archivos/revisiones/digest conservados
tras dos cierres propios. Última guía: 109 fuentes, 4/4 por motor; recorrido de
19 capítulos EN/ES, foco, ruta, anchos y visibilidad print, sin escribir negocio.
La prueba dirigida de guía no repite ni sustituye la aceptación de los módulos.
Emular viewport no acredita un dispositivo físico. Firefox actual sigue aplazado
por decisión previa; no descargar instaladores sin nueva indicación.

Verificación conjunta: **264 pruebas Node / 832 estáticas**, diff sin errores:

```powershell
node tests/static-checks.cjs
node --test --test-reporter=spec tests/unit/*.cjs
git diff --check
```

Ejecutores persistentes en tests/e2e: contact-import-ui, animal-import-ui,
related-import-ui, finance-import-ui, donation-import-ui, module-import-ui,
module-import-layout y demo-ui, además de los anteriores por módulo.
Consultar ENVIRONMENT_TESTS.md y sus argumentos --browser, --machine, --output
con nombre nuevo y --executable opcional. No sobrescribir evidencia.
La guía usó una comprobación puntual descrita en HELP.md, sin suite nueva de negocio.
Node/Playwright son herramientas de desarrollo: no son requisitos del comprador.

## Siguiente acción concreta

1. Extender las correcciones históricas desde HISTORY_CORRECTIONS.md. Entrada
   y devolución ya están implementadas y acreditadas; no volver a presentarlas
   como inexistentes. Acogidas y actos clínicos ya tienen UI y aceptación en HISTORY_LINKED_FACTS.md,
   con factura conservada explícitamente y tarea/esterilización coordinadas.
   Formalización ya tiene decisiones individuales: HISTORY_ADOPTION.md.
   Solicitudes/reservas independientes ya tienen UI en HISTORY_WORKFLOW.md.
   Seguir traslados y salidas/fallecimiento con sus
   dependencias y evento sustituto. No presentar como inexistentes estos bloques.
   No inferir cierres por una coincidencia de fechas ni reproducir dinero, stock
   o tareas. Formalización/salidas/muerte requieren revisión de dependencias
   individuales. Los eventos originales son inmutables en el repositorio.
2. Retención/limpieza explícita de staging/retirados y recursos sin uso, con copia
   verificada, revisión, dependencias y cancelación. No borrar automáticamente ni
   confundir retirada de demo con borrado general. Decidir borrado definitivo de
   negocio con revisión de relaciones, preservando historia válida.
3. Reducir snapshots/validaciones O(N), lecturas por índices y binarios diferidos.
   Importación JSON también tiene búsquedas de candidatos O(N*M). Los límites de
   seguridad del parser no acreditan rendimiento a esos máximos. Probar memoria,
   volumen y cuota física por separado de errores inyectados.
4. Completar impresión paginada y opción de datos personales, accesibilidad
   integral y aceptación por plataformas físicas. La guía EN/ES y README bilingües
   ya existen (HELP.md); no enumerarlos como inexistentes. Revisar contenido y
   recorridos con la aceptación final. No hay aceptación Android/iOS/iPadOS,
   macOS/Linux ni Firefox actual sobre las fuentes actuales.
5. Revisión comercial/licencias, paquete ZIP y aceptación completa fases 0–12.
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
