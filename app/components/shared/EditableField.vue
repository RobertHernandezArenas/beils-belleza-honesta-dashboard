<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Edit2, Check, X } from 'lucide-vue-next'
import gsap from 'gsap'

const props = defineProps({
  modelValue: {
    type: [String, Number, Date],
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text' // text, email, tel, date, select
  },
  options: {
    type: Array as PropType<{ label: string; value: string | number }[]>,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Editar...'
  },
  isMutating: {
    type: Boolean,
    default: false
  },
  formatDisplay: {
    type: Function,
    default: undefined
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const isEditing = ref(false)
const localValue = ref(props.modelValue)
const inputRef = ref<HTMLInputElement | HTMLSelectElement | null>(null)
const textContainerRef = ref<HTMLElement | null>(null)
const editContainerRef = ref<HTMLElement | null>(null)

watch(() => props.modelValue, (newVal) => {
  if (!isEditing.value) {
    localValue.value = newVal
  }
})

const displayValue = computed(() => {
  if (props.formatDisplay && props.modelValue) {
    return props.formatDisplay(props.modelValue)
  }
  if (props.type === 'select' && props.options.length) {
    const opt = props.options.find(o => o.value === props.modelValue)
    return opt ? opt.label : props.modelValue
  }
  return props.modelValue || '---'
})

const startEdit = () => {
  if (props.isMutating) return
  localValue.value = props.modelValue
  
  // Format date for date input if necessary
  if (props.type === 'date' && localValue.value) {
    try {
      const d = new Date(localValue.value as string)
      localValue.value = d.toISOString().split('T')[0] as string | number | Date
    } catch (e) {
      // ignore
    }
  }

  isEditing.value = true
  
  nextTick(() => {
    // GSAP animation for revealing the input
    if (textContainerRef.value && editContainerRef.value) {
      gsap.to(textContainerRef.value, { opacity: 0, scale: 0.95, duration: 0.2, display: 'none' })
      gsap.fromTo(editContainerRef.value, 
        { opacity: 0, scale: 0.95, display: 'none' }, 
        { opacity: 1, scale: 1, duration: 0.25, display: 'flex', ease: 'back.out(1.5)', onComplete: () => {
          inputRef.value?.focus()
        }}
      )
    } else {
       inputRef.value?.focus()
    }
  })
}

const cancelEdit = () => {
  isEditing.value = false
  animateBackToText()
}

const saveEdit = () => {
  if (localValue.value !== props.modelValue) {
    emit('update:modelValue', localValue.value)
    emit('save', localValue.value)
  }
  isEditing.value = false
  animateBackToText()
}

const animateBackToText = () => {
  nextTick(() => {
    if (textContainerRef.value && editContainerRef.value) {
      gsap.to(editContainerRef.value, { opacity: 0, scale: 0.95, duration: 0.2, display: 'none' })
      gsap.fromTo(textContainerRef.value, 
        { opacity: 0, scale: 0.95, display: 'none' }, 
        { opacity: 1, scale: 1, duration: 0.2, display: 'flex' }
      )
    }
  })
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') saveEdit()
  if (e.key === 'Escape') cancelEdit()
}
</script>

<template>
  <div class="group relative flex w-full flex-col min-h-6" :class="{ 'pointer-events-none opacity-50': isMutating }">
    <!-- Text Display State -->
    <div 
      ref="textContainerRef" 
      class="flex items-center gap-2 rounded-lg cursor-pointer transition-colors p-1 -m-1 hover:bg-bg-muted/50 w-fit"
      v-show="!isEditing"
      @click="startEdit"
    >
      <span class="truncate block">
        <slot name="display" :value="displayValue">
          {{ displayValue }}
        </slot>
      </span>
      <div class="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 text-primary rounded-md p-1 shrink-0">
        <Edit2 class="w-3 h-3" />
      </div>
    </div>

    <!-- Edit Input State -->
    <div 
      ref="editContainerRef" 
      class="hidden flex-col gap-1 w-full"
    >
      <div v-if="label" class="text-[10px] font-bold text-primary uppercase tracking-wider pl-1 mb-1">
        Editando: {{ label }}
      </div>
      <div class="flex items-center gap-2 w-full relative">
        <template v-if="type === 'select'">
          <select 
            ref="inputRef"
            v-model="localValue" 
            class="select select-sm w-full bg-bg-card border-primary focus:ring-primary/30 focus:border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.1)] transition-all font-medium text-text-primary"
            @blur="saveEdit"
            @keydown="handleKeyDown"
          >
            <option v-for="opt in options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </template>
        <template v-else>
          <input 
            ref="inputRef"
            v-model="localValue" 
            :type="type" 
            :placeholder="placeholder"
            class="input input-sm w-full bg-bg-card border-primary focus:ring-primary/30 focus:border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.1)] transition-all font-medium text-text-primary"
            @blur="saveEdit"
            @keydown="handleKeyDown"
          />
        </template>
        
        <!-- Actions (Absolute positioning for quick access without layout shift) -->
        <div class="absolute right-1 flex items-center gap-1 z-10" @mousedown.prevent>
          <button @click.prevent="saveEdit" class="btn btn-xs btn-circle btn-success text-white shadow-sm" title="Guardar">
            <Check class="w-3 h-3" />
          </button>
          <button @click.prevent="cancelEdit" class="btn btn-xs btn-circle btn-ghost text-error" title="Cancelar">
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
