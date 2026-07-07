<script setup lang="ts">
	import { useQueryClient } from '@tanstack/vue-query'
	import {
		CalendarDays,
		History,
		Search,
		Plus,
		ChevronLeft,
		ChevronRight,
	} from 'lucide-vue-next'
	import BookingFormModal from '~/components/agenda/BookingFormModal.vue'
	import BookingDetailsModal from '~/components/agenda/BookingDetailsModal.vue'
	import GenericDeleteModal from '~/components/shared/GenericDeleteModal.vue'

	// Import Agenda Views
	import AgendaDayView from '~/components/agenda/views/AgendaDayView.vue'
	import AgendaGridView from '~/components/agenda/views/AgendaGridView.vue'
	import AgendaMonthView from '~/components/agenda/views/AgendaMonthView.vue'
	import AgendaYearView from '~/components/agenda/views/AgendaYearView.vue'
	import AgendaListView from '~/components/agenda/views/AgendaListView.vue'

	import { useAgenda } from '~/composables/useAgenda'
	import gsap from 'gsap'

	definePageMeta({ layout: 'default' })
	useHead({ title: 'Agenda y Reservas | Beils' })

	const queryClient = useQueryClient()
	const modalRef = ref<InstanceType<typeof BookingFormModal> | null>(null)
	const detailsModalRef = ref<InstanceType<typeof BookingDetailsModal> | null>(null)

	const {
		selectedDate,
		viewMode,
		searchQuery,
		deleteModalOpen,
		bookingToDelete,
		toastMessage,
		toastType,
		showToast,
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
	} = useAgenda()

	const openCreateModal = () => {
		modalRef.value?.showModal(null, selectedDate.value)
	}

	const openEditModal = (booking: any) => {
		modalRef.value?.showModal(booking, selectedDate.value)
	}

	const openDetailsModal = (booking: any) => {
		detailsModalRef.value?.open(booking)
	}

	// GSAP Animations
	const viewContainer = ref(null)

	watch(viewMode, () => {
		if (viewContainer.value) {
			gsap.fromTo(viewContainer.value, 
				{ opacity: 0, y: 6 },
				{ opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
			)
		}
	})

	const handleDateChange = (direction: 'next' | 'prev') => {
		if (direction === 'next') nextPeriod()
		else prevPeriod()

		if (viewContainer.value) {
			const xMove = direction === 'next' ? 12 : -12
			gsap.fromTo(viewContainer.value,
				{ x: xMove, opacity: 0 },
				{ x: 0, opacity: 1, duration: 0.28, ease: 'power2.out' }
			)
		}
	}
</script>

<template>
	<div class="bg-bg-app text-text-primary relative flex h-screen min-h-screen w-full flex-col overflow-hidden p-4 lg:p-8 transition-colors duration-700">
		<!-- Background Glows (Subtler for light mode) -->
		<div class="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
		<div class="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>

		<!-- Header -->
		<div class="relative z-10 mb-6 flex shrink-0 flex-col justify-between gap-4 lg:mb-8 lg:flex-row lg:items-center">
			<div class="flex items-center gap-4">
				<div 
					class="bg-text-primary text-bg-app flex h-12 w-12 items-center justify-center rounded-2xl shadow-md">
					<CalendarDays class="h-6 w-6" />
				</div>
				<div>
					<h1 class="text-text-primary mb-0.5 text-2xl font-black tracking-wider uppercase font-sans">
						Agenda y Reservas
					</h1>
					<p class="text-text-muted text-xs font-semibold uppercase tracking-wider">{{ formatDayDate(selectedDate) }}</p>
				</div>
			</div>

			<div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
				<!-- Search -->
				<div class="relative w-full sm:w-3/4 lg:w-64">
					<Search class="text-text-muted absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
					<input
						v-model="searchQuery"
						type="text"
						placeholder="Buscar cita o cliente..."
						class="input bg-white/50 border border-border-default/80 focus:border-primary/50 focus:bg-bg-card h-12 w-full rounded-2xl pr-4 pl-11 text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all placeholder-text-muted/70 focus:ring-0" />
				</div>
				<!-- Add -->
				<button
					class="btn bg-text-primary hover:bg-text-primary/95 text-bg-card flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl border-none px-6 shadow-md transition-all active:scale-[0.98] sm:w-1/4 lg:w-auto"
					@click="openCreateModal">
					<Plus class="h-4.5 w-4.5" />
					<span class="text-xs font-black tracking-widest uppercase">Nueva Cita</span>
				</button>
			</div>
		</div>

		<!-- Toolbar -->
		<div class="relative z-10 mb-5 flex shrink-0 flex-col items-center justify-between gap-4 sm:flex-row">
			<div class="flex w-full flex-col items-center gap-3 lg:flex-row lg:justify-between">
				<!-- Date Navigation -->
				<div class="bg-white/40 border-border-default/85 flex w-full items-center justify-between gap-1 rounded-2xl border p-1 shadow-[0_1px_2px_rgba(0,0,0,0.01)] backdrop-blur-md md:w-auto">
					<button 
						class="text-text-primary hover:bg-bg-muted/40 flex h-9 items-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 md:h-10 md:text-xs"
						@click="setToday">
						<History class="h-3.5 w-3.5" />
						Hoy
					</button>
					<div class="bg-border-default/60 h-4 w-px"></div>
					<div class="flex items-center gap-0.5">
						<button
							class="text-text-muted hover:bg-bg-muted/45 hover:text-text-primary btn btn-square btn-ghost btn-sm h-9 w-9 rounded-xl transition-all active:scale-90 md:h-10 md:w-10 border-none"
							@click="handleDateChange('prev')">
							<ChevronLeft class="h-4.5 w-4.5" />
						</button>
						<button
							class="text-text-muted hover:bg-bg-muted/45 hover:text-text-primary btn btn-square btn-ghost btn-sm h-9 w-9 rounded-xl transition-all active:scale-90 md:h-10 md:w-10 border-none"
							@click="handleDateChange('next')">
							<ChevronRight class="h-4.5 w-4.5" />
						</button>
					</div>
				</div>

				<!-- View Switcher -->
				<div class="bg-white/40 border-border-default/85 custom-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-2xl border p-1 shadow-[0_1px_2px_rgba(0,0,0,0.01)] backdrop-blur-md no-scrollbar md:w-auto">
					<button
						v-for="mode in ['day', 'week', 'month', 'year', 'agenda']" 
						:key="mode"
						@click="viewMode = mode as any"
						class="h-9 shrink-0 rounded-xl px-4 text-[9px] font-extrabold tracking-wider uppercase transition-all duration-300 active:scale-95 md:h-10 md:px-5 md:text-[10px]"
						:class="[
							viewMode === mode 
								? 'bg-text-primary text-bg-card shadow-sm' 
								: 'text-text-muted hover:text-text-primary hover:bg-bg-muted/20'
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
			class="relative bg-bg-card/75 border border-border-default/80 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.02)] backdrop-blur-xl">
			
			<!-- Overlay Loader when initially pending -->
			<div v-if="isPending && (!displayBookings || displayBookings.length === 0)" class="flex flex-1 items-center justify-center bg-bg-card/40">
				<div class="loading loading-spinner text-text-primary loading-lg"></div>
			</div>

			<!-- Dynamic View Component (Always mounted to prevent destruction flicker) -->
			<div v-show="!isPending || (displayBookings && displayBookings.length > 0)" class="flex-1 overflow-hidden flex flex-col relative">
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
					@edit="openDetailsModal"
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

		<!-- Details Modal -->
		<BookingDetailsModal
			ref="detailsModalRef"
			@edit="openEditModal"
			@delete="id => { detailsModalRef?.close(); confirmDelete(id) }" />

		<!-- Confirm Delete Modal -->
		<GenericDeleteModal
			:is-open="deleteModalOpen"
			:item-name="bookingToDelete?.client ? `${bookingToDelete.client.name} ${bookingToDelete.client.surname}` : 'esta cita'"
			:is-deleting="isDeletingBooking"
			custom-title="Eliminar Cita"
			custom-message="¿Estás seguro de que deseas eliminar definitivamente esta cita de la agenda?"
			@close="deleteModalOpen = false"
			@confirm="handleActualDelete" />
	</div>
</template>

<style scoped>
	/* Custom scrollbars inside agenda views */
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.05);
		border-radius: 99px;
	}
</style>
