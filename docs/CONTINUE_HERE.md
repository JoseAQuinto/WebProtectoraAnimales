# Continuar desde otro PC o con otra IA

Checkpoint: **2026-10-18**, rama **main**, app **0.2.0-dev**.
DB **2**, schema **1**, backup **1**. Repositorio:
https://github.com/JoseAQuinto/WebProtectoraAnimales.git

Se revisó el commit local de otra IA `18e79a9` y todos sus cambios pendientes.
Se conservaron donaciones/inventario y se corrigieron/completaron informes en
`21f9f56`. Después se publicaron bloques separados: buscador/historial,
registro global de adopciones, configuración/catálogos/logotipo, exportaciones,
importación CSV de contactos, filtros de animales, mediciones y panel operativo.
Después del corte se añadió CSV de animales (ANIMAL_IMPORT.md): 15/15 por
motor y regresión de contactos 13/13. Consultar `git log -12 --oneline` para el commit final de este checkpoint.
**Producto incompleto: solo datos sintéticos. Este chat no es necesario.**

## Inicio

```powershell
git clone https://github.com/JoseAQuinto/WebProtectoraAnimales.git
cd WebProtectoraAnimales
git status
git log -12 --oneline
```

En un checkout limpio, `git pull --ff-only`. Si hay cambios locales, revisarlos
y conservarlos; no resetear ni sobrescribir avances válidos. No modificar `.env`,
secretos ni credenciales. Commits/push autorizados en la rama actual, sin force.

Leer `AGENTS.md`, `docs/PROJECT_STATUS.md` y `docs/REQUIREMENTS.es.md` completos.
El alcance original permanece íntegro. Mantener las restricciones file://,
vanilla/IIFE/scripts defer, recursos locales, sin servidor/CDN/fetch local ni
LocalStorage. UI de negocio usa servicios; IndexedDB es la única verdad.
Escrituras con lease/dataset/revisión/idempotencia y éxito solo tras completar.

Guardar/documentar/commit/push cuando quede **menos del 10 % de 5 horas**, o
**3 % o menos semanal**. No consumir créditos de reinicio. Esta sesión prepara
el relevo tras leer 91 % consumido en cinco horas (9 % restante) y 14 % semanal
consumido. El desarrollo se detiene por ese umbral; no se ha usado reinicio.

## Estado funcional y evidencia vigente

Abrir `index.html` directamente. Crear organización sintética o restaurar copia.
Los servicios, formularios y transiciones anteriores siguen disponibles.

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
| Filtros OR/AND de animales | ANIMAL_FILTERS.md | 10/10 por motor |
| Mediciones: edición/papelera/restauración | WEIGHT_HISTORY.md | 9/9 por motor |
| Panel, 17 tarjetas/listas y tres gráficos | DASHBOARD.md | 10/10 por motor |

No volver a presentar estos recorridos como pendientes ni afirmar fases completas.
Los JSON están en `tests/results`; los intentos fallidos se conservan y explican.
Último bloque: **90 fuentes cargadas intactas**, dos cierres propios por motor,
revisión/recuentos/digest de tablas y hashes reales de Blob conservados al reabrir.
Sin errores de página/consola ni HTTP de la página. Anchos emulados no son hardware.

Verificación conjunta final: **202 pruebas Node, 747 estáticas**, diff sin errores:

```powershell
node tests/static-checks.cjs
node --test --test-reporter=spec tests/unit/*.cjs
git diff --check
```

Ejecutores nuevos, todos con `--browser`, `--output`, `--machine` y `--executable`
opcional; no sobrescriben evidencia y cierran solo sus procesos/perfiles:

```powershell
node tests/e2e/dashboard-ui.cjs --browser chrome --machine MI-EQUIPO --output dashboard-NUEVA-RONDA.json
node tests/e2e/contact-import-ui.cjs --browser chrome --machine MI-EQUIPO --output contact-import-NUEVA-RONDA.json
```

Otros: `resources-reports-ui`, `search-history-ui`, `adoption-register-ui`,
`settings-configuration-ui`, `module-exports-ui`, `animal-filters-ui`,
`weights-history-ui` (todos `.cjs`). Ver ENVIRONMENT_TESTS.md para runtime y rutas.
Firefox actual sigue aplazado por decisión previa; no descargar instalador sin
nueva indicación. No instalar herramientas dentro del producto comercial.

## Siguiente acción concreta

1. Extender fase 10 desde CONTACT_IMPORT.md. **Contactos CSV ya está completo y
   probado en su alcance**, incluido mapeo, duplicados explícitos, campos sin
   mapear, actualizaciones parciales, identidades externas y 1.001 contactos
   mediante dataset separado. Animales CSV ya tiene entradas/fichas y aceptación propia. Perfiles voluntarios/solicitudes ya tienen aceptación en RELATED_IMPORT.md.
   Movimientos ya tienen aceptación en FINANCE_IMPORT.md. Faltan donaciones
   CSV y JSON v1 de módulos. Añadir
   interpretación explícita de fechas/importes, conflicto microchip/código,
   asociación por IDs/códigos y agrupación de líneas materiales. No resolver
   relaciones solo por nombre ni duplicar efectos al reconstruir datos.
2. Reutilizar `import-parser.js`; el planificador `contact-import.js` es específico
   de contactos. Extraer responsabilidades comunes con pruebas si se generaliza;
   no copiar sus reglas a finanzas/stock como si fueran simples fichas. Planes
   privados, revisión revalidada, subconjuntos expresos y activación atómica.
   JSON de módulo no contiene bytes y no es backup; comprobar referencias/archivos
   ausentes. Mantener los límites de esquema/formato y todo el alcance original.
3. Comandos coordinados de corrección de hechos e historial. La consulta ya
   distingue versiones y abre orígenes; **no existe aún UI de corrección general**.
4. Demostración opcional completa y retirada segura, solo sin negocio real;
   detectar dependencias reales y permitir conversión. Retención/limpieza
   explícita de staging retirado y recursos sin uso, sin borrado automático.
5. Guías EN/ES, impresión paginada final, accesibilidad, volumen/cuota real,
   plataformas físicas, revisión legal/licencias y ZIP comercial. No publicar Etsy.

## Riesgos conservados

Capturas/validación de dataset completo por operación: O(N). La UI no decodifica
fotos/documentos en el panel; los repositorios aún capturan referencias Blob.
Hace falta lecturas acotadas/índices/lazy binarios con pruebas reales de memoria.
Un QuotaExceededError inyectado no acredita agotamiento real. No hay aceptación
Android/iOS/iPadOS/macOS/Linux ni Firefox actual sobre este runtime.

Los CSV protegen fórmulas y conservan texto en lo que permite el formato; las
hojas de cálculo pueden transformar tipos/protecciones. JSON conserva tipos.
Tras recargar puede haber hasta 15 s de lectura por el lease anterior; no se
confía en escrituras de pagehide. Los conjuntos previos se conservan al activar
restauraciones/importaciones grandes. Las preparaciones canceladas no se borran
solas. La licencia comercial sigue pendiente de revisión.

## Guardar o trasladar

Cerrar solo navegadores de QA propios. Actualizar estado/changelog/evidencias,
revisar diff y temporales, commit/push sin force y comprobar HEAD/remoto y árbol
limpio. `.tmp`, `.tools`, perfiles/capturas y node_modules se ignoran. Conservar
UTF-8 sin BOM; no reescribir archivos con Get-Content/Set-Content de PowerShell 5.1.

Git transporta código y documentación, **no los datos del perfil del navegador**.
Para trasladar una organización: generar, descargar y reseleccionar/verificar
copia completa; conservarla externamente y restaurar en el otro PC. Los archivos
registrados como referencias externas se trasladan por separado.

Continuación posterior al corte: se reanudó con cupo renovado ordinariamente;
CSV de animales y regresión contactos publicados con alcance ANIMAL_IMPORT.md.
El corte del 9 % anterior es histórico, no una lectura de esta nueva sesión.

Siguiente checkpoint: CSV de perfiles voluntarios y solicitudes publicado;
194 Node / 742 estáticas, 16/16 Chrome/Edge y 334 solicitudes con activación
atómica. Continuar movimientos/donaciones y JSON, sin repetir como pendientes
los cuatro tipos CSV ya acreditados en su alcance.

CSV económico publicado: 202 Node / 747 estáticas y 16/16 por motor con
501 movimientos, correcciones/donación única y bytes. Continuar donaciones
CSV agrupadas y JSON; no usar correcciones como sobrescritura de importes.
