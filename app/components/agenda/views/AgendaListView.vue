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
	import gsap from 'gsap'
	import { onMounted } from 'vue'

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
			pending: 'bg-[#FFB800] text-black border-none',
			confirmed: 'bg-[#00D1FF] text-black border-none',
			completed: 'bg-[#00FF85] text-black border-none',
			cancelled: 'bg-[#FF005C] text-white border-none',
			no_show: 'bg-[#222222] text-white border-none',
		}
		return map[status] || map['pending']
	}

	const getStatusStrip = (status: string) => {
		const map: Record<string, string> = {
			pending: 'bg-black/20 shadow-none',
			confirmed: 'bg-black/20 shadow-none',
			completed: 'bg-black/20 shadow-none',
			cancelled: 'bg-white/20 shadow-none',
			no_show: 'bg-white/10 shadow-none',
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

	onMounted(() => {
		gsap.from('.list-booking-card', {
			opacity: 0,
			scale: 0.9,
			x: -30,
			duration: 0.5,
			stagger: 0.05,
			ease: 'expo.out',
			clearProps: 'all'
		})
	})
</script>

<template>
	<div class="custom-scrollbar flex-1 overflow-y-auto bg-bg-app transition-colors duration-500">
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:gap-6 md:p-8">
			<div v-if="bookings.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
				<div class="bg-bg-card border-border-default mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] border shadow-sm">
					<CalendarDays class="h-10 w-10 text-text-muted opacity-20" />
				</div>
				<h3 class="text-xl font-black tracking-tighter text-text-primary uppercase">No hay citas</h3>
				<p class="text-text-muted mt-2 text-xs font-black tracking-widest uppercase opacity-40">
					No se encontraron servicios para esta fecha
				</p>
			</div>

			<div
				v-for="booking in bookings"
				:key="booking.booking_id"
				class="group flex gap-3 md:gap-6 lg:gap-8"
				@click="emit('edit', booking)">
				<!-- Time Column -->
				<div
					class="border-border-default group-hover:border-primary/50 flex w-16 shrink-0 flex-col items-end border-r-2 pt-2 pr-3 transition-colors md:w-24 md:pr-5">
					<span class="text-lg leading-none font-black tracking-tighter tabular-nums text-text-primary md:text-2xl">
						{{ booking.start_time }}
					</span>
					<span class="text-text-muted mt-1 text-[8px] font-black tracking-widest uppercase tabular-nums md:text-[10px]">
						{{ booking.end_time }}
					</span>
					<span class="text-text-light mt-3 text-[8px] font-black tracking-[0.2em] uppercase md:text-[10px]">
						{{ new Date(booking.booking_date).toLocaleDateString('es-ES', { weekday: 'short' }) }}
					</span>
				</div>

				<!-- Card -->
				<div
					class="list-booking-card relative flex-1 rounded-[16px] border border-border-default bg-bg-card p-0 shadow-sm transition-all hover:scale-[1.015] hover:shadow-xl md:rounded-[24px]">
					<div class="flex h-full flex-col p-3 md:p-4 text-left">
						<div class="flex items-center justify-between">
							<span class="text-[9px] font-black tracking-widest uppercase opacity-60 md:text-[10px]">
								{{ booking.item_id.split('-')[0] }}
							</span>
							<span 
								class="rounded-full px-2 py-0.5 text-[8px] font-black tracking-widest uppercase md:text-[9px]"
								:class="getStatusColor(booking.status)">
								{{ booking.status }}
							</span>
						</div>
						<div class="mt-2 text-sm font-black tracking-tight uppercase md:text-base">
							{{ booking.client?.name }}
						</div>
						<div class="mt-2 flex items-center justify-between border-t border-border-subtle pt-2">
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase opacity-40 md:text-[10px]">
									<Clock class="h-3 w-3" />
									{{ booking.duration }} MIN
								</div>
								<div class="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase opacity-40 md:text-[10px]">
									<Scissors class="h-3 w-3" />
									{{ booking.professional?.name || 'Pro' }}
								</div>
							</div>
							<div class="dropdown dropdown-end relative z-20">
								<button
									tabindex="0"
									class="btn btn-ghost btn-xs btn-circle bg-bg-muted"
									@click.stop>
									<MoreVertical class="h-3 w-3" />
								</button>
								<ul
									tabindex="0"
									class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-50 mt-1 w-40 rounded-xl border p-1 shadow-xl">
									<li>
										<a @click.stop="emit('status', booking.booking_id, 'confirmed')">
											<CheckCircle2 class="text-info h-3.5 w-3.5" />
											Confirmar
										</a>
									</li>
									<li>
										<a @click.stop="emit('status', booking.booking_id, 'completed')">
											<CheckCircle2 class="text-success h-3.5 w-3.5" />
											Finalizar
										</a>
									</li>
									<li>
										<a @click.stop="emit('status', booking.booking_id, 'cancelled')">
											<XCircle class="text-error h-3.5 w-3.5" />
											Cancelar
										</a>
									</li>
									<div class="divider my-0.5 opacity-50"></div>
									<li>
										<a @click.stop="emit('delete', booking.booking_id)" class="text-error">
											<Trash2 class="h-3.5 w-3.5" />
											Eliminar
										</a>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
