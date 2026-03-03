<script lang="ts" setup>
	import { ShoppingBag, ArrowRight } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Ventas | Dashboard' })

	const { t } = useI18n()
</script>

<template>
	<div class="bg-bg-app text-text-secondary min-h-screen w-full p-4 font-sans lg:p-10">
		<div class="mx-auto max-w-[1400px]">
			<!-- Header -->
			<header class="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">Ventas</h1>
					<p class="text-text-muted text-sm font-medium">Historial y gestión de ventas realizadas</p>
				</div>
				<button
					class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 items-center gap-2 rounded-full border-transparent px-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all">
					<span class="font-bold">Ir a Terminal de Venta</span>
					<ArrowRight class="h-5 w-5" />
				</button>
			</header>

			<!-- Content Placeholder -->
			<div
				class="bg-bg-card flex flex-col items-center justify-center rounded-3xl py-24 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
				<div class="bg-bg-muted mb-6 flex h-24 w-24 items-center justify-center rounded-full">
					<ShoppingBag class="text-text-muted/50 h-12 w-12" />
				</div>
				<h2 class="text-text-primary mb-2 text-2xl font-bold">Módulo de Ventas en Construcción</h2>
				<p class="text-text-muted max-w-md text-sm">
					Aquí podrás visualizar el historial completo de ventas, tickets emitidos, devoluciones y
					métricas diarias. Próximamente disponible.
				</p>
			</div>
		</div>
	</div>
</template>
