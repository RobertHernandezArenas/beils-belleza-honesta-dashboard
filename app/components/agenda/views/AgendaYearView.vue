<script setup lang="ts">
	import { computed, onMounted } from 'vue'
	import gsap from 'gsap'

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

	const getStatusColor = (status: string) => {
		const map: Record<string, string> = {
			pending: 'bg-orange-500/10 text-orange-700 border-none',
			confirmed: 'bg-primary/10 text-primary border-none',
			completed: 'bg-emerald-500/10 text-emerald-700 border-none',
			cancelled: 'bg-stone-500/10 text-stone-700 border-none opacity-60',
			no_show: 'bg-transparent border border-border-default text-text-muted',
		}
		return map[status] || map['pending']
	}

	const isSelectedMonth = (month: number) => {
		return month === props.selectedDate.getMonth()
	}

	const monthNames = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	]

	onMounted(() => {
		gsap.from('.year-month-card', {
			opacity: 0,
			scale: 0.9,
			y: 30,
			duration: 0.6,
			stagger: 0.04,
			ease: 'expo.out',
			clearProps: 'all'
		})
	})
</script>

<template>
	<div class="custom-scrollbar flex-1 overflow-y-auto p-6">
		<div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<div 
				v-for="month in months" 
				:key="month" 
				class="year-month-card bg-bg-card border-border-default rounded-3xl border p-5 shadow-sm transition-all duration-500 hover:bg-bg-hover hover:scale-[1.03]"
				:class="{ 'ring-2 ring-primary/60 bg-primary/5': isSelectedMonth(month) }">
				
				<h3 class="mb-5 text-center text-xs font-black tracking-[0.2em] uppercase text-text-muted opacity-60">
					{{ monthNames[month] }}
				</h3>
				
				<div class="grid grid-cols-7 gap-1">
					<div v-for="d in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="d" class="text-center text-[8px] font-black opacity-40 text-text-muted">
						{{ d }}
					</div>
					
					<div 
						v-for="(date, idx) in getDaysInMonth(currentYear, month)" 
						:key="idx" 
						class="flex aspect-square items-center justify-center text-[10px] font-bold">
						<button 
							v-if="date"
							@click="emit('selectDate', date)"
							class="relative flex h-7 w-7 items-center justify-center rounded-full transition-all hover:bg-bg-hover"
							:class="[
								isToday(date) ? 'bg-primary text-white shadow-md' : 
								hasBooking(date) ? 'text-text-primary font-black' : 'text-text-muted opacity-40'
							]">
							{{ date.getDate() }}
							<span 
								v-if="hasBooking(date) && !isToday(date)" 
								class="absolute -bottom-0.5 h-1 w-1 rounded-full bg-text-primary shadow-sm">
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
