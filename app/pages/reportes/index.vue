<script lang="ts" setup>
	import { PieChart, Download } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Reportes | Dashboard' })

	const { t } = useI18n()
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">Reportes Analíticos</h1>
					<p class="text-text-muted text-sm font-medium">Métricas e Inteligencia de Negocio</p>
				</div>
				<button
					class="btn bg-bg-card text-text-secondary hover:bg-bg-muted border-border-subtle flex h-12 items-center gap-2 rounded-full border px-6 shadow-sm transition-all">
					<Download class="h-5 w-5" />
					<span class="font-bold">Exportar PDF</span>
				</button>
			</header>

			<!-- Content Placeholder -->
			<div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
				<div
					v-for="i in 3"
					:key="i"
					class="bg-bg-card flex h-32 flex-col justify-center rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
					<div class="bg-bg-muted mb-4 h-4 w-1/2 rounded"></div>
					<div class="bg-bg-muted h-8 w-3/4 animate-pulse rounded"></div>
				</div>
			</div>

			<div
				class="bg-bg-card flex flex-col items-center justify-center rounded-3xl py-24 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
				<div class="bg-bg-muted mb-6 flex h-24 w-24 items-center justify-center rounded-full">
					<PieChart class="text-text-muted/50 h-12 w-12" />
				</div>
				<h2 class="text-text-primary mb-2 text-2xl font-bold">Módulo de Reportes en Construcción</h2>
				<p class="text-text-muted max-w-md text-sm">
					Los gráficos de ingresos, balances de personal, productos más vendidos e indicadores
					financieros se mostrarán aquí.
				</p>
			</div>
		</div>
	</div>
</template>
