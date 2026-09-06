<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
	X,
	FileDown,
	FileSpreadsheet,
	Layers,
	Receipt,
	Calculator,
	Calendar,
	CheckCircle2,
	AlertCircle,
} from 'lucide-vue-next'
import type { Sale } from '~~/shared/types/domain'
import type { ExportDetailMode } from '~/utils/salesExportCalculations'
import { getPeriodDateBounds } from '~/utils/salesExportCalculations'
import type { SummaryTimeframe } from '~/composables/useSalesAnalytics'
import InfoTooltip from '~/components/shared/InfoTooltip.vue'

interface Props {
	isOpen: boolean
	allSales: Sale[]
	initialTimeframe?: SummaryTimeframe
	initialQuarter?: number
	initialYear?: number
	isGeneratingPdf: boolean
}

const props = withDefaults(defineProps<Props>(), {
	initialTimeframe: 'month',
	initialQuarter: () => Math.floor(new Date().getMonth() / 3) + 1,
	initialYear: () => new Date().getFullYear(),
})

const emit = defineEmits<{
	(e: 'close'): void
	(e: 'export', payload: {
		format: 'csv' | 'pdf'
		mode: ExportDetailMode
		targetSales: Sale[]
		periodTitle: string
	}): void
}>()

// Internal state of the modal
const selectedTimeframe = ref<SummaryTimeframe>(props.initialTimeframe)
const selectedQuarter = ref<number>(props.initialQuarter)
const selectedYear = ref<number>(props.initialYear)
const selectedMode = ref<ExportDetailMode>('breakdown')

// Available years for selection (current year and 3 prior years)
const currentYear = new Date().getFullYear()
const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

// Reset or sync when modal opens
watch(() => props.isOpen, (open) => {
	if (open) {
		selectedTimeframe.value = props.initialTimeframe
		selectedQuarter.value = props.initialQuarter
		selectedYear.value = props.initialYear
	}
})

// Dynamic title of the chosen period
const computedPeriodTitle = computed(() => {
	if (selectedTimeframe.value === 'day') return 'Hoy'
	if (selectedTimeframe.value === 'week') return 'Esta Semana'
	if (selectedTimeframe.value === 'month') {
		const monthNames = [
			'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
			'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
		]
		return `${monthNames[new Date().getMonth()]} ${selectedYear.value}`
	}
	if (selectedTimeframe.value === 'quarter') {
		const quarterLabels: Record<number, string> = {
			1: '20 Ene - 20 Abr',
			2: '20 Abr - 20 Jul',
			3: '20 Jul - 20 Oct',
			4: `20 Oct ${selectedYear.value} - 20 Ene ${selectedYear.value + 1}`,
		}
		return `${selectedQuarter.value}T ${selectedYear.value} (${quarterLabels[selectedQuarter.value] || `Trimestre ${selectedQuarter.value}`})`
	}
	if (selectedTimeframe.value === 'year') {
		return `Año ${selectedYear.value}`
	}
	return 'Histórico Total'
})

// Filter sales matching the modal's period selection in real-time
const targetSales = computed(() => {
	if (!props.allSales) return []
	if (selectedTimeframe.value === 'all') return props.allSales

	const { start, end } = getPeriodDateBounds(selectedTimeframe.value, {
		quarter: selectedQuarter.value,
		year: selectedYear.value,
	})

	if (!start || !end) return props.allSales

	return props.allSales.filter((s: Sale) => {
		const d = new Date(s.created_at)
		return d >= start && d <= end
	})
})

const targetSalesCount = computed(() => targetSales.value.length)
const targetTotalSum = computed(() => targetSales.value.reduce((acc, s) => acc + s.total, 0))

const formatCurrency = (val: number) =>
	new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

const triggerExport = (format: 'csv' | 'pdf') => {
	emit('export', {
		format,
		mode: selectedMode.value,
		targetSales: targetSales.value,
		periodTitle: computedPeriodTitle.value,
	})
}
</script>

<template>
	<div
		v-if="isOpen"
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
		role="dialog"
		aria-modal="true"
		aria-labelledby="export-modal-title"
	>
		<!-- Backdrop with soft blur -->
		<div
			class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
			@click="emit('close')"
		/>

		<!-- Modal Container -->
		<div
			class="relative w-full max-w-2xl bg-bg-card border border-border-default rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] transition-all animate-in zoom-in-95 duration-200"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-5 border-b border-border-default/80 bg-bg-card/50">
				<div class="flex items-center gap-3">
					<div class="size-10 rounded-2xl bg-[#922c88]/10 text-[#922c88] flex items-center justify-center font-bold">
						<FileDown class="size-5" />
					</div>
					<div>
						<h2 id="export-modal-title" class="text-base sm:text-lg font-black tracking-tight text-text-primary uppercase font-sans">
							Exportar Ventas y Facturación
						</h2>
						<p class="text-xs text-text-muted">
							Genera tu reporte contable o fiscal en formato .PDF o .CSV
						</p>
					</div>
				</div>
				<button
					class="size-9 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-muted transition-all"
					aria-label="Cerrar modal"
					@click="emit('close')"
				>
					<X class="size-4" />
				</button>
			</div>

			<!-- Body (Scrollable) -->
			<div class="p-6 overflow-y-auto space-y-6 custom-scrollbar">
				<!-- SECCIÓN 1: Selección de Periodo -->
				<div>
					<label class="block text-xs font-black tracking-wider uppercase text-text-primary mb-2.5">
						1. Periodo del Informe
					</label>

					<!-- Píldoras de timeframe -->
					<div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-bg-muted/70 rounded-2xl border border-border-default/60">
						<button
							type="button"
							class="py-2 px-1 text-xs font-extrabold rounded-xl transition-all text-center uppercase tracking-wider"
							:class="selectedTimeframe === 'day' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-default' : 'text-text-muted hover:text-text-primary'"
							@click="selectedTimeframe = 'day'"
						>
							Día
						</button>
						<button
							type="button"
							class="py-2 px-1 text-xs font-extrabold rounded-xl transition-all text-center uppercase tracking-wider"
							:class="selectedTimeframe === 'week' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-default' : 'text-text-muted hover:text-text-primary'"
							@click="selectedTimeframe = 'week'"
						>
							Semana
						</button>
						<button
							type="button"
							class="py-2 px-1 text-xs font-extrabold rounded-xl transition-all text-center uppercase tracking-wider"
							:class="selectedTimeframe === 'month' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-default' : 'text-text-muted hover:text-text-primary'"
							@click="selectedTimeframe = 'month'"
						>
							Mes
						</button>
						<button
							type="button"
							class="py-2 px-1 text-xs font-extrabold rounded-xl transition-all text-center uppercase tracking-wider"
							:class="selectedTimeframe === 'quarter' ? 'bg-[#922c88] text-white shadow-sm' : 'text-text-muted hover:text-text-primary'"
							@click="selectedTimeframe = 'quarter'"
						>
							Trimestre
						</button>
						<button
							type="button"
							class="py-2 px-1 text-xs font-extrabold rounded-xl transition-all text-center uppercase tracking-wider"
							:class="selectedTimeframe === 'year' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-default' : 'text-text-muted hover:text-text-primary'"
							@click="selectedTimeframe = 'year'"
						>
							Año
						</button>
						<button
							type="button"
							class="py-2 px-1 text-xs font-extrabold rounded-xl transition-all text-center uppercase tracking-wider"
							:class="selectedTimeframe === 'all' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-default' : 'text-text-muted hover:text-text-primary'"
							@click="selectedTimeframe = 'all'"
						>
							Histórico
						</button>
					</div>

					<!-- Sub-selector específico de Trimestre (Q1, Q2, Q3, Q4) y Año -->
					<div
						v-if="selectedTimeframe === 'quarter'"
						class="mt-3 p-3.5 bg-[#922c88]/5 border border-[#922c88]/20 rounded-2xl space-y-3 animate-in fade-in duration-200"
					>
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold text-[#922c88] uppercase tracking-wide flex items-center gap-1.5">
								<Calendar class="size-3.5" />
								<span>Declaración Trimestral de Autónomos (Día 20 al 20)</span>
								<InfoTooltip
									title="Ciclo Fiscal Trimestral (Día 20 al 20)"
									what="Período contable que abarca desde las 00:00:00 del día 20 del mes inicial hasta las 23:59:59 del día 20 del tercer mes (ej. 1T: 20 Ene - 20 Abr)."
									why="Coincide con los plazos oficiales de presentación y liquidación de impuestos de autónomos en España (Modelos 303 de IVA y 130 de IRPF ante la AEAT), cuya fecha límite legal es el día 20 de Abril, Julio, Octubre y Enero. Cerrar el trimestre el día 20 garantiza que todas las operaciones queden cuadradas para la gestoría sin desfases."
									how="Filtra automáticamente todas las ventas emitidas dentro del rango del día 20 al 20 del trimestre seleccionado, calculando las bases imponibles e impuestos correspondientes."
									position="bottom"
									align="start"
								/>
							</span>
							<select
								v-model="selectedYear"
								class="bg-bg-card border border-border-default text-text-primary text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#922c88]"
							>
								<option v-for="yr in availableYears" :key="yr" :value="yr">Año {{ yr }}</option>
							</select>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
							<button
								v-for="q in [1, 2, 3, 4]"
								:key="q"
								type="button"
								class="py-2 px-3 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-0.5 transition-all"
								:class="selectedQuarter === q
									? 'bg-[#922c88] text-white border-[#922c88] shadow-sm'
									: 'bg-bg-card text-text-secondary border-border-default hover:border-[#922c88]/50'"
								@click="selectedQuarter = q"
							>
								<span class="text-sm font-black">{{ q }}T</span>
								<span class="text-[10px] font-medium opacity-85">
									{{ q === 1 ? '20 Ene - 20 Abr' : q === 2 ? '20 Abr - 20 Jul' : q === 3 ? '20 Jul - 20 Oct' : '20 Oct - 20 Ene' }}
								</span>
							</button>
						</div>
					</div>

					<!-- Indicador en vivo de ventas encontradas -->
					<div class="mt-2.5 flex items-center justify-between text-xs text-text-muted px-1">
						<span class="flex items-center gap-1.5 font-medium">
							<CheckCircle2 v-if="targetSalesCount > 0" class="size-3.5 text-success" />
							<AlertCircle v-else class="size-3.5 text-warning" />
							<b class="text-text-primary">{{ targetSalesCount }}</b> tickets en {{ computedPeriodTitle }}
						</span>
						<span class="font-bold text-text-primary tabular-nums">
							Total: {{ formatCurrency(targetTotalSum) }}
						</span>
					</div>
				</div>

				<!-- SECCIÓN 2: Nivel de Desglose del Archivo -->
				<div>
					<label class="block text-xs font-black tracking-wider uppercase text-text-primary mb-2.5">
						2. Nivel de Desglose del Archivo
					</label>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<!-- Opción 1: Desglose total -->
						<div
							class="relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none"
							:class="selectedMode === 'breakdown'
								? 'border-[#922c88] bg-[#922c88]/5 shadow-sm'
								: 'border-border-default hover:border-border-strong bg-bg-card'"
							@click="selectedMode = 'breakdown'"
						>
							<div>
								<div class="flex items-center justify-between mb-2.5">
									<div class="size-8 rounded-xl flex items-center justify-center" :class="selectedMode === 'breakdown' ? 'bg-[#922c88] text-white' : 'bg-bg-muted text-text-muted'">
										<Layers class="size-4" />
									</div>
									<InfoTooltip
										title="Desglose Completo por Línea"
										what="Reporte analítico y de auditoría interna con todas las partidas detalladas."
										why="Ideal para control de stock, auditoría de consumos de cabina y verificación de precios unitarios."
										how="Exporta una fila por cada servicio o producto vendido dentro de cada ticket, desglosando base imponible, tipo de IVA y total."
										position="bottom"
										align="start"
									/>
								</div>
								<h3 class="text-xs font-black text-text-primary uppercase tracking-wide">
									Desglose Total
								</h3>
								<p class="text-[11px] text-text-muted leading-relaxed mt-1">
									Cada venta con todas sus líneas de servicio o producto, cantidades, IVA y precios unitarios.
								</p>
							</div>
							<div class="mt-3 pt-2 border-t border-border-default/60 flex items-center text-[10px] font-bold text-text-primary">
								<span :class="selectedMode === 'breakdown' ? 'text-[#922c88]' : 'text-text-muted'">
									{{ selectedMode === 'breakdown' ? '✓ Seleccionado' : 'Seleccionar' }}
								</span>
							</div>
						</div>

						<!-- Opción 2: Solo venta individual -->
						<div
							class="relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none"
							:class="selectedMode === 'individual'
								? 'border-[#922c88] bg-[#922c88]/5 shadow-sm'
								: 'border-border-default hover:border-border-strong bg-bg-card'"
							@click="selectedMode = 'individual'"
						>
							<div>
								<div class="flex items-center justify-between mb-2.5">
									<div class="size-8 rounded-xl flex items-center justify-center" :class="selectedMode === 'individual' ? 'bg-[#922c88] text-white' : 'bg-bg-muted text-text-muted'">
										<Receipt class="size-4" />
									</div>
									<InfoTooltip
										title="Libro Registro de Facturas Emitidas"
										what="Relación cronológica de tickets y facturas emitidas en el periodo."
										why="Cumple con las exigencias de la Agencia Tributaria (AEAT) para el libro registro de ventas e ingresos de autónomos."
										how="Exporta una sola fila por comprobante con su número correlativo, fecha, cliente, método de cobro y total final."
										position="bottom"
										align="center"
									/>
								</div>
								<h3 class="text-xs font-black text-text-primary uppercase tracking-wide">
									Venta Individual
								</h3>
								<p class="text-[11px] text-text-muted leading-relaxed mt-1">
									Un renglón por ticket/factura con datos de cliente, fecha, método de pago y total final.
								</p>
							</div>
							<div class="mt-3 pt-2 border-t border-border-default/60 flex items-center text-[10px] font-bold text-text-primary">
								<span :class="selectedMode === 'individual' ? 'text-[#922c88]' : 'text-text-muted'">
									{{ selectedMode === 'individual' ? '✓ Seleccionado' : 'Seleccionar' }}
								</span>
							</div>
						</div>

						<!-- Opción 3: Solo sumatorio (Fiscal) -->
						<div
							class="relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none"
							:class="selectedMode === 'summary'
								? 'border-[#922c88] bg-[#922c88]/5 shadow-sm'
								: 'border-border-default hover:border-border-strong bg-bg-card'"
							@click="selectedMode = 'summary'"
						>
							<div>
								<div class="flex items-center justify-between mb-2.5">
									<div class="size-8 rounded-xl flex items-center justify-center" :class="selectedMode === 'summary' ? 'bg-[#922c88] text-white' : 'bg-bg-muted text-text-muted'">
										<Calculator class="size-4" />
									</div>
									<InfoTooltip
										title="Resumen Fiscal para Modelos 303 y 130"
										what="Cuadro de mando contable consolidado sin listado exhaustivo de clientes."
										why="Diseñado para entregar directamente a tu gestoría para la liquidación trimestral de IVA (Modelo 303) y pago fraccionado de IRPF (Modelo 130)."
										how="Agrupa los ingresos por tipo impositivo (IVA 21%, IVA 10%), calculando base imponible total, cuota de IVA devengado y totales por método de pago."
										position="bottom"
										align="end"
									/>
								</div>
								<h3 class="text-xs font-black text-text-primary uppercase tracking-wide">
									Solo Sumatorio
								</h3>
								<p class="text-[11px] text-text-muted leading-relaxed mt-1">
									Resumen contable: Bases Imponibles, cuotas de IVA (21%, 10%) y métodos de cobro para autónomos.
								</p>
							</div>
							<div class="mt-3 pt-2 border-t border-border-default/60 flex items-center text-[10px] font-bold text-text-primary">
								<span :class="selectedMode === 'summary' ? 'text-[#922c88]' : 'text-text-muted'">
									{{ selectedMode === 'summary' ? '✓ Seleccionado' : 'Seleccionar' }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer Actions -->
			<div class="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border-default bg-bg-muted/40">
				<button
					type="button"
					class="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-text-muted hover:text-text-primary hover:bg-bg-muted rounded-xl transition-all"
					@click="emit('close')"
				>
					Cancelar
				</button>

				<div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
					<!-- CSV Button -->
					<button
						type="button"
						:disabled="targetSalesCount === 0"
						class="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-border-default hover:border-text-primary/30 bg-bg-card text-text-secondary hover:text-text-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
						@click="triggerExport('csv')"
					>
						<FileSpreadsheet class="size-4 text-emerald-600" />
						<span>Descargar CSV</span>
					</button>

					<!-- PDF Button -->
					<button
						type="button"
						:disabled="targetSalesCount === 0 || isGeneratingPdf"
						class="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#922c88] hover:bg-[#7e2575] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
						@click="triggerExport('pdf')"
					>
						<span v-if="isGeneratingPdf" class="loading loading-spinner loading-xs" />
						<FileDown v-else class="size-4" />
						<span>{{ isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF' }}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.08);
	border-radius: 99px;
}
</style>
