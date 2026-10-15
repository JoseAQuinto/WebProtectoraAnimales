# Animal Rescue & Shelter Manager

Aplicación de gestión offline para protectoras. **Proyecto en desarrollo; no es todavía un producto comercial utilizable.**

## Estado actual

La primera entrega valida los riesgos de `file://`, IndexedDB, binarios, confirmación de transacciones y reapertura. La pantalla de entrada solo conduce a un diagnóstico con datos sintéticos. No introduzcas información real.

Abre `index.html` directamente después de descargar y descomprimir la carpeta completa. No hace falta iniciar un servidor ni instalar herramientas para ejecutar el diagnóstico. Las herramientas de pruebas son exclusivas del desarrollo.

- [Estado y siguiente paso](docs/PROJECT_STATUS.md)
- [Requisitos originales completos](docs/REQUIREMENTS.es.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos propuesto](docs/DATA_MODEL.md)
- [Reglas e invariantes](docs/BUSINESS_RULES.md)
- [Compatibilidad y evidencia](docs/COMPATIBILITY.md)
- [Procedimiento de pruebas](docs/TEST_PLAN.md)

## Datos y traslado

Los datos de prueba residen en el perfil del navegador, no junto al HTML. Copiar la carpeta o clonar este repositorio en otro ordenador no traslada el almacenamiento del navegador. El producto deberá incorporar backup completo y restauración verificada antes de aceptar datos de negocio.

## Desarrollo y continuidad

Se conserva cada avance coherente con commits en este repositorio. Antes de detener el trabajo se actualiza `docs/PROJECT_STATUS.md` y se suben los cambios. Si queda **menos del 20 % del cupo de 5 horas**, se detiene el desarrollo y se deja la continuidad documentada. No se consume un reinicio de cuota sin petición expresa.

Las fases funcionales solo comienzan después de resolver los bloqueos de viabilidad del documento. La compatibilidad anunciada se limitará a combinaciones realmente comprobadas. La licencia comercial está pendiente de revisión; no se ha publicado el producto en Etsy.

## Comprobaciones para desarrolladores

`node tests/static-checks.cjs` verifica la sintaxis y las restricciones de recursos locales. Los procedimientos de navegador y sus requisitos se documentan en `docs/TEST_PLAN.md`. El diagnóstico funciona sin Node.js; Node.js solo es una herramienta de desarrollo.
