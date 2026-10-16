# Continuar desde otro PC o con otra IA

Checkpoint revisado: **2026-10-16**, aplicación **0.2.0-dev**.
Repositorio: https://github.com/JoseAQuinto/WebProtectoraAnimales.git

El commit del usuario `4c5554c` conserva el avance previo; este checkpoint añade
revisión, evidencia y documentación de relevo. El producto sigue incompleto.
Todo lo necesario para continuar está en Git; no hace falta este chat.

## Primeros pasos

```powershell
git clone https://github.com/JoseAQuinto/WebProtectoraAnimales.git
cd WebProtectoraAnimales
git status
```

Si ya existe un checkout limpio, utilizar `git pull --ff-only`. Si hay cambios
locales, revisarlos antes de actualizar; no resetear ni sobrescribir trabajo.

Leer en este orden:

1. `AGENTS.md`: restricciones y regla de continuidad del cupo (5 % o menos).
2. `docs/PROJECT_STATUS.md`: estado real, pruebas, pendientes y siguiente paso.
3. `docs/REQUIREMENTS.es.md` completo: prompt original, sin recortes.
4. `docs/REVIEW_HANDOFF.md`: hallazgos y riesgos que atender antes de datos reales.
5. `docs/ENVIRONMENT_TESTS.md`: evidencia ejecutada y comandos de navegador.
6. Arquitectura/modelo/reglas y APIs del área que se vaya a modificar.

## Qué puede abrirse ahora

Abrir `index.html` directamente por `file://`. Se puede crear una organización
**de prueba**, ver un resumen básico, editar configuración, generar y verificar
copias, restaurarlas y consultar ayuda EN/ES. La interfaz no ofrece aún gestión
de animales, contactos, salud, adopciones ni recursos. Sus servicios existentes
están en `js/services/` y tienen contratos en los documentos `*_API.md`.

No cambiar a servidor, framework, CDN, módulos ES o LocalStorage para salvar
una dificultad. No añadir módulos vacíos, éxitos simulados ni datos ficticios
permanentes. La aplicación no transmite datos ni necesita herramientas instaladas.

## Verificaciones rápidas de desarrollo

Herramientas utilizadas en la revisión: Node **22.16.0**, Playwright **1.62.1**;
Firefox se controla con Python y su biblioteca estándar. Son herramientas del
desarrollador y no forman parte de la aplicación ni del futuro ZIP comercial.

```powershell
node tests/static-checks.cjs
node --test --test-reporter=dot tests/unit/*.cjs
git diff --check
```

Resultado de revisión: **330 comprobaciones estáticas y 93 subpruebas Node
correctas**. Las pruebas de servicios con contexto simulado no equivalen a
IndexedDB real. El recorrido real `lifecycle.html` sí pasó en Chrome.

Para preparar Playwright cuando este PC no tenga el runtime de Codex, una
instalación de desarrollo aislada, con la versión que se ha probado:

```powershell
npm install --prefix .tools --no-audit --no-fund --save-exact playwright@1.62.1
$env:PLAYWRIGHT_PATH = Join-Path (Get-Location).Path '.tools\node_modules\playwright'
```

Los ejecutores Chrome/Edge usan navegadores estables instalados, perfiles nuevos
y `file://`, sin bajar protecciones. Configurar `RM_CHROME_BINARY` o
`RM_EDGE_BINARY` si las rutas por defecto no existen. Firefox admite `--firefox`.
No confundir Developer Edition con estable. `.tools`, `.tmp`, perfiles y
dependencias están ignorados: deben recrearse en cada equipo.

```powershell
node tests/e2e/suite.cjs --browser chrome --page tests/integration/business.html --machine NUEVO-PC --output business-NUEVA-FECHA-chrome.json
node tests/e2e/suite.cjs --browser chrome --page tests/integration/lifecycle.html --machine NUEVO-PC --output lifecycle-NUEVA-FECHA-chrome.json
node tests/e2e/ui.cjs --machine NUEVO-PC --output ui-NUEVA-FECHA-chrome.json
```

Conservar el resultado anterior: elegir nuevos nombres y registrar versiones.
Los hashes de evidencia corresponden a bytes concretos; una conversión de fin
de línea al clonar también puede cambiarlos. En otro PC ejecutar las pruebas
necesarias en lugar de declarar que un JSON antiguo prueba archivos distintos.

## Siguiente trabajo cuando el usuario pida reanudar

Primero resolver los hallazgos priorizados de `REVIEW_HANDOFF.md` y completar
aceptación de protección/recuperación. Después continuar fase 3 y fase 4:
contactos/fusión, voluntariado/horas, documentos e interfaz de animales.
Reutilizar `context.execute` y los servicios existentes, sin duplicar reglas.
El recorrido lifecycle en Edge/Firefox está pendiente; Chrome ya está verificado.
Seguir después fases 5–12 del prompt completo, manteniendo copias y validadores.

## Qué no se traslada con Git

Los registros de una organización y sus Blob viven en el perfil del navegador.
Clonar Git o copiar HTML no los traslada. Para moverlos se necesita un backup
externo generado, descargado, reseleccionado y verificado, y su restauración.
Este repositorio solo conserva código, fixtures sintéticos, decisiones y pruebas.

Antes de detener trabajo futuro: actualizar PROJECT_STATUS/CHANGELOG, registrar
fallos y siguiente acción concreta, ejecutar comprobaciones pertinentes y hacer
commit/push. Comprobar que HEAD está publicado y el árbol queda limpio.
