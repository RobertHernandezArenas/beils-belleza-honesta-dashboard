<script lang="ts" setup>
	definePageMeta({
		layout: 'auth',
	})
</script>

<template>
	<section
		class="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#fbfaf9] font-sans text-[#404040]">
		<!-- Minimalist background without blobs -->
		<!-- Contenedor del Formulario -->
		<div class="relative z-10 w-full px-4">
			<FormLogin />
		</div>
	</section>
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
		animation: blob 10s infinite alternate;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}

	.animation-delay-4000 {
		animation-delay: 4s;
	}
</style>
