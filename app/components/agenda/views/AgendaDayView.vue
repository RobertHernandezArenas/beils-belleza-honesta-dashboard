<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'
	import { Clock, User as UserIcon, Scissors, MoreVertical, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-vue-next'

	const props = defineProps<{
		bookings: any[]
		selectedDate: Date
	}>()

	const emit = defineEmits<{
		(e: 'edit', booking: any): void
		(e: 'delete', id: string): void
		(e: 'status', id: string, status: string): void
	}>()

	const hourHeight = 80 // pixels per hour
	const startHour = 8 // start at 8 AM
	const endHour = 22 // end at 10 PM
	const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

	const formatHour = (hour: number) => {
		return `${hour.toString().padStart(2, '0')}:00`
	}

	const getBookingStyle = (booking: any) => {
		const [h, m] = booking.start_time.split(':').map(Number)
		const duration = booking.duration || 30
		
		const top = (h - startHour + m / 60) * hourHeight
		const height = (duration / 60) * hourHeight
		
		return {
			top: `${top}px`,
			height: `${height}px`,
			minHeight: '2rem'
		}
	}

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

	const currentTimePosition = ref(0)
	const updateTimeIndicator = () => {
		const now = new Date()
		if (now.toDateString() === props.selectedDate.toDateString()) {
			const h = now.getHours()
			const m = now.getMinutes()
			if (h >= startHour && h <= endHour) {
				currentTimePosition.value = (h - startHour + m / 60) * hourHeight
			} else {
				currentTimePosition.value = -1
			}
		} else {
			currentTimePosition.value = -1
		}
	}

	onMounted(() => {
		updateTimeIndicator()
		setInterval(updateTimeIndicator, 60000)
	})
</script>

<template>
	<div class="custom-scrollbar relative flex-1 overflow-y-auto">
		<div class="flex min-h-full">
			<!-- Hours Column -->
			<div class="border-border-default sticky left-0 z-20 w-16 border-r bg-bg-card/80 backdrop-blur-md">
				<div v-for="hour in hours" :key="hour" :style="{ height: `${hourHeight}px` }" class="relative">
					<span class="text-text-muted absolute -top-2 w-full text-center text-[10px] font-bold">
						{{ formatHour(hour) }}
					</span>
				</div>
			</div>

			<!-- Timeline Grid -->
			<div class="relative flex-1">
				<!-- Grid Lines -->
				<div v-for="hour in hours" :key="hour" :style="{ height: `${hourHeight}px` }" class="border-border-subtle border-b border-dashed"></div>

				<!-- Current Time Indicator -->
				<div v-if="currentTimePosition >= 0" :style="{ top: `${currentTimePosition}px` }" class="absolute right-0 left-0 z-30 flex items-center">
					<div class="bg-error h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,0,0,0.5)]"></div>
					<div class="bg-error h-0.5 flex-1"></div>
				</div>

				<!-- Bookings -->
				<div
					v-for="booking in bookings"
					:key="booking.booking_id"
					class="group absolute right-2 left-2 z-10 overflow-hidden rounded-xl border p-3 shadow-sm transition-all hover:z-40 hover:scale-[1.02] hover:shadow-lg"
					:class="getStatusColor(booking.status)"
					:style="getBookingStyle(booking)">
					
					<div class="flex h-full flex-col justify-between overflow-hidden">
						<div class="flex items-center justify-between gap-2 overflow-hidden">
							<div class="flex min-w-0 items-center gap-1.5">
								<h4 class="truncate text-sm font-bold leading-none tracking-tight">
									{{ booking.client?.name }} {{ booking.client?.surname }}
								</h4>
							</div>
							
							<!-- Action Dropdown for Day View -->
							<div class="dropdown dropdown-end">
								<button tabindex="0" class="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100">
									<MoreVertical class="h-3 w-3" />
								</button>
								<ul tabindex="0" class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-100 mt-1 w-40 rounded-xl border p-1 shadow-xl">
									<li><a class="text-xs" @click="emit('status', booking.booking_id, 'confirmed')"><CheckCircle2 class="h-3.5 w-3.5 text-info" /> Confirmar</a></li>
									<li><a class="text-xs" @click="emit('status', booking.booking_id, 'completed')"><CheckCircle2 class="h-3.5 w-3.5 text-success" /> Finalizar</a></li>
									<div class="divider my-0.5 opacity-30"></div>
									<li><a class="text-xs" @click="emit('edit', booking)"><Pencil class="h-3.5 w-3.5" /> Editar</a></li>
									<li><a class="text-error text-xs" @click="emit('delete', booking.booking_id)"><Trash2 class="h-3.5 w-3.5" /> Eliminar</a></li>
								</ul>
							</div>
						</div>
						
						<div class="mt-0.5 flex items-center gap-2 truncate opacity-80">
							<span class="flex items-center gap-1.5 text-[10px] font-bold">
								<Clock class="h-2.5 w-2.5" />
								{{ booking.start_time }} - {{ booking.end_time }}
							</span>
							<span v-if="booking.staff" class="flex items-center gap-1.5 text-[10px] font-bold">
								<UserIcon class="h-2.5 w-2.5" />
								{{ booking.staff.name }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
