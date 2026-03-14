<script setup lang="ts">
	import { ref, reactive, watch, computed } from 'vue'
	import { z } from 'zod'
	import { useMutation, useQueryClient } from '@tanstack/vue-query'
	import { Save, AlertCircle, Edit, Hash } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const props = defineProps<{
		modelValue: boolean
		tagToEdit?: { tag_id: string; name: string } | null
	}>()

	const emit = defineEmits(['update:modelValue', 'close'])
	const { t } = useI18n()
	const queryClient = useQueryClient()

	const localVisible = ref(props.modelValue)
	const tagDialog = ref<HTMLDialogElement | null>(null)
	const { animateOpen, animateClose } = useModalAnimation()

	watch(
		() => props.modelValue,
		newVal => {
			localVisible.value = newVal
			if (newVal) {
				initForm()
				nextTick(() => {
					animateOpen(tagDialog.value, { staggerChildren: true })
				})
			} else if (tagDialog.value?.open) {
				animateClose(tagDialog.value)
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
	})

	const errors = reactive({
		name: '',
	})

	const apiError = ref('')

	const isEditing = computed(() => !!props.tagToEdit?.tag_id)

	const initForm = () => {
		apiError.value = ''
		errors.name = ''

		if (props.tagToEdit) {
			form.name = props.tagToEdit.name
		} else {
			form.name = ''
		}
	}

	const clearError = (field: keyof typeof errors) => {
		errors[field] = ''
		apiError.value = ''
	}

	const tagSchema = z.object({
		name: z.string().min(1, 'El nombre de la etiqueta es obligatorio'),
	})

	const { mutate: saveTag, isPending } = useMutation({
		mutationFn: async (data: typeof form) => {
			const url = isEditing.value ? `/api/catalog/tags/${props.tagToEdit!.tag_id}` : '/api/catalog/tags'
			const method = isEditing.value ? 'PUT' : 'POST'

			return await $fetch(url, {
				method,
				body: data,
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tags-list'] })
			queryClient.invalidateQueries({ queryKey: ['tags'] })
			localVisible.value = false
		},
		onError: (err: any) => {
			apiError.value = err.response?._data?.statusMessage || err.message || 'Error al guardar la etiqueta'
		},
	})

	const onSubmit = () => {
		errors.name = ''
		apiError.value = ''

		const result = tagSchema.safeParse(form)
		if (!result.success) {
			const formatted = result.error.format()
			errors.name = formatted.name?._errors[0] || ''
			return
		}

		saveTag(result.data)
	}
</script>

<template>
	<dialog ref="tagDialog" class="modal modal-bottom sm:modal-middle" :class="{ 'modal-open': localVisible }">
		<div class="modal-box bg-bg-app border-border-default m-4 max-w-lg border p-0 shadow-xl sm:rounded-3xl">
			<!-- Header -->
			<div class="bg-bg-card border-border-subtle flex items-center gap-4 rounded-t-3xl border-b p-6">
				<div
					class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
					<Edit v-if="isEditing" class="h-6 w-6" />
					<Hash v-else class="h-6 w-6" />
				</div>
				<div>
					<h3 class="text-text-primary text-lg font-bold">
						{{ isEditing ? 'Editar Etiqueta' : 'Nueva Etiqueta' }}
					</h3>
					<p class="text-text-muted text-sm font-medium">
						{{
							isEditing
								? 'Actualiza el nombre de esta etiqueta'
								: 'Registra una etiqueta para organizar productos'
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
							Nombre de la Etiqueta *
						</span>
					</label>
					<input
						v-model="form.name"
						type="text"
						placeholder="Ej. Vegano, Sin Gluten..."
						class="input bg-bg-muted hover:bg-bg-card focus:bg-bg-card focus:border-border-subtle focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-xl border-transparent font-medium shadow-inner transition-colors focus:ring-4"
						:class="{ 'border-error focus:border-error focus:ring-error/20': errors.name }"
						@input="clearError('name')" />
					<span v-if="errors.name" class="text-error mt-1.5 ml-1 text-xs font-bold">
						{{ errors.name }}
					</span>
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
								{{ isEditing ? 'Guardar Cambios' : 'Crear Etiqueta' }}
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
