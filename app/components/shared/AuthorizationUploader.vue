<script setup lang="ts">
import { ref } from 'vue'
import { UploadCloud, FileText, Eye, Trash2, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-vue-next'
import type { FetchError } from '~~/shared/types/domain'

const props = withDefaults(
	defineProps<{
		modelValue: string | null
		title?: string
		description?: string
		disabled?: boolean
	}>(),
	{
		title: 'Documento de Autorización (Menores de Edad / Tutor Legal)',
		description: 'Subí el documento firmado por el padre, madre o tutor legal en formato PDF, JPG o PNG (máx. 5MB).',
		disabled: false
	}
)

const emit = defineEmits<{
	(e: 'update:modelValue', val: string | null): void
	(e: 'preview', url: string): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const uploadError = ref('')
const isDragging = ref(false)

const triggerFileInput = () => {
	if (props.disabled || isUploading.value) return
	fileInputRef.value?.click()
}

const handleFileSelect = async (e: Event) => {
	const target = e.target as HTMLInputElement
	if (!target.files?.length) return
	await uploadFile(target.files[0])
	target.value = ''
}

const handleDrop = async (e: DragEvent) => {
	isDragging.value = false
	if (props.disabled || isUploading.value) return
	if (e.dataTransfer?.files?.length) {
		await uploadFile(e.dataTransfer.files[0])
	}
}

const uploadFile = async (file: File) => {
	uploadError.value = ''
	if (file.size > 5 * 1024 * 1024) {
		uploadError.value = 'El archivo supera el tamaño máximo permitido de 5MB.'
		return
	}

	const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
	if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
		uploadError.value = 'Formato no soportado. Debe ser PDF, JPG o PNG.'
		return
	}

	isUploading.value = true
	try {
		const formData = new FormData()
		formData.append('file', file)
		formData.append('category', 'documentos')
		formData.append('type', 'autorizaciones')

		const response: any = await $fetch('/api/upload', {
			method: 'POST',
			body: formData
		})

		if (response?.url) {
			emit('update:modelValue', response.url)
		} else {
			throw new Error('No se recibió la URL del archivo')
		}
	} catch (err: any) {
		uploadError.value = err?.data?.statusMessage || err?.message || 'Error al subir el archivo'
	} finally {
		isUploading.value = false
	}
}

const removeFile = () => {
	if (props.disabled) return
	emit('update:modelValue', null)
}

const openPreview = () => {
	if (props.modelValue) {
		emit('preview', props.modelValue)
	}
}
</script>

<template>
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="text-[11px] font-bold text-text-primary uppercase tracking-wider block">
				{{ title }}
			</label>
			<span v-if="modelValue" class="text-[10px] text-success font-bold flex items-center gap-1">
				<CheckCircle2 class="w-3.5 h-3.5" />
				Archivo Adjuntado
			</span>
		</div>

		<!-- SI YA HAY UN ARCHIVO SUBIDO -->
		<div
			v-if="modelValue"
			class="flex items-center justify-between p-3 sm:p-3.5 bg-bg-card border border-primary/30 rounded-2xl shadow-xs transition-all"
		>
			<div class="flex items-center gap-2.5 min-w-0">
				<div class="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
					<FileText v-if="modelValue.toLowerCase().endsWith('.pdf')" class="w-4 h-4" />
					<ImageIcon v-else class="w-4 h-4" />
				</div>
				<div class="truncate">
					<p class="text-xs font-bold text-text-primary truncate">
						{{ modelValue.split('/').pop() }}
					</p>
					<span class="text-[10px] text-text-muted">
						Documento oficial cargado
					</span>
				</div>
			</div>

			<div class="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					class="btn btn-ghost btn-xs text-primary hover:bg-primary/10 gap-1 rounded-xl font-bold"
					@click="openPreview"
				>
					<Eye class="w-3.5 h-3.5" />
					Previsualizar
				</button>
				<button
					v-if="!disabled"
					type="button"
					class="btn btn-ghost btn-circle btn-xs text-text-muted hover:text-error rounded-xl"
					title="Eliminar archivo"
					@click="removeFile"
				>
					<Trash2 class="w-3.5 h-3.5" />
				</button>
			</div>
		</div>

		<!-- SI NO HAY ARCHIVO: ZONA DROPZONE -->
		<div
			v-else
			class="relative border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer select-none bg-bg-muted/10"
			:class="[
				isDragging ? 'border-primary bg-primary/5' : 'border-border-subtle hover:border-primary/50 hover:bg-bg-card',
				disabled ? 'opacity-50 cursor-not-allowed' : ''
			]"
			@dragover.prevent="isDragging = true"
			@dragleave.prevent="isDragging = false"
			@drop.prevent="handleDrop"
			@click="triggerFileInput"
		>
			<input
				ref="fileInputRef"
				type="file"
				class="hidden"
				accept=".pdf,.png,.jpg,.jpeg,.webp"
				:disabled="disabled || isUploading"
				@change="handleFileSelect"
			/>

			<div class="flex flex-col items-center justify-center gap-1.5">
				<div v-if="isUploading" class="p-2.5 bg-primary/15 text-primary rounded-2xl animate-spin">
					<Loader2 class="w-5 h-5" />
				</div>
				<div v-else class="p-2.5 bg-primary/10 text-primary rounded-2xl">
					<UploadCloud class="w-5 h-5" />
				</div>

				<div class="space-y-0.5">
					<p class="text-xs font-bold text-text-primary">
						{{ isUploading ? 'Subiendo documento...' : 'Arrastrá o hacé clic para subir la autorización' }}
					</p>
					<p class="text-[10px] text-text-muted max-w-xs mx-auto">
						{{ description }}
					</p>
				</div>
			</div>
		</div>

		<!-- ERROR ALERT -->
		<p v-if="uploadError" class="text-[11px] text-error font-semibold mt-1">
			{{ uploadError }}
		</p>
	</div>
</template>
