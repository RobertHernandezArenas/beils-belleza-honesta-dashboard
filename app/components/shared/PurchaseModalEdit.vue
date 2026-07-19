<script setup lang="ts">
import { ArrowLeft, Plus, ShieldOff, ShoppingBag, Minus } from 'lucide-vue-next'

const props = defineProps<{
    cart: any
    tempItems: any[]
    tempTotal: number
    isSavingItems: boolean
}>()

const emit = defineEmits<{
    (e: 'cancel'): void
    (e: 'searchItems'): void
    (e: 'updateQuantity', index: number, delta: number): void
    (e: 'confirmChanges'): void
}>()
</script>

<template>
  <div class="space-y-6 animate-slide-right min-h-[450px] flex flex-col">
    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <button @click="emit('cancel')" class="btn btn-circle btn-ghost btn-sm bg-bg-muted/50 hover:bg-bg-muted">
                <ArrowLeft class="w-4 h-4" />
            </button>
            <h3 class="text-text-primary font-bold text-lg">Editando Ítems</h3>
        </div>
        <button @click="emit('searchItems')" class="btn btn-sm btn-primary rounded-xl gap-2 font-bold shadow-sm shadow-primary/20">
            <Plus class="w-4 h-4" /> Añadir Concepto
        </button>
    </div>

    <!-- AEAT Warning if submitted -->
    <div v-if="cart.aeat_status === 'submitted'" class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
        <div class="bg-amber-100 p-2 rounded-lg text-amber-600">
            <ShieldOff class="w-4 h-4" />
        </div>
        <div class="flex-1">
            <p class="text-amber-800 text-xs font-bold uppercase tracking-wider">Aviso de Cumplimiento Fiscal</p>
            <p class="text-amber-700 text-[10px] mt-0.5 leading-relaxed">
                Esta venta ya ha sido enviada a la AEAT (Veri*Factu). Modificar los conceptos después de la sumisión puede requerir una factura rectificativa manual. Use esta opción con precaución.
            </p>
        </div>
    </div>

    <!-- Current Session Cart -->
    <div class="flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        <div v-if="tempItems.length === 0" class="flex flex-col items-center justify-center py-16 opacity-40">
            <ShoppingBag class="w-16 h-16 mb-4" />
            <p class="font-bold tracking-widest uppercase text-xs">El carrito está vacío</p>
            <p class="text-[10px] mt-1">Añade servicios o productos usando el buscador</p>
        </div>
        <div v-else class="space-y-3">
            <div v-for="(item, idx) in tempItems" :key="idx" class="bg-bg-card border-border-subtle rounded-2xl border p-4 flex justify-between items-center shadow-sm relative group">
                <div class="flex-1 min-w-0 pr-4">
                    <p class="text-text-primary text-sm font-bold truncate">{{ item.name }}</p>
                    <p class="text-text-muted text-[10px] font-medium mt-0.5 uppercase tracking-wider">{{ item.item_type }} • {{ item.unit_price.toFixed(2) }}€/ud</p>
                </div>
                
                <div class="flex items-center gap-3 shrink-0">
                    <div class="flex items-center gap-2 bg-bg-muted/50 rounded-xl p-1">
                        <button @click="emit('updateQuantity', idx, -1)" class="btn btn-xs btn-circle bg-white border-bg-muted/30 shadow-xs hover:bg-bg-muted h-7 w-7 text-xs">
                            <Minus class="w-3 h-3" />
                        </button>
                        <span class="w-6 text-center text-sm font-black tabular-nums">{{ item.quantity }}</span>
                        <button @click="emit('updateQuantity', idx, 1)" class="btn btn-xs btn-circle bg-white border-bg-muted/30 shadow-xs hover:bg-bg-muted h-7 w-7 text-xs">
                            <Plus class="w-3 h-3" />
                        </button>
                    </div>
                    <span class="text-text-primary font-black tabular-nums min-w-[60px] text-right">{{ (item.unit_price * item.quantity).toFixed(2) }}€</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Editor Totals Footer -->
    <div class="pt-5 border-t border-border-subtle bg-bg-app/50 space-y-4">
        <div class="flex items-center justify-between px-2">
            <div class="flex flex-col">
                <span class="text-text-muted text-[10px] font-black uppercase tracking-widest">Previsualización de Total</span>
                <div class="flex items-end gap-2">
                    <span class="text-text-primary text-2xl font-black tabular-nums leading-none">{{ tempTotal.toFixed(2) }}€</span>
                    <span class="text-text-muted text-xs mb-0.5 line-through opacity-50" v-if="tempTotal !== cart.total">{{ cart.total.toFixed(2) }}€</span>
                </div>
            </div>
            <div class="flex gap-3">
                <button @click="emit('cancel')" class="btn btn-ghost rounded-xl">Descartar</button>
                <button 
                    @click="emit('confirmChanges')" 
                    :disabled="isSavingItems" 
                    class="btn btn-primary rounded-2xl px-10 h-12 font-black tracking-wider uppercase shadow-xl shadow-primary/30"
                >
                    <span v-if="isSavingItems" class="loading loading-spinner loading-xs"></span>
                    Guardar Cambios
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
