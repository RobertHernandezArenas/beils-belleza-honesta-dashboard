<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import {
    CalendarDays,
    Search,
    ChevronLeft,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-vue-next'
import BookingDrawer from '~/components/agenda/BookingDrawer.vue'
import DaySummaryModal from '~/components/agenda/DaySummaryModal.vue'
import GenericDeleteModal from '~/components/shared/GenericDeleteModal.vue'

// Import Agenda Views
import AgendaDayView from '~/components/agenda/views/AgendaDayView.vue'
import AgendaGridView from '~/components/agenda/views/AgendaGridView.vue'
import AgendaMonthView from '~/components/agenda/views/AgendaMonthView.vue'
import AgendaYearView from '~/components/agenda/views/AgendaYearView.vue'
import AgendaListView from '~/components/agenda/views/AgendaListView.vue'
import AgendaSidebar from '~/components/agenda/AgendaSidebar.vue'

import { useAgenda } from '~/composables/useAgenda'
import gsap from 'gsap'

definePageMeta({ layout: 'default' })
useHead({ title: 'Agenda y Reservas | Beils' })

const queryClient = useQueryClient()

const {
    store,
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

const daySummaryModalRef = ref<InstanceType<typeof DaySummaryModal> | null>(null)

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
    <div class="bg-bg-app text-text-primary flex h-screen min-h-screen w-full flex-col overflow-hidden p-0 transition-colors duration-700">
        
        <!-- Header Strip -->
        <div class="h-16 shrink-0 border-b border-border-subtle bg-bg-card/90 backdrop-blur-md px-6 flex items-center justify-between z-20 relative">
            <div class="flex items-center gap-4">
                <button 
                    @click="store.showSidebar = !store.showSidebar"
                    class="p-2 hover:bg-bg-muted rounded-xl transition-colors text-text-secondary hidden lg:block">
                    <PanelLeftClose v-if="store.showSidebar" class="h-5 w-5" />
                    <PanelLeftOpen v-else class="h-5 w-5" />
                </button>
                <div class="flex items-center gap-3">
                    <div class="bg-text-primary text-bg-app flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
                        <CalendarDays class="h-4 w-4" />
                    </div>
                    <h1 class="text-lg font-black tracking-wider uppercase m-0">Agenda</h1>
                </div>
            </div>

            <!-- View Switcher -->
            <div class="hidden md:flex items-center bg-bg-muted/50 p-1 rounded-xl border border-border-subtle">
                <button
                    v-for="mode in ['day', 'week', 'month']" 
                    :key="mode"
                    @click="store.setViewMode(mode as any)"
                    class="h-8 px-4 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all"
                    :class="[
                        viewMode === mode 
                            ? 'bg-bg-card text-text-primary shadow-sm' 
                            : 'text-text-muted hover:text-text-primary hover:bg-black/5'
                    ]">
                    {{ mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes' }}
                </button>
            </div>
            
            <div class="flex items-center gap-3 sm:gap-4">
                <!-- Navigation Arrows -->
                <div class="flex items-center bg-bg-muted/30 rounded-xl p-0.5 border border-border-subtle">
                    <button @click="handleDateChange('prev')" class="p-1.5 hover:bg-bg-card hover:shadow-sm rounded-lg transition-all text-text-secondary">
                        <ChevronLeft class="h-4 w-4" />
                    </button>
                    <button @click="handleDateChange('next')" class="p-1.5 hover:bg-bg-card hover:shadow-sm rounded-lg transition-all text-text-secondary">
                        <ChevronRight class="h-4 w-4" />
                    </button>
                </div>

                <!-- Current Date Display -->
                <div class="text-right hidden sm:block">
                    <ClientOnly>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">{{ selectedDate.getFullYear() }}</p>
                        <p class="text-xs font-black uppercase text-text-primary">{{ formatDayDate(selectedDate) }}</p>
                    </ClientOnly>
                </div>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="flex flex-1 overflow-hidden relative">
            
            <!-- Sidebar -->
            <ClientOnly>
                <AgendaSidebar v-show="store.showSidebar" />
            </ClientOnly>

            <!-- Agenda Viewport -->
            <div 
                ref="viewContainer" 
                class="flex-1 overflow-hidden flex flex-col relative bg-bg-card/40">
                
                <!-- Overlay Loader when initially pending -->
                <div v-if="isPending && (!displayBookings || displayBookings.length === 0)" class="absolute inset-0 z-50 flex items-center justify-center bg-bg-card/40 backdrop-blur-sm">
                    <div class="loading loading-spinner text-primary loading-lg"></div>
                </div>

                <!-- Dynamic View Component -->
                <div class="flex-1 overflow-hidden flex flex-col relative" :class="{ 'opacity-50 pointer-events-none': isPending && displayBookings && displayBookings.length > 0 }">
                    <ClientOnly>
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
                            @edit="(booking: any) => store.openBookingDrawer(booking)"
                            @delete="confirmDelete"
                            @status="setBookingStatus"
                            @create="(d: Date, t: string) => store.openBookingDrawer(null, d, t)"
                            @selectDate="(d: Date) => { store.setDate(d); store.setViewMode('day') }"
                            @viewDayDetails="(d: Date, bs: any[]) => daySummaryModalRef?.openModal(d, bs)"
                        />
                    </ClientOnly>
                </div>
            </div>
        </div>

        <!-- Toast Provider -->
        <div v-if="showToast" class="toast toast-end toast-bottom z-9999">
            <div
                :class="[
                    'alert rounded-2xl border-none text-white shadow-xl',
                    toastType === 'success' ? 'bg-success' : 'bg-error',
                ]">
                <span class="font-medium text-sm">{{ toastMessage }}</span>
            </div>
        </div>

        <!-- Booking Drawer (Replaces BookingFormModal and BookingDetailsModal) -->
        <BookingDrawer
            @refresh="queryClient.invalidateQueries({ queryKey: ['bookings'] })"
            @toast="displayToast" 
            @delete="confirmDelete" />

        <!-- Day Summary Modal -->
        <DaySummaryModal 
            ref="daySummaryModalRef"
            @edit="(booking) => store.openBookingDrawer(booking)"
            @create="(d: Date, t: string) => store.openBookingDrawer(null, d, t)" />

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
