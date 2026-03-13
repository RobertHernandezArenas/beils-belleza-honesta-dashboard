<script setup lang="ts">
	import { computed } from 'vue'

	const props = defineProps<{
		bookings: any[]
		selectedDate: Date
	}>()

	const emit = defineEmits<{
		(e: 'edit', booking: any): void
		(e: 'selectDate', date: Date): void
	}>()

	const daysOfWeek = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

	const calendarDays = computed(() => {
		const year = props.selectedDate.getFullYear()
		const month = props.selectedDate.getMonth()
		
		const firstDayOfMonth = new Date(year, month, 1)
		const lastDayOfMonth = new Date(year, month + 1, 0)
		
		// Adjust to start on Monday (0 is Sunday in JS, so we want 1=Mon...0=Sun)
		let startOffset = firstDayOfMonth.getDay() - 1
		if (startOffset === -1) startOffset = 6 // Sunday
		
		const days = []
		
		// Days from previous month
		const prevMonthLastDay = new Date(year, month, 0).getDate()
		for (let i = startOffset - 1; i >= 0; i--) {
			days.push({
				date: new Date(year, month - 1, prevMonthLastDay - i),
				currentMonth: false
			})
		}
		
		// Days from current month
		for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
			days.push({
				date: new Date(year, month, i),
				currentMonth: true
			})
		}
		
		// Days from next month
		const remaining = 42 - days.length
		for (let i = 1; i <= remaining; i++) {
			days.push({
				date: new Date(year, month + 1, i),
				currentMonth: false
			})
		}
		
		return days
	})

	const getBookingsForDay = (date: Date) => {
		const dateStr = date.toISOString().split('T')[0]
		return props.bookings.filter(b => {
			const bDate = new Date(b.booking_date).toISOString().split('T')[0]
			return bDate === dateStr
		})
	}

	const isToday = (date: Date) => {
		return date.toDateString() === new Date().toDateString()
	}

	const isSelected = (date: Date) => {
		return date.toDateString() === props.selectedDate.toDateString()
	}

	const getStatusColorClip = (status: string) => {
		const map: Record<string, string> = {
			pending: 'bg-warning/20 border-warning/50 text-yellow-900',
			confirmed: 'bg-info/20 border-info/50 text-info',
			completed: 'bg-success/20 border-success/50 text-success',
			cancelled: 'bg-error/10 border-error/50 text-error',
		}
		return map[status] || 'bg-bg-muted text-text-muted'
	}
</script>

<template>
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Month Header -->
		<div class="grid grid-cols-7 border-b border-border-default">
			<div v-for="day in daysOfWeek" :key="day" class="py-2 text-center text-[10px] font-black tracking-widest uppercase opacity-60">
				{{ day }}
			</div>
		</div>

		<!-- Grid -->
		<div class="grid flex-1 grid-cols-7 grid-rows-6 border-border-default overflow-hidden">
			<div 
				v-for="{ date, currentMonth } in calendarDays" 
				:key="date.toISOString()" 
				class="border-border-subtle group relative flex flex-col border-r border-b p-1 last:border-r-0 transition-colors hover:bg-bg-muted/30"
				:class="{ 'opacity-40 grayscale-[0.5]': !currentMonth, 'bg-primary/5': isToday(date) }">
				
				<!-- Day Number -->
				<div class="flex items-center justify-between p-1">
					<button 
						@click="emit('selectDate', date)"
						class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
						:class="[
							isToday(date) ? 'bg-primary text-white' : 
							isSelected(date) ? 'bg-text-primary text-bg-card' : 'text-text-muted group-hover:text-text-primary'
						]">
						{{ date.getDate() }}
					</button>
					<span v-if="getBookingsForDay(date).length > 0" class="text-[9px] font-black tracking-tighter opacity-40">
						{{ getBookingsForDay(date).length }} CITAS
					</span>
				</div>

				<!-- Day Bookings List -->
				<div class="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto pt-1">
					<button
						v-for="booking in getBookingsForDay(date).slice(0, 3)"
						:key="booking.booking_id"
						@click.stop="emit('edit', booking)"
						class="flex w-full items-center gap-1.5 truncate rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-tight transition-transform hover:scale-[1.02]"
						:class="getStatusColorClip(booking.status)">
						<span class="shrink-0 tabular-nums">{{ booking.start_time }}</span>
						<span class="truncate">{{ booking.client?.name }}</span>
					</button>
					<div v-if="getBookingsForDay(date).length > 3" class="px-1.5 text-center text-[8px] font-black tracking-widest opacity-40">
						+ {{ getBookingsForDay(date).length - 3 }} MAS
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
