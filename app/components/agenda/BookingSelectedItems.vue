<script setup lang="ts">
import { computed } from 'vue'
import { Scissors, Ticket, Package, Gift, Trash2 } from 'lucide-vue-next'
import type { BookingItemData } from '~/composables/useBookingForm'

const props = defineProps<{
    items: BookingItemData[]
}>()

const emit = defineEmits<{
    (e: 'update:items', items: BookingItemData[]): void
}>()

const groupedItems = computed(() => {
    const groups: { item: BookingItemData, indices: number[], count: number }[] = []
    props.items.forEach((item, index) => {
        const existing = groups.find(g => g.item.item_type === item.item_type && g.item.item_id === item.item_id)
        if (existing) {
            existing.indices.push(index)
            existing.count++
        } else {
            groups.push({ item, indices: [index], count: 1 })
        }
    })
    return groups
})

const addGroupItem = (item: BookingItemData) => {
    const newItems = [...props.items, { ...item }]
    emit('update:items', newItems)
}

const removeItem = (index: number) => {
    const newItems = [...props.items]
    newItems.splice(index, 1)
    emit('update:items', newItems)
}

const removeGroup = (indices: number[]) => {
    const newItems = [...props.items]
    const sorted = [...indices].sort((a, b) => b - a)
    sorted.forEach(idx => {
        newItems.splice(idx, 1)
    })
    emit('update:items', newItems)
}
</script>

<template>
    <div class="flex flex-col gap-2 mt-2">
        <div v-for="(group, idx) in groupedItems" :key="idx" 
            class="bg-bg-card border border-border-default p-3 rounded-xl flex items-center justify-between group shadow-sm transition-all hover:border-primary/30">
            <div class="flex items-center gap-3">
                <Scissors v-if="group.item.item_type === 'SERVICE'" class="h-4 w-4 text-primary" />
                <Ticket v-else-if="group.item.item_type === 'BONUS'" class="h-4 w-4 text-info" />
                <Package v-else-if="group.item.item_type === 'PACK'" class="h-4 w-4 text-success" />
                <Gift v-else class="h-4 w-4 text-warning" />
                
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-text-primary uppercase tracking-tight">{{ group.item.name }}</span>
                    <span class="text-[10px] text-text-muted font-bold tabular-nums">{{ group.item.duration }} min c/u</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                    <button type="button" @click="removeItem(group.indices[group.indices.length - 1]!)" aria-label="Decrease Quantity" class="w-6 h-6 flex items-center justify-center rounded-lg bg-bg-muted hover:bg-border-default/60 text-text-primary text-xs font-extrabold transition-colors">
                        -
                    </button>
                    <span class="w-6 text-center text-xs font-bold tabular-nums text-text-primary">
                        {{ group.count }}
                    </span>
                    <button type="button" @click="addGroupItem(group.item)" aria-label="Increase Quantity" class="w-6 h-6 flex items-center justify-center rounded-lg bg-bg-muted hover:bg-border-default/60 text-text-primary text-xs font-extrabold transition-colors">
                        +
                    </button>
                </div>
                <button type="button" @click="removeGroup(group.indices)" class="text-text-muted hover:text-error transition-colors p-1 opacity-50 group-hover:opacity-100">
                    <Trash2 class="h-4 w-4" />
                </button>
            </div>
        </div>
        <div v-if="items.length === 0" class="text-xs text-text-muted italic p-2 opacity-60 border border-dashed border-border-subtle rounded-xl text-center py-6">
            Ningún servicio seleccionado
        </div>
    </div>
</template>
