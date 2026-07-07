import { defineStore } from 'pinia'

export const useAgendaStore = defineStore('agenda', () => {
    // --- State ---
    const selectedDate = ref(new Date())
    const viewMode = ref<'day' | 'week' | 'month' | 'year' | 'agenda' | '4days'>('day')
    const searchQuery = ref('')
    
    // Drawers & Modals
    const isBookingDrawerOpen = ref(false)
    const isBookingDetailsOpen = ref(false)
    
    // Current payload
    const selectedBooking = ref<any | null>(null)
    const prefillDate = ref<Date | null>(null)
    const prefillTime = ref<string | null>(null)

    // Layout flags
    const showSidebar = ref(true)

    // --- Actions ---
    function setDate(date: Date) {
        selectedDate.value = new Date(date)
    }

    function setViewMode(mode: 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days') {
        viewMode.value = mode
    }

    function openBookingDrawer(booking: any = null, defaultDate: Date | null = null, defaultTime: string | null = null) {
        selectedBooking.value = booking
        prefillDate.value = defaultDate
        prefillTime.value = defaultTime
        isBookingDrawerOpen.value = true
    }

    function closeBookingDrawer() {
        isBookingDrawerOpen.value = false
        setTimeout(() => {
            selectedBooking.value = null
            prefillDate.value = null
            prefillTime.value = null
        }, 300) // Clear after animation
    }

    function openBookingDetails(booking: any) {
        selectedBooking.value = booking
        isBookingDetailsOpen.value = true
    }

    function closeBookingDetails() {
        isBookingDetailsOpen.value = false
        setTimeout(() => {
            if (!isBookingDrawerOpen.value) { // Don't clear if transitioning to edit drawer
                selectedBooking.value = null
            }
        }, 300)
    }

    return {
        // State
        selectedDate,
        viewMode,
        searchQuery,
        isBookingDrawerOpen,
        isBookingDetailsOpen,
        selectedBooking,
        prefillDate,
        prefillTime,
        showSidebar,

        // Actions
        setDate,
        setViewMode,
        openBookingDrawer,
        closeBookingDrawer,
        openBookingDetails,
        closeBookingDetails,
    }
})
