# Animal Rescue & Shelter Manager

Aplicación de gestión offline para protectoras. **Proyecto en desarrollo; no es todavía un producto comercial utilizable.**

## Estado actual

**Checkpoint de continuidad revisado el 2026-10-18.** Para que otra IA retome
el trabajo desde otro PC, empezar por [CONTINUE_HERE.md](docs/CONTINUE_HERE.md).

El núcleo ya incorpora esquemas, validación relacional, persistencia coordinada,
copias completas y restauración con conjunto separado. La interfaz permite
gestionar animales, contactos y duplicados, perfiles de acogida, voluntariado
y horas, fotografías/pesos y documentos incorporados o externos. Acogidas y
adopciones tienen sus transiciones reales; salud/planes y tareas/calendario
comparten registros. Finanzas permite ingresos/gastos, anulaciones y sustitutos
enlazados; donaciones e inventario conectan sus operaciones a los movimientos
económicos y de existencias. Incluye copias verificadas y recuperación local
visible. Incluye panel operativo, informes, buscador global, filtros combinados,
exportaciones CSV/JSON por módulo y asistente CSV de contactos con lotes grandes
atómicos. **Faltan los otros tipos de importación CSV/JSON, correcciones de
hechos, demo y aceptación integral. Utiliza solo datos de prueba.**

La evidencia inicial de viabilidad incluye Chrome, Edge y Firefox. Los últimos
recorridos funcionales están acreditados en Chrome y Edge de Windows; no se
extiende esa aceptación a Firefox actual ni a dispositivos físicos.
El desarrollo queda preparado para relevo; el estado vigente y la siguiente
acción se conservan en [PROJECT_STATUS.md](docs/PROJECT_STATUS.md).

Abre `index.html` directamente después de descargar y descomprimir la carpeta
completa. No hace falta servidor ni instalar herramientas. La sonda anterior
sigue disponible en `tests/viability/index.html`, solo para desarrollo.

- [Estado y siguiente paso](docs/PROJECT_STATUS.md)
- [Requisitos originales completos](docs/REQUIREMENTS.es.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos implementado](docs/DATA_MODEL.md)
- [Reglas e invariantes](docs/BUSINESS_RULES.md)
- [Compatibilidad y evidencia](docs/COMPATIBILITY.md)
- [Procedimiento de pruebas](docs/TEST_PLAN.md)

## Datos y traslado

Los datos de prueba residen en el perfil del navegador, no junto al HTML.
Copiar la carpeta o clonar este repositorio no traslada el almacenamiento del
navegador. Para trasladar la organización, genera una copia completa, descarga
y vuelve a seleccionar/verificar el archivo; restaura en el otro equipo. Las
referencias a archivos externos requieren trasladar sus originales por separado.
La aceptación comercial integral sigue pendiente. Utilizar datos sintéticos.

## Desarrollo y continuidad

Se conserva cada avance coherente con commits en este repositorio. La instrucción
vigente del usuario es guardar y subir los avances cuando quede **menos del 10 %**
del cupo de 5 horas. Se actualiza `docs/PROJECT_STATUS.md` con pruebas, límites y
siguiente paso para continuar desde otro PC. No se consume un reinicio de cuota
sin petición expresa.

Las fases funcionales solo comienzan después de resolver los bloqueos de viabilidad del documento. La compatibilidad anunciada se limitará a combinaciones realmente comprobadas. La licencia comercial está pendiente de revisión; no se ha publicado el producto en Etsy.

## Comprobaciones para desarrolladores

`node tests/static-checks.cjs` verifica la sintaxis y las restricciones de recursos locales. Los procedimientos de navegador y sus requisitos se documentan en `docs/TEST_PLAN.md`. El diagnóstico funciona sin Node.js; Node.js solo es una herramienta de desarrollo.
