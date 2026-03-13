<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'
	import { Clock, User as UserIcon, Scissors, MoreVertical, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-vue-next'

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

	const isToday = (date: Date) => {
		return date.toDateString() === new Date().toDateString()
	}
</script>

<template>
	<div class="custom-scrollbar flex-1 overflow-y-auto">
		<div class="flex min-w-[800px] flex-col min-h-full">
			<!-- Header Row -->
			<div class="border-border-default sticky top-0 z-40 flex border-b bg-bg-card/90 backdrop-blur-md">
				<div class="w-16 shrink-0 border-r border-border-default"></div>
				<div 
					v-for="day in daysToDisplay" 
					:key="day.toISOString()" 
					class="flex-1 border-r border-border-default p-3 text-center transition-colors"
					:class="{ 'bg-primary/5': isToday(day) }">
					<p class="text-[10px] font-black tracking-widest uppercase opacity-60">
						{{ new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day) }}
					</p>
					<p 
						class="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-black"
						:class="isToday(day) ? 'bg-primary text-white' : 'text-text-primary'">
						{{ day.getDate() }}
					</p>
				</div>
			</div>

			<!-- Grid Body -->
			<div class="relative flex flex-1">
				<!-- Hours Column -->
				<div class="border-border-default sticky left-0 z-20 w-16 border-r bg-bg-card/80 backdrop-blur-md">
					<div v-for="hour in hours" :key="hour" :style="{ height: `${hourHeight}px` }" class="relative">
						<span class="text-text-muted absolute -top-2 w-full text-center text-[10px] font-bold">
							{{ formatHour(hour) }}
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
						<div v-for="hour in hours" :key="hour" :style="{ height: `${hourHeight}px` }" class="border-border-subtle border-b border-dashed"></div>

						<!-- Bookings -->
						<div
							v-for="booking in getBookingsForDay(day)"
							:key="booking.booking_id"
							class="group absolute right-1 left-1 z-10 overflow-hidden rounded-lg border p-1.5 shadow-sm transition-all hover:z-40 hover:scale-[1.02] hover:shadow-md"
							:class="getStatusColor(booking.status)"
							:style="getBookingStyle(booking)"
							@click="emit('edit', booking)">
							
							<div class="flex h-full flex-col overflow-hidden">
								<h4 class="truncate text-[10px] font-black leading-tight tracking-tighter uppercase">
									{{ booking.client?.name }}
								</h4>
								<div class="mt-0.5 flex items-center gap-1 truncate opacity-70">
									<Clock class="h-2 w-2" />
									<span class="text-[9px] font-bold">{{ booking.start_time }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
