# Tutorial Paso a Paso: Implementación de Subtotales Mensuales en Reportes de Ventas y Píldora Histórico

Este documento detalla el paso a paso técnico para replicar y desplegar en producción la funcionalidad de **subtotales mensuales automáticos en la exportación de ventas (PDF y CSV)** y el establecimiento de la píldora **Histórico por defecto** en el dashboard de Beils.

---

## 1. Resumen de la Funcionalidad

1. **Subtotales mensuales inline en desgloses diarios (`summaryGrouping === 'day'`)**:
   - Al listar las filas diarias de un periodo multimes (ej. **3T 2026: 1 Jul - 30 Sep**), al finalizar los días de cada mes se inserta automáticamente una fila destacada de **SUBTOTAL** (ej. `SUBTOTAL JULIO 2026`, `SUBTOTAL AGOSTO 2026`, `SUBTOTAL SEPTIEMBRE 2026`).
2. **Tabla de Resumen Consolidado por Meses**:
   - Para periodos que abarcan más de un mes, tanto el PDF como el CSV incorporan una tabla resumen mes a mes con sus bases, impuestos (21% y 10%) y totales, coincidiendo exactamente con la declaración tributaria.
3. **Píldora por defecto en Ventas**:
   - La vista de `/ventas` ahora se abre por defecto con el filtro en **"HISTÓRICO"**, reflejando directamente los 390 tickets globales en la tarjeta métrica de "Tickets Emitidos" y evitando confusiones con los filtros mensuales.
4. **Títulos dinámicos en métricas**:
   - La tarjeta de "Tickets Emitidos" y "Prom. por Venta" ahora muestran explícitamente el período activo (`TICKETS EMITIDOS (HISTÓRICO)`, `TICKETS EMITIDOS (ESTE MES)`, etc.).

---

## 2. Archivos Modificados

| Archivo | Rol en la Implementación |
| :--- | :--- |
| `app/utils/salesExportCalculations.ts` | Agrupación mensual en CSV e inserción de filas `SUBTOTAL [MES]` y tabla consolidada. |
| `app/utils/exportHelpers.ts` | Maquetación en jsPDF de la fila destacada de subtotal y tabla resumen mensual. |
| `app/components/ventas/SalesMetrics.vue` | Títulos dinámicos por período en tarjetas de Tickets Emitidos y Promedio. |
| `app/components/ventas/SalesExportModal.vue` | Descripción clarificada de la opción "Por Día" en el modal de exportación. |
| `app/composables/useSales.ts` | Cambio del timeframe inicial por defecto a `'all'` (Histórico). |
| `tests/sales-export.test.ts` | Cobertura de pruebas unitarias para subtotales mensuales y trimestrales. |

---

## 3. Detalle de Cambios Código por Código

### Paso 1: Generación de CSV con Subtotales (`app/utils/salesExportCalculations.ts`)
En la función `buildSalesCsvContent`, cuando `mode === 'summary'` y `summaryGrouping === 'day'`:
- Se precalcula el mapa mensual usando `calculatePeriodicSummaries(sales, 'month')`.
- Al iterar las filas diarias, si la fila actual es el último día de su mes (`isLastDayOfMonth`), se inserta la fila de `SUBTOTAL [MES]`.
- Si el reporte contiene más de un mes (`monthlySummaries.length > 1`), se añade la sección `RESUMEN CONSOLIDADO POR MESES`.

```typescript
// app/utils/salesExportCalculations.ts
const monthlySummaries = summaryGrouping === 'day' ? calculatePeriodicSummaries(sales, 'month') : []
const monthlyMap = new Map<string, PeriodicSummaryRow>()
for (const m of monthlySummaries) {
    monthlyMap.set(m.key, m)
}

// Dentro del bucle de filas diarias:
if (summaryGrouping === 'day') {
    const currentMonthKey = row.key.slice(0, 7)
    const nextRow = periodicRows[i + 1]
    const isLastDayOfMonth = !nextRow || nextRow.key.slice(0, 7) !== currentMonthKey
    if (isLastDayOfMonth) {
        const monthSummary = monthlyMap.get(currentMonthKey)
        if (monthSummary) {
            lines.push([
                `SUBTOTAL ${monthSummary.label.toUpperCase()}`,
                String(monthSummary.salesCount),
                formatNumberEs(monthSummary.baseAmount),
                formatNumberEs(monthSummary.tax21Amount),
                formatNumberEs(monthSummary.tax10Amount),
                formatNumberEs(monthSummary.totalTaxAmount),
                formatNumberEs(monthSummary.grandTotal),
                formatNumberEs(mCash),
                formatNumberEs(mCard),
                formatNumberEs(mOthers),
            ])
        }
    }
}
```

---

### Paso 2: Maquetación en PDF (`app/utils/exportHelpers.ts`)
En la función `downloadSalesExportPdf`:
- Al final de cada mes en la tabla periódica diaria, se dibuja una barra de fondo color lavanda suave corporativo (`#f3e8ff` / RGB: 243, 232, 255) con texto en color violeta oscuro de marca (`#6d2875` / RGB: 109, 40, 117) y tipografía en negrita.
- Tras la tabla diaria, si hay más de 1 mes, se añade la sección **"Resumen Consolidado por Meses"** con su encabezado y totales acumulados.

```typescript
// app/utils/exportHelpers.ts
if (summaryGrouping === 'day' && isLastDayOfMonth) {
    const monthSummary = monthlyMap.get(currentMonthKey)
    if (monthSummary) {
        ensureSpace(9, () => {
            drawDocumentHeader()
            drawPeriodicHeader()
        })
        doc.setFillColor(243, 232, 255)
        doc.rect(marginX, y, contentWidth, 6.2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(109, 40, 117)
        // Dibuja etiquetas, tickets, bases, IVA 21%, IVA 10% y total
        ...
    }
}
```

---

### Paso 3: Píldora Histórico por Defecto (`app/composables/useSales.ts`)
Se actualizó la inicialización del composable de ventas:

```typescript
// app/composables/useSales.ts (Línea 42)
- const summaryTimeframe = ref<SummaryTimeframe>('month')
+ const summaryTimeframe = ref<SummaryTimeframe>('all')
```

---

### Paso 4: Títulos Dinámicos en Tarjetas de Métricas (`app/components/ventas/SalesMetrics.vue`)
Se agregaron las etiquetas dinámicas de periodo para consistencia:

```vue
<!-- app/components/ventas/SalesMetrics.vue -->
<span class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
    TICKETS<br>EMITIDOS {{ timeframeLabels[summaryTimeframe] }}
</span>
...
<span class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
    PROM. POR<br>VENTA {{ timeframeLabels[summaryTimeframe] }}
</span>
```

---

## 4. Despliegue en el Servidor de Producción

Para replicar estos cambios en el servidor Plesk / Docker de producción:

### 1. Actualizar repositorio
```bash
git fetch origin
git pull origin main
```

### 2. Verificar dependencias y compilación
```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

### 3. Reiniciar el servicio Node / PM2 / Docker
```bash
pm2 restart beils-dashboard
# o si usa systemd:
sudo systemctl restart beils-dashboard
```

---

## 5. Guía de Validación Funcional en Producción

### Caso de Prueba: Exportación Trimestral 3T 2026
1. Ir a la sección **Ventas**.
2. Verificar que al cargar la página:
   - La píldora superior activa es **HISTÓRICO**.
   - La tarjeta **TICKETS EMITIDOS HISTÓRICO** marca el total acumulado global (ej. **390**).
3. Hacer clic en **Exportar (.PDF / .CSV)**:
   - **Período**: Trimestre -> **3T (1 Jul - 30 Sep)**.
   - **Nivel de desglose**: **Solo Sumatorio**.
   - **Frecuencia**: **Por Día**.
4. Descargar el **PDF**:
   - Verificar que al final de los días de julio aparece la fila:  
     `SUBTOTAL JULIO 2026 | 70 tickets | Base: 2.329,26 € | IVA 21%: 489,14 € | IVA 10%: 0,00 € | Total: 2.818,40 €`.
   - Al final de agosto:  
     `SUBTOTAL AGOSTO 2026 | 65 tickets | Base: 2.306,78 € | IVA 21%: 484,42 € | IVA 10%: 0,00 € | Total: 2.787,20 €`.
   - Al final de septiembre:  
     `SUBTOTAL SEPTIEMBRE 2026 | 66 tickets | Base: 1.660,08 € | IVA 21%: 348,62 € | IVA 10%: 0,00 € | Total: 1.951,70 €`.
   - Al final del documento:  
     Tabla **"Resumen Consolidado por Meses"** con los 3 meses y los **TOTALES ACUMULADOS (201 tickets | 7.557,30 €)**.
5. Descargar el **CSV**:
   - Abrir en Excel y confirmar que contiene las líneas de `SUBTOTAL [MES]` y la sección `RESUMEN CONSOLIDADO POR MESES`.
