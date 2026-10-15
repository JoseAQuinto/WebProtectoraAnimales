# Historial de cambios

## 0.1.0-dev — 2026-10-15 (avance parcial; pausa por cupo)

- Inicio de fase 1 después de superar viabilidad de escritorio en tres motores.
- Utilidades de UUID v4, fechas, edad, cantidades y dinero exacto, incluidas JPY y KWD.
- Normalización de búsqueda, email, teléfonos y microchips sin perder ceros.
- Traducciones base EN/ES, plurales, cambio de idioma y clasificación de errores.
- Serialización JSON canónica con rechazo de datos corruptos y accesores.
- Pruebas unitarias significativas y contratos del núcleo documentados.
- Núcleo persistente coordinado: transacciones atómicas, leases, revisiones,
  UUID, idempotencia, cambio de conjunto y rechazo de versiones futuras sin pérdida.
- Prueba real del núcleo por file:// en Chrome: 9+6 casos correctos.
- Desarrollo pausado al quedar 19 % del cupo de 5 horas; continuidad documentada.
- Entidades/repositorios de negocio, backup y restauración siguen pendientes.

## 0.0.1-dev — 2026-10-15

- Repositorio inicial y requisitos completos preservados.
- Diseño inicial de arquitectura, entidades e invariantes.
- Diagnóstico independiente ejecutable por `file://`, sin recursos externos.
- Prueba de IndexedDB, Blob, confirmación de transacción y reversión atómica.
- Marcador sintético para probar cierre y reapertura.
- Control de escritura de diagnóstico por arrendamiento transaccional.
- Descarga y lectura de informes JSON; no constituye backup comercial.
- Pruebas de navegador y resultados reales en `tests/results/`.

La viabilidad y los límites de verificación figuran en `docs/COMPATIBILITY.md`.
No hay módulos de gestión terminados ni versión comercial publicada.
