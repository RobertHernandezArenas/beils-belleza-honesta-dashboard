<script setup lang="ts">
import {
	Calendar, FileText,
	TrendingUp, Wallet,
	CalendarClock, MapPin, Eye, EyeOff, Plus, UserCircle, ShoppingBag, Sparkles, AlertCircle
} from 'lucide-vue-next'

import { useI18n } from 'vue-i18n'
import { useDataPrivacy } from '~/composables/useDataPrivacy'
import EditableField from '~/components/shared/EditableField.vue'
import ClientChart from '~/components/ClientChart.client.vue'

const props = defineProps({
	client: { type: Object as PropType<any>, required: true },
	isUpdating: { type: Boolean, default: false }
})

const emit = defineEmits(['update', 'open-booking', 'open-purchase', 'open-debt'])
const { revealedDocs, toggleDocumentVisibility } = useDataPrivacy()
const { locale } = useI18n()

const kpis = computed(() => props.client?.kpis || {
	topServices: [], topProducts: [], ltv: 0, aov: 0, bookingFrequencyDays: 0, totalBookings: 0,
	spendingHistory: [], paymentMethods: [], nextBooking: null
})

const timeframe = ref<'3M' | '6M' | '1Y' | 'ALL'>('ALL')

const isSavingNotes = ref(false)
const notesText = ref(props.client?.annotations || '')
watch(() => props.client?.annotations, (newVal) => {
	if (!isSavingNotes.value) notesText.value = newVal || ''
})

const saveNotes = () => {
	isSavingNotes.value = true
	emit('update', 'annotations', notesText.value)
	setTimeout(() => { isSavingNotes.value = false }, 500)
}

const formatDate = (dateStr: string) => {
	if (!dateStr) return '---'
	return new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr))
}

const formatCurrency = (val: number) => {
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val || 0)
}

// Next Booking calculation
const nextBookingData = computed(() => {
	if (kpis.value.nextBooking) return kpis.value.nextBooking
	if (!props.client.client_bookings) return null
	const now = new Date()
	now.setHours(0, 0, 0, 0)
	const futureBookings = props.client.client_bookings
		.filter((b: any) => {
			const bDate = new Date(b.booking_date)
			bDate.setHours(0, 0, 0, 0)
			return bDate.getTime() >= now.getTime() && (b.status === 'PENDIENTE' || b.status === 'CONFIRMADA' || b.status === 'pending' || b.status === 'confirmed')
		})
		.sort((a: any, b: any) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
	return futureBookings[0] || null
})

// Spending Chart Options for ECharts (theme-aware)
const chart = useChartTheme()
const chartOptions = computed(() => {
	const ct = chart.value
	let rawHistory = kpis.value.spendingHistory || []
	
	if (timeframe.value === '3M') {
		rawHistory = rawHistory.slice(-3)
	} else if (timeframe.value === '6M') {
		rawHistory = rawHistory.slice(-6)
	} else if (timeframe.value === '1Y') {
		rawHistory = rawHistory.slice(-12)
	}

	const dates = rawHistory.map((h: any) => h.period)
	const totals = rawHistory.map((h: any) => h.total)

	return {
		grid: { top: 25, right: 15, bottom: 25, left: 45, containLabel: true },
		tooltip: {
			trigger: 'axis',
			backgroundColor: ct.tooltipBg,
			borderColor: ct.tooltipBorder,
			textStyle: { color: ct.tooltipText, fontSize: 11, fontWeight: 'bold' },
			formatter: (params: any) => {
				const item = params[0]
				return `${item.name}: <b style="color: ${ct.accent}">${item.value.toFixed(2)} €</b>`
			}
		},
		xAxis: {
			type: 'category',
			data: dates.length ? dates : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
			axisLine: { lineStyle: { color: ct.axisLine } },
			axisLabel: { color: ct.label, fontSize: 10, fontWeight: 'bold' }
		},
		yAxis: {
			type: 'value',
			axisLine: { show: false },
			splitLine: { lineStyle: { color: ct.grid, type: 'dashed' } },
			axisLabel: { color: ct.label, fontSize: 10, formatter: '{value} €' }
		},
		series: [
			{
				data: totals.length ? totals : [0, 0, 0, 0, 0, 0],
				type: 'line',
				smooth: true,
				symbolSize: 8,
				itemStyle: { color: ct.series },
				lineStyle: { width: 3, color: ct.series },
				areaStyle: {
					color: {
						type: 'linear',
						x: 0, y: 0, x2: 0, y2: 1,
						colorStops: [
							{ offset: 0, color: ct.areaTop },
							{ offset: 1, color: ct.areaBottom }
						]
					}
				}
			}
		]
	}
})

// Pending Debt Calculation
const pendingDebtTotal = computed(() => {
	if (!props.client.debts) return 0
	return props.client.debts.reduce((acc: number, d: any) => acc + (d.remaining || 0), 0)
})
</script>

<template>
	<div class="flex flex-col gap-6 lg:gap-8">

		<!-- ALERTA DE DEUDA PENDIENTE (SI EXISTE) -->
		<div v-if="pendingDebtTotal > 0" class="alert bg-error/10 border border-error/30 text-error shadow-md rounded-2xl p-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-error text-white rounded-xl">
					<Wallet class="w-5 h-5" />
				</div>
				<div>
					<h4 class="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
						Deuda Pendiente de Pago
						<div class="tooltip tooltip-right z-50" data-tip="El cliente posee tickets o consumos pendientes de cobro en el TPV o deudas registradas.">
							<AlertCircle class="w-3.5 h-3.5 opacity-80 cursor-help" />
						</div>
					</h4>
					<p class="text-xs font-semibold opacity-90">Este cliente tiene un saldo pendiente de <strong>{{ formatCurrency(pendingDebtTotal) }}</strong>.</p>
				</div>
			</div>
			<button class="btn btn-error btn-sm rounded-xl font-bold uppercase tracking-wider text-white shadow-sm" @click="$emit('open-debt', props.client.debts[0])">
				Gestionar Pago
			</button>
		</div>

		<!-- BENTO GRID SYSTEM (12 Columns Layout - Trend 2027) -->
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6 lg:gap-8">
			
			<!-- BENTO CARD 1: Próxima Cita & Countdown (Span 4) -->
			<div class="xl:col-span-4 bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl transition-all">
				<div>
					<div class="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
						<span class="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
							<CalendarClock class="w-4 h-4 text-primary" />
							Próxima Cita
							<div class="tooltip tooltip-right z-50" data-tip="Próxima visita agendada en la agenda del centro para este cliente.">
								<AlertCircle class="w-3 h-3 text-text-muted/60 cursor-help" />
							</div>
						</span>
						<span v-if="nextBookingData" class="badge badge-primary badge-sm font-black text-[9px] uppercase">
							{{ nextBookingData.status }}
						</span>
					</div>

					<div v-if="nextBookingData" class="space-y-3">
						<div class="flex items-baseline justify-between">
							<span class="text-2xl font-black text-text-primary tabular-nums">
								{{ formatDate(nextBookingData.booking_date) }}
							</span>
							<span class="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
								{{ nextBookingData.start_time }} h
							</span>
						</div>

						<div v-if="nextBookingData.booking_items?.length" class="space-y-1">
							<span class="text-[10px] font-bold uppercase tracking-wider text-text-muted">Servicios Agendados:</span>
							<div class="flex flex-wrap gap-1">
								<span v-for="it in nextBookingData.booking_items" :key="it.booking_item_id" class="badge bg-bg-muted text-text-primary font-bold text-[10px] border border-border-subtle">
									{{ it.name }}
								</span>
							</div>
						</div>

						<div v-if="nextBookingData.staff" class="text-xs text-text-muted font-medium pt-1">
							Especialista: <strong class="text-text-primary">{{ nextBookingData.staff.name }} {{ nextBookingData.staff.surname || '' }}</strong>
						</div>
					</div>

					<div v-else class="py-8 text-center flex flex-col items-center justify-center text-text-muted opacity-60">
						<Calendar class="w-10 h-10 mb-2 stroke-[1.5]" />
						<p class="text-xs font-bold uppercase tracking-wider">Sin citas agendadas</p>
					</div>
				</div>

				<div class="pt-4 border-t border-border-subtle mt-4">
					<button class="btn btn-neutral btn-sm w-full rounded-xl font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2" @click="$emit('open-booking')">
						<Plus class="w-4 h-4" />
						Agendar Nueva Cita
					</button>
				</div>
			</div>

			<!-- BENTO CARD 2: Gasto Total (LTV) & Ticket Medio (AOV) (Span 4) -->
			<div class="xl:col-span-4 bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl transition-all">
				<div class="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
					<span class="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
						<TrendingUp class="w-4 h-4 text-primary" />
						Rendimiento Financiero
					</span>
					<span class="text-[10px] font-black text-text-muted uppercase">Beils CRM</span>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<!-- LTV -->
					<div class="bg-bg-muted/40 border border-border-subtle rounded-2xl p-4 space-y-1">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-black uppercase text-text-muted tracking-wider">LTV (Gasto Total)</span>
							<div class="tooltip tooltip-bottom z-50" data-tip="Lifetime Value (LTV): Suma monetaria total acumulada de todas las compras y cobros realizados por este cliente en el centro.">
								<AlertCircle class="w-3 h-3 text-text-muted/60 cursor-help" />
							</div>
						</div>
						<p class="text-2xl font-black text-text-primary tabular-nums">{{ formatCurrency(kpis.ltv) }}</p>
						<span class="text-[9px] font-bold text-success flex items-center gap-1">
							<Sparkles class="w-3 h-3" /> Acumulado
						</span>
					</div>

					<!-- AOV -->
					<div class="bg-bg-muted/40 border border-border-subtle rounded-2xl p-4 space-y-1">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-black uppercase text-text-muted tracking-wider">AOV (Ticket Medio)</span>
							<div class="tooltip tooltip-bottom z-50" data-tip="Average Order Value (AOV): Promedio monetario gastado en cada transacción o visita de compra.">
								<AlertCircle class="w-3 h-3 text-text-muted/60 cursor-help" />
							</div>
						</div>
						<p class="text-2xl font-black text-text-primary tabular-nums">{{ formatCurrency(kpis.aov) }}</p>
						<span class="text-[9px] font-bold text-text-muted">Por transacción</span>
					</div>
				</div>

				<!-- Frecuencia -->
				<div class="bg-bg-muted/20 border border-border-subtle rounded-2xl p-3.5 mt-4 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<CalendarClock class="w-4 h-4 text-primary" />
						<span class="text-xs font-bold text-text-primary">Frecuencia de Citas</span>
						<div class="tooltip tooltip-top z-50" data-tip="Promedio estimado de días transcurridos entre citas agendadas por este cliente.">
							<AlertCircle class="w-3 h-3 text-text-muted/60 cursor-help" />
						</div>
					</div>
					<span class="text-xs font-black text-primary tabular-nums">Cada {{ kpis.bookingFrequencyDays || 30 }} días</span>
				</div>
			</div>

			<!-- BENTO CARD 3: Datos Personales e Información de Contacto (Span 4) -->
			<div class="xl:col-span-4 bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl transition-all">
				<div>
					<div class="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
						<span class="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
							<UserCircle class="w-4 h-4 text-primary" />
							Datos de Contacto
						</span>
						<span class="badge badge-ghost font-mono text-[9px] font-bold">PERFIL</span>
					</div>

					<div class="space-y-3 text-xs font-medium">
						<div class="bg-bg-muted/30 border border-border-subtle rounded-2xl p-3.5 space-y-2">
							<EditableField :model-value="client.address" label="Dirección" :is-mutating="isUpdating" @save="emit('update', 'address', $event)" />
							<div class="flex gap-1 items-center">
								<EditableField :model-value="client.city" label="Ciudad" :is-mutating="isUpdating" @save="emit('update', 'city', $event)" />
								<span>,</span>
								<EditableField :model-value="client.postal_code" label="C.P." :is-mutating="isUpdating" @save="emit('update', 'postal_code', $event)" />
							</div>
							<EditableField :model-value="client.country" label="País" :is-mutating="isUpdating" @save="emit('update', 'country', $event)" />
						</div>

						<div class="bg-bg-muted/30 border border-border-subtle rounded-2xl p-3 flex items-center justify-between">
							<span class="text-text-muted text-[11px] font-bold">Documento:</span>
							<div class="flex items-center gap-2">
								<span class="font-mono font-bold text-text-primary">{{ revealedDocs[client.user_id] || '****' + (client.document_number?.slice(-4) || '3115') }}</span>
								<button class="btn btn-ghost btn-xs btn-circle" aria-label="Toggle Document" @click="toggleDocumentVisibility(client.user_id, client.document_number)">
									<component :is="revealedDocs[client.user_id] ? EyeOff : Eye" class="w-3.5 h-3.5 text-text-muted" />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- BENTO CARD 4: Gráfico Interactivo Evolución Gasto / Tiempo (Span 8) -->
			<div class="xl:col-span-8 bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 hover:shadow-xl transition-all flex flex-col justify-between">
				<div>
					<div class="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
						<span class="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
							<TrendingUp class="w-4 h-4 text-primary" />
							Evolución de Gasto por Tiempo
							<div class="tooltip tooltip-right z-50" data-tip="Gráfico interactivo de ingresos mensuales aportados por el cliente. Seleccioná el rango temporal deseado (3M, 6M, 1Y, Todo).">
								<AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
							</div>
						</span>
						
						<!-- Timeframe Selector Button Group -->
						<div class="join border border-border-subtle rounded-xl overflow-hidden bg-bg-muted/50">
							<button 
								v-for="tf in (['3M', '6M', '1Y', 'ALL'] as const)" 
								:key="tf"
								class="join-item btn btn-xs font-black px-3 transition-colors"
								:class="timeframe === tf ? 'btn-neutral text-white shadow-xs' : 'btn-ghost text-text-muted hover:text-text-primary'"
								@click="timeframe = tf"
							>
								{{ tf }}
							</button>
						</div>
					</div>

					<div class="h-64 w-full pt-2">
						<ClientChart :option="chartOptions" />
					</div>
				</div>
			</div>

			<!-- BENTO CARD 5: Servicios y Productos Favoritos (Span 4) -->
			<div class="xl:col-span-4 bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 flex flex-col justify-between hover:shadow-xl transition-all">
				<div class="space-y-4">
					<div class="flex items-center justify-between border-b border-border-subtle pb-3">
						<span class="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
							<ShoppingBag class="w-4 h-4 text-primary" />
							Favoritos Más Consumidos
							<div class="tooltip tooltip-left z-50" data-tip="Top 3 de servicios y productos con mayor número de unidades contratadas o adquiridas por este cliente.">
								<AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
							</div>
						</span>
					</div>

					<!-- Top Servicios -->
					<div class="space-y-2">
						<span class="text-[10px] font-black text-primary uppercase tracking-wider">Top Servicios</span>
						<div v-if="kpis.topServices?.length" class="space-y-1.5">
							<div v-for="s in kpis.topServices" :key="s.name" class="flex items-center justify-between text-xs bg-bg-muted/30 p-2.5 rounded-xl border border-border-subtle">
								<span class="font-bold text-text-primary truncate max-w-[170px]">{{ s.name }}</span>
								<span class="badge badge-sm font-black tabular-nums">{{ s.qty }}x ({{ formatCurrency(s.total) }})</span>
							</div>
						</div>
						<p v-else class="text-xs text-text-muted italic opacity-60">Sin historial de servicios</p>
					</div>

					<!-- Top Productos -->
					<div class="space-y-2 pt-2 border-t border-border-subtle">
						<span class="text-[10px] font-black text-secondary uppercase tracking-wider">Top Productos</span>
						<div v-if="kpis.topProducts?.length" class="space-y-1.5">
							<div v-for="p in kpis.topProducts" :key="p.name" class="flex items-center justify-between text-xs bg-bg-muted/30 p-2.5 rounded-xl border border-border-subtle">
								<span class="font-bold text-text-primary truncate max-w-[170px]">{{ p.name }}</span>
								<span class="badge badge-sm font-black tabular-nums">{{ p.qty }}x ({{ formatCurrency(p.total) }})</span>
							</div>
						</div>
						<p v-else class="text-xs text-text-muted italic opacity-60">Sin compras de productos</p>
					</div>
				</div>
			</div>

			<!-- BENTO CARD 6: Anotaciones Comerciales & Ficha Técnica (Span 12) -->
			<div class="xl:col-span-12 bg-bg-card border border-border-default/80 shadow-md rounded-3xl p-6 hover:shadow-xl transition-all space-y-4">
				<div class="flex items-center justify-between border-b border-border-subtle pb-3">
					<span class="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
						<FileText class="w-4 h-4 text-primary" />
						Anotaciones Comerciales & Ficha Técnica
						<div class="tooltip tooltip-right z-50" data-tip="Notas privadas del equipo de recepción o estética para registrar alergias, preferencias o particularidades del cliente.">
							<AlertCircle class="w-3.5 h-3.5 text-text-muted/60 cursor-help" />
						</div>
					</span>
					<span class="text-[10px] text-text-muted font-bold">Auto-guardado habilitado</span>
				</div>

				<textarea 
					v-model="notesText" 
					rows="3"
					class="textarea border-border-default/80 bg-bg-muted/20 focus:border-primary/50 w-full rounded-2xl p-4 text-xs font-medium focus:outline-none transition-all shadow-inner" 
					placeholder="Escribe aquí notas sobre preferencias, alergias, o detalles importantes del cliente..."
				/>

				<div class="flex justify-end">
					<button :disabled="isSavingNotes" class="btn btn-neutral btn-sm rounded-xl font-bold px-6 shadow-sm" @click="saveNotes">
						<span v-if="isSavingNotes" class="loading loading-spinner loading-xs"/>
						{{ isSavingNotes ? 'Guardando...' : 'Guardar Anotaciones' }}
					</button>
				</div>
			</div>

		</div>
	</div>
</template>

<style scoped>
</style>
