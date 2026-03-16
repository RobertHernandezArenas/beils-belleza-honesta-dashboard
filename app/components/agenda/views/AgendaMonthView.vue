<script setup lang="ts">
	import gsap from 'gsap'

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
			pending: 'bg-orange-500/10 text-orange-700 border-none',
			confirmed: 'bg-emerald-500/10 text-emerald-700 border-none',
			completed: 'bg-emerald-500/10 text-emerald-700 border-none',
			cancelled: 'bg-rose-500/10 text-rose-700 border-none opacity-60',
			no_show: 'bg-transparent border border-border-default text-text-muted',
		}
		return map[status] || map['pending']
	}

	onMounted(() => {
		gsap.from('.month-day-cell', {
			opacity: 0,
			scale: 0.95,
			duration: 0.5,
			stagger: {
				each: 0.01,
				grid: [6, 7],
				from: 'center'
			},
			ease: 'power2.out',
			clearProps: 'all'
		})
	})
</script>

<template>
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Month Header -->
		<div class="grid grid-cols-7 border-b border-border-default bg-bg-card">
			<div v-for="day in daysOfWeek" :key="day" class="py-3 text-center text-[10px] font-black tracking-[0.2em] uppercase text-text-muted opacity-60">
				{{ day }}
			</div>
		</div>

		<!-- Grid -->
		<div class="grid flex-1 grid-cols-7 grid-rows-6 border-border-subtle overflow-hidden bg-bg-card">
			<div 
				v-for="{ date, currentMonth } in calendarDays" 
				:key="date.toISOString()" 
				class="month-day-cell border-border-subtle group relative flex flex-col border-r border-b p-1 last:border-r-0 transition-all duration-300 hover:z-10 hover:bg-bg-hover"
				:class="{ 'opacity-40 grayscale': !currentMonth, 'bg-primary/5': isToday(date) }">
				
				<!-- Day Number -->
				<div class="flex items-center justify-between p-0.5 md:p-1">
					<button 
						@click="emit('selectDate', date)"
						class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-all md:h-8 md:w-8 md:text-sm"
						:class="[
							isToday(date) ? 'bg-primary text-white shadow-lg' : 
							isSelected(date) ? 'bg-text-primary text-bg-card shadow-md scale-105' : 'text-text-muted group-hover:text-text-primary'
						]">
						{{ date.getDate() }}
					</button>
					<span v-if="getBookingsForDay(date).length > 0 && currentMonth" class="text-[8px] font-black tracking-widest text-primary">
						{{ getBookingsForDay(date).length }}
					</span>
				</div>

				<!-- Day Bookings List -->
				<div class="custom-scrollbar flex-1 space-y-1 overflow-y-auto pt-1 px-1">
					<button
						v-for="booking in getBookingsForDay(date).slice(0, 3)"
						:key="booking.booking_id"
						@click.stop="emit('edit', booking)"
						class="flex w-full items-center gap-1.5 truncate rounded-md px-2 py-0.5 text-[8px] font-bold tracking-tight transition-all hover:scale-[1.05] hover:shadow-lg"
						:class="getStatusColorClip(booking.status)">
						<span class="shrink-0 tabular-nums opacity-60">{{ booking.start_time }}</span>
						<span class="truncate uppercase">{{ booking.client?.name }}</span>
					</button>
					<div v-if="getBookingsForDay(date).length > 3" class="px-1.5 text-center text-[8px] font-black tracking-widest opacity-40">
						+ {{ getBookingsForDay(date).length - 3 }} MAS
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
