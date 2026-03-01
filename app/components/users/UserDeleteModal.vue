<template>
	<dialog ref="deleteModal" class="modal modal-bottom sm:modal-middle">
		<div
			class="modal-box relative rounded-[2.5rem] border border-red-200 bg-bg-card p-8 text-center text-text-primary shadow-lg backdrop-blur-md">
			<!-- Glow rojo intenso -->
			<div
				class="pointer-events-none absolute inset-0 z-0 rounded-[2.5rem] bg-linear-to-b from-red-50 to-transparent"></div>

			<div class="relative z-10 flex flex-col items-center">
				<div class="mb-5 rounded-full bg-red-100 p-5 text-red-600 shadow-sm ring-1 ring-red-200">
					<AlertTriangle class="h-10 w-10" />
				</div>
				<h3 class="mb-2 text-2xl font-black text-red-600">{{ $t('users.delete.title') }}</h3>
				<p class="max-w-xs text-sm font-medium text-text-muted">
					{{ $t('users.delete.message') }}
					<span class="my-2 block font-bold text-text-primary">{{ userToDelete?.name }}</span>
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
	import { ref } from 'vue'
	import { AlertTriangle } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	const { t } = useI18n()

	const deleteModal = ref<HTMLDialogElement | null>(null)
	const userToDelete = ref<any | null>(null)
	const isDeleting = ref(false)

	const emit = defineEmits(['refresh', 'toast'])

	const showModal = (user: any) => {
		userToDelete.value = user
		deleteModal.value?.showModal()
	}

	const closeModal = () => {
		deleteModal.value?.close()
	}

	const executeDelete = async () => {
		if (!userToDelete.value) return
		isDeleting.value = true

		try {
			await $fetch(`/api/users/${userToDelete.value.user_id}`, {
				method: 'DELETE',
			})
			userToDelete.value = null
			emit('refresh')
			emit('toast', {
				message: t('users.messages.deleted', 'Usuario eliminado exitosamente'),
				type: 'success',
			})
		} catch (error: any) {
			console.error('Error deleting user:', error)
			emit('toast', {
				message:
					error.data?.statusMessage || t('users.messages.errorDelete', 'Error al eliminar el usuario'),
				type: 'error',
			})
		} finally {
			isDeleting.value = false
			closeModal()
		}
	}

	defineExpose({
		showModal,
	})
</script>
