<script setup lang="ts">
import { 
  User, 
  CalendarDays, 
  FileText, 
  CreditCard,
  Settings
} from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  counts: {
    type: Object as PropType<Record<string, number>>,
    default: () => ({ bookings: 0, documents: 0, debts: 0 })
  }
})

const emit = defineEmits(['update:modelValue'])

const tabs = [
  { id: 'overview', name: 'Resumen', icon: User },
  { id: 'bookings', name: 'Historial de Citas', icon: CalendarDays, count: 'bookings' },
  { id: 'documents', name: 'Documentos y Formularios', icon: FileText, count: 'documents' },
  { id: 'billing', name: 'Facturación y Deudas', icon: CreditCard, count: 'debts' },
]

const setActiveTab = (id: string) => {
  emit('update:modelValue', id)
}
</script>

<template>
  <div class="border-border-subtle bg-bg-card flex w-full gap-2 border-b px-6 lg:px-10 overflow-x-auto no-scrollbar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      @click="setActiveTab(tab.id)"
      class="group relative flex items-center gap-2 border-b-2 py-5 px-4 text-sm font-bold transition-all duration-300 whitespace-nowrap"
      :class="modelValue === tab.id 
        ? 'border-primary text-primary' 
        : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-muted/50'"
    >
      <component :is="tab.icon" class="h-4 w-4" />
      {{ tab.name }}
      
      <span 
        v-if="tab.count && (counts?.[tab.count] ?? 0) > 0"
        class="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black uppercase ring-1 ring-inset transition-all"
        :class="modelValue === tab.id 
          ? 'bg-primary/10 text-primary ring-primary/20' 
          : 'bg-bg-muted text-text-muted ring-border-default group-hover:bg-primary/5 group-hover:text-primary'"
      >
        {{ counts?.[tab.count] }}
      </span>

      <!-- Active indicator bar -->
      <div 
        v-if="modelValue === tab.id"
        class="bg-primary absolute bottom-0 left-0 h-0.5 w-full rounded-full shadow-[0_-2px_8px_rgba(var(--color-primary-rgb),0.3)]"
      ></div>
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
