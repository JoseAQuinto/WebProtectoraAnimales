# Historial de cambios

## Checkpoint de continuidad — 2026-10-16

- Revisión del estado parcial de 0.2.0-dev conservado en el commit 4c5554c.
- Reejecutadas 330 comprobaciones estáticas y 93 subpruebas unitarias, correctas.
- Recorrido integrado pendiente ejecutado por file:// en Chrome 155.0.8059.80:
  11 casos internos y 6 externos correctos, con persistencia tras cierre completo.
- Auditadas las huellas de las evidencias: la ronda `validator-fix` sustituye
  las primeras rondas `business-final` tras el endurecimiento del dominio.
- Documentación de relevo, límites, defectos conocidos, herramientas portables
  y primera acción concreta para otra IA. Sin ampliar funcionalidad del producto.

## 0.2.0-dev — 2026-10-15 (avance funcional parcial)

- 28 esquemas de negocio, enumeraciones, fábrica y validación estructural y
  relacional; entradas hostiles, fechas, estados, importes, intervalos y stock.
- Almacenes e índices, migración física aditiva 1→2, repositorios con revisión
  y lease/token, idempotencia y asignación transaccional de códigos de animales.
- Backup JSON completo con SHA-256 nativo/alternativo, recursos Blob/Base64,
  manifiesto, archivos validados y rechazo de corrupción/versiones futuras.
- Preparación de restauración separada, validación de lo escrito y activación
  atómica; datos previos conservados; recibos generado/solicitado/verificado.
- Servicios de animales/acogidas/adopciones, salud/tareas, finanzas/donaciones
  e inventario, con pruebas de lógica y cambios coordinados. Todavía sin interfaz.
- Primera interfaz EN/ES para configuración, copias, ayuda y resumen real básico.
- Evidencia real de núcleo y recuperación en Chrome, Edge y Firefox estables
  de este equipo, incluido cierre y reapertura con comparación de datos/binarios.
- El umbral de continuidad vigente pasa a **5 % o menos**, según el usuario.

No es aún un producto comercial terminado. Ver pendientes y evidencia exacta
en `docs/PROJECT_STATUS.md` y `docs/ENVIRONMENT_TESTS.md`.

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
