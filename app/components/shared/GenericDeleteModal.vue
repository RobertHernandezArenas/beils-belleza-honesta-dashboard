<script setup lang="ts">
	import { AlertTriangle } from 'lucide-vue-next'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const props = defineProps<{
		isOpen: boolean
		itemName: string
		isDeleting: boolean
		customTitle?: string
		customMessage?: string
	}>()

	const emit = defineEmits(['close', 'confirm'])
	const deleteModal = ref<HTMLDialogElement | null>(null)
	const { animateOpen, animateClose } = useModalAnimation()

	watch(
		() => props.isOpen,
		newVal => {
			if (newVal) {
				animateOpen(deleteModal.value)
			} else {
				if (deleteModal.value?.open) {
					animateClose(deleteModal.value)
				}
			}
		},
	)

	const closeModal = () => {
		animateClose(deleteModal.value, () => emit('close'))
	}

	const confirmDelete = () => {
		emit('confirm')
	}
</script>

<template>
	<dialog ref="deleteModal" class="modal modal-bottom sm:modal-middle" @close="closeModal">
		<div
			class="modal-box bg-bg-card text-text-primary relative w-full max-w-md rounded-[2.5rem] border border-red-200 p-8 text-center shadow-lg backdrop-blur-md">
			<!-- Glow rojo intenso -->
			<div
				class="pointer-events-none absolute inset-0 z-0 rounded-[2.5rem] bg-linear-to-b from-red-50 to-transparent"></div>

			<div class="relative z-10 flex flex-col items-center">
				<div class="mb-5 rounded-full bg-red-100 p-5 text-red-600 shadow-sm ring-1 ring-red-200">
					<AlertTriangle class="h-10 w-10" />
				</div>
				<h3 class="mb-2 text-2xl font-black text-red-600">
					{{ customTitle || 'Eliminar Registro' }}
				</h3>
				<p class="text-text-muted max-w-xs text-sm font-medium">
					{{ customMessage || '¿Estás seguro de que deseas eliminar este registro?' }}
					<span v-if="itemName" class="text-text-primary my-2 block font-bold">
						{{ itemName }}
					</span>
					Esta acción no se puede deshacer.
				</p>

				<div class="mt-8 flex w-full gap-3">
					<button
						class="btn btn-ghost border-border-default text-text-muted hover:bg-bg-hover hover:text-text-primary h-12 flex-1 rounded-xl border"
						@click.prevent="closeModal"
						:disabled="isDeleting">
						Cancelar
					</button>
					<button
						class="btn text-bg-card h-12 flex-1 rounded-xl border-none bg-red-600 font-bold shadow-md hover:bg-red-700 hover:shadow-lg"
						@click.prevent="confirmDelete"
						:disabled="isDeleting">
						<span v-if="isDeleting" class="loading loading-spinner"></span>
						Confirmar Eliminar
					</button>
				</div>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-primary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>
