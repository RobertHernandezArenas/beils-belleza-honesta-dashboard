<script setup lang="ts">
	import { 
		MoreVertical, 
		CheckCircle2, 
		XCircle, 
		Pencil, 
		Trash2, 
		User as UserIcon, 
		Scissors, 
		Clock,
		CalendarDays
	} from 'lucide-vue-next'

	defineProps<{
		bookings: any[]
		isPending: boolean
	}>()

	const emit = defineEmits<{
		(e: 'edit', booking: any): void
		(e: 'delete', id: string): void
		(e: 'status', id: string, status: string): void
		(e: 'create'): void
	}>()

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
	<div class="custom-scrollbar flex-1 overflow-y-auto p-4 lg:p-6" v-if="bookings.length > 0">
		<div class="flex flex-col gap-4">
			<div
				v-for="booking in bookings"
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
									<a @click="emit('status', booking.booking_id, 'confirmed')">
										<CheckCircle2 class="text-info h-4 w-4" />
										Confirmar
									</a>
								</li>
								<li>
									<a @click="emit('status', booking.booking_id, 'completed')">
										<CheckCircle2 class="text-success h-4 w-4" />
										Finalizar
									</a>
								</li>
								<li>
									<a @click="emit('status', booking.booking_id, 'cancelled')">
										<XCircle class="text-error h-4 w-4" />
										Cancelar
									</a>
								</li>
								<div class="divider my-1 opacity-50"></div>
								<li>
									<a @click="emit('edit', booking)" class="font-medium">
										<Pencil class="h-4 w-4" />
										Editar
									</a>
								</li>
								<li>
									<a
										@click="emit('delete', booking.booking_id)"
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
			@click="emit('create')">
			<Plus class="h-4 w-4" />
			Agendar Primera Cita
		</button>
	</div>
</template>
