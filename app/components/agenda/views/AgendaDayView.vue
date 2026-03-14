<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'
	import { Clock, User as UserIcon, Scissors, MoreVertical, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-vue-next'
	import gsap from 'gsap'

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
			pending: 'bg-[#dbd2c6] text-text-primary border-none shadow-sm',
			confirmed: 'bg-text-primary text-bg-card border-none shadow-md',
			completed: 'bg-[#bababa] text-text-primary border-none shadow-sm',
			cancelled: 'bg-bg-muted text-text-light border-none opacity-60',
		}
		return map[status] || 'bg-bg-muted text-text-muted'
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

		// Staggered entry animation
		gsap.from('.booking-card', {
			opacity: 0,
			scale: 0.8,
			y: 30,
			duration: 0.5,
			stagger: 0.04,
			ease: 'expo.out',
			clearProps: 'all'
		})
	})
</script>

<template>
	<div class="custom-scrollbar relative flex-1 overflow-y-auto">
		<div class="flex min-h-full">
			<!-- Hours Column -->
			<div class="border-border-subtle sticky top-0 z-40 flex border-b bg-bg-card/80 backdrop-blur-xl transition-all duration-300">
			<div class="w-12 shrink-0 border-r border-border-subtle p-2 md:w-16"></div>
			<div class="flex-1 py-3 text-center md:py-4">
				<div class="text-text-muted text-[8px] font-black tracking-[0.2em] uppercase md:text-[10px]">
					{{ selectedDate.toLocaleDateString('es-ES', { weekday: 'long' }) }}
				</div>
				<div class="text-text-primary mt-0.5 text-2xl font-black tracking-tighter md:mt-1 md:text-4xl">
					{{ selectedDate.getDate() }}
				</div>
			</div>
		</div>

			<!-- Timeline Grid -->
			<div class="relative flex-1">
						<!-- Grid Lines -->
						<div v-for="hour in hours" :key="hour" class="border-border-subtle h-20 border-b border-solid md:h-24"></div>

				<!-- Current Time Indicator -->
				<div v-if="currentTimePosition >= 0" :style="{ top: `${currentTimePosition}px` }" class="absolute right-0 left-0 z-30 flex items-center pointer-events-none px-2">
					<div class="bg-primary h-3 w-3 rounded-full shadow-[0_0_20px_rgba(var(--color-primary),1)] animate-pulse"></div>
					<div class="bg-primary/30 h-0.5 flex-1 ml-1"></div>
				</div>

				<!-- Bookings -->
				<div
					v-for="booking in bookings"
					:key="booking.booking_id"
					class="booking-card group absolute right-2 left-3 z-10 overflow-hidden rounded-[24px] border-none p-0 shadow-2xl transition-all hover:z-40 hover:scale-[1.02] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]"
					:class="getStatusColor(booking.status)"
					:style="getBookingStyle(booking)">
					
					<!-- Status Strip -->
					<div 
						class="absolute top-0 left-0 bottom-0 w-1 rounded-full my-3 ml-1.5"
						:class="getStatusStrip(booking.status)">
					</div>

					<div class="flex h-full flex-col justify-between p-4 pl-6 overflow-hidden">
						<div class="flex items-center justify-between gap-2 overflow-hidden">
							<div class="flex min-w-0 items-center gap-1.5">
								<h4 class="truncate text-base font-black leading-none tracking-tighter uppercase">
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
						
						<div class="mt-1 flex items-center gap-3 truncate opacity-60">
							<span class="flex items-center gap-1.5 text-[11px] font-black tracking-widest uppercase">
								<Clock class="h-3 w-3" />
								{{ booking.start_time }}
							</span>
							<span v-if="booking.staff" class="flex items-center gap-1.5 text-[11px] font-black tracking-widest uppercase">
								<UserIcon class="h-3 w-3" />
								{{ booking.staff.name }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
