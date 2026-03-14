<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'
	import { Clock, User as UserIcon, Scissors, MoreVertical, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-vue-next'
	import gsap from 'gsap'

	const props = defineProps<{
		bookings: any[]
		selectedDate: Date
		daysCount?: number
	}>()

	const emit = defineEmits<{
		(e: 'edit', booking: any): void
		(e: 'delete', id: string): void
		(e: 'status', id: string, status: string): void
	}>()

	const hourHeight = 60 // pixels per hour (slightly smaller for week view)
	const startHour = 8 
	const endHour = 22 
	const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

	const daysToDisplay = computed(() => {
		const count = props.daysCount || 7
		const days = []
		
		if (count === 7) {
			// standard week (Mon-Sun)
			const start = new Date(props.selectedDate)
			const day = start.getDay()
			const diff = start.getDate() - day + (day === 0 ? -6 : 1)
			start.setDate(diff)
			
			for (let i = 0; i < 7; i++) {
				const d = new Date(start)
				d.setDate(start.getDate() + i)
				days.push(d)
			}
		} else {
			// 4 days starting from selected
			for (let i = 0; i < count; i++) {
				const d = new Date(props.selectedDate)
				d.setDate(props.selectedDate.getDate() + i)
				days.push(d)
			}
		}
		return days
	})

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
			minHeight: '1.5rem'
		}
	}

	const getBookingsForDay = (date: Date) => {
		const dateStr = date.toISOString().split('T')[0]
		return props.bookings.filter(b => {
			const bDate = new Date(b.booking_date).toISOString().split('T')[0]
			return bDate === dateStr
		})
	}

	const getDayBookings = (date: Date, hour: number) => {
		const dateStr = date.toISOString().split('T')[0];
		return props.bookings.filter(b => {
			const bDate = new Date(b.booking_date).toISOString().split('T')[0];
			const [bookingHour] = b.start_time.split(':').map(Number);
			return bDate === dateStr && bookingHour === hour;
		});
	};

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

	const isToday = (date: Date) => {
		return date.toDateString() === new Date().toDateString()
	}

	onMounted(() => {
		gsap.from('.grid-booking-card', {
			opacity: 0,
			scale: 0.8,
			y: 10,
			duration: 0.4,
			stagger: 0.02,
			ease: 'expo.out',
			clearProps: 'all'
		})
	})
</script>

<template>
	<div class="custom-scrollbar flex-1 overflow-y-auto">
		<div class="flex min-w-[800px] flex-col min-h-full">
			<!-- Header Row -->
			<div class="border-border-subtle sticky top-0 z-40 flex border-b bg-bg-card/80 backdrop-blur-xl">
				<div class="border-border-subtle w-16 shrink-0 border-r"></div>
				<div 
					v-for="day in daysToDisplay" 
					:key="day.toISOString()"
					class="border-border-subtle flex flex-1 flex-col items-center py-3 border-r last:border-r-0"
					:class="{ 'bg-primary/5': isToday(day) }">
					<div class="text-text-muted text-[10px] font-black tracking-widest uppercase opacity-60">
						{{ day.toLocaleDateString('es-ES', { weekday: 'short' }) }}
					</div>
					<div 
						class="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-xl font-black transition-all"
						:class="isToday(day) ? 'bg-primary text-white shadow-lg' : 'text-text-primary'">
						{{ day.getDate() }}
					</div>
				</div>
			</div>

			<!-- Grid Body -->
			<div class="relative flex flex-1">
				<!-- Hours Column -->
				<div class="border-border-subtle sticky left-0 z-20 w-16 border-r bg-bg-card/80 backdrop-blur-xl">
					<div 
						v-for="hour in hours" 
						:key="hour" 
						class="border-border-subtle flex h-24 items-start justify-end border-b pr-3 pt-2">
						<span class="text-text-muted text-[10px] font-black tracking-tighter tabular-nums opacity-60">
							{{ hour }}:00
						</span>
					</div>
				</div>

				<!-- Days Columns -->
				<div class="flex flex-1">
					<div 
						v-for="day in daysToDisplay" 
						:key="day.toISOString()" 
						class="relative flex-1 border-r border-border-subtle last:border-r-0">
						
						<!-- Grid Lines -->
						<div v-for="hour in hours" :key="hour" class="border-border-subtle h-24 border-b border-solid"></div>

						<!-- Bookings -->
						<button
							v-for="booking in getBookingsForDay(day)"
							:key="booking.booking_id"
							@click="emit('edit', booking)"
							class="grid-booking-card group absolute right-0.5 left-0.5 z-10 overflow-hidden rounded-[14px] border-none p-0 shadow-sm transition-all hover:z-40 hover:scale-[1.02] hover:shadow-lg active:scale-95"
							:class="getStatusColor(booking.status)"
							:style="getBookingStyle(booking)">
							<div class="flex h-full flex-col p-2 text-left">
								<div class="truncate text-[9px] font-black tracking-tight uppercase">
									{{ booking.client?.name }}
								</div>
								<div class="text-[8px] font-black opacity-40 mt-0.5">
									{{ booking.start_time }}
								</div>
							</div>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
