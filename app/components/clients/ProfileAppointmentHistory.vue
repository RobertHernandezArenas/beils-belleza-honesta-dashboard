<script setup lang="ts">
import type { ClientProfile, Booking, Sale } from '~~/shared/types/domain'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { CalendarClock, Clock, User2, Receipt, X, ChevronRight, Scissors } from 'lucide-vue-next'

const props = defineProps<{
	client: ClientProfile
}>()

const selected = ref<Booking | null>(null)

const bookings = computed<Booking[]>(() =>
	[...(props.client?.client_bookings || [])].sort(
		(a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime(),
	),
)

// Cart/ticket linked to a booking via cart.booking_id
const ticketFor = (booking: Booking) =>
	(props.client?.carts || []).find((c: Sale) => c.booking_id === booking?.booking_id) || null

const selectedTicket = computed(() => (selected.value ? ticketFor(selected.value) : null))

const fmtDate = (d: string) =>
	new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
const fmtMoney = (v: number) =>
	new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0)

const statusStyle = (status: string) => {
	const s = (status || '').toUpperCase()
	if (s === 'COMPLETADA' || s === 'COMPLETED') return 'bg-success/10 text-success'
	if (s === 'CONFIRMADA' || s === 'CONFIRMED') return 'bg-primary/10 text-primary'
	if (s === 'PENDIENTE' || s === 'PENDING') return 'bg-warning/10 text-warning'
	if (s === 'CANCELADA' || s === 'CANCELLED') return 'bg-error/10 text-error'
	if (s === 'AUSENTE' || s === 'NO_SHOW') return 'bg-text-muted/15 text-text-muted'
	return 'bg-text-muted/15 text-text-muted'
}
const serviceNames = (b: Booking) =>
	(b.booking_items || []).map((it: { name: string }) => it.name).join(' · ') || b.item_type || 'Servicio'

const open = (b: Booking) => (selected.value = b)
const close = () => (selected.value = null)
const onKey = (e: KeyboardEvent) => {
	if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
	<section class="bg-bg-card border-border-default/80 rounded-3xl border p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
		<div class="mb-5 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
					<CalendarClock class="h-5 w-5" />
				</div>
				<div>
					<h2 class="text-text-primary text-lg font-bold">Historial de Citas</h2>
					<p class="text-text-muted text-xs">Citas en el tiempo · pulsa para ver el detalle y su ticket</p>
				</div>
			</div>
			<span class="badge badge-neutral text-[10px] font-black">{{ bookings.length }}</span>
		</div>

		<!-- Empty -->
		<div
			v-if="bookings.length === 0"
			class="text-text-muted flex flex-col items-center justify-center gap-2 py-12 text-center">
			<CalendarClock class="h-8 w-8 opacity-40" />
			<p class="text-sm font-semibold">Este cliente aún no tiene citas registradas.</p>
		</div>

		<!-- Timeline -->
		<ol v-else class="custom-scrollbar relative max-h-[420px] overflow-y-auto pl-4">
			<li
				v-for="b in bookings"
				:key="b.booking_id"
				class="border-border-subtle relative border-l pb-4 pl-5 last:pb-0">
				<span
					class="bg-bg-card border-primary absolute -left-[6px] top-1.5 h-3 w-3 rounded-full border-2"/>
				<button
					type="button"
					class="group hover:bg-bg-muted/50 border-border-default/70 flex w-full items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-colors"
					@click="open(b)">
					<div class="min-w-0 flex-1">
						<div class="mb-1 flex flex-wrap items-center gap-2">
							<span class="text-text-primary text-xs font-black tabular-nums">{{ fmtDate(b.booking_date) }}</span>
							<span v-if="b.start_time" class="text-text-muted inline-flex items-center gap-1 text-[10px] font-bold">
								<Clock class="h-3 w-3" />{{ b.start_time }}
							</span>
							<span class="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" :class="statusStyle(b.status)">
								{{ b.status }}
							</span>
							<span v-if="ticketFor(b)" class="text-success inline-flex items-center gap-1 text-[9px] font-black uppercase">
								<Receipt class="h-3 w-3" /> Ticket
							</span>
						</div>
						<p class="text-text-secondary truncate text-xs font-semibold">{{ serviceNames(b) }}</p>
						<p v-if="b.staff" class="text-text-muted mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold">
							<User2 class="h-3 w-3" />{{ b.staff.name }} {{ b.staff.surname }}
						</p>
					</div>
					<ChevronRight class="text-text-muted/60 group-hover:text-primary mt-1 h-4 w-4 shrink-0 transition-colors" />
				</button>
			</li>
		</ol>

		<!-- Detail modal -->
		<Teleport to="body">
			<Transition
				enter-active-class="transition-opacity duration-200"
				enter-from-class="opacity-0"
				leave-active-class="transition-opacity duration-150"
				leave-to-class="opacity-0">
				<div
					v-if="selected"
					class="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
					@click.self="close">
					<div class="bg-bg-card border-border-default max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border p-6 shadow-2xl sm:rounded-3xl">
						<!-- header -->
						<div class="mb-4 flex items-start justify-between">
							<div>
								<h3 class="text-text-primary text-lg font-bold">Detalle de la cita</h3>
								<p class="text-text-muted text-xs">{{ fmtDate(selected.booking_date) }} · {{ selected.start_time || '—' }}</p>
							</div>
							<button type="button" class="btn btn-ghost btn-sm btn-circle text-text-muted" @click="close">
								<X class="h-5 w-5" />
							</button>
						</div>

						<span class="mb-4 inline-block rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" :class="statusStyle(selected.status)">
							{{ selected.status }}
						</span>

						<!-- Services -->
						<div class="border-border-default mb-4 rounded-2xl border p-3">
							<p class="text-text-muted mb-2 text-[10px] font-black uppercase tracking-widest">Servicios</p>
							<ul class="space-y-1.5">
								<li v-for="(it, i) in (selected.booking_items || [])" :key="i" class="flex items-center justify-between text-xs">
									<span class="text-text-primary flex items-center gap-2 font-semibold">
										<Scissors class="text-primary h-3.5 w-3.5" />{{ it.name }}
									</span>
									<span class="text-text-muted font-bold">{{ it.duration || 0 }} min</span>
								</li>
								<li v-if="!(selected.booking_items || []).length" class="text-text-muted text-xs italic">Sin servicios detallados</li>
							</ul>
						</div>

						<div v-if="selected.staff" class="text-text-secondary mb-4 flex items-center gap-2 text-xs font-semibold">
							<User2 class="text-text-muted h-4 w-4" /> {{ selected.staff.name }} {{ selected.staff.surname }}
						</div>

						<div v-if="selected.notes" class="bg-bg-muted/50 mb-4 rounded-2xl p-3">
							<p class="text-text-muted mb-1 text-[10px] font-black uppercase tracking-widest">Notas</p>
							<p class="text-text-secondary text-xs">{{ selected.notes }}</p>
						</div>

						<!-- Linked ticket / invoice -->
						<div v-if="selectedTicket" class="border-success/30 bg-success/5 rounded-2xl border p-4">
							<div class="mb-3 flex items-center justify-between">
								<span class="text-success inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
									<Receipt class="h-4 w-4" /> Ticket / Factura
								</span>
								<span v-if="selectedTicket.invoice_number" class="text-text-muted font-mono text-[10px] font-bold">
									{{ selectedTicket.invoice_number }}
								</span>
							</div>
							<ul class="mb-3 space-y-1">
								<li v-for="(it, i) in (selectedTicket.items || [])" :key="i" class="flex items-center justify-between text-xs">
									<span class="text-text-secondary truncate font-medium">{{ it.quantity }}× {{ it.name }}</span>
									<span class="text-text-primary font-bold tabular-nums">{{ fmtMoney(it.total ?? it.unit_price) }}</span>
								</li>
							</ul>
							<div class="border-border-default/60 flex items-center justify-between border-t pt-2">
								<span class="text-text-muted text-[10px] font-black uppercase">{{ selectedTicket.payment_method || 'Pago' }}</span>
								<span class="text-text-primary text-sm font-black tabular-nums">{{ fmtMoney(selectedTicket.total) }}</span>
							</div>
						</div>
						<div v-else class="border-border-default text-text-muted rounded-2xl border border-dashed p-4 text-center text-xs font-semibold">
							Esta cita no tiene un ticket asociado.
						</div>
					</div>
				</div>
			</Transition>
		</Teleport>
	</section>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
	width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
	background: color-mix(in oklab, var(--text-muted) 40%, transparent);
	border-radius: 99px;
}
</style>
