# Continuar desde otro PC o con otra IA

Checkpoint: **2026-10-18**, aplicación **0.2.0-dev**.
Repositorio: https://github.com/JoseAQuinto/WebProtectoraAnimales.git

El desarrollo continúa desde `c44831b`, obtenido del remoto antes de editar.
Se han añadido servicios de medios/documentos/pesos, interfaz de animales y
personas y recuperación visible. El producto sigue incompleto. El estado y
las decisiones necesarios para continuar están en Git; este chat no es necesario.

## Primeros pasos

```powershell
git clone https://github.com/JoseAQuinto/WebProtectoraAnimales.git
cd WebProtectoraAnimales
git status
```

Checkout existente limpio: `git pull --ff-only`. Si hay cambios locales,
revisarlos y conservarlos; no resetear ni sobrescribir trabajo ajeno.

Leer en orden:

1. `AGENTS.md`: restricciones. Guardar/documentar/commit/push con **menos del
   10 % restante de 5 horas**; se conserva el límite semanal del 3 % restante.
   No consumir un reinicio de cuota sin petición expresa.
2. `docs/PROJECT_STATUS.md`: funciones actuales, pruebas, límites y próximos pasos.
3. `docs/REQUIREMENTS.es.md` completo: prompt original sin recortes.
4. `docs/REVIEW_HANDOFF.md`: R1–R4 corregidos y riesgos conservados.
5. `docs/ENVIRONMENT_TESTS.md`, `docs/RECOVERY_EVIDENCE.md` y últimos JSON de QA.
6. APIs del área: DOCUMENTS, CONTACTS, LIFECYCLE, VOLUNTEERS, HEALTH, RESOURCES
   y DONATIONS_INVENTORY_UI; además REPORTS_API y SEARCH_HISTORY.

## Qué puede abrirse ahora

Abrir `index.html` directamente por **file://**. Crear una organización de
prueba o restaurar una copia. Hay resumen/configuración/ayuda/copias; agenda
con duplicados y fusión; perfiles de acogida y voluntariado/horas; animales
con ficha, altas, pesos, fotografías, traslados y salidas; documentos incorporados
/externos y vínculos; recuperación de conjuntos retirados.

Las secciones sanitarias, acogidas y adopción permiten sus acciones reales:
asignar/finalizar estancias, revisar/reservar/adoptar/devolver, planes, actos
realizados y tareas/calendario centrales. Finanzas tiene interfaz de movimientos,
anulación y corrección; revisar FINANCE_UI_ACCEPTANCE antes de extenderla.
Donaciones/Inventario e Informes tienen aceptación 12/12 por motor; ver
REVIEW_RESOURCES_REPORTS.md. Buscador global e historial por origen: 10/10 por
motor en SEARCH_HISTORY.md. Los informes exportan sus tablas en CSV y JSON.
Consultar PROJECT_STATUS y los documentos de aceptación para el resto del alcance.

No cambiar a servidor/framework/CDN/módulos ES/LocalStorage. Sin botones de
éxito simulado ni datos ficticios permanentes. **Usar solo datos sintéticos.**
Las escrituras pasan por servicios/contexto, nunca IndexedDB desde módulos UI.
Documentos precede a fotografías en el orden de scripts. Traducciones solo en
locales/en.js y locales/es.js; ya no hay fragmentos suplementarios.

## Comprobaciones

```powershell
node tests/static-checks.cjs
node --test --test-reporter=dot tests/unit/*.cjs
git diff --check
```

Última ronda conjunta: **142 subpruebas Node correctas**. La estática se
registra con su recuento por checkpoint en PROJECT_STATUS.
Pruebas reales adicionales: perfiles 9+6 y medios 10+6 en Chrome/Edge.
Pantallas iniciales 13/13 más visual dirigida 5/5 por motor. Ciclo de acogida/
adopción 16 comprobaciones por motor acreditadas en cadena; salud/tareas 12/12
en Chrome y Edge. Ver UI_ACCEPTANCE, WORKFLOWS_UI_ACCEPTANCE y
HEALTH_UI_ACCEPTANCE, además de recuperación/cierres en RECOVERY_EVIDENCE.
Finanzas: **12/12 por motor** en Chrome y Edge, con importes/anulación/
corrección, revisión antigua y cierre/reapertura; ver FINANCE_UI_ACCEPTANCE.
Última estática del bloque completo: **632 comprobaciones correctas**.
Las primeras rondas fallidas
por entorno o ejecutor se conservan sin contarlas como aceptación.

Ejecutores portables:

```powershell
node tests/e2e/suite.cjs --browser chrome --page tests/integration/media.html --output media-NUEVA-RONDA.json
node tests/e2e/suite.cjs --browser chrome --page tests/integration/profiles.html --output profiles-NUEVA-RONDA.json
node tests/e2e/workspace-ui.cjs --browser chrome --machine MI-EQUIPO --output workspace-ui-NUEVA-RONDA.json
```

Para Edge u otras rutas usar `--executable` según ENVIRONMENT_TESTS. Las rutas
privadas son opciones de desarrollo, no dependencias de la aplicación.
Firefox actual queda pendiente por decisión previa: no descargar instalador
sin nueva indicación. Las ventanas estrechas no acreditan dispositivos reales.

Node/Python/Playwright y perfiles de QA no se distribuyen. `.tmp`, `.tools` y
node_modules se ignoran. No reescribir texto con Get-Content/Set-Content de
Windows PowerShell 5.1; conservar UTF-8 sin BOM.

## Guardar el siguiente relevo

Cerrar solo navegadores/perfiles de prueba propios, actualizar estado/pruebas/
pendientes y CHANGELOG, revisar diff/secretos/archivos temporales, commit y push
sin force y verificar remoto y árbol limpio. No afirmar que una prueba pasó
si solo se preparó o si falló el cierre del ejecutor.

El registro global ya tiene aceptación 10/10 por motor (ADOPTION_REGISTER.md).
Los siguientes pendientes concretos son configuración/catálogos,
correcciones coordinadas de hechos, importación/exportación por módulo y demo
según el prompt completo. No volver a
implementar desde cero los flujos ya verificados. El rendimiento O(N), cuota
física real y aceptación de plataformas continúan pendientes antes de datos
reales.

Git lleva código y documentación. **Los datos del navegador no viajan con Git**:
trasladarlos exige descargar, volver a seleccionar/verificar y conservar una
copia externa y restaurarla en el otro equipo. Los archivos externos deben
trasladarse por separado. No publicar en Etsy; licencia comercial pendiente.
