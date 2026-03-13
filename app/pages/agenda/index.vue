<script setup lang="ts">
	import { ref, computed } from 'vue'
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
</script>

<template>
	<div
		class="bg-bg-app text-text-secondary flex h-screen min-h-screen w-full flex-col overflow-hidden p-4 lg:p-8">
		<!-- Header -->
		<div class="mb-6 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
					<CalendarDays class="h-6 w-6" />
				</div>
				<div>
					<h1 class="text-2xl font-bold tracking-tight">Agenda</h1>
					<p class="text-text-muted text-sm font-medium capitalize">{{ formatDayDate(selectedDate) }}</p>
				</div>
			</div>

			<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
				<!-- Search -->
				<div class="relative w-full sm:w-3/4 lg:w-64">
					<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Buscar cita o cliente..."
						class="input bg-bg-card border-border-default focus:border-border-strong focus:ring-border-subtle h-11 w-full rounded-xl pl-10 text-sm shadow-sm transition-[border-color,box-shadow]" />
				</div>

				<!-- Add -->
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-11 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border-none px-6 font-bold shadow-sm sm:w-1/4 lg:w-auto"
					@click="openCreateModal">
					<Plus class="h-4 w-4" />
					Nueva Cita
				</button>
			</div>
		</div>

		<!-- Toolbar -->
		<div
			class="bg-bg-card border-border-default mb-4 flex shrink-0 flex-col items-center justify-between rounded-3xl border p-2 shadow-sm sm:flex-row">
			<!-- Date Nav -->
			<div class="mb-2 flex items-center gap-1 sm:mb-0">
				<button
					class="btn btn-ghost btn-sm text-text-secondary hover:bg-bg-muted flex h-10 items-center gap-2 rounded-xl px-4 font-bold"
					@click="setToday">
					<History class="h-4 w-4" />
					Hoy
				</button>
				<button
					class="btn btn-square btn-ghost btn-sm border-border-default text-text-muted hover:bg-bg-muted ml-2 h-10 w-10 rounded-lg border"
					@click="prevPeriod">
					<ChevronLeft class="h-5 w-5" />
				</button>
				<button
					class="btn btn-square btn-ghost btn-sm border-border-default text-text-muted hover:bg-bg-muted h-10 w-10 rounded-lg border"
					@click="nextPeriod">
					<ChevronRight class="h-5 w-5" />
				</button>
				<span class="ml-3 hidden text-sm font-bold tracking-wide capitalize sm:inline-block">
					{{ formatDayDate(selectedDate) }}
				</span>
			</div>

			<!-- Views Selector (DaisyUI Dropdown) -->
			<div class="dropdown dropdown-end w-full sm:w-auto">
				<div 
					tabindex="0" 
					role="button" 
					class="btn bg-bg-muted hover:bg-bg-hover border-border-default h-10 flex min-w-[160px] items-center justify-between rounded-xl border px-4 font-bold shadow-sm transition-all focus:ring-2 focus:ring-primary/20 focus:outline-none">
					<div class="flex items-center gap-2">
						<component :is="viewMode === 'day' ? Calendar : 
										viewMode === 'week' ? CalendarRange : 
										viewMode === 'month' ? LayoutDashboard : 
										viewMode === 'year' ? CalendarDays : 
										viewMode === 'agenda' ? ListTodo : 
										CalendarDays" 
									class="text-primary h-4 w-4" />
						<span class="text-xs tracking-wide uppercase">
							{{
								viewMode === 'day' ? 'Día' :
								viewMode === '4days' ? '4 Días' :
								viewMode === 'week' ? 'Semana' :
								viewMode === 'month' ? 'Mes' :
								viewMode === 'year' ? 'Año' :
								'Agenda'
							}}
						</span>
					</div>
					<ChevronDown class="text-text-muted h-4 w-4" />
				</div>
				<ul tabindex="0" class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-100 mt-2 w-full min-w-[180px] rounded-2xl border p-2 shadow-xl backdrop-blur-md sm:w-48">
					<li v-for="mode in ['day', '4days', 'week', 'month', 'year', 'agenda']" :key="mode">
						<button 
							@click="viewMode = mode as any"
							class="flex items-center gap-3 rounded-xl px-4 py-3 text-[10px] font-black tracking-widest uppercase transition-colors"
							:class="viewMode === mode ? 'bg-primary/10 text-primary' : 'hover:bg-bg-muted text-text-muted hover:text-text-secondary'">
							<component :is="mode === 'day' ? Calendar : 
											mode === 'week' ? CalendarRange : 
											mode === 'month' ? LayoutDashboard : 
											mode === 'year' ? CalendarDays : 
											mode === 'agenda' ? ListTodo : 
											CalendarDays" 
										class="h-4 w-4" />
							{{
								mode === 'day' ? 'Día' :
								mode === '4days' ? '4 Días' :
								mode === 'week' ? 'Semana' :
								mode === 'month' ? 'Mes' :
								mode === 'year' ? 'Año' :
								'Agenda'
							}}
						</button>
					</li>
				</ul>
			</div>
		</div>

		<!-- Agenda View (Linear Day Flow for simplicity initially, adaptable to grid) -->
		<div
			class="bg-bg-card border-border-default relative flex flex-1 flex-col overflow-hidden rounded-3xl border shadow-sm">
			<div
				v-if="isPending"
				class="bg-bg-card/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm">
				<span class="loading loading-spinner loading-lg text-primary"></span>
			</div>

			<div class="custom-scrollbar flex-1 overflow-y-auto p-4 lg:p-6" v-if="displayBookings.length > 0">
				<div class="flex flex-col gap-4">
					<div
						v-for="booking in displayBookings"
						:key="booking.booking_id"
						class="group flex flex-col gap-4 sm:flex-row">
						<!-- Time Column -->
						<div
							class="border-border-default group-hover:border-primary/30 flex w-24 shrink-0 flex-col items-end border-r-2 pt-2 pr-4 transition-colors">
							<span class="text-xl leading-none font-black tracking-tighter tabular-nums">
								{{ booking.start_time }}
							</span>
							<span class="text-text-muted mt-1 text-xs font-bold tabular-nums">
								{{ booking.end_time }}
							</span>
							<span class="text-text-muted mt-2 text-[10px] capitalize">
								{{ new Date(booking.booking_date).toLocaleDateString('es-ES', { weekday: 'short' }) }}
							</span>
						</div>

						<!-- Card -->
						<div
							class="relative flex-1 rounded-2xl border p-4 shadow-sm transition-colors hover:shadow-md"
							:class="getStatusColor(booking.status)">
							<div class="relative z-50 mb-2 flex items-start justify-between">
								<div class="flex items-center gap-2">
									<div
										class="bg-bg-card/50 rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider uppercase backdrop-blur-sm">
										{{ getStatusLabel(booking.status) }}
									</div>
									<span
										v-if="booking.staff"
										class="flex items-center gap-1 text-xs font-bold opacity-80">
										<UserIcon class="h-3 w-3" />
										{{ booking.staff.name }}
									</span>
								</div>

								<!-- Dropdown -->
								<div class="dropdown dropdown-end relative z-200">
									<button
										tabindex="0"
										class="btn btn-ghost btn-sm btn-circle bg-bg-card/30 hover:bg-bg-card -mr-2 opacity-50 hover:opacity-100">
										<MoreVertical class="h-4 w-4" />
									</button>
									<ul
										tabindex="0"
										class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-100 mt-1 w-48 rounded-xl border p-2 shadow-xl">
										<li
											class="menu-title text-text-muted px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
											Estado
										</li>
										<li>
											<a @click="setBookingStatus(booking.booking_id, 'confirmed')">
												<CheckCircle2 class="text-info h-4 w-4" />
												Confirmar
											</a>
										</li>
										<li>
											<a @click="setBookingStatus(booking.booking_id, 'completed')">
												<CheckCircle2 class="text-success h-4 w-4" />
												Finalizar
											</a>
										</li>
										<li>
											<a @click="setBookingStatus(booking.booking_id, 'cancelled')">
												<XCircle class="text-error h-4 w-4" />
												Cancelar
											</a>
										</li>
										<div class="divider my-1 opacity-50"></div>
										<li>
											<a @click="openEditModal(booking)" class="font-medium">
												<Pencil class="h-4 w-4" />
												Editar
											</a>
										</li>
										<li>
											<a
												@click="confirmDelete(booking.booking_id)"
												class="text-error hover:bg-error/10 font-medium">
												<Trash2 class="h-4 w-4" />
												Eliminar
											</a>
										</li>
									</ul>
								</div>
							</div>

							<div class="relative z-10 mb-3">
								<h3 class="flex items-center gap-2 text-lg leading-tight font-bold">
									{{ booking.client?.name }} {{ booking.client?.surname }}
								</h3>
								<div class="mt-0.5 flex items-center gap-1 text-sm font-medium opacity-80">
									<Scissors class="h-3.5 w-3.5" v-if="booking.item_type === 'service'" />
									<span class="text-[11px] font-bold tracking-wider uppercase">
										{{ booking.item_type === 'service' ? 'Servicio/Paquete' : 'Otro' }} ID:
									</span>
									<span class="max-w-[150px] truncate">{{ booking.item_id.split('-')[0] }}...</span>
								</div>
							</div>

							<div
								class="relative z-10 flex items-center justify-between border-t border-black/10 pt-2 text-xs font-medium opacity-90">
								<span class="flex items-center gap-1">
									<Clock class="h-3.5 w-3.5" />
									{{ booking.duration }} min
								</span>
								<span v-if="booking.notes" class="max-w-[200px] truncate italic">
									"{{ booking.notes }}"
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div v-else class="flex flex-1 flex-col items-center justify-center p-6 text-center opacity-60">
				<CalendarDays class="text-border-strong mb-4 h-16 w-16" />
				<h3 class="mb-1 text-lg font-bold">Sin Citas Programadas</h3>
				<p class="mb-6 max-w-sm text-sm font-medium">
					No tienes citas registradas para este periodo en la agenda.
				</p>
				<button
					class="btn bg-text-primary text-bg-card hover:bg-text-secondary h-11 flex items-center gap-2 rounded-xl border-none px-6 font-bold shadow-sm"
					@click="openCreateModal">
					<Plus class="h-4 w-4" />
					Agendar Primera Cita
				</button>
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
