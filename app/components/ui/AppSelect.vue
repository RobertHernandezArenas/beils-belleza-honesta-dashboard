<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

interface Option {
	value: string
	label: string
}

const props = defineProps<{
	options: Option[]
	placeholder?: string
	ariaLabel?: string
}>()

const model = defineModel<string>({ required: true })

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(
	() => props.options.find(o => o.value === model.value)?.label ?? props.placeholder ?? 'Seleccionar',
)

const toggle = () => (open.value = !open.value)
const select = (value: string) => {
	model.value = value
	open.value = false
}

const onDocPointer = (e: PointerEvent) => {
	if (rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false
}
const onKey = (e: KeyboardEvent) => {
	if (e.key === 'Escape') open.value = false
}

onMounted(() => {
	document.addEventListener('pointerdown', onDocPointer)
	document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
	document.removeEventListener('pointerdown', onDocPointer)
	document.removeEventListener('keydown', onKey)
})

defineExpose({ close: () => (open.value = false) })
</script>

<template>
	<div ref="rootRef" class="relative w-full">
		<!-- Trigger -->
		<button
			type="button"
			:aria-label="ariaLabel"
			:aria-haspopup="true"
			:aria-expanded="open"
			@click="toggle"
			class="bg-bg-card border-border-default/85 hover:border-text-primary/25 flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors">
			<span class="text-text-muted shrink-0 flex items-center">
				<slot name="icon" />
			</span>
			<span
				class="flex-1 truncate text-left"
				:class="model ? 'text-text-primary' : 'text-text-muted/70'">
				{{ selectedLabel }}
			</span>
			<ChevronDown
				class="text-text-muted/70 h-3.5 w-3.5 shrink-0 transition-transform duration-200"
				:class="open && 'rotate-180'" />
		</button>

		<!-- Panel -->
		<Transition
			enter-active-class="transition ease-out duration-150"
			enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
			enter-to-class="opacity-100 translate-y-0 scale-100"
			leave-active-class="transition ease-in duration-100"
			leave-from-class="opacity-100 translate-y-0 scale-100"
			leave-to-class="opacity-0 -translate-y-1 scale-[0.98]">
			<ul
				v-if="open"
				role="listbox"
				class="bg-bg-card border-border-default absolute right-0 z-50 mt-1.5 max-h-64 w-full min-w-[11rem] origin-top overflow-y-auto rounded-xl border p-1.5 shadow-xl">
				<li v-for="opt in options" :key="opt.value">
					<button
						type="button"
						role="option"
						:aria-selected="opt.value === model"
						@click="select(opt.value)"
						class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors"
						:class="
							opt.value === model
								? 'bg-primary/10 text-primary'
								: 'text-text-secondary hover:bg-bg-muted'
						">
						<span class="truncate">{{ opt.label }}</span>
						<Check v-if="opt.value === model" class="text-primary h-3.5 w-3.5 shrink-0" />
					</button>
				</li>
			</ul>
		</Transition>
	</div>
</template>
