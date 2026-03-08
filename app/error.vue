<script setup lang="ts">
	import type { NuxtError } from '#app'
	import { Home, AlertCircle, RefreshCcw } from 'lucide-vue-next'

	const props = defineProps({
		error: Object as () => NuxtError,
	})

	const handleError = () => clearError({ redirect: '/' })

	const handleReload = () => {
		window.location.reload()
	}
</script>

<template>
	<div
		class="bg-bg-app text-text-secondary relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 font-sans">
		<!-- Minimalist background without blobs -->
		<!-- Contenedor Principal del Error -->
		<div
			class="bg-bg-card relative z-10 w-full max-w-lg space-y-8 rounded-[2rem] border border-transparent p-10 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md sm:p-14">
			<!-- Glow sutil dentro de la tarjeta -->
			<div
				class="pointer-events-none absolute inset-0 z-0 rounded-[2rem] bg-linear-to-b from-red-50 to-transparent"></div>

			<!-- Icono Central con Resplandor (Error, color rojo) -->
			<div class="relative z-10 flex justify-center">
				<div class="relative">
					<div class="absolute inset-0 rounded-full bg-red-50 blur-2xl"></div>
					<div
						class="relative mb-5 rounded-full border border-red-200 bg-red-100 p-5 text-red-600 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-red-300">
						<AlertCircle class="h-12 w-12" stroke-width="1.5" />
					</div>
				</div>
			</div>

			<!-- Detalles del Error -->
			<div class="relative z-10 space-y-5">
				<h1
					class="text-text-secondary text-8xl font-medium tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.02)] select-none sm:text-9xl">
					{{ error?.statusCode || '500' }}
				</h1>
				<h2 class="text-text-secondary text-2xl font-medium tracking-tighter sm:text-3xl">
					¡Oops! Algo no salió bien
				</h2>
				<p class="text-text-muted mx-auto max-w-sm text-lg font-medium tracking-wide">
					{{
						error?.statusMessage ||
						error?.message ||
						'No hemos podido conectarnos o se ha producido un error inesperado al procesar tu solicitud.'
					}}
				</p>
			</div>

			<!-- Botones de Acción -->
			<div class="relative z-10 flex flex-col justify-center gap-4 pt-6 sm:flex-row">
				<button
					@click="handleReload"
					class="btn btn-ghost group text-text-muted hover:bg-bg-hover hover:text-text-secondary flex h-14 items-center justify-center rounded-2xl border border-transparent px-6 font-semibold tracking-wide transition-colors sm:w-auto">
					<RefreshCcw
						class="text-text-light group-hover:text-text-secondary mr-2 h-5 w-5 group-hover:rotate-180" />
					Reintentar
				</button>
				<button
					@click="handleError"
					class="btn btn-ghost group btn-lg text-bg-card h-14 rounded-2xl border-none bg-[#404040] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-[transform,color,background-color,box-shadow] duration-300 hover:-translate-y-1 hover:bg-[#404040]/80 hover:shadow-lg">
					<Home class="mr-2 size-5" />
					Volver al Inicio
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
	@keyframes blob {
		0% {
			transform: translate(0px, 0px) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0px, 0px) scale(1);
		}
	}

	.animate-blob {
		animation: blob 15s infinite alternate;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}

	.animation-delay-4000 {
		animation-delay: 4s;
	}

	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}
</style>
