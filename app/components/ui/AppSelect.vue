<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

interface Option {
	value: string | number
	label: string
}

const props = withDefaults(
	defineProps<{
		options: Option[]
		placeholder?: string
		ariaLabel?: string
		disabled?: boolean
		size?: 'sm' | 'md' | 'lg'
	}>(),
	{ size: 'md', placeholder: '', ariaLabel: '' },
)

const model = defineModel<string | number>({ required: true })

const heightClass = computed(() => ({ sm: 'h-10', md: 'h-11', lg: 'h-12' })[props.size])

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

// Panel is teleported out of any scroll/overflow container and positioned `fixed`
// relative to the trigger, so it never gets clipped or overlapped inside modals.
const teleportTarget = ref<HTMLElement | string>('body')
const panelStyle = ref<Record<string, string>>({})

const selectedLabel = computed(
	() => props.options.find(o => o.value === model.value)?.label ?? props.placeholder ?? 'Seleccionar',
)

const updatePosition = () => {
	const el = triggerRef.value
	if (!el) return
	const r = el.getBoundingClientRect()
	const width = Math.max(r.width, 176) // >= 11rem
	const gap = 6
	const belowSpace = window.innerHeight - r.bottom
	const openUp = belowSpace < 240 && r.top > belowSpace
	panelStyle.value = {
		position: 'fixed',
		left: `${Math.min(r.left, window.innerWidth - width - 8)}px`,
		width: `${width}px`,
		...(openUp
			? { bottom: `${window.innerHeight - r.top + gap}px` }
			: { top: `${r.bottom + gap}px` }),
	}
}

const resolveTarget = () => {
	// If we're inside a top-layer <dialog> (opened via showModal), teleport INTO it
	// so the panel shares the same top layer; otherwise the plain <body> is fine.
	const dlg = triggerRef.value?.closest('dialog') as HTMLDialogElement | null
	teleportTarget.value = dlg && dlg.matches(':modal') ? dlg : 'body'
}

const openPanel = async () => {
	resolveTarget()
	open.value = true
	await nextTick()
	updatePosition()
}

const toggle = () => {
	if (props.disabled) return
	if (open.value) { open.value = false } else { openPanel() }
}
const select = (value: string | number) => {
	model.value = value
	open.value = false
}

const onDocPointer = (e: PointerEvent) => {
	const t = e.target as Node
	if (triggerRef.value?.contains(t) || panelRef.value?.contains(t)) return
	open.value = false
}
const onKey = (e: KeyboardEvent) => {
	if (e.key === 'Escape') open.value = false
}
const onReflow = () => {
	if (open.value) updatePosition()
}

onMounted(() => {
	document.addEventListener('pointerdown', onDocPointer, true)
	document.addEventListener('keydown', onKey)
	window.addEventListener('resize', onReflow)
	window.addEventListener('scroll', onReflow, true)
})
onBeforeUnmount(() => {
	document.removeEventListener('pointerdown', onDocPointer, true)
	document.removeEventListener('keydown', onKey)
	window.removeEventListener('resize', onReflow)
	window.removeEventListener('scroll', onReflow, true)
})

defineExpose({ close: () => (open.value = false) })
</script>

<template>
	<div class="w-full">
		<!-- Trigger -->
		<button
			ref="triggerRef"
			type="button"
			:aria-label="ariaLabel"
			:aria-haspopup="true"
			:aria-expanded="open"
			:disabled="disabled"
			class="bg-bg-card border-border-default/85 hover:border-text-primary/25 flex w-full items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
			:class="heightClass"
			@click="toggle">
			<span class="text-text-muted flex shrink-0 items-center">
				<slot name="icon" />
			</span>
			<span class="flex-1 truncate text-left" :class="model ? 'text-text-primary' : 'text-text-muted/70'">
				{{ selectedLabel }}
			</span>
			<ChevronDown
				class="text-text-muted/70 h-3.5 w-3.5 shrink-0 transition-transform duration-200"
				:class="open && 'rotate-180'" />
		</button>

		<!-- Panel (teleported, fixed-positioned) -->
		<Teleport :to="teleportTarget">
			<Transition
				enter-active-class="transition ease-out duration-150"
				enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
				enter-to-class="opacity-100 translate-y-0 scale-100"
				leave-active-class="transition ease-in duration-100"
				leave-from-class="opacity-100 translate-y-0 scale-100"
				leave-to-class="opacity-0 -translate-y-1 scale-[0.98]">
				<ul
					v-if="open"
					ref="panelRef"
					role="listbox"
					:style="panelStyle"
					class="bg-bg-card border-border-default z-[6000] max-h-64 origin-top overflow-y-auto rounded-xl border p-1.5 shadow-xl">
					<li v-for="opt in options" :key="opt.value">
						<button
							type="button"
							role="option"
							:aria-selected="opt.value === model"
							class="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors"
							:class="
								opt.value === model
									? 'bg-primary/10 text-primary'
									: 'text-text-secondary hover:bg-bg-muted'
							"
							@click="select(opt.value)">
							<span class="truncate">{{ opt.label }}</span>
							<Check v-if="opt.value === model" class="text-primary h-3.5 w-3.5 shrink-0" />
						</button>
					</li>
				</ul>
			</Transition>
		</Teleport>
	</div>
</template>
