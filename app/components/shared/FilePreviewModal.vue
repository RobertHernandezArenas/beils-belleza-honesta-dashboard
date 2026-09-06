<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { X, Download, FileText, ExternalLink, Eye } from 'lucide-vue-next'
import { useModalAnimation } from '~/composables/useModalAnimation'

const props = defineProps<{
	modelValue: boolean
	fileUrl: string | null
	title?: string
}>()

const emit = defineEmits(['update:modelValue', 'close'])

const dialogRef = ref<HTMLDialogElement | null>(null)
const { animateOpen, animateClose } = useModalAnimation()

const isPdf = computed(() => {
	if (!props.fileUrl) return false
	return props.fileUrl.toLowerCase().includes('.pdf')
})

watch(
	() => props.modelValue,
	newVal => {
		if (newVal) {
			nextTick(() => {
				animateOpen(dialogRef.value, { staggerChildren: true })
			})
		} else if (dialogRef.value?.open) {
			animateClose(dialogRef.value)
		}
	}
)

const handleClose = () => {
	emit('update:modelValue', false)
	emit('close')
}

const downloadFile = () => {
	if (!props.fileUrl) return
	const a = document.createElement('a')
	a.href = props.fileUrl
	a.download = props.fileUrl.split('/').pop() || 'documento-autorizacion'
	a.target = '_blank'
	a.click()
}
</script>

<template>
	<dialog ref="dialogRef" class="modal modal-bottom sm:modal-middle z-7000">
		<div class="modal-box bg-bg-card border border-border-default/80 max-w-4xl w-full p-0 rounded-3xl shadow-2xl flex flex-col max-h-[94dvh] overflow-hidden">
			
			<!-- HEADER FIJO -->
			<div class="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle bg-bg-card shrink-0">
				<div class="flex items-center gap-2.5">
					<div class="p-2 bg-primary/15 text-primary rounded-xl">
						<Eye class="size-5" />
					</div>
					<div>
						<h3 class="text-text-primary text-sm sm:text-base font-black tracking-tight">
							{{ title || 'Previsualización del Documento' }}
						</h3>
						<p class="text-text-muted text-[11px] font-semibold truncate max-w-xs sm:max-w-md">
							{{ fileUrl?.split('/').pop() }}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						v-if="fileUrl"
						type="button"
						class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-primary"
						title="Descargar documento"
						@click="downloadFile"
					>
						<Download class="size-4" />
					</button>
					<button
						class="btn btn-ghost btn-circle btn-sm text-text-muted hover:text-text-primary"
						@click="handleClose"
					>
						<X class="size-5" />
					</button>
				</div>
			</div>

			<!-- BODY CON VISOR RESPONSIVE -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg-muted/10 flex items-center justify-center min-h-87.5 sm:min-h-125">
				<div v-if="!fileUrl" class="text-center text-text-muted space-y-2">
					<FileText class="size-10 mx-auto opacity-40" />
					<p class="text-xs font-semibold">No hay archivo para previsualizar</p>
				</div>

				<!-- Visor de PDF -->
				<iframe
					v-else-if="isPdf"
					:src="fileUrl"
					class="w-full h-[60vh] sm:h-[70vh] rounded-2xl border border-border-subtle bg-white shadow-sm"
					frameborder="0"
				></iframe>

				<!-- Visor de Imagen (JPG/PNG) -->
				<div v-else class="max-w-full max-h-[70vh] flex items-center justify-center">
					<img
						:src="fileUrl"
						alt="Previsualización del archivo de autorización"
						class="max-w-full max-h-[65vh] object-contain rounded-2xl border border-border-subtle shadow-md bg-white"
					/>
				</div>
			</div>

			<!-- FOOTER FIJO -->
			<div class="p-3 sm:p-4 border-t border-border-subtle bg-bg-card shrink-0 flex items-center justify-between">
				<a
					v-if="fileUrl"
					:href="fileUrl"
					target="_blank"
					class="btn btn-ghost btn-xs text-text-muted hover:text-primary gap-1.5 font-bold"
				>
					<ExternalLink class="size-3.5" />
					Abrir en pestaña nueva
				</a>
				<div v-else></div>

				<button
					type="button"
					class="btn btn-primary btn-sm rounded-xl font-bold uppercase tracking-wider text-xs"
					@click="handleClose"
				>
					Cerrar Visor
				</button>
			</div>

		</div>
		<form method="dialog" class="modal-backdrop" @click="handleClose">
			<button>close</button>
		</form>
	</dialog>
</template>
