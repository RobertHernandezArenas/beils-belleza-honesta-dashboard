<template>
	<div
		class="bg-bg-app text-text-secondary relative min-h-screen w-full overflow-hidden p-6 font-sans lg:p-10">
		<!-- Minimalist background without blobs -->

		<!-- Contenedor Principal -->
		<div class="relative z-10 mx-auto max-w-7xl space-y-8">
			<UsersUserHeader
				v-model="filtersStore.searchQuery"
				:filters-active="filtersStore.hasActiveFilters"
				@toggle-filters="filtersStore.toggleFilters()"
				@create="userForm?.showModal(null)" />

			<!-- Filters Panel Component -->
			<UsersUserFilterPanel />

			<UsersUserTable
				:users="paginatedUsers"
				:pending="pending"
				:total-items="filteredUsers.length"
				:items-per-page="itemsPerPage"
				v-model:current-page="currentPage"
				@edit="userForm?.showModal($event)"
				@delete="openDeleteModal"
				@toggle-status="toggleUserStatus" />
		</div>

		<!-- Modales -->
		<UsersUserFormModal ref="userForm" @refresh="refresh" @toast="handleToast" />
		<UsersUserDeleteModal
			:is-open="showDeleteModal"
			:user-name="selectedUserToDelete?.name || ''"
			:is-deleting="isDeletingUser"
			@close="showDeleteModal = false"
			@confirm="executeDelete" />

		<!-- Toasts Notificaciones -->
		<div class="toast toast-bottom toast-center sm:toast-end z-100">
			<TransitionGroup name="list">
				<div
					v-for="toast in toasts"
					:key="toast.id"
					class="alert mb-2 max-w-sm flex-row items-center border border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md"
					:class="
						toast.type === 'success'
							? 'bg-[#10b981]/10 text-[#10b981]'
							: 'bg-[#ef4444]/10 text-[#ef4444]'
					">
					<span class="font-bold">{{ toast.message }}</span>
				</div>
			</TransitionGroup>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import { useI18n } from 'vue-i18n'
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { useUsersFilterStore } from '~/stores/useUsersFilterStore'

	const { t } = useI18n()

	useHead({
		title: t('nav.users') + ' | beilsbellezhonesta Plus',
		meta: [{ name: 'description', content: 'Lista y gestión de usuarios del sistema' }],
	})

	definePageMeta({
		layout: 'default',
	})

	// --- Notificaciones ---
	const toasts = ref<{ id: number; message: string; type: 'success' | 'error' }[]>([])
	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		const id = Date.now()
		toasts.value.push({ id, message, type })
		setTimeout(() => {
			toasts.value = toasts.value.filter(t => t.id !== id)
		}, 3000)
	}

	const handleToast = (payload: { message: string; type: 'success' | 'error' }) => {
		showToast(payload.message, payload.type)
	}

	interface UserData {
		user_id: string
		name: string
		surname?: string
		email: string
		phone?: string
		address?: string
		city?: string
		country?: string
		postal_code?: string
		gender?: string
		birth_date?: string
		document_type?: string
		document_number?: string
		role: string
		status: 'ON' | 'OFF'
		avatar?: string
	}

	const {
		data: usersData,
		refetch: refresh,
		isPending: pending,
	} = useQuery<UserData[]>({
		queryKey: ['users'],
		queryFn: () => $fetch('/api/users'),
	})
	const users = computed(() => usersData.value || [])

	const filtersStore = useUsersFilterStore()

	// --- Búsqueda (Search) ---
	const searchQuery = useDebouncedRef(filtersStore.searchQuery, 500)
	
	watch(searchQuery, (newVal) => {
		filtersStore.searchQuery = newVal
	})

	const filteredUsers = computed(() => {
		const query = filtersStore.searchQuery.toLowerCase()

		return users.value.filter(u => {
			// Búsqueda de texto (barra superior)
			const matchesSearch =
				!query ||
				u.name.toLowerCase().includes(query) ||
				u.email.toLowerCase().includes(query) ||
				u.role.toLowerCase().includes(query)

			// Validaciones de Filtros
			const matchesRole = filtersStore.filterRole === 'all' || u.role === filtersStore.filterRole
			const matchesStatus = filtersStore.filterStatus === 'all' || u.status === filtersStore.filterStatus
			const matchesDocType =
				filtersStore.filterDocType === 'all' || u.document_type === filtersStore.filterDocType

			return matchesSearch && matchesRole && matchesStatus && matchesDocType
		})
	})

	// --- Paginación ---
	const currentPage = ref(1)
	const itemsPerPage = ref(10)

	const paginatedUsers = computed(() => {
		const start = (currentPage.value - 1) * itemsPerPage.value
		const end = start + itemsPerPage.value
		return filteredUsers.value.slice(start, end)
	})

	// Reset page when searching or filtering
	watch(
		() => [
			filtersStore.searchQuery,
			filtersStore.filterRole,
			filtersStore.filterStatus,
			filtersStore.filterDocType,
		],
		() => {
			currentPage.value = 1
		},
	)

	// --- Referencias a los componentes hijos ---
	const userForm = ref<any>(null)
	
	// --- Gestión de Eliminación ---
	const showDeleteModal = ref(false)
	const selectedUserToDelete = ref<any>(null)
	const queryClient = useQueryClient()

	const { mutate: deleteUser, isPending: isDeletingUser } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/users/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['users'] })
			handleToast({
				message: t('users.messages.deleted', 'Usuario eliminado exitosamente'),
				type: 'success',
			})
			showDeleteModal.value = false
			selectedUserToDelete.value = null
		},
		onError: (error: any) => {
			console.error('Error deleting user:', error)
			handleToast({
				message: error.data?.statusMessage || t('users.messages.errorDelete', 'Error al eliminar el usuario'),
				type: 'error',
			})
			showDeleteModal.value = false
		},
	})

	const openDeleteModal = (user: any) => {
		selectedUserToDelete.value = user
		showDeleteModal.value = true
	}

	const executeDelete = () => {
		if (!selectedUserToDelete.value) return
		deleteUser(selectedUserToDelete.value.user_id)
	}

	const { mutate: updateStatus } = useMutation({
		mutationFn: (payload: { id: string; status: string }) =>
			$fetch(`/api/users/${payload.id}`, {
				method: 'PUT',
				body: { status: payload.status },
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['users'] })
			if (variables.status === 'ON') {
				handleToast({ message: t('users.messages.statusOn', 'Usuario activado'), type: 'success' })
			} else {
				handleToast({ message: t('users.messages.statusOff', 'Usuario desactivado'), type: 'success' })
			}
		},
		onError: (error: any) => {
			handleToast({
				message: error.data?.message || t('users.messages.toggleError', 'Error al cambiar estado'),
				type: 'error',
			})
		},
	})

	const toggleUserStatus = (user: UserData) => {
		const newStatus = user.status === 'ON' ? 'OFF' : 'ON'
		updateStatus({ id: user.user_id, status: newStatus })
	}
</script>

<style scoped>
	.list-enter-active,
	.list-leave-active {
		transition-property: opacity, transform;
		transition-duration: 0.3s;
		transition-timing-function: ease;
	}
	.list-enter-from {
		opacity: 0;
		transform: translateY(30px);
	}
	.list-leave-to {
		opacity: 0;
		transform: translateX(30px);
	}
	@keyframes blob {
		0% {
			transform: translate(0px, 0px) scale(1);
		}
		33% {
			transform: translate(30px, -50px) scale(1.1);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.9);
		}
		100% {
			transform: translate(0px, 0px) scale(1);
		}
	}

	.animate-blob {
		animation: blob 15s infinite alternate;
	}

	.animation-delay-2000 {
		animation-delay: 2s;
	}

	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}

	/* Ocultar barra de scroll en Webkit pero permitir scroll funcional */
	.overflow-x-auto::-webkit-scrollbar {
		height: 6px;
	}
	.overflow-x-auto::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.05);
		border-radius: 10px;
	}
	.overflow-x-auto::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 10px;
	}
	.overflow-x-auto::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.2);
	}
</style>
