<script setup lang="ts">
	import { computed } from 'vue'

	const props = defineProps<{
		bookings: any[]
		selectedDate: Date
	}>()

	const emit = defineEmits<{
		(e: 'selectDate', date: Date): void
	}>()

	const currentYear = computed(() => props.selectedDate.getFullYear())
	const months = Array.from({ length: 12 }, (_, i) => i)

	const getDaysInMonth = (year: number, month: number) => {
		const date = new Date(year, month, 1)
		const days = []
		
		// Start day (Mon=1 ... Sun=0)
		let startDay = date.getDay() - 1
		if (startDay === -1) startDay = 6
		
		// Fill empty slots
		for (let i = 0; i < startDay; i++) days.push(null)
		
		const lastDay = new Date(year, month + 1, 0).getDate()
		for (let i = 1; i <= lastDay; i++) {
			days.push(new Date(year, month, i))
		}
		
		return days
	}

	const hasBooking = (date: Date | null) => {
		if (!date) return false
		const dateStr = date.toISOString().split('T')[0]
		return props.bookings.some(b => {
			const bDate = new Date(b.booking_date).toISOString().split('T')[0]
			return bDate === dateStr
		})
	}

	const isToday = (date: Date | null) => {
		if (!date) return false
		return date.toDateString() === new Date().toDateString()
	}

	const isSelectedMonth = (month: number) => {
		return month === props.selectedDate.getMonth()
	}

	const monthNames = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	]
</script>

<template>
	<div class="custom-scrollbar flex-1 overflow-y-auto p-6">
		<div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<div 
				v-for="month in months" 
				:key="month" 
				class="bg-bg-card border-border-default rounded-3xl border p-4 shadow-sm transition-all hover:shadow-md"
				:class="{ 'ring-2 ring-primary/20': isSelectedMonth(month) }">
				
				<h3 class="mb-4 text-center text-sm font-black tracking-widest uppercase text-text-primary">
					{{ monthNames[month] }}
				</h3>
				
				<div class="grid grid-cols-7 gap-1">
					<div v-for="d in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="d" class="text-center text-[8px] font-black opacity-40">
						{{ d }}
					</div>
					
					<div 
						v-for="(date, idx) in getDaysInMonth(currentYear, month)" 
						:key="idx" 
						class="flex aspect-square items-center justify-center text-[10px] font-bold">
						<button 
							v-if="date"
							@click="emit('selectDate', date)"
							class="relative flex h-6 w-6 items-center justify-center rounded-full transition-all hover:bg-bg-muted"
							:class="[
								isToday(date) ? 'bg-primary text-white' : 
								hasBooking(date) ? 'text-primary' : 'text-text-muted'
							]">
							{{ date.getDate() }}
							<span 
								v-if="hasBooking(date) && !isToday(date)" 
								class="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary/40">
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
