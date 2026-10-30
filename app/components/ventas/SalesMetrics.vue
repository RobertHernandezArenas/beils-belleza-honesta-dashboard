<script setup lang="ts">
import type { SummaryTimeframe } from '~/composables/useSalesAnalytics'
import InfoTooltip from '~/components/shared/InfoTooltip.vue'
import { paymentMethodLabel } from '~~/shared/utils/payments'

interface Props {
	timeframeLabels: Record<string, string>
	summaryTimeframe: SummaryTimeframe
	summaryStats: {
		total: number
		count: number
		average: number
		totalChange: number
		countChange: number
		averageChange: number
	}
	collectedStats: {
		total: number
		byMethod: { method: string; amount: number }[]
	}
	salesCount: number
	salesTotalSum: number
	totalSparkline: string
	totalSparklineArea: string
	countSparkline: string
	countSparklineArea: string
	averageSparkline: string
	averageSparklineArea: string
	monthlyProjection: {
		projected: number
		changeVsLastMonth: number
	}
	formatCurrency: (val: number) => string
}

defineProps<Props>()
</script>

<template>
	<!-- METRICS (Left Side - 4 columns) -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-[65%] shrink-0">
		<!-- Card 1 -->
		<div class="bg-bg-card border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-36.25">
			<div class="flex justify-between items-start">
				<div class="flex items-start gap-1">
					<span class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
						FACTURADO<br>{{ timeframeLabels[summaryTimeframe] }}
					</span>
					<InfoTooltip
						title="Facturado"
						what="Importe total de las ventas facturadas en el periodo, estén cobradas o no (las ventas a deber cuentan al crearse)."
						why="Mide el volumen de facturación y la capacidad de generación de ingresos del centro en tiempo real."
						how="Sumatorio del importe total de todas las operaciones y comprobantes emitidos en el periodo."
						position="bottom"
						align="start"
					/>
				</div>
				<span
					class="text-[10px] font-bold"
					:class="summaryStats.totalChange >= 0 ? 'text-[#248A3D]' : 'text-[#C53030]'">
					{{ summaryStats.totalChange >= 0 ? '+' : '' }}{{ summaryStats.totalChange.toFixed(1) }}%
				</span>
			</div>
			<div class="mt-1">
				<h3 class="text-2xl font-black text-text-primary tabular-nums tracking-tight font-sans leading-none mb-1">{{ formatCurrency(summaryStats.total) }}</h3>
				<span class="text-[9px] font-bold text-text-muted/80 block">
					Histórico: {{ formatCurrency(salesTotalSum) }}
				</span>
			</div>
			<div class="h-8 w-full -mx-1 -mb-1 opacity-90">
				<svg viewBox="0 0 100 20" class="size-full text-text-primary" preserveAspectRatio="none">
					<path :d="totalSparklineArea" fill="currentColor" class="text-text-primary/5" />
					<path :d="totalSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		</div>

		<!-- Card 2 -->
		<div class="bg-bg-card border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-36.25">
			<div class="flex justify-between items-start">
				<div class="flex items-start gap-1">
					<span class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
						TICKETS<br>EMITIDOS {{ timeframeLabels[summaryTimeframe] }}
					</span>
					<InfoTooltip
						title="Tickets Emitidos"
						what="Cantidad total de transacciones y comprobantes emitidos en caja."
						why="Evalúa la afluencia de clientes al centro y el volumen operativo procesado en el TPV."
						how="Conteo directo de comprobantes con estado completado dentro del rango de fechas activo."
						position="bottom"
						align="start"
					/>
				</div>
				<span
					class="text-[10px] font-bold"
					:class="summaryStats.countChange >= 0 ? 'text-[#248A3D]' : 'text-[#C53030]'">
					{{ summaryStats.countChange >= 0 ? '+' : '' }}{{ summaryStats.countChange.toFixed(1) }}%
				</span>
			</div>
			<div class="mt-1">
				<h3 class="text-2xl font-black text-text-primary tabular-nums tracking-tight font-sans leading-none mb-1">{{ summaryStats.count }}</h3>
				<span class="text-[9px] font-bold text-text-muted/80 block">
					Histórico: {{ salesCount }} tickets
				</span>
			</div>
			<div class="h-8 w-full -mx-1 -mb-1 opacity-90">
				<svg viewBox="0 0 100 20" class="size-full text-text-primary" preserveAspectRatio="none">
					<path :d="countSparklineArea" fill="currentColor" class="text-text-primary/5" />
					<path :d="countSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		</div>

		<!-- Card 3 -->
		<div class="bg-bg-card border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-36.25">
			<div class="flex justify-between items-start">
				<div class="flex items-start gap-1">
					<span class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
						PROM. POR<br>VENTA {{ timeframeLabels[summaryTimeframe] }}
					</span>
					<InfoTooltip
						title="Promedio por Venta"
						what="Gasto medio generado por cada transacción (Ticket Medio / AOV)."
						why="Permite monitorizar si las ventas crecen por aumento de clientes o por mayor consumo medio por ticket."
						how="Facturación total acumulada dividida entre el número de comprobantes emitidos."
						position="bottom"
						align="center"
					/>
				</div>
				<span
					class="text-[10px] font-bold"
					:class="summaryStats.averageChange >= 0 ? 'text-[#248A3D]' : 'text-[#C53030]'">
					{{ summaryStats.averageChange >= 0 ? '+' : '' }}{{ summaryStats.averageChange.toFixed(1) }}%
				</span>
			</div>
			<div class="mt-1">
				<h3 class="text-2xl font-black text-text-primary tabular-nums tracking-tight font-sans leading-none mb-1">{{ formatCurrency(summaryStats.average) }}</h3>
				<!-- Empty placeholder to match heights of Card 1 and 2 -->
				<div class="h-3"/>
			</div>
			<div class="h-8 w-full -mx-1 -mb-1 opacity-90">
				<svg viewBox="0 0 100 20" class="size-full" :class="summaryStats.averageChange >= 0 ? 'text-text-primary' : 'text-[#C53030]'" preserveAspectRatio="none">
					<path :d="averageSparklineArea" fill="currentColor" class="opacity-5" />
					<path :d="averageSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		</div>

		<!-- Card 4 (Pure Black Card Matching Image) -->
		<div class="bg-black border border-black rounded-xl p-4.5 flex flex-col justify-between shadow-sm relative h-36.25 text-white">
			<!-- Subcontainer to absolute clip watermark arrow without overflow-hidden on parent -->
			<div class="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
				<!-- Big arrow watermark on the right -->
				<div class="absolute -right-0.5 top-4 bottom-4 text-text-secondary flex items-center justify-center opacity-65">
					<svg class="size-22.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round">
						<line x1="12" y1="19" x2="12" y2="5"/>
						<polyline points="5 12 12 5 19 12"/>
					</svg>
				</div>
			</div>
			<div class="relative z-10 flex flex-col h-full justify-between">
				<div class="text-left">
					<div class="flex items-start gap-1">
						<span class="text-[9px] font-bold text-text-muted tracking-wider uppercase leading-tight">
							PROYECCIÓN<br>MENSUAL
						</span>
						<InfoTooltip
							title="Proyección Mensual"
							what="Estimación matemática de facturación al cierre del mes corriente (Run Rate)."
							why="Permite anticipar el cumplimiento de objetivos comerciales y el punto de equilibrio financiero con antelación."
							how="Promedio de ventas diario alcanzado multiplicado por el total de días naturales del mes."
							position="bottom"
							align="end"
						/>
					</div>
					<h3 class="text-3xl font-black tabular-nums tracking-tight font-sans leading-none mb-1.5 mt-1">{{ formatCurrency(monthlyProjection.projected) }}</h3>
				</div>
				<p class="text-[10px] text-text-muted font-medium max-w-[80%] leading-snug">
					Superando el mes anterior en {{ Math.abs(monthlyProjection.changeVsLastMonth).toFixed(1) }}%
				</p>
			</div>
		</div>

		<!-- Cobrado: dinero realmente recibido en el periodo, por método -->
		<div class="bg-bg-card border border-border-default/70 rounded-xl p-4.5 flex flex-col gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.01)] sm:col-span-2 lg:col-span-4">
			<div class="flex items-start gap-1">
				<span class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
					COBRADO {{ timeframeLabels[summaryTimeframe] }}
				</span>
				<InfoTooltip
					title="Cobrado"
					what="Dinero realmente recibido en el periodo: ventas pagadas en el momento más los cobros de deudas (cada uno en su fecha)."
					why="Una venta a deber se factura al crearla pero no suma aquí hasta que se cobra, así que no se cuenta dos veces."
					how="Suma por método de pago; en los pagos mixtos se reparte según el desglose de cada método."
					position="bottom"
					align="start"
				/>
			</div>
			<div class="flex flex-wrap items-baseline gap-x-6 gap-y-1">
				<h3 class="text-2xl font-black text-text-primary tabular-nums tracking-tight font-sans leading-none">{{ formatCurrency(collectedStats.total) }}</h3>
				<span v-for="part in collectedStats.byMethod" :key="part.method" class="text-[11px] font-bold text-text-muted tabular-nums">
					{{ paymentMethodLabel(part.method) }}: <span class="text-text-primary">{{ formatCurrency(part.amount) }}</span>
				</span>
			</div>
		</div>
	</div>
</template>
