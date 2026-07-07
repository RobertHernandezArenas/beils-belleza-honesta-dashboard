import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { useAgendaStore } from '~/stores/useAgendaStore'

export function useAgenda() {
	const queryClient = useQueryClient()
	const store = useAgendaStore()

	// Extract state from store
	const { 
		selectedDate, 
		viewMode, 
		searchQuery, 
		isBookingDrawerOpen, 
		isBookingDetailsOpen, 
		selectedBooking,
		prefillDate,
		prefillTime,
		showSidebar
	} = storeToRefs(store)

	// Additional local state for modals that are not in store
	const deleteModalOpen = ref(false)
	const bookingToDelete = ref<any>(null)

	// Toast State
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	// Query params derivation
	const queryParams = computed(() => {
		const start = new Date(selectedDate.value)
		const end = new Date(selectedDate.value)

		// To prevent data flickering/disappearing when switching between Day/Week/Month tabs,
		// we ALWAYS fetch the entire month (plus a 7-day padding for cross-month weeks) 
		// regardless of the current viewMode. The individual view components will filter 
		// the data they need.
		start.setDate(1)
		start.setHours(0, 0, 0, 0)
		start.setDate(start.getDate() - 7) // 7 days padding for week view overlap

		end.setMonth(end.getMonth() + 1)
		end.setDate(0)
		end.setHours(23, 59, 59, 999)
		end.setDate(end.getDate() + 14) // 14 days padding for month view overlap

		return {
			start: start.toISOString(),
			end: end.toISOString(),
			search: searchQuery.value || undefined
		}
	})

	// Fetch bookings
	const { data: bookings, isPending } = useQuery({
		queryKey: ['bookings', queryParams], // Removed viewMode to prevent refetching when switching tabs
		queryFn: () => $fetch<Array<any>>('/api/agenda/bookings', { query: queryParams.value }),
		placeholderData: keepPreviousData,
	})

	// Mutations
	const { mutate: updateStatus } = useMutation({
		mutationFn: (payload: { id: string; status: string }) =>
			$fetch(`/api/agenda/bookings/${payload.id}`, {
				method: 'PUT',
				body: { status: payload.status },
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bookings'] })
			displayToast('Estado de la cita actualizado', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al actualizar', 'error')
		},
	})

	const { mutate: deleteBooking, isPending: isDeletingBooking } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/agenda/bookings/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bookings'] })
			displayToast('Cita cancelada y eliminada', 'success')
			deleteModalOpen.value = false
			bookingToDelete.value = null
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar', 'error')
		},
	})

	// Period navigation
	const prevPeriod = () => {
		const newDate = new Date(selectedDate.value)
		if (viewMode.value === 'day') newDate.setDate(newDate.getDate() - 1)
		else if (viewMode.value === '4days') newDate.setDate(newDate.getDate() - 4)
		else if (viewMode.value === 'week') newDate.setDate(newDate.getDate() - 7)
		else if (viewMode.value === 'month') newDate.setMonth(newDate.getMonth() - 1)
		else if (viewMode.value === 'year') newDate.setFullYear(newDate.getFullYear() - 1)
		else if (viewMode.value === 'agenda') newDate.setDate(newDate.getDate() - 30)
		store.setDate(newDate)
	}

	const nextPeriod = () => {
		const newDate = new Date(selectedDate.value)
		if (viewMode.value === 'day') newDate.setDate(newDate.getDate() + 1)
		else if (viewMode.value === '4days') newDate.setDate(newDate.getDate() + 4)
		else if (viewMode.value === 'week') newDate.setDate(newDate.getDate() + 7)
		else if (viewMode.value === 'month') newDate.setMonth(newDate.getMonth() + 1)
		else if (viewMode.value === 'year') newDate.setFullYear(newDate.getFullYear() + 1)
		else if (viewMode.value === 'agenda') newDate.setDate(newDate.getDate() + 30)
		store.setDate(newDate)
	}

	const setToday = () => {
		store.setDate(new Date())
	}

	// Filtered list
	const displayBookings = computed(() => {
		if (!bookings.value || !Array.isArray(bookings.value)) return []
		let filtered = bookings.value as Array<any>

		if (searchQuery.value) {
			const q = searchQuery.value.toLowerCase()
			filtered = filtered.filter(
				(b: any) =>
					b.client?.name?.toLowerCase().includes(q) ||
					b.client?.surname?.toLowerCase().includes(q) ||
					b.client?.phone?.includes(q) ||
					b.staff?.name?.toLowerCase().includes(q) ||
					b.notes?.toLowerCase().includes(q),
			)
		}

		return filtered
	})

	const confirmDelete = (id: string) => {
		const b = bookings.value?.find((b: any) => b.booking_id === id)
		bookingToDelete.value = b || { booking_id: id }
		deleteModalOpen.value = true
	}

	const handleActualDelete = () => {
		if (bookingToDelete.value?.booking_id) {
			deleteBooking(bookingToDelete.value.booking_id)
		}
	}

	const setBookingStatus = (id: string, status: string) => {
		updateStatus({ id, status })
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const formatDayDate = (date: Date) => {
		return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
	}

	const getStatusColor = (status: string) => {
		const s = (status || 'PENDIENTE').toUpperCase()
		const map: Record<string, string> = {
			PENDIENTE: 'bg-warning/20 text-yellow-800 border-warning/50',
			CONFIRMADA: 'bg-primary/20 text-primary border-primary/50',
			CANCELADA: 'bg-error/10 text-error border-error/50',
			COMPLETADA: 'bg-success/20 text-success border-success/50',
			AUSENTE: 'bg-gray-500/20 text-gray-500 border-gray-400/50',
		}
		return map[s] || map['PENDIENTE']
	}

	const getStatusLabel = (status: string) => {
		const s = (status || 'PENDIENTE').toUpperCase()
		const map: Record<string, string> = {
			PENDIENTE: 'Pendiente',
			CONFIRMADA: 'Confirmada',
			CANCELADA: 'Cancelada',
			COMPLETADA: 'Finalizada',
			AUSENTE: 'No asiste',
		}
		return map[s] || s
	}

	return {
		store,
		selectedDate,
		viewMode,
		searchQuery,
		deleteModalOpen,
		bookingToDelete,
		toastMessage,
		toastType,
		showToast,
		bookings,
		isPending,
		isDeletingBooking,
		prevPeriod,
		nextPeriod,
		setToday,
		displayBookings,
		confirmDelete,
		handleActualDelete,
		setBookingStatus,
		displayToast,
		formatDayDate,
		getStatusColor,
		getStatusLabel,
	}
}
