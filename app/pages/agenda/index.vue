<script setup lang="ts">
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import {
		MoreVertical,
		Trash2,
		Calendar,
		CalendarDays,
		CalendarRange,
		LayoutDashboard,
		ListTodo,
		ChevronDown,
		History,
		Search,
		Plus,
		ChevronLeft,
		ChevronRight,
		Clock,
		User as UserIcon,
		Scissors,
		CheckCircle2,
		XCircle,
		Pencil,
	} from 'lucide-vue-next'
	import BookingFormModal from '~/components/agenda/BookingFormModal.vue'
	import { useDebouncedRef } from '~/composables/useDebouncedRef'

	// Import Agenda Views
	import AgendaDayView from '~/components/agenda/views/AgendaDayView.vue'
	import AgendaGridView from '~/components/agenda/views/AgendaGridView.vue'
	import AgendaMonthView from '~/components/agenda/views/AgendaMonthView.vue'
	import AgendaYearView from '~/components/agenda/views/AgendaYearView.vue'
	import AgendaListView from '~/components/agenda/views/AgendaListView.vue'
	import gsap from 'gsap'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Agenda y Reservas' })

	const queryClient = useQueryClient()
	const modalRef = ref<InstanceType<typeof BookingFormModal> | null>(null)
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	// Calendar State
	const currentDate = ref(new Date())
	const selectedDate = ref(new Date())
	const viewMode = ref<'day' | 'week' | 'month' | 'year' | 'agenda' | '4days'>('day')
	const searchQuery = useDebouncedRef('', 500)

	// Compute start and end of current view for API query
	const queryParams = computed(() => {
		const start = new Date(selectedDate.value)
		const end = new Date(selectedDate.value)

		if (viewMode.value === 'day') {
			start.setHours(0, 0, 0, 0)
			end.setHours(23, 59, 59, 999)
		} else if (viewMode.value === '4days') {
			start.setHours(0, 0, 0, 0)
			end.setDate(end.getDate() + 3)
			end.setHours(23, 59, 59, 999)
		} else if (viewMode.value === 'week') {
			// Start of week (Monday)
			const day = start.getDay()
			const diff = start.getDate() - day + (day === 0 ? -6 : 1)
			start.setDate(diff)
			start.setHours(0, 0, 0, 0)
			
			end.setTime(start.getTime())
			end.setDate(end.getDate() + 6)
			end.setHours(23, 59, 59, 999)
		} else if (viewMode.value === 'month') {
			start.setDate(1)
			start.setHours(0, 0, 0, 0)
			end.setMonth(end.getMonth() + 1)
			end.setDate(0)
			end.setHours(23, 59, 59, 999)
		} else if (viewMode.value === 'year') {
			start.setMonth(0, 1)
			start.setHours(0, 0, 0, 0)
			end.setMonth(11, 31)
			end.setHours(23, 59, 59, 999)
		} else if (viewMode.value === 'agenda') {
			start.setHours(0, 0, 0, 0)
			end.setDate(end.getDate() + 30) // Agenda shows 30 days by default
			end.setHours(23, 59, 59, 999)
		}

		return {
			start: start.toISOString(),
			end: end.toISOString(),
			search: searchQuery.value || undefined
		}
	})

	const { data: bookings, isPending } = useQuery({
		queryKey: ['bookings', queryParams, viewMode],
		queryFn: () => $fetch<Array<any>>('/api/agenda/bookings', { query: queryParams.value }),
	})

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

	const { mutate: deleteBooking } = useMutation({
		mutationFn: (id: string) => $fetch(`/api/agenda/bookings/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bookings'] })
			displayToast('Cita cancelada y eliminada', 'success')
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al eliminar', 'error')
		},
	})

	// Navigation
	const prevPeriod = () => {
		const newDate = new Date(selectedDate.value)
		if (viewMode.value === 'day') newDate.setDate(newDate.getDate() - 1)
		else if (viewMode.value === '4days') newDate.setDate(newDate.getDate() - 4)
		else if (viewMode.value === 'week') newDate.setDate(newDate.getDate() - 7)
		else if (viewMode.value === 'month') newDate.setMonth(newDate.getMonth() - 1)
		else if (viewMode.value === 'year') newDate.setFullYear(newDate.getFullYear() - 1)
		else if (viewMode.value === 'agenda') newDate.setDate(newDate.getDate() - 30)
		selectedDate.value = newDate
	}

	const nextPeriod = () => {
		const newDate = new Date(selectedDate.value)
		if (viewMode.value === 'day') newDate.setDate(newDate.getDate() + 1)
		else if (viewMode.value === '4days') newDate.setDate(newDate.getDate() + 4)
		else if (viewMode.value === 'week') newDate.setDate(newDate.getDate() + 7)
		else if (viewMode.value === 'month') newDate.setMonth(newDate.getMonth() + 1)
		else if (viewMode.value === 'year') newDate.setFullYear(newDate.getFullYear() + 1)
		else if (viewMode.value === 'agenda') newDate.setDate(newDate.getDate() + 30)
		selectedDate.value = newDate
	}

	const setToday = () => {
		selectedDate.value = new Date()
	}

	// Filtered Bookings for the View
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

	const openCreateModal = () => {
		// Pass selectedDate as default for new booking
		modalRef.value?.showModal(null, selectedDate.value)
	}

	const openEditModal = (booking: any) => {
		modalRef.value?.showModal(booking, selectedDate.value)
	}

	const confirmDelete = (id: string) => {
		if (confirm('¿Eliminar definitivamente esta cita de la agenda?')) {
			deleteBooking(id)
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
		const map: Record<string, string> = {
			pending: 'bg-warning/20 text-yellow-800 border-warning/50',
			confirmed: 'bg-info/20 text-info border-info/50',
			completed: 'bg-success/20 text-success border-success/50',
			cancelled: 'bg-error/10 text-error border-error/50',
			no_show: 'bg-bg-muted text-text-muted border-border-strong',
		}
		return map[status] || map['pending']
	}

	const getStatusLabel = (status: string) => {
		const map: Record<string, string> = {
			pending: 'Pendiente',
			confirmed: 'Confirmada',
			completed: 'Finalizada',
			cancelled: 'Cancelada',
			no_show: 'No asiste',
		}
		return map[status] || status
	}

	// GSAP Animations
	const viewContainer = ref(null)

	watch(viewMode, () => {
		if (viewContainer.value) {
			gsap.fromTo(viewContainer.value, 
				{ opacity: 0, scale: 0.98, filter: 'blur(10px)' },
				{ opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power4.out' }
			)
		}
	})

	const handleDateChange = (direction: 'next' | 'prev') => {
		if (direction === 'next') nextPeriod()
		else prevPeriod()

		if (viewContainer.value) {
			const xMove = direction === 'next' ? 30 : -30
			gsap.fromTo(viewContainer.value,
				{ x: xMove, opacity: 0, scale: 0.99 },
				{ x: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' }
			)
		}
	}
</script>

<template>
	<div class="bg-bg-app text-text-primary relative flex h-screen min-h-screen w-full flex-col overflow-hidden p-4 lg:p-8 transition-colors duration-700">
		<!-- Background Glows (Subtler for light mode) -->
		<div class="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
		<div class="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]"></div>

		<!-- Header -->
		<div class="relative z-10 mb-8 flex shrink-0 flex-col justify-between gap-4 lg:mb-10 lg:flex-row lg:items-center">
			<div class="flex items-center gap-4">
				<div 
					class="bg-text-primary text-bg-app flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg">
					<CalendarDays class="h-6 w-6" />
				</div>
				<div>
					<h1 class="text-text-primary mb-1 text-3xl font-medium tracking-tight">
						Agenda
					</h1>
					<p class="text-text-muted text-sm font-medium">{{ formatDate(selectedDate) }}</p>
				</div>
			</div>

			<div class="flex w-full flex-col gap-4 sm:flex-row sm:items-center lg:w-auto">
				<!-- Search -->
				<div class="relative w-full sm:w-3/4 lg:w-64">
					<Search class="text-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Buscar cita o cliente..."
						class="input bg-bg-card hover:bg-bg-card focus:bg-bg-card focus:ring-border-subtle/30 text-text-primary placeholder:text-text-muted/50 h-12 w-full rounded-full border-none pl-11 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors focus:ring-4" />
				</div>
				<!-- Add -->
				<button
					class="btn bg-text-primary text-bg-app hover:bg-text-secondary flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full border-transparent px-6 shadow-md transition-colors sm:w-1/4 lg:w-auto"
					@click="openCreateModal">
					<Plus class="h-5 w-5" />
					<span class="font-bold">Nueva Cita</span>
				</button>
			</div>
		</div>

		<!-- Toolbar -->
		<div
			class="relative z-10 mb-6 flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex w-full flex-col items-center gap-3 lg:flex-row lg:justify-between">
				<!-- Date Navigation -->
				<div class="bg-bg-muted border-border-default flex w-full items-center justify-between gap-1 rounded-full border p-1 shadow-sm md:w-auto">
					<button 
						class="text-text-primary hover:bg-bg-hover flex h-8 items-center gap-2 rounded-full px-4 text-[10px] font-black transition-all active:scale-95 md:h-9 md:text-xs"
						@click="setToday">
						<History class="h-3.5 w-3.5" />
						Hoy
					</button>
					<div class="bg-border-default h-4 w-px"></div>
					<div class="flex items-center gap-1">
						<button
							class="text-text-muted hover:bg-bg-hover hover:text-text-primary btn btn-square btn-ghost btn-sm h-8 w-8 rounded-full transition-all active:scale-90 md:h-9 md:w-9"
							@click="handleDateChange('prev')">
							<ChevronLeft class="h-5 w-5" />
						</button>
						<button
							class="text-text-muted hover:bg-bg-hover hover:text-text-primary btn btn-square btn-ghost btn-sm h-8 w-8 rounded-full transition-all active:scale-90 md:h-9 md:w-9"
							@click="handleDateChange('next')">
							<ChevronRight class="h-5 w-5" />
						</button>
					</div>
				</div>

				<!-- View Switcher (Responsive Switcher) -->
				<div class="bg-bg-muted border-border-default custom-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-full border p-1 shadow-sm no-scrollbar md:w-auto">
					<button
						v-for="mode in ['day', 'week', 'month', 'year', 'agenda']" 
						:key="mode"
						@click="viewMode = mode as any"
						class="h-8 shrink-0 rounded-full px-4 text-[9px] font-black tracking-widest uppercase transition-all duration-300 active:scale-95 md:h-9 md:px-5 md:text-[10px]"
						:class="[
							viewMode === mode 
								? 'bg-text-primary text-bg-card shadow-lg' 
								: 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
						]">
						{{ 
							mode === 'day' ? 'Día' : 
							mode === 'week' ? 'Semana' : 
							mode === 'month' ? 'Mes' : 
							mode === 'year' ? 'Año' : 
							'Agenda' 
						}}
					</button>
				</div>
			</div>
		</div>

		<!-- Agenda Viewport -->
		<div 
			ref="viewContainer" 
			class="glass-card flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl premium-shadow">
			
			<div v-if="isPending" class="flex flex-1 items-center justify-center bg-bg-card">
				<div class="loading loading-spinner text-text-primary loading-lg"></div>
			</div>

			<!-- Dynamic View Component -->
			<div ref="viewContainer" class="flex-1 overflow-hidden flex flex-col">
				<component 
					:is="viewMode === 'day' ? AgendaDayView :
						viewMode === 'week' ? AgendaGridView :
						viewMode === '4days' ? AgendaGridView :
						viewMode === 'month' ? AgendaMonthView :
						viewMode === 'year' ? AgendaYearView :
						AgendaListView"
					:bookings="displayBookings"
					:selectedDate="selectedDate"
					:isPending="isPending"
					:daysCount="viewMode === '4days' ? 4 : 7"
					@edit="openEditModal"
					@delete="confirmDelete"
					@status="setBookingStatus"
					@create="openCreateModal"
					@selectDate="(d: Date) => { selectedDate = d; viewMode = 'day' }"
				/>
			</div>
		</div>

		<!-- Toast Provider -->
		<div v-if="showToast" class="toast toast-end toast-bottom z-200">
			<div
				:class="[
					'alert rounded-2xl border-none text-white shadow-lg',
					toastType === 'success' ? 'bg-success' : 'bg-error',
				]">
				<span class="font-medium">{{ toastMessage }}</span>
			</div>
		</div>

		<!-- Form Modal -->
		<BookingFormModal
			ref="modalRef"
			@refresh="queryClient.invalidateQueries({ queryKey: ['bookings'] })"
			@toast="displayToast" />
	</div>
</template>
