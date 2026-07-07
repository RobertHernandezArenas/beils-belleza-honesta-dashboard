<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
    Clock,
    User as UserIcon,
    Scissors,
    MoreVertical,
    CheckCircle2,
    Pencil,
    Trash2,
} from 'lucide-vue-next'
import { useAgendaStore } from '~/stores/useAgendaStore'

const props = defineProps<{
    bookings: any[]
    selectedDate: Date
}>()

const emit = defineEmits<{
    (e: 'edit', booking: any): void
    (e: 'delete', id: string): void
    (e: 'status', id: string, status: string): void
    (e: 'create', defaultDate: Date, defaultTime: string): void
}>()

const store = useAgendaStore()

const hourHeight = 96 // pixels per hour (matches h-24)
const startHour = 8
const endHour = 22
const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`

const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + (m || 0)
}

// ----------------------------------------------------
// Core Overlap / Bin-Packing Algorithm
// ----------------------------------------------------
const processedBookings = computed(() => {
    if (!props.bookings) return []

    // 1. Filter for the selected day only
    const offset1 = props.selectedDate.getTimezoneOffset() * 60000
    const dateStr = new Date(props.selectedDate.getTime() - offset1).toISOString().split('T')[0]

    const dayBookings = props.bookings.filter(b => {
        const bObj = new Date(b.booking_date)
        const offset2 = bObj.getTimezoneOffset() * 60000
        const bDate = new Date(bObj.getTime() - offset2).toISOString().split('T')[0]
        return bDate === dateStr
    }).map(b => {
        const startMin = timeToMinutes(b.start_time)
        const duration = b.duration || 30
        return {
            ...b,
            startMin,
            endMin: startMin + duration,
            column: 0,
            maxColumns: 1
        }
    })

    // 2. Sort by start time ascending, then by duration descending
    dayBookings.sort((a, b) => {
        if (a.startMin !== b.startMin) return a.startMin - b.startMin
        return b.duration - a.duration
    })

    // 3. Assign columns (Bin Packing)
    const columns: any[][] = []
    
    for (const b of dayBookings) {
        let placed = false
        for (let colIndex = 0; colIndex < columns.length; colIndex++) {
            const col = columns[colIndex]
            // Check if b overlaps with the last item in this column
            const lastInCol = col[col.length - 1]
            if (lastInCol.endMin <= b.startMin) {
                // Doesn't overlap, can be placed here
                b.column = colIndex
                col.push(b)
                placed = true
                break
            }
        }
        if (!placed) {
            // Must create a new column
            b.column = columns.length
            columns.push([b])
        }
    }

    // 4. Determine max overlapping columns for each block to compute widths
    // A block is a group of connected overlapping events
    const blocks: any[][] = []
    let currentBlock: any[] = []
    let blockEnd = -1

    for (const b of dayBookings) {
        if (b.startMin >= blockEnd && currentBlock.length > 0) {
            // End of block
            blocks.push([...currentBlock])
            currentBlock = []
            blockEnd = -1
        }
        currentBlock.push(b)
        if (b.endMin > blockEnd) {
            blockEnd = b.endMin
        }
    }
    if (currentBlock.length > 0) {
        blocks.push([...currentBlock])
    }

    // For each block, all members share the max width
    for (const block of blocks) {
        // Find max column index in this block
        const maxCol = Math.max(...block.map(b => b.column)) + 1
        block.forEach(b => {
            b.maxColumns = maxCol
        })
    }

    return dayBookings
})

const getBookingStyle = (booking: any) => {
    let startMin = booking.startMin || (startHour * 60)
    // Clamp to visible hours to prevent disappearing
    startMin = Math.max(startHour * 60, Math.min(endHour * 60, startMin))
    
    const top = ((startMin - (startHour * 60)) / 60) * hourHeight
    const height = (booking.duration / 60) * hourHeight
    const width = 100 / booking.maxColumns
    const left = booking.column * width

    return {
        top: `${top}px`,
        height: `${Math.max(height, 40)}px`, // Ensure at least 40px height to be clickable
        width: `calc(${width}% - 4px)`, // 4px margin between columns
        left: `${left}%`,
        zIndex: booking.column + 10 // Layer overlapping correctly
    }
}

// ----------------------------------------------------
// UI Helpers
// ----------------------------------------------------
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

// ----------------------------------------------------
// Time Indicator
// ----------------------------------------------------
const currentTimePosition = ref(-1)
let timeInterval: any

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

// ----------------------------------------------------
// Interaction
// ----------------------------------------------------
const handleGridClick = (e: MouseEvent) => {
    // Determine which hour slot was clicked based on Y coordinate
    // The grid wrapper is relative.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const clickedHour = startHour + Math.floor(y / hourHeight)
    
    // We can also determine the half-hour if needed, but let's stick to hour or 30-min marks
    const minutesFraction = (y % hourHeight) / hourHeight
    const clickedMinutes = minutesFraction > 0.5 ? '30' : '00'
    
    const timeString = `${clickedHour.toString().padStart(2, '0')}:${clickedMinutes}`
    
    // Don't trigger if clicked on an actual event (event propagation stop should handle this)
    emit('create', props.selectedDate, timeString)
}

onMounted(() => {
    updateTimeIndicator()
    timeInterval = setInterval(updateTimeIndicator, 60000)
})

onUnmounted(() => {
    clearInterval(timeInterval)
})
</script>

<template>
    <div class="custom-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden bg-bg-app">
        <div class="flex flex-col min-h-full">
            <!-- Top Header -->
            <div class="border-border-subtle sticky top-0 z-40 flex border-b bg-bg-card/90 backdrop-blur-md">
                <div class="border-border-subtle w-16 shrink-0 border-r p-2"></div>
                <div class="flex-1 py-3 px-4 flex items-center gap-4">
                    <div class="text-text-primary text-4xl font-black tracking-tighter tabular-nums">
                        {{ selectedDate.getDate() }}
                    </div>
                    <div>
                        <div class="text-text-muted text-[10px] font-bold uppercase tracking-widest">
                            {{ selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) }}
                        </div>
                        <div class="text-text-primary text-sm font-semibold capitalize">
                            {{ selectedDate.toLocaleDateString('es-ES', { weekday: 'long' }) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Timeline Grid -->
            <div class="relative flex flex-1">
                <!-- Hours Column (Y axis) -->
                <div class="border-border-subtle sticky left-0 z-30 w-16 shrink-0 border-r bg-bg-card/90 backdrop-blur-md">
                    <div 
                        v-for="hour in hours" 
                        :key="'label-'+hour" 
                        class="border-border-subtle relative flex h-24 items-start justify-end border-b pr-3">
                        <span class="text-text-muted absolute -top-2.5 bg-bg-card/80 px-1 text-[10px] font-bold tabular-nums">
                            {{ formatHour(hour) }}
                        </span>
                    </div>
                </div>

                <!-- Bookings Area -->
                <div class="relative flex-1" @click="handleGridClick">
                    <!-- Grid Lines -->
                    <div
                        v-for="hour in hours"
                        :key="'grid-'+hour"
                        class="border-border-subtle h-24 border-b border-dashed w-full opacity-50"></div>

                    <!-- Current Time Indicator -->
                    <div
                        v-if="currentTimePosition >= 0"
                        :style="{ top: `${currentTimePosition}px` }"
                        class="pointer-events-none absolute right-0 left-0 z-20 flex items-center">
                        <div class="bg-error h-2.5 w-2.5 -ml-1.5 animate-pulse rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <div class="bg-error/50 h-px flex-1 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></div>
                    </div>

                    <!-- Empty State Indicator for Debugging -->
                    <div v-if="processedBookings.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                        <span class="text-xs font-bold uppercase tracking-widest text-text-muted">No hay citas para este día</span>
                    </div>

                    <!-- Bookings -->
                    <button
                        v-for="booking in processedBookings"
                        :key="booking.booking_id"
                        class="booking-card group absolute ml-1 cursor-pointer overflow-hidden rounded-xl border p-2 transition-all hover:z-50 hover:shadow-md"
                        :class="getStatusColor(booking.status)"
                        :style="getBookingStyle(booking)"
                        @click.stop="emit('edit', booking)">
                        
                        <!-- Left Status Strip -->
                        <div
                            class="absolute top-0 bottom-0 left-0 w-1 opacity-80"
                            :class="getStatusStrip(booking.status)"></div>

                        <!-- Content Layout -->
                        <div class="flex h-full flex-col overflow-hidden pl-2">
                            <!-- Header Row -->
                            <div class="flex items-start justify-between gap-1 shrink-0">
                                <h4 class="truncate font-bold tracking-tight text-xs leading-tight">
                                    {{ booking.client?.name }} {{ booking.client?.surname }}
                                </h4>

                                <!-- Action Dropdown -->
                                <div class="dropdown dropdown-end" @click.stop>
                                    <button
                                        tabindex="0"
                                        class="btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical class="h-3 w-3" />
                                    </button>
                                    <ul
                                        tabindex="0"
                                        class="dropdown-content menu bg-bg-card text-text-secondary border-border-default z-[100] mt-1 w-36 rounded-xl border p-1 shadow-xl">
                                        <li><a class="text-[11px] py-1.5" @click.stop="emit('status', booking.booking_id, 'confirmed')"><CheckCircle2 class="text-info h-3 w-3" /> Confirmar</a></li>
                                        <li><a class="text-[11px] py-1.5" @click.stop="emit('status', booking.booking_id, 'completed')"><CheckCircle2 class="text-success h-3 w-3" /> Finalizar</a></li>
                                        <div class="divider my-0 opacity-30 h-1"></div>
                                        <li><a class="text-[11px] py-1.5" @click.stop="emit('edit', booking)"><Pencil class="h-3 w-3" /> Editar</a></li>
                                        <li><a class="text-error text-[11px] py-1.5" @click.stop="emit('delete', booking.booking_id)"><Trash2 class="h-3 w-3" /> Eliminar</a></li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Meta Info (Time & Staff) -->
                            <div class="flex items-center gap-2 mt-0.5 shrink-0 opacity-80">
                                <span class="flex items-center gap-1 text-[9px] font-bold tabular-nums">
                                    <Clock class="h-2.5 w-2.5" />
                                    {{ booking.start_time }}
                                </span>
                                <span v-if="booking.staff" class="flex items-center gap-1 text-[9px] font-semibold truncate">
                                    <UserIcon class="h-2.5 w-2.5" />
                                    <span class="truncate max-w-[60px]">{{ booking.staff.name }}</span>
                                </span>
                            </div>

                            <!-- Services Info (Only if tall enough) -->
                            <div v-if="booking.duration > 30 && booking.booking_items?.length" class="mt-1.5 overflow-hidden">
                                <div v-for="item in booking.booking_items.slice(0, 2)" :key="item.id" 
                                    class="text-[9px] opacity-70 flex items-center gap-1 truncate mt-0.5">
                                    <Scissors v-if="item.item_type === 'SERVICE'" class="h-2 w-2 shrink-0" />
                                    <span class="truncate">{{ item.name }}</span>
                                </div>
                                <div v-if="booking.booking_items.length > 2" class="text-[9px] opacity-50 mt-0.5 italic">
                                    +{{ booking.booking_items.length - 2 }} más
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
