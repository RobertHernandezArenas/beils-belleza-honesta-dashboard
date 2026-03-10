<template>
	<dialog ref="deleteModal" class="modal modal-bottom sm:modal-middle">
		<div
			class="modal-box relative w-full max-w-md rounded-[2.5rem] border border-red-200 bg-bg-card p-8 text-center text-text-primary shadow-lg backdrop-blur-md">
			<!-- Glow rojo intenso -->
			<div
				class="pointer-events-none absolute inset-0 z-0 rounded-[2.5rem] bg-linear-to-b from-red-50 to-transparent"></div>

			<div class="relative z-10 flex flex-col items-center">
				<div class="mb-5 rounded-full bg-red-100 p-5 text-red-600 shadow-sm ring-1 ring-red-200">
					<AlertTriangle class="h-10 w-10" />
				</div>
				<h3 class="mb-2 text-2xl font-black text-red-600">{{ customTitle || $t('users.delete.title') }}</h3>
				<p class="max-w-xs text-sm font-medium text-text-muted">
					{{ customMessage || $t('users.delete.message') }}
					<span v-if="userName" class="my-2 block font-bold text-text-primary">{{ userName }}</span>
					{{ $t('users.delete.warning') }}
				</p>

				<div class="mt-8 flex w-full gap-3">
					<button
						class="btn btn-ghost h-12 flex-1 rounded-xl border border-border-default text-text-muted hover:bg-bg-hover hover:text-text-primary"
						@click.prevent="closeModal">
						{{ $t('common.cancel') }}
					</button>
					<button
						class="btn h-12 flex-1 rounded-xl border-none bg-red-600 font-bold text-bg-card shadow-md hover:bg-red-700 hover:shadow-lg"
						@click.prevent="executeDelete">
						<span v-if="isDeleting" class="loading loading-spinner"></span>
						{{ $t('users.delete.confirm') }}
					</button>
				</div>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop bg-text-primary/40 backdrop-blur-sm">
			<button>close</button>
		</form>
	</dialog>
</template>

<script setup lang="ts">
	import { ref, watch, nextTick } from 'vue'
	import { AlertTriangle } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'
	import { useModalAnimation } from '~/composables/useModalAnimation'

	const props = defineProps<{
		isOpen: boolean
		userName?: string
		isDeleting?: boolean
		customTitle?: string
		customMessage?: string
	}>()

	const emit = defineEmits(['close', 'confirm'])

	const { t } = useI18n()
	const deleteModal = ref<HTMLDialogElement | null>(null)
	const { animateOpen, animateClose } = useModalAnimation()

	watch(
		() => props.isOpen,
		newVal => {
			if (newVal) {
				nextTick(() => {
					animateOpen(deleteModal.value)
				})
			} else if (deleteModal.value?.open) {
				animateClose(deleteModal.value)
			}
		},
	)

	const closeModal = () => {
		emit('close')
	}

	const executeDelete = () => {
		emit('confirm')
	}
</script>
