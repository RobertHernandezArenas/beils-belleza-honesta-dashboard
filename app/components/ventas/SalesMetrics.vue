<script setup lang="ts">
interface Props {
	timeframeLabels: Record<'day' | 'week' | 'month' | 'year', string>
	summaryTimeframe: 'day' | 'week' | 'month' | 'year'
	summaryStats: {
		total: number
		count: number
		average: number
		totalChange: number
		countChange: number
		averageChange: number
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
		<div class="bg-white border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-[145px]">
			<div class="flex justify-between items-start">
				<div class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
					<span 
						class="tooltip tooltip-bottom tooltip-first cursor-help text-left inline-block"
						data-tip="¿Qué es? Ingreso total facturado del periodo. &#xa;¿Para qué sirve? Mide el volumen financiero y la facturación en tiempo real. &#xa;¿Cómo se calcula? Sumando el importe total de las ventas completadas.">
						TOTAL<br/>VENTAS {{ timeframeLabels[summaryTimeframe] }}
					</span>
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
				<svg viewBox="0 0 100 20" class="w-full h-full text-text-primary" preserveAspectRatio="none">
					<path :d="totalSparklineArea" fill="currentColor" class="text-text-primary/5" />
					<path :d="totalSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		</div>

		<!-- Card 2 -->
		<div class="bg-white border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-[145px]">
			<div class="flex justify-between items-start">
				<div class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
					<span 
						class="tooltip tooltip-bottom cursor-help text-left inline-block"
						data-tip="¿Qué es? Cantidad de comprobantes emitidos. &#xa;¿Para qué sirve? Evalúa el flujo de clientes y transacciones procesadas. &#xa;¿Cómo se calcula? Contando las ventas con estado completado en el periodo.">
						TICKETS<br/>EMITIDOS
					</span>
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
				<svg viewBox="0 0 100 20" class="w-full h-full text-text-primary" preserveAspectRatio="none">
					<path :d="countSparklineArea" fill="currentColor" class="text-text-primary/5" />
					<path :d="countSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		</div>

		<!-- Card 3 -->
		<div class="bg-white border border-border-default/70 rounded-xl p-4.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative h-[145px]">
			<div class="flex justify-between items-start">
				<div class="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight text-left">
					<span 
						class="tooltip tooltip-bottom cursor-help text-left inline-block"
						data-tip="¿Qué es? Gasto promedio por cada ticket emitido. &#xa;¿Para qué sirve? Ayuda a entender el consumo medio de los clientes. &#xa;¿Cómo se calcula? Dividiendo el total de ventas del periodo por el total de tickets.">
						PROM. POR<br/>VENTA
					</span>
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
				<div class="h-3"></div>
			</div>
			<div class="h-8 w-full -mx-1 -mb-1 opacity-90">
				<svg viewBox="0 0 100 20" class="w-full h-full" :class="summaryStats.averageChange >= 0 ? 'text-text-primary' : 'text-[#C53030]'" preserveAspectRatio="none">
					<path :d="averageSparklineArea" fill="currentColor" class="opacity-5" />
					<path :d="averageSparkline" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		</div>

		<!-- Card 4 (Pure Black Card Matching Image) -->
		<div class="bg-black border border-black rounded-xl p-4.5 flex flex-col justify-between shadow-sm relative h-[145px] text-white">
			<!-- Subcontainer to absolute clip watermark arrow without overflow-hidden on parent -->
			<div class="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
				<!-- Big arrow watermark on the right -->
				<div class="absolute right-[-2px] top-4 bottom-4 text-neutral-800 flex items-center justify-center opacity-65">
					<svg class="w-[90px] h-[90px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round">
						<line x1="12" y1="19" x2="12" y2="5"></line>
						<polyline points="5 12 12 5 19 12"></polyline>
					</svg>
				</div>
			</div>
			<div class="relative z-10 flex flex-col h-full justify-between">
				<div class="text-left">
					<span 
						class="text-[9px] font-bold text-neutral-400 tracking-wider uppercase block tooltip tooltip-bottom tooltip-last cursor-help text-left inline-block"
						data-tip="¿Qué es? Estimación de ventas al finalizar el mes en curso. &#xa;¿Para qué sirve? Evalúa la proyección de metas y objetivos mensuales. &#xa;¿Cómo se calcula? Multiplicando el promedio diario del mes por los días totales del mes.">
						PROYECCIÓN<br/>MENSUAL
					</span>
					<h3 class="text-3xl font-black tabular-nums tracking-tight font-sans leading-none mb-1.5 mt-1">{{ formatCurrency(monthlyProjection.projected) }}</h3>
				</div>
				<p class="text-[10px] text-neutral-400 font-medium max-w-[80%] leading-snug">
					Superando el mes anterior en {{ Math.abs(monthlyProjection.changeVsLastMonth).toFixed(1) }}%
				</p>
			</div>
		</div>
	</div>
</template>
