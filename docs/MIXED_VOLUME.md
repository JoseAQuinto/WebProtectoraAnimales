# Escenario mixto de volumen — 2026-10-21

Ejecutor de desarrollo `tests/e2e/mixed-volume-ui.cjs`, separado de la regresión
habitual por el coste del escenario. No forma parte del ZIP del comprador.

```powershell
node tests/e2e/mixed-volume-ui.cjs --browser chrome --machine NUEVO-PC --output mixed-volume-FECHA-chrome.json
```

La escala completa solicita 2.000 animales y 5.000 contactos. Genera además
50.000 registros relacionados: 8.000 tareas, 8.000 pesos, 8.000 actos clínicos,
8.000 eventos clínicos, 8.000 movimientos económicos, 6.000 horas y 4.000
movimientos de inventario. Añade los episodios y eventos de entrada necesarios,
500 perfiles voluntarios y 200 artículos. Es una distribución sintética concreta,
no una capacidad garantizada ni la cobertura de todas las combinaciones de estados.

El generador prepara cambios con los modelos reales y los guarda por la ruta de
contexto/repositorio en lotes de hasta 1.000 filas, con validación y lease reales.
Los hechos clínicos/eventos y animales/episodios se crean juntos. Esta preparación
es fixture de desarrollo, **no** aceptación de miles de formularios ni de actos
médicos introducidos por usuarios. No se sustituyen servicios ni resultados.

Mide captura fría/repetida y validación completa, después refrescos de siete rutas
reales: panel, animales, contactos, tareas, finanzas, inventario e informes.
Introduce una edición por servicio y un TXT de 1 MiB; la prueba separada de contactos
en VOLUME.md cubre 32 MiB, y las pruebas de medios cubren decodificación de imágenes.

La copia se descarga físicamente, se reselecciona y se restaura por la interfaz.
Se comparan todos los registros normalizando únicamente el datasetId técnico,
recuentos y hashes de los bytes reales, después de activar y de cerrar/reabrir
el navegador propio. La prueba rechaza pantallas de error y tráfico HTTP de página.

## Escala reducida

`--scale 0.01` sirve para verificar el generador con 20 animales, 50 contactos y
500 registros relacionados antes de iniciar la medición grande. Esa ronda no
acredita el objetivo completo. `mixed-volume-ui-2026-10-21-chrome-smoke.json`
pasó 20 comprobaciones, incluida copia física, restauración y reapertura.

## Escala completa: primera ronda conservada

`mixed-volume-ui-2026-10-21-chrome-full.json` preparó correctamente el objetivo
completo: 2.000 animales, 5.000 contactos y los 50.000 relacionados, más episodios,
entradas, 500 perfiles y 200 artículos. Pasó validación completa, siete rutas,
edición real y TXT de 1 MiB; descargó/verificó físicamente una copia de
36.473.346 bytes. La ronda **permanece fallida** al intentar restaurar: la actividad
de copias no usaba la protección temporal de los comandos y perdió el lease bajo
carga. No acredita restauración ni reapertura completa. No se convierte la ronda
reducida en prueba del objetivo grande ni se oculta el defecto encontrado.

Mediciones del padre, carga simultánea no controlada: captura fría 8.028 ms,
repetida 8 ms, validación 3.059 ms, edición de contacto 3.297 ms y archivo 12.528 ms.
Refrescos repetidos: panel 193 ms, animales 51 ms, contactos 84 ms, tareas 1.134 ms,
finanzas 425 ms, inventario 81 ms, informes 109 ms. Son datos de las fuentes del
padre; un cambio posterior requiere su propia evidencia para copia/restauración.

`mixed-recovery-ui.cjs` permite una continuación dirigida del perfil propio de
ese padre fallido. Comprueba el hash de la copia original, su correspondencia
con todos los registros/bytes aún activos y las fuentes (solo admite la corrección
documentada de `js/services/backup.js`). Después crea/descarga otra copia desde
la UI actual, verifica, restaura y cierra/reabre. Los pasos nuevos y los heredados
se enumeran por separado. Desde otro PC ejecutar el escenario completo: los
perfiles ignorados y las copias ficticias locales no se suben a Git.

## Corrección y continuación dirigida de Chrome

La creación/verificación de copias protege ahora el lease de quien ya controla
la escritura; siguen disponibles sin adquirir control en pestañas de lectura.
Restauración y recuperación protegen también toda la preparación, validación y
activación. Se mantienen confirmación, copia actual verificada, revisión, fencing,
cancelación, conjunto separado y conservación del anterior. No se extiende un
lease ya perdido. Cambia únicamente `js/services/backup.js` respecto al padre.

`mixed-recovery-ui-2026-10-21-chrome-protected-backup.json`: **8/8 comprobaciones
nuevas**, 131 fuentes actuales idénticas al cerrar. Primero acreditó que el intento
fallido había conservado el grafo activo completo y sus bytes, comparándolos con
el archivo original. Después descargó otra copia de 36.473.346 bytes desde la UI
(7,34 s), la seleccionó/verificó conservando control y la restauró (29,51 s), con
todos los registros y hashes idénticos. El anterior quedó retirado y recuperable;
cierre/reapertura conservaron dataset/revisión/digest/bytes. Estos tiempos se
midieron sin otras suites nativas simultáneas y no son una promesa de latencia.

Se heredan explícitamente los pasos de generación del padre; no se presenta esta
continuación como una ejecución desde cero ni se cambia su resultado fallido.
La comparación de fuentes permite solo el archivo corregido indicado arriba.

## Edge completo desde cero con la corrección

`mixed-volume-ui-2026-10-21-edge-protected-backup.json`: **20/20**, generación
completa nueva y las 131 fuentes actuales intactas. Ejecutado sin otras suites
nativas simultáneas. Todos los recuentos previstos se comprobaron; los 61.772
registros iniciales incluyen los episodios, entradas, catálogos y configuración.
Después se comprobó la edición y el documento con sus hechos relacionados.

| Medida | Edge |
|---|---:|
| Captura fría / repetida | 1.022 / 1 ms |
| Validación completa | 805 ms |
| Edición de contacto | 843 ms |
| Documento TXT de 1 MiB | 1.843 ms |
| Refrescos panel / animales / contactos / tareas | 41 / 18 / 18 / 149 ms |
| Refrescos finanzas / inventario / informes | 74 / 15 / 29 ms |
| Generar copia / descarga y verificación UI completa | 7.801 / 17.312 ms |
| Restauración completa | 33.971 ms |

Copia física de 36.473.346 bytes, hash
`7d45d95e01609c439faeb6aa4bc408f664a12e696cb147187441dbe230978a73`.
La activación creó otro dataset y los registros/bytes resultaron idénticos;
dos cierres propios y reapertura conservaron revisión, recuentos y hashes.
Los tiempos del padre Chrome bajo carga no son comparables como diferencias
entre motores. El ensayo no acredita todas las distribuciones de negocio,
memoria máxima, dispositivos físicos ni aceptación comercial.

## Límites

Tiempos dependientes del equipo/carga, sin control estadístico. Los refrescos
medidos se realizan tras navegar, con captura repetida; no deben presentarse como
tiempo de primera carga ni latencia garantizada para el usuario. No se mide
memoria con perfilador ni se acredita una plataforma física o Firefox actual.
El producto y la licencia comercial continúan pendientes de aceptación.
