<script setup lang="ts">
	import { ref, reactive, watch, computed } from 'vue'
	import { z } from 'zod'
	import { useMutation, useQueryClient, useQuery } from '@tanstack/vue-query'
	import { Save, AlertCircle, Edit, Layers } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const props = defineProps<{
		modelValue: boolean
		categoryToEdit?: {
			category_id: string
			name: string
			description: string | null
			subcategories?: { name: string }[]
		} | null
	}>()

	const emit = defineEmits(['update:modelValue', 'close'])
	const { t } = useI18n()
	const queryClient = useQueryClient()

	const localVisible = ref(props.modelValue)
	const categoryDialog = ref<HTMLDialogElement | null>(null)
	const { animateOpen, animateClose } = useModalAnimation()

	watch(
		() => props.modelValue,
		newVal => {
			localVisible.value = newVal
			if (newVal) {
				initForm()
				nextTick(() => {
					animateOpen(categoryDialog.value, { staggerChildren: true })
				})
			} else if (categoryDialog.value?.open) {
				animateClose(categoryDialog.value)
			}
		},
	)

	watch(
		() => localVisible.value,
		newVal => {
			emit('update:modelValue', newVal)
			if (!newVal) emit('close')
		},
	)

	const form = reactive({
		name: '',
		description: '',
		subcategories: [] as string[],
	})

	const subcategoryInput = ref('')
	const isSubcategoryFocused = ref(false)

	// Fetch subcategories for autocomplete
	const { data: existingSubcats } = useQuery<{ subcategory_id: string; name: string }[]>({
		queryKey: ['subcategories-list'],
		queryFn: () => $fetch('/api/catalog/subcategories'),
	})

	const filteredSubcategories = computed(() => {
		if (!existingSubcats.value) return []
		const search = subcategoryInput.value.toLowerCase()
		return existingSubcats.value
			.filter(sub => sub.name.toLowerCase().includes(search) && !form.subcategories.includes(sub.name))
			.slice(0, 5) // Muestra máximo 5 coincidencias
	})

	const errors = reactive({
		name: '',
		description: '',
	})

	const apiError = ref('')

	const isEditing = computed(() => !!props.categoryToEdit?.category_id)

	const initForm = () => {
		apiError.value = ''
		errors.name = ''
		errors.description = ''
		subcategoryInput.value = ''

		if (props.categoryToEdit) {
			form.name = props.categoryToEdit.name
			form.description = props.categoryToEdit.description || ''
			form.subcategories = props.categoryToEdit.subcategories?.map(s => s.name) || []
		} else {
			form.name = ''
			form.description = ''
			form.subcategories = []
		}
	}

	const addSubcategory = (nameStr?: string) => {
		// allow passing a specific name (from dropdown), or fallback to input value
		let val = ''
		if (typeof nameStr === 'string') {
			val = nameStr.trim()
		} else {
			val = subcategoryInput.value.trim()
		}

		if (val && !form.subcategories.includes(val)) {
			form.subcategories.push(val)
		}
		subcategoryInput.value = ''
	}

	const removeSubcategory = (index: number) => {
		form.subcategories.splice(index, 1)
	}

	const clearError = (field: keyof typeof errors) => {
		errors[field] = ''
		apiError.value = ''
	}

	const categorySchema = z.object({
		name: z.string().min(1, 'El nombre de la categoría es obligatorio'),
		description: z.string().optional(),
	})

	const { mutate: saveCategory, isPending } = useMutation({
		mutationFn: async (data: typeof form) => {
			const url = isEditing.value
				? `/api/catalog/categories/${props.categoryToEdit!.category_id}`
				: '/api/catalog/categories'
			const method = isEditing.value ? 'PUT' : 'POST'

			return await $fetch(url, {
				method,
				body: data,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['categories-list'] })
			queryClient.invalidateQueries({ queryKey: ['categories'] })
			localVisible.value = false
		},
		onError: (err: any) => {
			apiError.value = err.response?._data?.statusMessage || err.message || 'Error al guardar la categoría'
		},
	})

	const onSubmit = () => {
		errors.name = ''
		errors.description = ''
		apiError.value = ''

		const result = categorySchema.safeParse(form)
		if (!result.success) {
			const formatted = result.error.format()
			errors.name = formatted.name?._errors[0] || ''
			errors.description = formatted.description?._errors[0] || ''
			return
		}

		saveCategory({
			...result.data,
			description: result.data.description || '',
			subcategories: form.subcategories,
		})
	}
</script>

<template>
	<dialog ref="categoryDialog" class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': localVisible }">
		<div class="modal-box bg-bg-app border-border-default m-4 max-w-lg border p-0 shadow-xl sm:rounded-3xl">
			<!-- Header -->
			<div class="bg-bg-card border-border-subtle flex items-center gap-4 rounded-t-3xl border-b p-6">
				<div
					class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
					<Edit v-if="isEditing" class="h-6 w-6" />
					<Layers v-else class="h-6 w-6" />
				</div>
				<div>
					<h3 class="text-text-primary text-lg font-bold">
						{{ isEditing ? 'Editar Categoría' : 'Nueva Categoría' }}
					</h3>
					<p class="text-text-muted text-sm font-medium">
						{{
							isEditing
								? 'Actualiza los datos de esta categoría'
								: 'Registra una nueva categoría en el sistema'
						}}
					</p>
				</div>
			</div>

			<!-- Error Alert -->
			<div
				v-if="apiError"
				class="bg-error/10 border-error/20 mx-6 mt-6 flex items-start gap-3 rounded-xl border p-4">
				<AlertCircle class="text-error mt-0.5 h-5 w-5 shrink-0" />
				<p class="text-error text-sm font-medium">{{ apiError }}</p>
			</div>

			<!-- Formulario -->
			<form @submit.prevent="onSubmit" class="space-y-5 p-6">
				<div class="form-control">
					<label class="label">
						<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
							Nombre de la Categoría *
						</span>
					</label>
					<input
						v-model="form.name"
						type="text"
						placeholder="Ej. Cuidado Facial, Maquillaje..."
						class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
						:class="{ 'border-error focus:border-error focus:ring-error/20': errors.name }"
						@input="clearError('name')" />
					<span v-if="errors.name" class="text-error mt-1.5 ml-1 text-xs font-bold">
						{{ errors.name }}
					</span>
				</div>

				<div class="form-control">
					<label class="label">
						<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
							Descripción (Opcional)
						</span>
					</label>
					<textarea
						v-model="form.description"
						placeholder="Breve descripción de la categoría..."
						class="textarea bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-24 w-full resize-none rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
						@input="clearError('description')"></textarea>
				</div>

				<div class="form-control">
					<label class="label">
						<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
							Subcategorías (Opcional)
						</span>
					</label>
					<div class="relative flex items-center">
						<input
							v-model="subcategoryInput"
							type="text"
							placeholder="Escribe y presiona Enter..."
							class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent pr-16 font-medium shadow-inner transition-colors focus:ring-4"
							@focus="isSubcategoryFocused = true"
							@blur="isSubcategoryFocused = false"
							@keydown.enter.prevent="() => addSubcategory()"
							@keydown.comma.prevent="() => addSubcategory()" />
						<button
							type="button"
							class="text-primary bg-primary/10 hover:bg-primary/20 absolute right-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
							@click="() => addSubcategory()">
							Agregar
						</button>

						<!-- Autocomplete Dropdown -->
						<ul
							v-if="isSubcategoryFocused && filteredSubcategories.length > 0"
							class="bg-bg-card border-border-default animate-in slide-in-from-top-2 absolute top-14 left-0 z-50 max-h-56 w-full overflow-y-auto rounded-xl border p-1.5 shadow-xl duration-200">
							<li
								v-for="sub in filteredSubcategories"
								:key="sub.subcategory_id"
								class="hover:bg-bg-muted text-text-primary flex cursor-pointer items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-bold transition-colors"
								@mousedown.prevent
								@click="() => addSubcategory(sub.name)">
								<Layers class="text-primary h-4 w-4 opacity-60" />
								{{ sub.name }}
							</li>
						</ul>
					</div>

					<!-- Pills -->
					<div v-if="form.subcategories.length > 0" class="mt-4 flex flex-wrap gap-2 p-1">
						<div
							v-for="(sub, index) in form.subcategories"
							:key="index"
							class="bg-bg-muted text-text-primary border-border-default animate-in zoom-in-95 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold shadow-xs duration-200">
							{{ sub }}
							<button
								type="button"
								class="text-text-muted hover:text-error ml-1 transition-colors focus:outline-none"
								@click="removeSubcategory(index)">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd" />
								</svg>
							</button>
						</div>
					</div>
				</div>

				<!-- Acciones -->
				<div class="modal-action border-border-subtle mt-8 flex gap-3 border-t pt-4">
					<button
						type="button"
						class="btn btn-ghost hover:bg-bg-muted text-text-muted h-12 flex-1 rounded-xl border-transparent font-bold transition-colors"
						@click="localVisible = false"
						:disabled="isPending">
						Cancelar
					</button>
					<button
						type="submit"
						class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 flex-1 items-center gap-2 rounded-xl border-transparent shadow-md transition-colors hover:shadow-lg"
						:disabled="isPending">
						<span v-if="isPending" class="loading loading-spinner loading-sm"></span>
						<template v-else>
							<Save class="h-4 w-4" />
							<span class="font-bold tracking-wide">
								{{ isEditing ? 'Guardar Cambios' : 'Crear Categoría' }}
							</span>
						</template>
					</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm">
			<button @click="localVisible = false">Cerrar</button>
		</form>
	</dialog>
</template>
