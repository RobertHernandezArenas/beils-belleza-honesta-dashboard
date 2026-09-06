<script lang="ts" setup>
interface Props {
	size?: 'sm' | 'md' | 'lg' | 'xl'
	showText?: boolean
	text?: string
}

const props = withDefaults(defineProps<Props>(), {
	size: 'md',
	showText: false,
	text: 'Iniciando sesión...',
})

const sizeClasses = computed(() => {
	switch (props.size) {
		case 'sm':
			return { container: 'size-10', svg: 'size-10', text: 'text-xs' }
		case 'lg':
			return { container: 'size-24', svg: 'size-24', text: 'text-base' }
		case 'xl':
			return { container: 'size-32', svg: 'size-32', text: 'text-lg' }
		case 'md':
		default:
			return { container: 'size-16', svg: 'size-16', text: 'text-sm' }
	}
})
</script>

<template>
	<div class="flex flex-col items-center justify-center gap-4">
		<!-- Aura & Radiance Container -->
		<div class="relative flex items-center justify-center" :class="sizeClasses.container">
			<!-- Soft Background Ambient Glow -->
			<div
				class="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-beils-pulse pointer-events-none" />

			<!-- Animated Sacred Geometry SVG -->
			<svg
				:class="sizeClasses.svg"
				viewBox="0 0 100 100"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				class="relative select-none">
				<!-- Outer Golden / Primary Orbit Ring -->
				<circle
					cx="50"
					cy="50"
					r="44"
					stroke="currentColor"
					stroke-width="1.5"
					class="text-primary/25" />

				<circle
					cx="50"
					cy="50"
					r="44"
					stroke="url(#beilsGradientOuter)"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-dasharray="70 200"
					class="origin-center animate-beils-spin" />

				<!-- Middle Reverse Orbit Ring -->
				<circle
					cx="50"
					cy="50"
					r="34"
					stroke="currentColor"
					stroke-width="1.2"
					stroke-dasharray="4 8"
					class="text-text-muted/30 origin-center animate-beils-spin-reverse" />

				<!-- Inner Harmonic Core Ring -->
				<circle
					cx="50"
					cy="50"
					r="24"
					stroke="url(#beilsGradientInner)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-dasharray="40 120"
					class="origin-center animate-beils-spin" />

				<!-- Central Breathing Monogram / Lotus Petal Radiance -->
				<g class="origin-center animate-beils-breathe">
					<!-- Diamond Core Sparkle -->
					<path
						d="M50 36 C50 43 43 50 36 50 C43 50 50 57 50 64 C50 57 57 50 64 50 C57 50 50 43 50 36 Z"
						fill="url(#beilsCoreFill)"
						class="drop-shadow-[0_0_8px_rgba(146,44,136,0.5)]" />
					<!-- Micro Center Dot -->
					<circle cx="50" cy="50" r="2.5" fill="currentColor" class="text-white" />
				</g>

				<!-- Gradients Definition -->
				<defs>
					<linearGradient id="beilsGradientOuter" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stop-color="var(--color-primary, #922c88)" stop-opacity="1" />
						<stop offset="50%" stop-color="var(--color-accent, #c05bb4)" stop-opacity="0.8" />
						<stop offset="100%" stop-color="var(--color-primary, #922c88)" stop-opacity="0" />
					</linearGradient>

					<linearGradient id="beilsGradientInner" x1="100%" y1="100%" x2="0%" y2="0%">
						<stop offset="0%" stop-color="var(--color-accent, #c05bb4)" stop-opacity="1" />
						<stop offset="100%" stop-color="var(--color-primary, #922c88)" stop-opacity="0.2" />
					</linearGradient>

					<linearGradient id="beilsCoreFill" x1="36" y1="36" x2="64" y2="64">
						<stop offset="0%" stop-color="var(--color-accent, #c05bb4)" />
						<stop offset="100%" stop-color="var(--color-primary, #922c88)" />
					</linearGradient>
				</defs>
			</svg>
		</div>

		<!-- Optional Elegant Label -->
		<div v-if="showText" class="flex flex-col items-center gap-1 text-center">
			<p class="font-bold tracking-widest text-text-primary uppercase" :class="sizeClasses.text">
				{{ text }}
			</p>
			<span class="text-[10px] font-bold tracking-[0.3em] uppercase text-text-muted">
				Beils · Belleza Honesta
			</span>
		</div>
	</div>
</template>

<style scoped>
@keyframes beilsSpin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

@keyframes beilsSpinReverse {
	from {
		transform: rotate(360deg);
	}
	to {
		transform: rotate(0deg);
	}
}

@keyframes beilsPulse {
	0%, 100% {
		transform: scale(0.85);
		opacity: 0.3;
	}
	50% {
		transform: scale(1.15);
		opacity: 0.65;
	}
}

@keyframes beilsBreathe {
	0%, 100% {
		transform: scale(0.92);
		opacity: 0.85;
	}
	50% {
		transform: scale(1.08);
		opacity: 1;
	}
}

.animate-beils-spin {
	animation: beilsSpin 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-beils-spin-reverse {
	animation: beilsSpinReverse 6s linear infinite;
}

.animate-beils-pulse {
	animation: beilsPulse 2.8s ease-in-out infinite;
}

.animate-beils-breathe {
	animation: beilsBreathe 2.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
	.animate-beils-spin,
	.animate-beils-spin-reverse,
	.animate-beils-pulse,
	.animate-beils-breathe {
		animation: none;
	}
}
</style>
