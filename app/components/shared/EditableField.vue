<script setup lang="ts">
	import { ref, watch, nextTick } from 'vue'
	import { Edit2, Check, X } from 'lucide-vue-next'
	import gsap from 'gsap'

	const props = defineProps({
		modelValue: {
			type: [String, Number, Date],
			required: true,
		},
		label: {
			type: String,
			default: '',
		},
		type: {
			type: String,
			default: 'text', // text, email, tel, date, select
		},
		options: {
			type: Array as PropType<{ label: string; value: string | number }[]>,
			default: () => [],
		},
		placeholder: {
			type: String,
			default: 'Editar...',
		},
		isMutating: {
			type: Boolean,
			default: false,
		},
		formatDisplay: {
			type: Function,
			default: undefined,
		},
	})

	const emit = defineEmits(['update:modelValue', 'save'])

	const isEditing = ref(false)
	const localValue = ref(props.modelValue)
	const inputRef = ref<HTMLInputElement | HTMLSelectElement | null>(null)
	const textContainerRef = ref<HTMLElement | null>(null)
	const editContainerRef = ref<HTMLElement | null>(null)

	watch(
		() => props.modelValue,
		newVal => {
			if (!isEditing.value) {
				localValue.value = newVal
			}
		},
	)

	const displayValue = computed(() => {
		if (props.formatDisplay && props.modelValue) {
			return props.formatDisplay(props.modelValue)
		}
		if (props.type === 'select' && props.options.length) {
			const opt = props.options.find(o => o.value === props.modelValue)
			return opt ? opt.label : props.modelValue
		}
		return props.modelValue || '---'
	})

	const startEdit = () => {
		if (props.isMutating) return
		localValue.value = props.modelValue

		// Format date for date input if necessary
		if (props.type === 'date' && localValue.value) {
			try {
				const d = new Date(localValue.value as string)
				localValue.value = d.toISOString().split('T')[0] as string | number | Date
			} catch (e) {
				// ignore
			}
		}

		isEditing.value = true

		nextTick(() => {
			if (textContainerRef.value && editContainerRef.value) {
				// Hides the text container instantly to avoid adding its height to the input's height
				gsap.set(textContainerRef.value, { display: 'none' })
				
				gsap.fromTo(
					editContainerRef.value,
					{ opacity: 0, scale: 0.95, display: 'flex' },
					{
						opacity: 1,
						scale: 1,
						duration: 0.25,
						ease: 'back.out(1.5)',
						onComplete: () => {
							inputRef.value?.focus()
						},
					},
				)
			} else {
				inputRef.value?.focus()
			}
		})
	}

	const cancelEdit = () => {
		isEditing.value = false
		animateBackToText()
	}

	const saveEdit = () => {
		if (localValue.value !== props.modelValue) {
			emit('update:modelValue', localValue.value)
			emit('save', localValue.value)
		}
		isEditing.value = false
		animateBackToText()
	}

	const animateBackToText = () => {
		nextTick(() => {
			if (textContainerRef.value && editContainerRef.value) {
				// Hides the edit container instantly to avoid container stretching
				gsap.set(editContainerRef.value, { display: 'none' })
				
				gsap.fromTo(
					textContainerRef.value,
					{ opacity: 0, scale: 0.95, display: 'flex' },
					{ opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' },
				)
			}
		})
	}

	const handleBlur = () => {
		// Los select nativos pueden disparar blur al abrir sus opciones nativas según el SO.
		if (props.type === 'select') return
		setTimeout(() => {
			if (isEditing.value) {
				saveEdit()
			}
		}, 200)
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') saveEdit()
		if (e.key === 'Escape') cancelEdit()
	}
</script>

<template>
	<div
		class="group relative flex min-h-6 w-full flex-col"
		:class="{ 'pointer-events-none opacity-50': isMutating }">
		<!-- Text Display State -->
		<div
			ref="textContainerRef"
			class="hover:bg-bg-muted/50 -m-1 flex w-fit cursor-pointer items-center gap-2 rounded-lg p-1 transition-colors"
			@click="startEdit">
			<span class="block truncate">
				<slot name="display" :value="displayValue">
					{{ displayValue }}
				</slot>
			</span>
			<div
				class="bg-primary/10 text-primary shrink-0 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100">
				<Edit2 class="h-4 w-4" />
			</div>
		</div>

		<!-- Edit Input State -->
		<div ref="editContainerRef" class="flex w-full flex-col gap-1" style="display: none;">
			<!-- <div v-if="label" class="text-[10px] font-bold text-primary uppercase tracking-wider pl-1 mb-1">
        Editando: {{ label }}
      </div> -->
			<div class="flex w-full items-center gap-2">
				<template v-if="type === 'select'">
					<select
						ref="inputRef"
						v-model="localValue"
						class="select select-md bg-bg-card focus:ring-primary/30 focus:border-primary text-text-primary flex-1 border-text-secondary/30 font-medium shadow-[0_0_15px_rgba(var(--color-primary),0.1)] ring-0! outline-0! transition-all rounded-full focus-visible:border-text-secondary/30 focus-visible:ring-0! focus-visible:outline-0!"
						@change="saveEdit"
						@blur="handleBlur"
						@keydown.stop="handleKeyDown"
						@click.stop>
						<option v-for="opt in options" :key="opt.value" :value="opt.value">
							{{ opt.label }}
						</option>
					</select>
				</template>
				<template v-else>
					<input
						ref="inputRef"
						v-model="localValue"
						:type="type"
						:placeholder="placeholder"
						class="input input-md bg-bg-card focus:ring-primary/30 focus:border-primary text-text-primary flex-1 border-text-secondary/30 font-medium shadow-[0_0_15px_rgba(var(--color-primary),0.1)] ring-0! outline-0! transition-all rounded-full focus-visible:border-text-secondary/30 focus-visible:ring-0! focus-visible:outline-0!"
						@blur="handleBlur"
						@keydown.stop="handleKeyDown"
						@click.stop />
				</template>

				<!-- Actions (Inline positioning side-by-side to avoid overlapping arrow/text) -->
				<div class="flex shrink-0 items-center gap-1">
					<button
						@click.stop.prevent="saveEdit"
						@mousedown.stop.prevent
						class="btn btn-xs btn-circle btn-success text-white shadow-sm"
						title="Guardar">
						<Check class="h-3 w-3" />
					</button>
					<button
						@click.stop.prevent="cancelEdit"
						@mousedown.stop.prevent
						class="btn btn-xs btn-circle btn-ghost text-error"
						title="Cancelar">
						<X class="h-3 w-3" />
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
