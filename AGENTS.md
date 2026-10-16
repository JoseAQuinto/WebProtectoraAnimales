# Instrucciones de continuidad

Leer primero `docs/PROJECT_STATUS.md` y `docs/REQUIREMENTS.es.md` completos;
el alcance original no puede recortarse para aparentar producto terminado.
Para trasladar el trabajo a otro equipo, empezar por `docs/CONTINUE_HERE.md`.
El checkpoint de 2026-10-16 es un relevo de desarrollo revisado y parcial,
no una aplicación comercial terminada. No repetir como pendientes pruebas
que ya tengan evidencia vigente ni dar por implementados los módulos sin UI.

## Autorización del usuario

- Trabajar en este repositorio y hacer commits/push de avances coherentes a
  `https://github.com/JoseAQuinto/WebProtectoraAnimales.git`.
- Instrucción vigente del usuario el 2026-10-15: comprobar el cupo disponible
  y, cuando quede un 5 % o menos de la ventana de 5 horas, detener desarrollo
  y trabajo delegado, guardar avances coherentes, actualizar documentación,
  hacer commit y push para continuar desde otro equipo. Los antiguos umbrales
  del 20 % y de agotamiento total quedan revocados.
- No consumir un reinicio de cuota sin indicación expresa del usuario.
- Dejar el proyecto continuable desde otro equipo: código, decisiones,
  evidencias de pruebas, defectos y siguiente acción concreta en Git.

## Restricciones técnicas

- El comprador abre `index.html` por `file://`, sin servidor, red ni instalación.
- HTML/CSS/JS vanilla; scripts clásicos `defer`, IIFE y solo `window.RescueManager`.
- Ningún `fetch` de archivos locales, módulos ES en navegador, CDN o recursos remotos.
- IndexedDB es la única fuente de verdad. Nada de alternativa silenciosa a
  LocalStorage o memoria. La UI de negocio nunca accede a IndexedDB directamente.
- Confirmar guardados solo en `transaction.complete`. Preparar imágenes/hashes
  y esperar interacción del usuario fuera de transacciones.
- Relaciones por UUID dentro del mismo dataset, revisión optimista e idempotencia.
- Cada escritura de negocio comprueba lease, conjunto activo y revisión en
  la misma transacción. Pestañas sin control son de lectura.
- Dinero/cantidades en enteros seguros, fechas de calendario como cadenas ISO.
- Restaurar mediante dataset separado y activación atómica; nunca vaciar primero.
- Datos del usuario en `textContent`, sin eval, HTML activo ni ejecución importada.

## Orden y calidad

Seguir fases 0–12. No construir sobre una incompatibilidad de la matriz
obligatoria sin documentar y resolver. La fase 2 de protección de datos precede
a los formularios de negocio. Ampliar backup y validadores con cada entidad.
No crear archivos vacíos, botones sin comportamiento ni éxitos simulados.

Probar la distribución real bajo `file://`. Herramientas de desarrollo sí
pueden instalarse, pero no deben entrar en el paquete comercial. No declarar
pruebas pendientes como aprobadas ni emulación de viewport como dispositivo real.
Revisar archivos propios grandes y dividirlos por responsabilidad cuando ayude.

Documentar limitaciones reales y los cuatro números de versión. La licencia
comercial está pendiente de revisión; no publicar Etsy ni inventar condiciones.
Mantener `docs/PROJECT_STATUS.md` y `CHANGELOG.md` por cada avance significativo.
