<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Scissors, User as UserIcon } from 'lucide-vue-next'

const props = defineProps<{
    bookings: any[]
    selectedDate: Date
    daysCount?: number
}>()

const emit = defineEmits<{
    (e: 'edit', booking: any): void
    (e: 'delete', id: string): void
    (e: 'status', id: string, status: string): void
    (e: 'create', defaultDate: Date, defaultTime: string): void
}>()

const hourHeight = 96 // pixels per hour
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

const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
}

// ----------------------------------------------------
// Core Overlap / Bin-Packing Algorithm per Day
// ----------------------------------------------------
const processedDays = computed(() => {
    if (!props.bookings) return daysToDisplay.value.map(d => ({ date: d, bookings: [] }))

    return daysToDisplay.value.map(date => {
        const offset1 = date.getTimezoneOffset() * 60000;
        const dateStr = new Date(date.getTime() - offset1).toISOString().split('T')[0]
        
        let dayBookings = props.bookings.filter(b => {
            const bObj = new Date(b.booking_date)
            const offset2 = bObj.getTimezoneOffset() * 60000;
            const bDate = new Date(bObj.getTime() - offset2).toISOString().split('T')[0]
            return bDate === dateStr
        }).map(b => {
            const startMin = timeToMinutes(b.start_time)
            const duration = b.duration || 30
            
            // VISUAL PACKING LOGIC: Reserve at least 28 minutes visually (~45px) for short events
            const minVisualDuration = 28 
            const visualDuration = Math.max(duration, minVisualDuration)

            return {
                ...b,
                startMin,
                endMin: startMin + duration,
                visualEndMin: startMin + visualDuration,
                visualDuration,
                column: 0,
                maxColumns: 1
            }
        })

        // Sort
        dayBookings.sort((a, b) => {
            if (a.startMin !== b.startMin) return a.startMin - b.startMin
            return b.duration - a.duration
        })

        // Bin Packing
        const columns: any[][] = []
        for (const b of dayBookings) {
            let placed = false
            for (let colIndex = 0; colIndex < columns.length; colIndex++) {
                const col = columns[colIndex]
                if (!col) continue
                const lastInCol = col[col.length - 1]
                if (lastInCol?.visualEndMin <= b.startMin) {
                    b.column = colIndex
                    col.push(b)
                    placed = true
                    break
                }
            }
            if (!placed) {
                b.column = columns.length
                columns.push([b])
            }
        }

        const blocks: any[][] = []
        let currentBlock: any[] = []
        let blockEnd = -1

        for (const b of dayBookings) {
            if (b.startMin >= blockEnd && currentBlock.length > 0) {
                blocks.push([...currentBlock])
                currentBlock = []
                blockEnd = -1
            }
            currentBlock.push(b)
            if (b.visualEndMin > blockEnd) {
                blockEnd = b.visualEndMin
            }
        }
        if (currentBlock.length > 0) {
            blocks.push([...currentBlock])
        }

        for (const block of blocks) {
            const maxCol = Math.max(...block.map(b => b.column)) + 1
            block.forEach(b => {
                b.maxColumns = maxCol
            })
        }

        return { date, bookings: dayBookings }
    })
})

const getBookingStyle = (booking: any) => {
    let startMin = booking.startMin || (startHour * 60)
    // Clamp to visible hours to prevent disappearing
    startMin = Math.max(startHour * 60, Math.min(endHour * 60, startMin))
    
    const top = ((startMin - (startHour * 60)) / 60) * hourHeight
    const height = (booking.visualDuration / 60) * hourHeight
    const width = 100 / booking.maxColumns
    const left = booking.column * width

    return {
        top: `${top}px`,
        height: `${height}px`, // Height is now driven by visualDuration to ensure readability
        width: `calc(${width}% - 2px)`, // 2px margin
        left: `${left}%`,
        zIndex: booking.column + 10
    }
}

const getStatusColor = (status: string) => {
    const key = (status || 'pending').toLowerCase()
    const map: Record<string, string> = {
        pending: 'bg-orange-500/10 text-orange-700 border-orange-500/30 hover:bg-orange-500/20',
        pendiente: 'bg-orange-500/10 text-orange-700 border-orange-500/30 hover:bg-orange-500/20',
        confirmed: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
        confirmada: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
        completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20',
        completada: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20',
        cancelled: 'bg-stone-500/10 text-stone-500 border-stone-500/30 opacity-60',
        cancelada: 'bg-stone-500/10 text-stone-500 border-stone-500/30 opacity-60',
    }
    return map[key] || 'bg-bg-muted text-text-muted border-border-default'
}

const getStatusStrip = (status: string) => {
    const key = (status || 'pending').toLowerCase()
    const map: Record<string, string> = {
        pending: 'bg-orange-500',
        pendiente: 'bg-orange-500',
        confirmed: 'bg-primary',
        confirmada: 'bg-primary',
        completed: 'bg-emerald-500',
        completada: 'bg-emerald-500',
        cancelled: 'bg-stone-500',
        cancelada: 'bg-stone-500',
    }
    return map[key] || 'bg-border-default'
}

const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
}

const handleGridClick = (e: MouseEvent, day: Date) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const clickedHour = startHour + Math.floor(y / hourHeight)
    
    const minutesFraction = (y % hourHeight) / hourHeight
    const clickedMinutes = minutesFraction > 0.5 ? '30' : '00'
    
    const timeString = `${clickedHour.toString().padStart(2, '0')}:${clickedMinutes}`
    
    emit('create', day, timeString)
}


</script>

<template>
    <div class="custom-scrollbar flex-1 overflow-y-auto bg-bg-app">
        <div class="flex min-w-[800px] flex-col min-h-full">
            <!-- Header Row -->
            <div class="border-border-subtle sticky top-0 z-40 flex border-b bg-bg-card/90 backdrop-blur-md">
                <div class="border-border-subtle w-16 shrink-0 border-r"></div>
                <div 
                    v-for="dayObj in processedDays" 
                    :key="dayObj.date.toISOString()"
                    class="border-border-subtle flex flex-1 flex-col items-center py-3 border-r last:border-r-0"
                    :class="{ 'bg-primary/5': isToday(dayObj.date) }">
                    <div class="text-text-muted text-[10px] font-black tracking-widest uppercase opacity-60">
                        {{ dayObj.date.toLocaleDateString('es-ES', { weekday: 'short' }) }}
                    </div>
                    <div 
                        class="mt-1 flex h-10 w-10 items-center justify-center rounded-full text-xl font-black transition-all"
                        :class="isToday(dayObj.date) ? 'bg-primary text-white shadow-lg' : 'text-text-primary'">
                        {{ dayObj.date.getDate() }}
                    </div>
                </div>
            </div>

            <!-- Grid Body -->
            <div class="relative flex flex-1">
                <!-- Hours Column -->
                <div class="border-border-subtle sticky left-0 z-30 w-16 shrink-0 border-r bg-bg-card/90 backdrop-blur-md">
                    <div 
                        v-for="hour in hours" 
                        :key="hour" 
                        class="border-border-subtle relative flex h-24 items-start justify-end border-b pr-3">
                        <span class="text-text-muted absolute -top-2.5 bg-bg-card/80 px-1 text-[10px] font-bold tabular-nums">
                            {{ formatHour(hour) }}
                        </span>
                    </div>
                </div>

                <!-- Days Columns -->
                <div class="flex flex-1">
                    <div 
                        v-for="dayObj in processedDays" 
                        :key="dayObj.date.toISOString()" 
                        class="relative flex-1 border-r border-border-subtle last:border-r-0"
                        @click="(e) => handleGridClick(e, dayObj.date)">
                        
                        <!-- Grid Lines -->
                        <div v-for="hour in hours" :key="hour" class="border-border-subtle h-24 border-b border-dashed opacity-50"></div>

                        <!-- Empty State Indicator for Debugging -->
                        <div v-if="dayObj.bookings.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                            <span class="text-xs font-bold uppercase tracking-widest text-text-muted -rotate-90 whitespace-nowrap">Sin citas</span>
                        </div>

                        <!-- Bookings -->
                        <button
                            v-for="booking in dayObj.bookings"
                            :key="booking.booking_id"
                            @click.stop="emit('edit', booking)"
                            class="grid-booking-card group absolute ml-0.5 cursor-pointer overflow-hidden rounded-lg border p-1.5 transition-all hover:z-50 hover:shadow-md"
                            :class="getStatusColor(booking.status)"
                            :style="getBookingStyle(booking)">
                            
                            <!-- Left Status Strip -->
                            <div
                                class="absolute top-0 bottom-0 left-0 w-1 opacity-80"
                                :class="getStatusStrip(booking.status)"></div>

                            <div class="flex h-full flex-col text-left pl-1.5 overflow-hidden">
                                <div class="truncate text-[9px] font-bold tracking-tight leading-tight shrink-0">
                                    {{ booking.client?.name }} {{ booking.client?.surname?.charAt(0) }}.
                                </div>
                                <div class="text-[8px] font-semibold opacity-70 mt-px truncate flex items-center gap-1 shrink-0">
                                    <Clock class="h-2 w-2 shrink-0" /> {{ booking.start_time }}
                                </div>
                                <div v-if="booking.booking_items?.length" class="mt-px flex-1 min-h-0 overflow-hidden">
                                    <div v-for="item in booking.booking_items.slice(0, 1)" :key="item.id" 
                                        class="text-[8px] font-medium opacity-80 truncate mt-px">
                                        {{ item.name }}
                                    </div>
                                    <div v-if="booking.booking_items.length > 1" class="text-[7.5px] font-bold opacity-60 italic mt-px">
                                        +{{ booking.booking_items.length - 1 }}
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
