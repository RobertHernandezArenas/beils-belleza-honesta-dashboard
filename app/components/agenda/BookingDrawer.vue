<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { Search, ShieldCheck, Clock, Scissors, Package, CheckCircle2, History, Plus, Trash2, Ticket, Gift, Package as PackageIcon, X } from 'lucide-vue-next'
import { useAgendaStore } from '~/stores/useAgendaStore'

interface ClientItem {
    user_id: string
    name: string
    surname: string
    phone: string
    [key: string]: any
}

interface StaffItem {
    user_id: string
    name: string
    surname: string
    [key: string]: any
}

interface BookingItemData {
    item_type: string
    item_id: string
    name: string
    duration: number
}

const store = useAgendaStore()
const { isBookingDrawerOpen, selectedBooking, prefillDate, prefillTime, prefillClientId } = storeToRefs(store)

const emit = defineEmits(['refresh', 'toast', 'delete'])

// Fetch Data for Dropdowns
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

const queryClient = useQueryClient()
const activeTab = ref<'SERVICE' | 'PACK' | 'BONUS' | 'GIFTCARD'>('SERVICE')
const localError = ref('')
const showLocalError = ref(false)

// Search and selection states
const clientSearch = ref('')
const isClientDropdownOpen = ref(false)

const itemSearch = ref('')
const isItemDropdownOpen = ref(false)

const getLocalDateString = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

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

// Auto-fill staff
watch(staff, (newStaff) => {
    if (newStaff && !form.staff_id) {
        const firstAdmin = newStaff.find(s => s.role === 'ADMIN')
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

const filteredItems = computed(() => {
    const q = itemSearch.value.toLowerCase().trim()
    let source: any[] = []
    
    if (activeTab.value === 'SERVICE') source = services.value || []
    else if (activeTab.value === 'PACK') source = packs.value || []
    else if (activeTab.value === 'BONUS') {
        source = clientWallet.bonuses.map(cb => ({
            bonus_id: cb.client_bonus_id,
            name: `Bono: ${cb.bonus?.name} (Quedan ${cb.remaining_sessions})`,
            duration: cb.bonus?.service?.duration || 0,
            is_client_bonus: true
        }))
    }
    else if (activeTab.value === 'GIFTCARD') {
        source = clientWallet.giftcards.map(g => ({
            giftcard_id: g.giftcard_id,
            name: `Tarjeta Regalo: ${g.code} (Saldo: ${g.current_balance}€)`,
            duration: 0,
            is_giftcard_usage: true,
            code: g.code
        }))
    }
    
    if (!q) return source.slice(0, 10)
    
    return source.filter(item => 
        item.name?.toLowerCase().includes(q) || 
        item.code?.toLowerCase().includes(q)
    ).slice(0, 15)
})

const filteredClients = computed(() => {
    if (!clients.value) return []
    const q = clientSearch.value.toLowerCase().trim()
    if (!q) return (clients.value as any[]).slice(0, 10)
    return (clients.value as any[]).filter((c) => {
        const fullName = `${c.name} ${c.surname || ''}`.toLowerCase()
        return fullName.includes(q) || c.phone?.includes(q)
    })
})

const addItem = (item: any) => {
    const id = item.service_id || item.pack_id || item.bonus_id || item.giftcard_id
    form.items.push({
        item_type: activeTab.value,
        item_id: id,
        name: item.name,
        duration: Number(item.duration || 0)
    })
    itemSearch.value = ''
    isItemDropdownOpen.value = false
    updateDuration()
}

const removeItem = (index: number) => {
    form.items.splice(index, 1)
    updateDuration()
}

const updateDuration = () => {
    form.duration = form.items.reduce((acc, item) => acc + item.duration, 0)
}

const selectClient = (client: ClientItem) => {
    form.client_id = client.user_id
    clientSearch.value = `${client.name} ${client.surname || ''}`.trim()
    isClientDropdownOpen.value = false
}

// Watch pinia state to reset form
watch(isBookingDrawerOpen, (isOpen) => {
    if (isOpen) {
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
        
        if (form.client_id && clients.value) {
            const c = clients.value.find((x: any) => x.user_id === form.client_id)
            if (c) clientSearch.value = `${c.name} ${c.surname || ''}`.trim()
        } else {
            clientSearch.value = ''
        }
    }
})

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

const closeDropdowns = () => {
    isClientDropdownOpen.value = false
    isItemDropdownOpen.value = false
}

const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)
</script>

<template>
    <!-- Overlay -->
    <Transition
        enter-active-class="transition-opacity ease-linear duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity ease-linear duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="isBookingDrawerOpen" class="fixed inset-0 z-100 bg-text-secondary/20 backdrop-blur-sm" @click="store.closeBookingDrawer()"></div>
    </Transition>

    <!-- Drawer -->
    <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transform transition ease-in duration-300"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full">
        <div v-if="isBookingDrawerOpen" class="fixed inset-y-0 right-0 z-110 w-full max-w-md bg-bg-app shadow-2xl flex flex-col border-l border-border-subtle" @click="closeDropdowns">
            
            <!-- Header -->
            <div class="border-border-subtle shrink-0 border-b bg-bg-card/90 px-6 py-5 flex items-center justify-between backdrop-blur-md">
                <h2 class="text-xl font-black uppercase tracking-wider text-text-primary">
                    {{ selectedBooking ? 'Editar Cita' : 'Nueva Cita' }}
                </h2>
                <div class="flex items-center gap-2">
                    <button v-if="selectedBooking" type="button" class="btn btn-sm btn-circle btn-ghost text-error" @click="emit('delete', selectedBooking.booking_id)">
                        <Trash2 class="h-4 w-4" />
                    </button>
                    <button type="button" class="btn btn-sm btn-circle btn-ghost text-text-muted" @click="store.closeBookingDrawer()">
                        <X class="h-5 w-5" />
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
                <form id="drawerBookingForm" @submit.prevent="saveBooking" class="flex flex-col gap-6" @click.stop>
                    
                    <!-- Status -->
                    <div v-if="selectedBooking" class="form-control">
                        <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Estado</span></label>
                        <select
                            v-model="form.status"
                            class="select bg-bg-card border-border-default focus:border-primary/50 w-full rounded-xl shadow-sm text-xs font-bold">
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="CONFIRMADA">CONFIRMADA</option>
                            <option value="CANCELADA">CANCELADA</option>
                            <option value="COMPLETADA">COMPLETADA</option>
                            <option value="AUSENTE">AUSENTE</option>
                        </select>
                    </div>

                    <!-- Date & Time Row -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-control">
                            <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Fecha *</span></label>
                            <input v-model="form.booking_date" type="date" required class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl px-4 text-xs font-bold shadow-sm outline-none" />
                        </div>
                        <div class="form-control">
                            <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Hora *</span></label>
                            <input v-model="form.start_time" type="time" required class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl px-4 text-xs font-bold shadow-sm outline-none" />
                        </div>
                    </div>

                    <!-- Client Selection -->
                    <div class="form-control">
                        <label class="label pb-1"><span class="label-text text-primary text-[10px] font-bold uppercase tracking-widest">Cliente *</span></label>
                        <div class="relative">
                            <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <input v-model="clientSearch" type="text" required placeholder="Buscar cliente..." autocomplete="off"
                                class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none"
                                @focus="isClientDropdownOpen = true" 
                                @keydown.esc="isClientDropdownOpen = false" />
                            
                            <!-- Dropdown -->
                            <div v-show="isClientDropdownOpen" class="bg-bg-card border-border-default absolute z-50 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                                <button v-for="c in filteredClients" :key="c.user_id"
                                    type="button" class="hover:bg-bg-muted flex w-full flex-col px-4 py-3 text-left transition-colors border-b border-border-subtle last:border-none"
                                    @mousedown="selectClient(c)">
                                    <span class="text-xs font-bold text-text-primary">{{ c.name }} {{ c.surname }}</span>
                                    <span class="text-text-muted text-[10px]">{{ c.phone }}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Client Wallet Indicator -->
                    <div v-if="form.client_id && (!clientWallet.isLoading) && (clientWallet.bonuses.length > 0 || clientWallet.giftcards.length > 0)" class="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-[-10px]">
                        <h4 class="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">Disponibles del Cliente</h4>
                        <div class="flex flex-col gap-2">
                            <div v-for="b in clientWallet.bonuses.filter(b => b.remaining_sessions > 0)" :key="b.client_bonus_id" class="flex items-center gap-2 text-[10px] font-bold bg-white/50 px-2 py-1 rounded border border-primary/10">
                                <Ticket class="h-3 w-3 text-primary" />
                                <span>{{ b.bonus?.name || 'Bono' }} (Quedan {{ b.remaining_sessions }})</span>
                            </div>
                            <div v-for="g in clientWallet.giftcards" :key="g.giftcard_id" class="flex items-center gap-2 text-[10px] font-bold bg-white/50 px-2 py-1 rounded border border-secondary/10">
                                <PackageIcon class="h-3 w-3 text-secondary" />
                                <span>Tarjeta {{ g.code }} ({{ formatCurrency(g.current_balance) }})</span>
                            </div>
                        </div>
                    </div>

                    <!-- Professional -->
                    <div class="form-control">
                        <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Profesional</span></label>
                        <select v-model="form.staff_id" class="select bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl px-4 text-xs font-bold shadow-sm outline-none">
                            <option value="">-- Sin asignar --</option>
                            <option v-for="user in staff?.filter(s => s.role === 'ADMIN' || s.user_id === form.staff_id)" :key="user.user_id" :value="user.user_id">{{ user.name }} {{ user.surname }}</option>
                        </select>
                    </div>

                    <div class="divider my-0 opacity-50"></div>

                    <!-- Services/Items -->
                    <div class="flex flex-col gap-3">
                        <div class="flex justify-between items-end">
                            <span class="text-primary text-[10px] font-bold uppercase tracking-widest">Servicios/Packs *</span>
                            <span class="text-text-muted text-[10px] font-bold tabular-nums">{{ form.duration }} min total</span>
                        </div>
                        
                        <!-- Categories Tabs -->
                        <div class="flex w-full bg-bg-muted/50 p-1 rounded-lg border border-border-subtle">
                            <button v-for="t in ['SERVICE', 'BONUS', 'PACK', 'GIFTCARD']" :key="t" 
                                type="button"
                                class="flex-1 py-1.5 text-[9px] font-black uppercase rounded-md transition-all"
                                :class="activeTab === t ? 'bg-bg-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'"
                                @click="activeTab = t as any">
                                {{ t === 'SERVICE' ? 'SERV.' : t === 'BONUS' ? 'BONOS' : t === 'PACK' ? 'PACKS' : 'TARJ.' }}
                            </button>
                        </div>

                        <!-- Item Search -->
                        <div class="relative z-40">
                            <Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <input v-model="itemSearch" type="text" placeholder="Añadir..." 
                                class="input bg-bg-card border-border-default focus:border-primary/50 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none"
                                @focus="isItemDropdownOpen = true" 
                                @keydown.esc="isItemDropdownOpen = false" />
                            
                            <div v-show="isItemDropdownOpen" class="bg-bg-card border-border-default absolute z-50 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border shadow-xl">
                                <button v-for="it in filteredItems" :key="it.service_id || it.pack_id || it.bonus_id || it.giftcard_id"
                                    type="button" class="hover:bg-bg-muted flex w-full items-center justify-between px-4 py-3 text-left border-b border-border-subtle last:border-none"
                                    @mousedown="addItem(it)">
                                    <div class="flex flex-col">
                                        <span class="text-xs font-bold text-text-primary">{{ it.name }}</span>
                                        <span class="text-text-muted text-[10px] uppercase font-bold mt-0.5">{{ it.duration || 0 }} min</span>
                                    </div>
                                    <Plus class="h-4 w-4 text-primary" />
                                </button>
                                <div v-if="filteredItems.length === 0" class="px-4 py-4 text-center text-xs text-text-muted italic">No hay resultados</div>
                            </div>
                        </div>

                        <!-- Selected Items List -->
                        <div class="flex flex-col gap-2 mt-2">
                            <div v-for="(it, idx) in form.items" :key="idx" 
                                class="bg-bg-card border border-border-default p-3 rounded-xl flex items-center justify-between group shadow-sm transition-all hover:border-primary/30">
                                <div class="flex items-center gap-3">
                                    <Scissors v-if="it.item_type === 'SERVICE'" class="h-4 w-4 text-primary" />
                                    <Ticket v-else-if="it.item_type === 'BONUS'" class="h-4 w-4 text-info" />
                                    <Package v-else-if="it.item_type === 'PACK'" class="h-4 w-4 text-success" />
                                    <Gift v-else class="h-4 w-4 text-warning" />
                                    
                                    <div class="flex flex-col">
                                        <span class="text-xs font-bold text-text-primary uppercase tracking-tight">{{ it.name }}</span>
                                        <span class="text-[10px] text-text-muted font-bold tabular-nums">{{ it.duration }} min</span>
                                    </div>
                                </div>
                                <button type="button" @click="removeItem(idx)" class="text-text-muted hover:text-error transition-colors p-1 opacity-50 group-hover:opacity-100">
                                    <Trash2 class="h-4 w-4" />
                                </button>
                            </div>
                            <div v-if="form.items.length === 0" class="text-xs text-text-muted italic p-2 opacity-60 border border-dashed border-border-subtle rounded-xl text-center py-6">
                                Ningún servicio seleccionado
                            </div>
                        </div>
                    </div>

                    <div class="divider my-0 opacity-50"></div>

                    <!-- Notes -->
                    <div class="form-control pb-8">
                        <label class="label pb-1"><span class="label-text text-text-muted text-[10px] font-bold uppercase tracking-widest">Notas (Opcional)</span></label>
                        <textarea v-model="form.notes" rows="2" placeholder="Detalles de la reserva..."
                            class="textarea bg-bg-card border-border-default focus:border-primary/50 w-full rounded-xl px-4 py-3 text-xs font-medium shadow-sm outline-none"></textarea>
                    </div>
                </form>
            </div>

            <!-- Footer -->
            <div class="border-border-subtle shrink-0 border-t bg-bg-card/90 px-6 py-5 backdrop-blur-md space-y-3">
                <NuxtLink 
                    v-if="selectedBooking && selectedBooking.booking_id && form.status !== 'COMPLETADA'" 
                    :to="`/tpv?booking_id=${selectedBooking.booking_id}`" 
                    class="btn btn-primary btn-outline w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-sm"
                    @click="store.closeBookingDrawer()">
                    Cobrar en TPV
                </NuxtLink>
                <button type="submit" form="drawerBookingForm" class="btn text-bg-card hover:bg-text-secondary/90 bg-text-secondary w-full h-12 rounded-xl border-none font-black uppercase tracking-widest shadow-lg" :disabled="isSaving">
                    <span v-if="isSaving" class="loading loading-spinner"></span>
                    <span v-else>{{ selectedBooking ? 'Guardar Cambios' : 'Confirmar Reserva' }}</span>
                </button>
                <div v-show="showLocalError" class="mt-3 text-center">
                    <span class="text-[10px] font-bold text-error uppercase">{{ localError }}</span>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 99px;
}
</style>
