<script setup lang="ts">

import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { X, Crop, Upload } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  imageSrc: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue', 'crop'])

const cropperRef = ref<any>(null)

const handleClose = () => {
  emit('update:modelValue', false)
}

const handleCrop = () => {
  if (cropperRef.value) {
    const { canvas } = cropperRef.value.getResult()
    if (canvas) {
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          emit('crop', blob)
          handleClose()
        }
      }, 'image/jpeg', 0.9)
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <dialog :class="['modal z-9999', { 'modal-open': modelValue }]">
      <div class="modal-box w-11/12 max-w-2xl bg-bg-app border border-border-subtle p-0 overflow-hidden shadow-2xl flex flex-col h-fit">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border-subtle bg-bg-card p-4 shrink-0">
          <h3 class="text-text-primary flex items-center gap-2 text-lg font-bold tracking-tight">
            <Crop class="text-primary h-5 w-5" />
            Ajustar Fotografía
          </h3>
          <button @click="handleClose" class="btn btn-circle btn-ghost btn-sm text-text-muted hover:text-error transition-colors">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Cropper Area -->
        <div class="h-[500px] w-full bg-black shrink-0">
          <ClientOnly>
            <Cropper
              ref="cropperRef"
              class="h-full w-full"
              :src="imageSrc"
              :stencil-component="CircleStencil"
              :stencil-props="{ aspectRatio: 1 }"
              image-restriction="stencil"
              background-class="cropper-bg"
            />
          </ClientOnly>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-3 border-t border-border-subtle bg-bg-card p-4 shrink-0">
          <button @click="handleClose" class="btn btn-ghost text-text-muted font-bold hover:bg-bg-muted">
            Cancelar
          </button>
          <button @click="handleCrop" class="btn btn-primary font-bold shadow-md hover:scale-105 transition-transform">
            <Upload class="mr-2 h-4 w-4" />
            Recortar y Subir
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop bg-black/60 backdrop-blur-sm" @click="handleClose">
        <button>close</button>
      </form>
    </dialog>
  </Teleport>
</template>

<style scoped>
.cropper-bg {
  background-color: #000;
}
</style>
