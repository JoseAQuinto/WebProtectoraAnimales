# Plurales de Almacenamiento — 2026-10-21

Los textos de archivos, grupos y registros de Archivos sin referencias y Papelera
usan las variantes `one`/`other` del motor existente con `Intl.PluralRules`.
No se construyen sustantivos añadiendo «(s)». Los recuentos de grupos y archivos
se pluralizan de forma independiente y se interpolan en una frase completa:
un grupo puede contener dos archivos. Los valores del negocio no cambian.

Se actualizan también los mensajes de éxito, archivos conservados y bloqueos
por referencias/tareas. La ayuda de archivos conservados ya remite a la revisión
de eliminación definitiva de la Papelera disponible. EN/ES mantienen paridad de
claves. App 0.2.0-dev / DB 2 / schema 1 / backup 1 sin cambios de formato.

## Comprobación

Las aserciones de diccionarios incluyen 0/1/2, singular/plural de éxito y
ausencia de variables sin interpolar. El ejecutor de archivos añade una comprobación
real de interfaz en EN/ES para 0 grupos/0 archivos, 1/1, 2/3 y 1/2, más leyendas
de grupos con un archivo y dos archivos. La revisión conserva digest, revisión
y bytes; sus recorridos de eliminación, rollback, copias y reapertura permanecen.

La aceptación funcional completa anterior de los módulos conserva sus hashes
en VALIDATION_PERFORMANCE.md. Los cambios posteriores de diccionario/vista no
se atribuyen retrospectivamente a esas rondas.

Rondas actuales: `regression-2026-10-21-storage-plurals-{chrome,edge}.json`,
3 suites / 57 comprobaciones por motor, sin fallos: archivos 20/20, papelera
19/19 y conjuntos inactivos 18/18. Incluyen cierres propios y 131 fuentes
intactas. El nuevo regression.cjs se ha usado realmente para estas selecciones.
303 Node / 917 estáticas. No acredita un dispositivo físico o lector de pantalla.
