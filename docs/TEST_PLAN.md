# Plan de pruebas

Fecha de inicio: 2026-10-15. La ejecución debe distinguir PASA, FALLA y PENDIENTE.
Este documento es un procedimiento, no una declaración de resultados.

## Puerta de fase 0

La página `tests/viability/index.html` carga scripts clásicos y CSS locales;
usa una base exclusiva `rescue-manager-viability` y datos sintéticos.
No abre la base futura de negocio.

Para Chrome, Edge y Firefox **estables**, con perfil nuevo y sin relajar
protecciones del navegador:

1. Abrir el archivo local con la red bloqueada antes de la primera carga.
2. Comprobar carga de CSS y JavaScript sin peticiones HTTP/HTTPS de la página.
3. Abrir IndexedDB, escribir y leer Unicode y Blob; esperar `transaction.complete`.
4. Abortar una transacción que escriba en dos almacenes y comprobar que ninguno conserva el cambio.
5. Guardar un marcador único, cerrar todos los procesos propios de ese perfil,
   abrir exactamente la misma URL y verificar texto y bytes del Blob.
6. Descargar el informe JSON, seleccionar el archivo guardado y comprobar lectura.
7. Abrir dos pestañas con mismo perfil y URL; solo un arrendamiento válido.
   Probar que una escritura con dueño incorrecto o lease vencido se aborta.
8. Copiar/renombrar la carpeta y observar acceso al marcador. No extrapolar el resultado a otros perfiles o navegadores.
9. Denegar almacenamiento mediante controles del navegador cuando sea posible.
   La inyección controlada de `SecurityError` solo verifica gestión del error;
   debe identificarse como simulación, nunca como denegación real.
10. Registrar disponibilidad de APIs opcionales. La presencia de una función
    no demuestra su éxito bajo `file://`; anotar rechazos reales por separado.
11. Comprobar vista a 360, 768, 1024 y 1440 píxeles. La emulación de tamaño
    no demuestra compatibilidad de un navegador móvil real ni de su gestor de archivos.

Registrar versión exacta, canal, sistema operativo, fecha, URL, método de
automatización, errores, afirmaciones verificadas y límites de la prueba.
No sustituir un fallo por un cambio a servidor, LocalStorage o memoria.

## Ejecutores de desarrollo

- `node tests/static-checks.cjs`: recursos locales, CSP, sintaxis, sin módulos de navegador,
  sin sinks de HTML no seguros ni dependencias de almacenamiento alternativas.
- `node tests/e2e/chromium.cjs`: Chrome y Edge locales; ver opciones y requisitos en el archivo.
- `python tests/e2e/firefox.py`: Firefox aislado; ver opciones y requisitos en el archivo.

Los ejecutores requieren herramientas del desarrollador, **nunca del comprador**.
No iniciar un servidor de aplicación. El transporte local de automatización
no forma parte del producto. No cerrar procesos de perfiles del usuario.

## Pruebas de fases posteriores (todavía pendientes)

Las pruebas obligatorias de las secciones 39 y 40 del documento fuente siguen
siendo criterios de aceptación. Deben añadirse al implementar cada fase:

- Núcleo: revisiones antiguas, claves únicas, dataset activo, lease vencido,
  transacciones multi-entidad e idempotencia.
- Backup: canonicalización, hashes, binarios, límites, versiones, referencias,
  duplicados, corrupción y snapshot consistente.
- Restauración: staging separado, cuota insuficiente, cancelación, cierres antes
  y después de activación, reversión local, igualdad de datos.
- Flujos: entrada → salud con gasto → acogida → reserva → adopción → seguimiento
  → devolución; donación económica y material sin duplicados.
- Importación: CSV complejo, fórmulas, fechas ambiguas, identificadores largos,
  claves peligrosas, correspondencias, lote atómico y conflictos.
- UX: teclado, foco, traducciones completas, ampliación, impresión,
  recuperación de errores, cambios sin guardar y accesibilidad.
- Rendimiento: 2.000 animales, 5.000 contactos y 50.000 registros relacionados
  con mediciones, sin afirmar capacidad garantizada antes de probarla.
- Distribución comercial: revisión de dependencias y licencias, sin datos reales,
  conexiones externas ni herramientas de desarrollo dentro del paquete.

El recorrido completo de aceptación no está ejecutado porque el producto
funcional aún no está implementado.
