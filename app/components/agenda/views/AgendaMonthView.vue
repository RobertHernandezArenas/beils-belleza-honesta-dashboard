<script setup lang="ts">
import gsap from 'gsap'
import { computed, onMounted } from 'vue'

const props = defineProps<{
    bookings: any[]
    selectedDate: Date
}>()

const emit = defineEmits<{
    (e: 'edit', booking: any): void
    (e: 'selectDate', date: Date): void
    (e: 'viewDayDetails', date: Date, bookings: any[]): void
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
    const offset1 = date.getTimezoneOffset() * 60000;
    const dateStr = new Date(date.getTime() - offset1).toISOString().split('T')[0]
    
    let dayBookings = props.bookings.filter(b => {
        const bObj = new Date(b.booking_date)
        const offset2 = bObj.getTimezoneOffset() * 60000;
        const bDate = new Date(bObj.getTime() - offset2).toISOString().split('T')[0]
        return bDate === dateStr
    })

    // Sort by time
    dayBookings.sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0
        return a.start_time.localeCompare(b.start_time)
    })

    return dayBookings
}

const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
}

const isSelected = (date: Date) => {
    return date.toDateString() === props.selectedDate.toDateString()
}

const handleDayClick = (date: Date, dayBookings: any[]) => {
    if (dayBookings.length > 0) {
        emit('viewDayDetails', date, dayBookings)
    } else {
        emit('selectDate', date) // Normal jump to day view if empty
    }
}

const getStatusColorClip = (status: string) => {
    const key = (status || 'pending').toLowerCase()
    const map: Record<string, string> = {
        pending: 'bg-orange-500/10 text-orange-700',
        pendiente: 'bg-orange-500/10 text-orange-700',
        confirmed: 'bg-primary/10 text-primary',
        confirmada: 'bg-primary/10 text-primary',
        completed: 'bg-emerald-500/10 text-emerald-700',
        completada: 'bg-emerald-500/10 text-emerald-700',
        cancelled: 'bg-stone-500/10 text-stone-500 opacity-60',
        cancelada: 'bg-stone-500/10 text-stone-500 opacity-60',
    }
    return map[key] || 'bg-bg-muted text-text-muted'
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
    <div class="flex flex-1 flex-col overflow-hidden bg-bg-app">
        <!-- Month Header -->
        <div class="grid grid-cols-7 border-b border-border-subtle bg-bg-card/90 backdrop-blur-md">
            <div v-for="day in daysOfWeek" :key="day" class="py-3 text-center text-[10px] font-black tracking-[0.2em] uppercase text-text-muted opacity-60">
                {{ day }}
            </div>
        </div>

        <!-- Grid -->
        <div class="grid flex-1 grid-cols-7 grid-rows-6 border-border-subtle overflow-hidden">
            <div 
                v-for="{ date, currentMonth } in calendarDays" 
                :key="date.toISOString()" 
                @click="handleDayClick(date, getBookingsForDay(date))"
                class="month-day-cell relative flex flex-col border-r border-b border-border-subtle/50 p-1 transition-all duration-300 hover:bg-bg-card/60 cursor-pointer"
                :class="{ 'opacity-40 grayscale bg-bg-muted/30': !currentMonth, 'bg-primary/5': isToday(date) }">
                
                <!-- Day Number -->
                <div class="flex items-center justify-between p-0.5 md:p-1">
                    <div 
                        class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-all md:h-8 md:w-8 md:text-sm"
                        :class="[
                            isToday(date) ? 'bg-primary text-white shadow-lg' : 
                            isSelected(date) ? 'bg-text-primary text-bg-card shadow-md scale-105' : 'text-text-primary hover:bg-bg-muted'
                        ]">
                        {{ date.getDate() }}
                    </div>
                    <span v-if="getBookingsForDay(date).length > 0 && currentMonth" class="text-[8px] font-black tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                        {{ getBookingsForDay(date).length }}
                    </span>
                </div>

                <!-- Day Bookings List -->
                <div class="custom-scrollbar flex-1 space-y-1 overflow-y-auto pt-1 px-1">
                    <button
                        v-for="booking in getBookingsForDay(date).slice(0, 4)"
                        :key="booking.booking_id"
                        @click.stop="emit('edit', booking)"
                        class="flex w-full items-center gap-1.5 truncate rounded px-1.5 py-0.5 text-[9px] font-bold tracking-tight transition-all hover:opacity-80"
                        :class="getStatusColorClip(booking.status)">
                        <div class="w-1.5 h-1.5 rounded-full bg-current opacity-60"></div>
                        <span class="shrink-0 tabular-nums opacity-80">{{ booking.start_time }}</span>
                        <span class="truncate uppercase">{{ booking.client?.name }}</span>
                    </button>
                    <div v-if="getBookingsForDay(date).length > 4" class="px-1.5 text-center text-[8px] font-black tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                        + {{ getBookingsForDay(date).length - 4 }} MAS
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
