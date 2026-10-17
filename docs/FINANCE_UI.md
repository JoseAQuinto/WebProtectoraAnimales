# Interfaz de finanzas

`modules.finance.render(ctx)` devuelve un array para la ruta `#finance`.
Utiliza snapshot/revisión, refresh/notify y canWrite del contexto habitual.
Cargar después de UI, servicios de finanzas/contactos y antes de bootstrap.
Traducciones `f.*` centralizadas en ambos diccionarios tras integrar los fragmentos.

## Funciones

- Lista de 20 movimientos por página, búsqueda con retraso de 180 ms, filtros
  de fecha inclusiva, dirección, categoría, animal, contacto y estado.
- Ingresos, gastos y saldo se derivan de todos los movimientos filtrados,
  mediante `finance.totals`. Excluyen anulados. La ayuda explica que el filtro
  de dirección afecta al saldo y que filtrar solo anulados produce totales cero.
- Alta de ingreso o gasto con fecha civil no futura, concepto, categoría de
  la dirección elegida, importe positivo, contactos/animales existentes y notas.
  Usa moneda de organización y parser entero con separador decimal explícito.
  No permite cambiar moneda ni inyectar orígenes o metadatos.
- Anulación con fecha, motivo y confirmación. Conserva movimiento e historia,
  explica los efectos en donación económica y que no devuelve stock ni borra
  actos sanitarios o adopciones.
- Corrección con motivo, fecha y confirmación. `finance.correct` anula y crea
  sustituto; no sobrescribe el importe original. Muestra ambos enlaces y
  las referencias de los otros módulos sin repetir sus operaciones.
- La ficha muestra origen, enlaces a animal/contacto, estado, motivo/fecha de
  anulación, notas y referencias a salud/donación/adopción/inventario.
- Las referencias actualmente inactivas se conservan en el editor de corrección
  con un aviso; el usuario debe revisar y elegir una relación/categoría válida.
  El servicio revalida antes de guardar. No se limpian relaciones por defecto.
- Modo lectura desactiva altas/correcciones/anulaciones. Cada formulario captura
  revisión al abrir y usa ui.form para errores, campos conservados e idempotencia.

El alta manual solo crea un movimiento económico. Donaciones, inventario,
exportación y contabilidad fiscal no se implementan en este módulo. El producto
conserva su alcance pendiente; esta pantalla no acredita esas funciones.

## Verificación y aceptación pendiente

Se comprueban sintaxis y paridad de claves/variables EN/ES. No se ejecutan
navegadores durante el trabajo paralelo; aceptación real pendiente en `file://`:

1. Alta de ingreso/gasto en EUR, JPY y KWD; precisión, separador y límites;
   rechazo de cero/negativo, fecha futura y categoría de otra dirección.
2. Filtros/paginación y totales contra todos los registros coincidentes,
   incluidos anulados excluidos y sin sumar facturas compartidas varias veces.
3. Anulación con motivo y corrección con sustituto; comprobar conservación
   del original, referencias reasignadas, doble pulsación y rechazo atómico.
4. Contactos fusionados/históricos y relaciones archivadas, sin UUID visibles
   ni eliminación silenciosa de enlaces.
5. Revisión antigua, pérdida de control o cuota: campos conservados y ningún
   éxito parcial. Persistencia y backup/restauración de vínculos e importes.
6. Teclado/foco, EN/ES, ampliación y anchos de pantalla. No equiparar un viewport
   con un dispositivo físico ni esta comprobación con aceptación comercial.
