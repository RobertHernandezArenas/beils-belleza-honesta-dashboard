import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { useAgendaStore } from '~/stores/useAgendaStore'
import type { BookingItem, CatalogItem, FetchError } from '~~/shared/types/domain'
import { getEmailIneligibility } from '~~/shared/utils/email-eligibility'

export interface ClientItem {
    user_id: string
    name: string
    surname: string
    phone: string
    email?: string | null
    [key: string]: unknown
}

export interface StaffItem {
    user_id: string
    name: string
    surname: string
    role: string
    [key: string]: unknown
}

export interface BookingItemData {
    item_type: string
    item_id: string
    name: string
    duration: number
    [key: string]: unknown
}

export function useBookingForm(emit: (event: 'toast' | 'refresh' | 'delete', ...args: unknown[]) => void) {
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

    // Confirmation email (create only). Unchecked automatically when the client can't receive it.
    const notifyEmail = ref(true)

    const localError = ref('')
    const showLocalError = ref(false)

    // Data Fetching
    const { data: clients } = useQuery({
        queryKey: ['clients-agenda'],
        queryFn: async () => {
            const res = await $fetch<{ data: ClientItem[] }>('/api/clients', { query: { limit: 500 } })
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
        queryFn: () => $fetch<CatalogItem[]>('/api/services'),
    })

    const { data: notificationChannels } = useQuery({
        queryKey: ['notification-channels'],
        queryFn: () => $fetch<{ email: boolean }>('/api/notifications/status'),
    })

    const selectedClient = computed(() => clients.value?.find((c: ClientItem) => c.user_id === form.client_id) || null)

    // Why the confirmation email can't be sent (null = it can). No client selected = walk-in fallback.
    const emailBlockedReason = computed(() =>
        getEmailIneligibility({ mailConfigured: !!notificationChannels.value?.email, client: selectedClient.value }),
    )

    const sendConfirmationEmail = computed({
        get: () => notifyEmail.value && !emailBlockedReason.value,
        set: (value: boolean) => { notifyEmail.value = value },
    })

    // Sellable bonos/packages catalog (to sell a bono within an appointment)
    const { data: catalogPackages } = useQuery({
        queryKey: ['packages-agenda'],
        queryFn: () => $fetch<CatalogItem[]>('/api/packages'),
    })

    const { data: clientPackages } = useQuery({
        queryKey: ['client-packages-agenda', computed(() => form.client_id)],
        queryFn: async () => {
            if (!form.client_id) return []
            return await $fetch<CatalogItem[]>(`/api/clients/${form.client_id}/packages`)
        },
        enabled: computed(() => !!form.client_id)
    })
    // Auto-fill staff (Alexandra Victoria as default) — only runs once at mount
    watch(staff, (newStaff) => {
        if (newStaff && !form.staff_id) {
            const alexandra = newStaff.find((s: StaffItem) => s.name === 'Alexandra' && s.surname === 'Victoria')
            if (alexandra) {
                form.staff_id = alexandra.user_id
            } else if (newStaff.length > 0) {
                form.staff_id = newStaff[0]?.user_id || ''
            }
        }
    }, { immediate: true })

    // Reset form every time the drawer opens, reading all prefill values at once
    // flush:'post' ensures all store mutations from openBookingDrawer() are settled
    watch(
        () => store.isBookingDrawerOpen,
        (isOpen) => {
            if (isOpen) resetForm()
        },
        { flush: 'post' }
    )

    // Mutation
    const { mutate: performSave, isPending: isSaving } = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
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
        onSuccess: (result) => {
            const emailStatus = (result as { notification?: { email?: string } } | undefined)?.notification?.email
            let msg = selectedBooking.value ? 'Cita actualizada' : 'Cita programada'
            if (emailStatus === 'sent') msg += ' y confirmación enviada por email'
            else if (emailStatus === 'failed') msg += ', pero no se pudo enviar el email de confirmación'
            emit('toast', msg, 'success')
            queryClient.invalidateQueries({ queryKey: ['bookings'] })
            emit('refresh')
            store.closeBookingDrawer()
        },
        onError: (error: FetchError) => {
            const serverMsg = error.data?.statusMessage || error.message
            localError.value = serverMsg || 'Error al guardar la cita'
            showLocalError.value = true
            setTimeout(() => { showLocalError.value = false }, 5000)
            emit('toast', localError.value, 'error')
        },
    })

    const saveBooking = () => {
        // Decided before the walk-in fallback below, so the fallback client is never emailed
        const notify = !!form.client_id && sendConfirmationEmail.value
        if (!form.client_id && clients.value?.length) {
            const fallback = clients.value.find((c: ClientItem) => 
                c.name?.toLowerCase().includes('no registrado') || 
                c.name?.toLowerCase().includes('mostrador')
            ) || clients.value[0]
            if (fallback) form.client_id = fallback.user_id
        }
        if (!form.client_id) return emit('toast', 'Selecciona un cliente', 'error')
        if (form.items.length === 0) return emit('toast', 'Añade al menos un servicio', 'error')
        
        // Date/Time validation for NEW bookings has been removed to allow scheduling past bookings        
        proceedSaveBooking(notify)
    }

    const proceedSaveBooking = (notifyEmailOnCreate = false) => {
        performSave({
            ...form,
            duration: Number(form.duration),
            ...(selectedBooking.value ? {} : { notify_email: notifyEmailOnCreate }),
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
                form.items = b.booking_items.map((it: BookingItem) => ({
                    item_type: it.item_type,
                    item_id: it.item_id,
                    name: it.name,
                    duration: it.duration,
                    remaining_sessions: it.remaining_sessions
                }))
            } else {
                form.items = []
            }
        } else {
            // New booking: preselect the client only when opened from a client profile.
            // Otherwise leave the field empty (the "no registrado / mostrador" walk-in
            // fallback is still applied at save time in saveBooking()).
            form.client_id = prefillClientId.value || ''
            form.items = []
            form.status = 'PENDIENTE'
            form.booking_date = getLocalDateString(prefillDate.value || new Date())
            form.start_time = prefillTime.value || '10:00'
            form.duration = 0
            form.notes = ''
            notifyEmail.value = true
            
            // Re-apply staff auto-fill if resetting a new booking
            if (staff.value) {
                const alexandra = staff.value.find((s: StaffItem) => s.name === 'Alexandra' && s.surname === 'Victoria')
                form.staff_id = alexandra ? alexandra.user_id : (staff.value[0]?.user_id || '')
            }
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
        clientPackages,
        catalogPackages,
        isSaving,
        saveBooking,
        proceedSaveBooking,
        resetForm,
        localError,
        showLocalError,
        updateDuration,
        sendConfirmationEmail,
        emailBlockedReason,
    }
}
