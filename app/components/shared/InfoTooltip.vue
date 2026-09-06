<script setup lang="ts">
import { ref, computed } from 'vue'
import { Info, HelpCircle } from 'lucide-vue-next'

interface Props {
	title?: string
	what?: string
	why?: string
	how?: string
	text?: string
	position?: 'top' | 'bottom' | 'left' | 'right'
	align?: 'start' | 'center' | 'end'
	iconType?: 'info' | 'help'
	size?: 'xs' | 'sm' | 'md'
	customClass?: string
}

const props = withDefaults(defineProps<Props>(), {
	position: 'bottom',
	align: 'start',
	iconType: 'help',
	size: 'xs',
	customClass: '',
})

const isOpen = ref(false)

const openTooltip = () => {
	isOpen.value = true
}

const closeTooltip = () => {
	isOpen.value = false
}

const toggleTooltip = () => {
	isOpen.value = !isOpen.value
}

const iconSizeClass = computed(() => {
	switch (props.size) {
		case 'xs':
			return 'size-3'
		case 'md':
			return 'size-4.5'
		case 'sm':
		default:
			return 'size-3.5'
	}
})

const positionClasses = computed(() => {
	const classes: string[] = []

	// Vertical or Horizontal offset
	switch (props.position) {
		case 'top':
			classes.push('bottom-full mb-2')
			break
		case 'left':
			classes.push('right-full mr-2 top-1/2 -translate-y-1/2')
			break
		case 'right':
			classes.push('left-full ml-2 top-1/2 -translate-y-1/2')
			break
		case 'bottom':
		default:
			classes.push('top-full mt-2')
			break
	}

	// Alignment for top/bottom
	if (props.position === 'top' || props.position === 'bottom') {
		switch (props.align) {
			case 'end':
				classes.push('right-0')
				break
			case 'center':
				classes.push('left-1/2 -translate-x-1/2')
				break
			case 'start':
			default:
				classes.push('left-0')
				break
		}
	}

	return classes.join(' ')
})
</script>

<template>
	<div
		class="relative inline-flex items-center select-none"
		:class="customClass"
		@mouseenter="openTooltip"
		@mouseleave="closeTooltip"
		@focusin="openTooltip"
		@focusout="closeTooltip"
	>
		<!-- Trigger button or custom slot -->
		<slot name="trigger" :toggle="toggleTooltip" :is-open="isOpen">
			<button
				type="button"
				class="inline-flex items-center justify-center rounded-full p-0.5 text-text-muted/70 hover:text-text-primary hover:bg-bg-subtle transition-all cursor-help focus:outline-hidden focus:ring-1 focus:ring-primary/40"
				:aria-label="title ? `Información sobre ${title}` : 'Ver explicación de la métrica'"
				:aria-expanded="isOpen"
				@click.stop="toggleTooltip"
			>
				<HelpCircle v-if="iconType === 'help'" :class="iconSizeClass" />
				<Info v-else :class="iconSizeClass" />
			</button>
		</slot>

		<!-- Popover Card -->
		<transition
			enter-active-class="transition duration-150 ease-out"
			enter-from-class="opacity-0 scale-95"
			enter-to-class="opacity-100 scale-100"
			leave-active-class="transition duration-100 ease-in"
			leave-from-class="opacity-100 scale-100"
			leave-to-class="opacity-0 scale-95"
		>
			<div
				v-show="isOpen"
				role="tooltip"
				class="absolute z-9999 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#1c1c22] border border-border-default shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.6)] p-4 text-left pointer-events-auto"
				:class="positionClasses"
				@click.stop
			>
				<!-- Card Header / Title -->
				<div v-if="title" class="mb-2.5 pb-2 border-b border-border-default/60 flex items-center justify-between">
					<span class="text-xs font-black text-text-primary uppercase tracking-wider">{{ title }}</span>
					<span class="text-[9px] font-bold text-accent px-1.5 py-0.5 rounded-md bg-accent/10 uppercase">
						Guía Financiera
					</span>
				</div>

				<!-- 3-point structured content -->
				<div class="space-y-2.5 text-left font-sans">
					<!-- 1. ¿Qué es? -->
					<div v-if="what" class="text-text-secondary">
						<span class="block text-[9px] font-black uppercase tracking-wider text-text-muted mb-0.5">
							¿Qué es?
						</span>
						<p class="text-[11px] leading-relaxed font-medium">
							{{ what }}
						</p>
					</div>

					<!-- 2. ¿Para qué sirve? -->
					<div v-if="why" class="text-text-secondary">
						<span class="block text-[9px] font-black uppercase tracking-wider text-text-muted mb-0.5">
							¿Para qué sirve?
						</span>
						<p class="text-[11px] leading-relaxed font-medium">
							{{ why }}
						</p>
					</div>

					<!-- 3. ¿Cómo se calcula o interpreta? -->
					<div v-if="how" class="text-text-secondary">
						<span class="block text-[9px] font-black uppercase tracking-wider text-text-muted mb-0.5">
							¿Cómo se calcula o interpreta?
						</span>
						<p class="text-[11px] leading-relaxed font-medium text-text-secondary/95">
							{{ how }}
						</p>
					</div>

					<!-- Simple text fallback if 3 points aren't passed -->
					<div v-if="text && !what" class="text-[11px] leading-relaxed font-medium text-text-secondary">
						<p>{{ text }}</p>
					</div>

					<!-- Extra content slot -->
					<slot />
				</div>
			</div>
		</transition>
	</div>
</template>
