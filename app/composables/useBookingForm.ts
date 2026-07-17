import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { useAgendaStore } from '~/stores/useAgendaStore'

export interface ClientItem {
    user_id: string
    name: string
    surname: string
    phone: string
    [key: string]: any
}

export interface StaffItem {
    user_id: string
    name: string
    surname: string
    role: string
    [key: string]: any
}

export interface BookingItemData {
    item_type: string
    item_id: string
    name: string
    duration: number
    [key: string]: any
}

export function useBookingForm(emit: (event: 'toast' | 'refresh' | 'delete', ...args: any[]) => void) {
    const store = useAgendaStore()
    const { selectedBooking, prefillDate, prefillTime, prefillClientId } = storeToRefs(store)
    const queryClient = useQueryClient()

    // Form State
    const form = reactive({
        client_id: '',
        staff_id: '',
        items: [] as BookingItemData[],
        status: 'PENDIENTE',
        booking_date: getLocalDateString(new Date()),
        start_time: '10:00',
        duration: 0,
        notes: '',
    })

    const localError = ref('')
    const showLocalError = ref(false)

    // Data Fetching
    const { data: clients } = useQuery({
        queryKey: ['clients-agenda'],
        queryFn: async () => {
            const res = await $fetch<any>('/api/clients', { query: { limit: 500 } })
            return res?.data || []
        },
    })

    const { data: staff } = useQuery({
        queryKey: ['staff-agenda'],
        queryFn: () => $fetch<StaffItem[]>('/api/users', {
            query: { roles: 'ADMIN,STAFF' }
        }),
    })

    const { data: services } = useQuery({
        queryKey: ['services-agenda'],
        queryFn: () => $fetch<any[]>('/api/services'),
    })

    const { data: packs } = useQuery({
        queryKey: ['packs-agenda'],
        queryFn: () => $fetch<any[]>('/api/catalog/packs'),
    })

    const { data: bonuses } = useQuery({
        queryKey: ['bonuses-agenda'],
        queryFn: () => $fetch<any[]>('/api/marketing/bonuses'),
    })

    const { data: giftcards } = useQuery({
        queryKey: ['giftcards-agenda'],
        queryFn: () => $fetch<any[]>('/api/marketing/giftcards'),
    })

    // Auto-fill staff
    watch(staff, (newStaff) => {
        if (newStaff && !form.staff_id) {
            const firstAdmin = newStaff.find((s: StaffItem) => s.role === 'ADMIN')
            if (firstAdmin) {
                form.staff_id = firstAdmin.user_id
            }
        }
    }, { immediate: true })

    // Client Wallet State
    const clientWallet = reactive({
        bonuses: [] as any[],
        giftcards: [] as any[],
        isLoading: false
    })

    watch(() => form.client_id, async (newClientId) => {
        if (!newClientId) {
            clientWallet.bonuses = []
            clientWallet.giftcards = []
            return
        }
        
        clientWallet.isLoading = true
        try {
            const [b, g] = await Promise.all([
                $fetch(`/api/clients/${newClientId}/bonuses`),
                $fetch(`/api/clients/${newClientId}/giftcards`)
            ])
            clientWallet.bonuses = (b as any[]) || []
            clientWallet.giftcards = (g as any[]) || []
        } catch (error) {
            console.error('Error fetching client wallet:', error)
        } finally {
            clientWallet.isLoading = false
        }
    })

    // Mutation
    const { mutate: performSave, isPending: isSaving } = useMutation({
        mutationFn: async (payload: any) => {
            if (selectedBooking.value) {
                return await $fetch(`/api/agenda/bookings/${selectedBooking.value.booking_id}`, {
                    method: 'PUT',
                    body: payload,
                })
            } else {
                return await $fetch(`/api/agenda/bookings`, {
                    method: 'POST',
                    body: payload,
                })
            }
        },
        onSuccess: () => {
            const msg = selectedBooking.value ? 'Cita actualizada' : 'Cita programada'
            emit('toast', msg, 'success')
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            emit('refresh')
            store.closeBookingDrawer()
        },
        onError: (error: any) => {
            const serverMsg = error.data?.statusMessage || error.message
            localError.value = serverMsg || 'Error al guardar la cita'
            showLocalError.value = true
            setTimeout(() => { showLocalError.value = false }, 5000)
            emit('toast', localError.value, 'error')
        },
    })

    const saveBooking = () => {
        if (!form.client_id) return emit('toast', 'Selecciona un cliente', 'error')
        if (form.items.length === 0) return emit('toast', 'Añade al menos un servicio', 'error')
        
        performSave({
            ...form,
            duration: Number(form.duration),
        })
    }

    const resetForm = () => {
        if (selectedBooking.value) {
            const b = selectedBooking.value
            form.client_id = b.client_id || ''
            form.staff_id = b.staff_id || ''
            form.status = (b.status || 'PENDIENTE').toUpperCase()
            form.booking_date = getLocalDateString(new Date(b.booking_date))
            form.start_time = b.start_time || '10:00'
            form.duration = b.duration || 0
            form.notes = b.notes || ''
            
            if (b.booking_items) {
                form.items = b.booking_items.map((it: any) => ({
                    item_type: it.item_type,
                    item_id: it.item_id,
                    name: it.name,
                    duration: it.duration
                }))
            } else {
                form.items = []
            }
        } else {
            form.client_id = prefillClientId.value || ''
            form.items = []
            form.status = 'PENDIENTE'
            form.booking_date = getLocalDateString(prefillDate.value || new Date())
            form.start_time = prefillTime.value || '10:00'
            form.duration = 0
            form.notes = ''
        }
    }

    function getLocalDateString(d: Date) {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 10);
    }

    const updateDuration = () => {
        form.duration = form.items.reduce((acc, item) => acc + item.duration, 0)
    }

    return {
        form,
        clients,
        staff,
        services,
        packs,
        bonuses,
        giftcards,
        clientWallet,
        isSaving,
        saveBooking,
        resetForm,
        localError,
        showLocalError,
        updateDuration,
    }
}
