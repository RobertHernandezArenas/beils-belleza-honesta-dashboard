<script setup lang="ts">
import { useAgendaStore } from '~/stores/useAgendaStore'
import { ChevronLeft, ChevronRight, Search, Users, CircleDot, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'

const store = useAgendaStore()
const { selectedDate, searchQuery } = storeToRefs(store)

const currentMonth = ref(new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth(), 1))

// Generate calendar days
const calendarDays = computed(() => {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    
    // Previous month padding
    let firstDayOfWeek = firstDay.getDay()
    if (firstDayOfWeek === 0) firstDayOfWeek = 7 // Adjust for Monday start
    
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
        const d = new Date(year, month, 1 - i)
        days.push({ date: d, isCurrentMonth: false })
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i)
        days.push({ date: d, isCurrentMonth: true })
    }
    
    // Next month padding
    const remainingDays = 42 - days.length // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
        const d = new Date(year, month + 1, i)
        days.push({ date: d, isCurrentMonth: false })
    }
    
    return days
})

const nextMonth = () => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

const prevMonth = () => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

const selectDate = (date: Date) => {
    store.setDate(date)
    store.setViewMode('day')
    // Update mini calendar if we click a padding day
    if (date.getMonth() !== currentMonth.value.getMonth()) {
        currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
    }
}

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
}

const isToday = (date: Date) => {
    return isSameDay(date, new Date())
}

const isSelected = (date: Date) => {
    return isSameDay(date, selectedDate.value)
}

const monthName = computed(() => {
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentMonth.value)
})
</script>

<template>
    <div class="w-72 shrink-0 border-r border-border-subtle bg-bg-card/50 backdrop-blur-xl hidden lg:flex flex-col h-full overflow-y-auto custom-scrollbar">
        <!-- New Booking Button -->
        <div class="p-5 pb-2">
            <button 
                @click="store.openBookingDrawer(null, selectedDate)"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-text-primary text-bg-card h-12 shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
                <Plus class="h-4 w-4" />
                <span class="text-xs font-bold uppercase tracking-widest">Nueva Cita</span>
            </button>
        </div>

        <!-- Mini Calendar -->
        <div class="p-5">
            <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-bold uppercase tracking-wider text-text-primary">{{ monthName }}</span>
                <div class="flex gap-1">
                    <button @click="prevMonth" class="p-1 hover:bg-bg-muted rounded-lg transition-colors text-text-muted hover:text-text-primary">
                        <ChevronLeft class="h-4 w-4" />
                    </button>
                    <button @click="nextMonth" class="p-1 hover:bg-bg-muted rounded-lg transition-colors text-text-muted hover:text-text-primary">
                        <ChevronRight class="h-4 w-4" />
                    </button>
                </div>
            </div>

            <!-- Days Header -->
            <div class="grid grid-cols-7 mb-2">
                <span v-for="day in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="day" class="text-center text-[10px] font-bold text-text-muted">
                    {{ day }}
                </span>
            </div>

            <!-- Days Grid -->
            <div class="grid grid-cols-7 gap-y-1">
                <button
                    v-for="(day, idx) in calendarDays"
                    :key="idx"
                    @click="selectDate(day.date)"
                    class="h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs transition-all relative group"
                    :class="[
                        !day.isCurrentMonth ? 'text-text-muted/40' : 'text-text-primary hover:bg-bg-muted',
                        isSelected(day.date) && !isToday(day.date) ? 'bg-primary/10 text-primary font-bold' : '',
                        isToday(day.date) ? 'bg-primary text-white font-bold shadow-sm' : ''
                    ]"
                >
                    {{ day.date.getDate() }}
                </button>
            </div>
        </div>

        <!-- Divider -->
        <div class="mx-5 h-px bg-border-subtle my-2"></div>

        <!-- Search & Filters -->
        <div class="p-5 flex-1 flex flex-col gap-4">
            <div>
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Buscar</label>
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input 
                        v-model="searchQuery" 
                        type="text" 
                        placeholder="Cliente, tel..." 
                        class="w-full h-10 pl-9 pr-3 rounded-xl bg-bg-muted/50 border border-border-subtle focus:border-primary/50 text-xs transition-all focus:bg-bg-card focus:outline-none"
                    />
                </div>
            </div>

            <div>
                <label class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2">
                    <Users class="h-3 w-3" /> Filtro Rápido
                </label>
                <!-- This is a placeholder for future staff filtering. The backend allows searching by staff name via the searchQuery anyway. -->
                <div class="flex items-center gap-2 p-2 rounded-lg border border-border-subtle bg-bg-muted/30">
                    <CircleDot class="h-3 w-3 text-primary" />
                    <span class="text-xs text-text-secondary">Todos los empleados</span>
                </div>
            </div>
        </div>
    </div>
</template>
