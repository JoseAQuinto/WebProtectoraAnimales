# Animal Rescue & Shelter Manager

Aplicación de gestión para protectoras de animales que funciona sin Internet, sin
cuentas y sin suscripción. **Versión 1.0.0.**

Inicio rápido: [Español](README.es.md) · [English](README.en.md) ·
[Notas de versión](RELEASE_NOTES.md). La guía completa está en Ayuda, dentro de la
aplicación (docs/HELP.md).

## Qué incluye

Animales (fichas, salud, pesos, fotos, acogidas, adopciones, devoluciones, salidas e
historial), contactos con detección de duplicados, familias de acogida, voluntariado,
tareas y calendario, finanzas con correcciones que conservan el original, donaciones,
inventario, documentos, resumen, informes imprimibles, buscador global, importación
CSV/JSON con revisión previa, exportaciones, copias de seguridad comprobadas con
restauración segura, papelera y datos de ejemplo opcionales. Español e inglés.

Abre `index.html` directamente después de descomprimir la carpeta completa. No hace
falta servidor ni instalar nada. Todo se carga desde la carpeta (CSP sin conexiones).

## Datos y traslado

Los datos residen en el almacenamiento del navegador, no junto al HTML. Copiar la
carpeta o clonar este repositorio no traslada esos datos. Para cambiar de equipo,
genera una copia completa, compruébala volviendo a seleccionarla y restáurala en el
otro equipo. Los documentos «guardados fuera» se trasladan por separado.

## Compatibilidad comprobada

Chrome y Microsoft Edge en Windows, con recorridos funcionales automatizados en
navegador real (docs/COMPATIBILITY.md). Firefox, macOS, Linux, Android, iOS y
dispositivos físicos no se han verificado con esta versión.

## Pendiente antes de publicar comercialmente

- **Licencia comercial:** LICENSE.txt sigue pendiente de definir por el titular.
- Prueba con personas usuarias reales, lector de pantalla y dispositivos físicos.
- Reversión de cambios de situación (por ejemplo, un fallecimiento registrado por
  error): hoy solo se corrigen las fechas; está indicado en Ayuda → Limitaciones.

## Documentación técnica

- [Estado y siguiente paso](docs/PROJECT_STATUS.md)
- [Requisitos originales completos](docs/REQUIREMENTS.es.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Sistema de diseño](docs/DESIGN_SYSTEM.md)
- [Modelo de datos implementado](docs/DATA_MODEL.md)
- [Reglas e invariantes](docs/BUSINESS_RULES.md)
- [Compatibilidad y evidencia](docs/COMPATIBILITY.md)
- [Procedimiento de pruebas](docs/TEST_PLAN.md)
- [Relevo de desarrollo](docs/CONTINUE_HERE.md)

## Comprobaciones para desarrolladores

`node tests/static-checks.cjs` verifica sintaxis y restricciones de recursos locales.
`node tests/e2e/regression.cjs --browser chrome --label <etiqueta>` ejecuta todas las
suites en navegador real. `node tests/release/build-package.cjs` genera el ZIP de
distribución en `.tmp/dist/`. Node.js solo es una herramienta de desarrollo: el
producto no lo necesita.
