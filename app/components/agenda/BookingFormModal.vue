<script setup lang="ts">
	import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
	import { useModalAnimation } from '~/composables/useModalAnimation'
	import { Search, User, ShieldCheck, Calendar, Clock, Scissors, Package, CheckCircle2, History, Pencil, Plus, Trash2, Ticket, Gift } from 'lucide-vue-next'

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

	// Watch for staff loading to auto-assign if still empty (for new bookings or unassigned ones)
	watch(staff, (newStaff) => {
		if (newStaff && !form.staff_id) {
			const firstAdmin = newStaff.find(s => s.role === 'ADMIN')
			if (firstAdmin) {
				form.staff_id = firstAdmin.user_id
			}
		}
	}, { immediate: true })

	const { data: giftcards } = useQuery({
		queryKey: ['giftcards-agenda'],
		queryFn: () => $fetch<any[]>('/api/marketing/giftcards'),
	})

	const queryClient = useQueryClient()
	const modalRef = ref<HTMLDialogElement | null>(null)
	const editingBooking = ref<any | null>(null)
	const activeTab = ref<'SERVICE' | 'PACK' | 'BONUS' | 'GIFTCARD'>('SERVICE')
	const { animateOpen, animateClose } = useModalAnimation()
	const localError = ref('')
	const showLocalError = ref(false)

	const emit = defineEmits(['refresh', 'toast'])

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

	// Filtering for items based on tab and search
	const filteredItems = computed(() => {
		const q = itemSearch.value.toLowerCase().trim()
		let source: any[] = []
		
		if (activeTab.value === 'SERVICE') source = services.value || []
		else if (activeTab.value === 'PACK') source = packs.value || []
		else if (activeTab.value === 'BONUS') source = bonuses.value || []
		else if (activeTab.value === 'GIFTCARD') source = giftcards.value || []
		
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
		
		// Avoid duplicate services if needed, or allow them
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

	const showModal = (booking: any | null, defaultDate: Date, defaultClientId?: string) => {
		editingBooking.value = booking

		// 1. Initial assignment from booking or defaults
		if (booking) {
			form.client_id = booking.client_id || ''
			form.staff_id = booking.staff_id || ''
			form.status = (booking.status || 'PENDIENTE').toUpperCase()
			form.booking_date = getLocalDateString(new Date(booking.booking_date))
			form.start_time = booking.start_time || '10:00'
			form.duration = booking.duration || 0
			form.notes = booking.notes || ''
			
			// Map existing items
			if (booking.booking_items) {
				form.items = booking.booking_items.map((it: any) => ({
					item_type: it.item_type,
					item_id: it.item_id,
					name: it.name,
					duration: it.duration
				}))
			} else if (booking.item_id) {
				form.items = [{
					item_type: booking.item_type || 'SERVICE',
					item_id: booking.item_id,
					name: 'Carga anterior...',
					duration: booking.duration || 0
				}]
			} else {
				form.items = []
			}
		} else {
			form.client_id = defaultClientId || ''
			form.items = []
			form.status = 'PENDIENTE'
			form.booking_date = getLocalDateString(defaultDate)
			form.start_time = '10:00'
			form.duration = 0
			form.notes = ''
		}

		// 2. Logic for Auto-assignment of Professional
		if (!form.staff_id && staff.value) {
			const firstAdmin = staff.value.find(s => s.role === 'ADMIN')
			if (firstAdmin) {
				form.staff_id = firstAdmin.user_id
			}
		}
		
		closeDropdowns()
		itemSearch.value = ''
		
		// Sync client name for display
		if (form.client_id && clients.value) {
			const c = clients.value.find((x: any) => x.user_id === form.client_id)
			if (c) clientSearch.value = `${c.name} ${c.surname || ''}`.trim()
		} else {
			clientSearch.value = ''
		}

		animateOpen(modalRef.value, { staggerChildren: true })
	}

	const closeModal = () => {
		showLocalError.value = false
		localError.value = ''
		animateClose(modalRef.value)
	}

	const { mutate: performSave, isPending: isSaving } = useMutation({
		mutationFn: async (payload: any) => {
			if (editingBooking.value) {
				return await $fetch(`/api/agenda/bookings/${editingBooking.value.booking_id}`, {
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
			const msg = editingBooking.value ? 'Cita actualizada' : 'Cita programada'
			emit('toast', msg, 'success')
			queryClient.invalidateQueries({ queryKey: ['bookings'] })
			emit('refresh')
			closeModal()
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

	const delayedCloseClient = () => {
		setTimeout(() => { isClientDropdownOpen.value = false }, 250)
	}

	const delayedCloseItem = () => {
		setTimeout(() => { isItemDropdownOpen.value = false }, 250)
	}

	const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

	defineExpose({ showModal })
</script>

<template>
	<dialog ref="modalRef" class="modal">
		<div class="modal-box bg-bg-card text-text-secondary relative w-11/12 max-w-2xl rounded-4xl p-0 shadow-xl overflow-visible">
			<!-- Header -->
			<div class="bg-bg-muted/30 border-border-default sticky top-0 z-50 flex items-center justify-between border-b px-8 py-5 backdrop-blur-md rounded-t-4xl">
				<h3 class="text-xl font-bold tracking-tight">
					{{ editingBooking ? 'Editar Reserva' : 'Agendar Nueva Cita' }}
				</h3>
				<div class="flex items-center gap-3">
					<select
						v-model="form.status"
						class="select select-sm bg-bg-card border-border-default rounded-lg font-bold">
						<option value="PENDIENTE">PENDIENTE</option>
						<option value="CONFIRMADA">CONFIRMADA</option>
						<option value="CANCELADA">CANCELADA</option>
						<option value="COMPLETADA">COMPLETADA</option>
						<option value="AUSENTE">AUSENTE</option>
					</select>
					<button type="button" class="btn btn-sm btn-circle btn-ghost text-text-light hover:bg-text-primary" @click="closeModal">✕</button>
				</div>
			</div>

			<!-- Body -->
			<div class="custom-scrollbar max-h-[75vh] overflow-y-auto px-8 py-6" @click="closeDropdowns">
				<form id="bookingForm" @submit.prevent="saveBooking" class="flex flex-col gap-6" @click.stop>
					<!-- Client & Staff -->
					<div class="relative z-40 grid grid-cols-1 gap-5 md:grid-cols-2">
						<div class="form-control">
							<label class="label pb-1"><span class="label-text text-primary text-xs font-bold uppercase tracking-wider">Cliente *</span></label>
							<div class="relative">
								<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<input v-model="clientSearch" type="text" required placeholder="Buscar cliente..." autocomplete="off"
									class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-primary/40 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none"
									@focus="isClientDropdownOpen = true" 
									@blur="delayedCloseClient"
									@keydown.esc="isClientDropdownOpen = false" />
								
								<div v-show="isClientDropdownOpen" class="bg-white border-border-default absolute z-100 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border shadow-2xl">
									<button v-for="c in filteredClients" :key="c.user_id"
										type="button" class="hover:bg-bg-muted flex w-full flex-col px-4 py-3 text-left transition-colors border-b border-border-subtle last:border-none"
										@mousedown="selectClient(c)">
										<span class="text-sm font-bold text-text-primary">{{ c.name }} {{ c.surname }}</span>
										<span class="text-text-muted text-[10px]">{{ c.phone }}</span>
									</button>
								</div>
							</div>
						</div>

						<div class="form-control">
							<label class="label pb-1"><span class="label-text text-text-muted text-xs font-bold uppercase tracking-wider">Profesional Asignado</span></label>
							<select v-model="form.staff_id" class="select bg-bg-muted border-border-default focus:bg-bg-card h-11 w-full rounded-xl px-4 text-sm font-medium shadow-sm transition-colors focus:outline-none">
								<option value="">-- Sin asignar --</option>
								<option v-for="user in staff?.filter(s => s.role === 'ADMIN' || s.user_id === form.staff_id)" :key="user.user_id" :value="user.user_id">{{ user.name }} {{ user.surname }}</option>
							</select>
						</div>
					</div>

					<div class="divider my-0 opacity-50"></div>

					<!-- Date, Time, Duration -->
					<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
						<div class="form-control">
							<label class="label pb-1"><span class="label-text text-text-muted text-xs font-bold uppercase tracking-wider">Fecha *</span></label>
							<input v-model="form.booking_date" type="date" required class="input bg-bg-muted border-border-default focus:bg-bg-card h-11 w-full rounded-xl px-4 text-sm font-bold shadow-sm outline-none" />
						</div>
						<div class="form-control">
							<label class="label pb-1"><span class="label-text text-text-muted text-xs font-bold uppercase tracking-wider">Hora Inicio *</span></label>
							<input v-model="form.start_time" type="time" required class="input bg-bg-muted border-border-default focus:bg-bg-card h-11 w-full rounded-xl px-4 text-sm font-bold shadow-sm outline-none" />
						</div>
						<div class="form-control">
							<label class="label pb-1"><span class="label-text text-text-muted text-xs font-bold uppercase tracking-wider">Duración (Min)</span></label>
							<div class="input bg-bg-muted/50 border-border-default h-11 w-full rounded-xl px-4 flex items-center text-sm font-bold text-primary tabular-nums shadow-inner">{{ form.duration }} min</div>
						</div>
					</div>

					<div class="divider my-0 opacity-50"></div>

					<!-- Items Selection -->
					<div class="flex flex-col gap-3">
						<span class="label-text text-primary pl-1 text-xs font-bold uppercase tracking-wider">Servicios o Paquetes a agendar *</span>
						
						<!-- Categories -->
						<div class="tabs tabs-boxed bg-bg-muted/50 border-border-default flex w-full rounded-xl border p-1 no-scrollbar overflow-x-auto">
							<a v-for="t in ['SERVICE', 'BONUS', 'PACK', 'GIFTCARD']" :key="t" 
								class="tab h-8 flex-1 rounded-lg px-2 text-[10px] font-black tracking-tighter transition-all"
								:class="activeTab === t ? 'bg-bg-card text-primary shadow-md' : 'text-text-muted'"
								@click="activeTab = t as any">
								{{ t === 'SERVICE' ? 'SERVICIOS' : t === 'BONUS' ? 'BONOS' : t === 'PACK' ? 'PACKS' : 'TARJETAS REGALO' }}
							</a>
						</div>

						<!-- Searchable Item Input -->
						<div class="relative z-30">
							<Search class="text-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
							<input v-model="itemSearch" type="text" placeholder="Buscar item para añadir..." 
								class="input bg-bg-muted border-border-default focus:bg-bg-card focus:ring-primary/40 h-11 w-full rounded-xl pl-9 text-xs font-bold shadow-sm transition-all focus:outline-none"
								@focus="isItemDropdownOpen = true" 
								@blur="delayedCloseItem"
								@keydown.esc="isItemDropdownOpen = false" />
							
							<div v-show="isItemDropdownOpen" class="bg-white border-border-default absolute z-100 top-full left-0 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border shadow-2xl">
								<button v-for="it in filteredItems" :key="it.service_id || it.pack_id || it.bonus_id || it.giftcard_id"
									type="button" class="hover:bg-bg-muted flex w-full items-center justify-between px-4 py-3 text-left border-b border-border-subtle last:border-none"
									@mousedown="addItem(it)">
									<div class="flex flex-col">
										<span class="text-xs font-bold text-text-primary">{{ it.name }}</span>
										<span class="text-text-muted text-[10px] uppercase font-bold">{{ it.duration || 0 }} min • {{ formatCurrency(it.price || it.initial_balance || 0) }}</span>
									</div>
									<Plus class="h-4 w-4 text-primary" />
								</button>
								<div v-if="filteredItems.length === 0" class="px-4 py-6 text-center text-xs text-text-muted italic">No hay resultados</div>
							</div>
						</div>

						<!-- Selected Items Chips -->
						<div class="flex flex-wrap gap-2 mt-1">
							<div v-for="(it, idx) in form.items" :key="idx" 
								class="bg-bg-muted border border-border-default px-3 py-2 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
								<Scissors v-if="it.item_type === 'SERVICE'" class="h-3.5 w-3.5 text-primary" />
								<Ticket v-else-if="it.item_type === 'BONUS'" class="h-3.5 w-3.5 text-info" />
								<Package v-else-if="it.item_type === 'PACK'" class="h-3.5 w-3.5 text-success" />
								<Gift v-else class="h-3.5 w-3.5 text-warning" />
								
								<div class="flex flex-col pointer-events-none">
									<span class="text-[11px] font-bold text-text-primary uppercase leading-tight">{{ it.name }}</span>
								</div>
								
								<button type="button" @click="removeItem(idx)" class="text-text-muted hover:text-error transition-colors p-0.5">
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
							<div v-if="form.items.length === 0" class="text-xs text-text-muted italic p-2 opacity-60">Ningún servicio seleccionado aún...</div>
						</div>
					</div>

					<!-- Notes -->
					<div class="form-control">
						<label class="label pb-1"><span class="label-text text-text-muted text-xs font-bold uppercase tracking-wider">Notas y Comentarios (Opcional)</span></label>
						<textarea v-model="form.notes" rows="2" placeholder="Especificaciones del cliente, alertas, etc."
							class="textarea bg-bg-muted border-border-default focus:bg-bg-card hover:bg-bg-hover w-full rounded-xl px-4 py-3 text-sm font-medium shadow-sm transition-colors focus:outline-none"></textarea>
					</div>
				</form>
			</div>

			<!-- Footer -->
			<div class="bg-bg-muted/30 border-border-default sticky bottom-0 z-50 flex justify-end gap-3 border-t px-8 py-5 backdrop-blur-md rounded-b-4xl">
				<button type="button" class="btn btn-ghost text-text-muted hover:bg-bg-hover h-12 rounded-xl px-6" @click="closeModal">Cancelar</button>
				<button type="submit" form="bookingForm" class="btn text-bg-card hover:bg-text-secondary/80 bg-text-secondary flex h-12 items-center gap-2 rounded-xl border-none px-8 font-bold shadow-md" :disabled="isSaving">
					<span v-if="isSaving" class="loading loading-spinner"></span>
					<CheckCircle2 v-else class="h-4 w-4" />
					{{ editingBooking ? 'Guardar Cambios' : 'Confirmar Reserva' }}
				</button>
			</div>
		</div>

		<form method="dialog" class="modal-backdrop bg-text-secondary/40 backdrop-blur-sm"><button>close</button></form>

		<!-- Error Toast -->
		<div v-show="showLocalError" class="toast toast-top toast-center z-200 mt-4">
			<div class="alert alert-error rounded-2xl border-none font-bold text-white shadow-2xl">
				<div class="flex flex-col gap-1 items-center text-center">
					<span class="text-[10px] opacity-80 uppercase tracking-widest font-black">Conflicto de Agenda</span>
					<span class="text-sm leading-tight text-white">{{ localError }}</span>
				</div>
			</div>
		</div>
	</dialog>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
