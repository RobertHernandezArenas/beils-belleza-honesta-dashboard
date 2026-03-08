<script setup lang="ts">
	import { ref, reactive, watch, computed } from 'vue'
	import { z } from 'zod'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Save, AlertCircle, Edit, ListTree } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	const props = defineProps<{
		modelValue: boolean
		subcategoryToEdit?: {
			subcategory_id: string
			name: string
			description: string | null
			category_id: string
		} | null
	}>()

	const emit = defineEmits(['update:modelValue', 'close'])
	const { t } = useI18n()
	const queryClient = useQueryClient()

	const localVisible = ref(props.modelValue)

	const { data: categories, isPending: loadingCategories } = useQuery<
		{ category_id: string; name: string }[]
	>({
		queryKey: ['categories-select-list'],
		queryFn: () => $fetch('/api/catalog/categories'),
	})

	watch(
		() => props.modelValue,
		newVal => {
			localVisible.value = newVal
			if (newVal) {
				initForm()
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
		category_id: '',
	})

	const errors = reactive({
		name: '',
		description: '',
		category_id: '',
	})

	const apiError = ref('')

	const isEditing = computed(() => !!props.subcategoryToEdit?.subcategory_id)

	const initForm = () => {
		apiError.value = ''
		errors.name = ''
		errors.description = ''
		errors.category_id = ''

		if (props.subcategoryToEdit) {
			form.name = props.subcategoryToEdit.name
			form.description = props.subcategoryToEdit.description || ''
			form.category_id = props.subcategoryToEdit.category_id
		} else {
			form.name = ''
			form.description = ''
			form.category_id = ''
		}
	}

	const clearError = (field: keyof typeof errors) => {
		errors[field] = ''
		apiError.value = ''
	}

	const subcategorySchema = z.object({
		name: z.string().min(1, 'El nombre de la subcategoría es obligatorio'),
		description: z.string().optional(),
		category_id: z.string().min(1, 'Debe seleccionar una categoría principal'),
	})

	const { mutate: saveSubcategory, isPending } = useMutation({
		mutationFn: async (data: typeof form) => {
			const url = isEditing.value
				? `/api/catalog/subcategories/${props.subcategoryToEdit!.subcategory_id}`
				: '/api/catalog/subcategories'
			const method = isEditing.value ? 'PUT' : 'POST'

			return await $fetch(url, {
				method,
				body: data,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['subcategories-list'] })
			localVisible.value = false
		},
		onError: (err: any) => {
			apiError.value =
				err.response?._data?.statusMessage || err.message || 'Error al guardar la subcategoría'
		},
	})

	const onSubmit = () => {
		errors.name = ''
		errors.description = ''
		errors.category_id = ''
		apiError.value = ''

		const result = subcategorySchema.safeParse(form)
		if (!result.success) {
			const formatted = result.error.format()
			errors.name = formatted.name?._errors[0] || ''
			errors.description = formatted.description?._errors[0] || ''
			errors.category_id = formatted.category_id?._errors[0] || ''
			return
		}

		saveSubcategory({ ...result.data, description: result.data.description || '' })
	}
</script>

<template>
	<dialog class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': localVisible }">
		<div
			class="modal-box bg-bg-app border-border-default m-4 max-w-lg overflow-visible border p-0 shadow-xl sm:rounded-3xl">
			<!-- Header -->
			<div class="bg-bg-card border-border-subtle flex items-center gap-4 rounded-t-3xl border-b p-6">
				<div
					class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
					<Edit v-if="isEditing" class="h-6 w-6" />
					<ListTree v-else class="h-6 w-6" />
				</div>
				<div>
					<h3 class="text-text-primary text-lg font-bold">
						{{ isEditing ? 'Editar Subcategoría' : 'Nueva Subcategoría' }}
					</h3>
					<p class="text-text-muted text-sm font-medium">
						{{
							isEditing
								? 'Actualiza los datos de esta subcategoría'
								: 'Registra una nueva subcategoría en el sistema'
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
			<form @submit.prevent="onSubmit" class="relative space-y-5 p-6">
				<div class="form-control">
					<label class="label">
						<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
							Categoría Principal *
						</span>
					</label>
					<select
						v-model="form.category_id"
						class="select bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
						:class="{ 'border-error focus:border-error focus:ring-error/20': errors.category_id }"
						@change="clearError('category_id')"
						:disabled="loadingCategories">
						<option value="" disabled>Selecciona una categoría...</option>
						<option v-for="cat in categories" :key="cat.category_id" :value="cat.category_id">
							{{ cat.name }}
						</option>
					</select>
					<span v-if="errors.category_id" class="text-error mt-1.5 ml-1 text-xs font-bold">
						{{ errors.category_id }}
					</span>
				</div>

				<div class="form-control">
					<label class="label">
						<span class="label-text text-text-secondary text-xs font-bold tracking-wider uppercase">
							Nombre de la Subcategoría *
						</span>
					</label>
					<input
						v-model="form.name"
						type="text"
						placeholder="Ej. Labiales, Cremas Anti-edad..."
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
						placeholder="Breve descripción de la subcategoría..."
						class="textarea bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-24 w-full resize-none rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
						@input="clearError('description')"></textarea>
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
								{{ isEditing ? 'Guardar Cambios' : 'Crear Subcategoría' }}
							</span>
						</template>
					</button>
				</div>
			</form>
		</div>
		<form method="dialog" class="modal-backdrop z-[-1] bg-black/40 backdrop-blur-sm">
			<button @click="localVisible = false">Cerrar</button>
		</form>
	</dialog>
</template>
