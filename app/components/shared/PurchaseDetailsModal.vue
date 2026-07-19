<script setup lang="ts">
import { ref } from 'vue'
import { usePurchaseModal } from '~/composables/usePurchaseModal'
import PurchaseModalHeader from './PurchaseModalHeader.vue'
import PurchaseModalView from './PurchaseModalView.vue'
import PurchaseModalSearch from './PurchaseModalSearch.vue'
import PurchaseModalEdit from './PurchaseModalEdit.vue'

const emit = defineEmits(['success'])
const modalRef = ref<HTMLDialogElement | null>(null)

// Initialize Composable
const {
    cart,
    isSearching,
    isEditingItems,
    searchQuery,
    selectedClientToAssign,
    tempItems,
    tempTotal,
    clients,
    isSearchingClients,
    catalogItems,
    isSearchingItems,
    assignClient,
    isAssigningClient,
    saveItems,
    isSavingItems
} = usePurchaseModal(emit as any)

// Modal Controller Methods
const open = (cartData: any) => {
  cart.value = JSON.parse(JSON.stringify(cartData)) // Deep clone for safety
  isSearching.value = false
  isEditingItems.value = false
  searchQuery.value = ''
  selectedClientToAssign.value = null
  tempItems.value = []
  modalRef.value?.showModal()
}

const close = () => {
  modalRef.value?.close()
  setTimeout(() => { cart.value = null }, 300)
}

// Handlers for View Actions
const startEditingItems = () => {
  tempItems.value = JSON.parse(JSON.stringify(cart.value.items))
  isEditingItems.value = true
  isSearching.value = false
}

const startClientSearch = () => {
    isSearching.value = true
}

const removeAssignedClient = () => {
    if (confirm('¿Estás seguro de que deseas quitar este cliente de la venta?')) {
        assignClient(null)
    }
}

const editAssignedClient = () => {
    selectedClientToAssign.value = cart.value.user
    isSearching.value = true
}

// Handlers for Search Actions
const selectClient = (client: any) => {
  selectedClientToAssign.value = client
}

const confirmAssignment = () => {
  if (selectedClientToAssign.value) {
    assignClient(selectedClientToAssign.value.user_id)
  }
}

const addNewItem = (item: any) => {
  const existing = tempItems.value.find(i => i.item_id === item.item_id)
  if (existing) {
    existing.quantity++
  } else {
    tempItems.value.push({
      item_id: item.item_id,
      item_type: item.item_type,
      name: item.name,
      unit_price: item.price,
      tax_rate: item.tax_rate || 21.0,
      quantity: 1
    })
  }
  isSearching.value = false
  searchQuery.value = ''
}

const cancelSearch = () => {
  isSearching.value = false
  searchQuery.value = ''
  selectedClientToAssign.value = null
}

// Handlers for Edit Actions
const updateQuantity = (index: number, delta: number) => {
  const item = tempItems.value[index]
  if (!item) return
  const newQty = item.quantity + delta
  if (newQty > 0) {
    item.quantity = newQty
  } else {
    tempItems.value.splice(index, 1)
  }
}

const cancelEditingItems = () => {
  isEditingItems.value = false
  isSearching.value = false
  tempItems.value = []
}

const confirmItemChanges = () => {
  if (tempItems.value.length === 0) {
    if (!confirm('¿Seguro que deseas eliminar todos los ítems de esta venta?')) return
  }
  saveItems(tempItems.value)
}

defineExpose({ open, close })
</script>

<template>
  <dialog ref="modalRef" class="modal modal-bottom sm:modal-middle z-50">
    <div v-if="cart" class="modal-box bg-bg-app border-border-subtle p-0 sm:max-w-2xl sm:rounded-3xl border shadow-2xl">
      <!-- Header Component -->
      <PurchaseModalHeader 
        :cart="cart"
        @close="close" 
      />

      <div class="p-6">
         <!-- Details View Component -->
         <PurchaseModalView 
            v-if="!isSearching && !isEditingItems"
            :cart="cart"
            @edit-items="startEditingItems"
            @search-client="startClientSearch"
            @remove-client="removeAssignedClient"
            @edit-client="editAssignedClient"
         />

         <!-- Search Mode View (Compatible with Clients & Items) -->
         <PurchaseModalSearch
            v-else-if="isSearching"
            v-model:search-query="searchQuery"
            :is-editing-items="isEditingItems"
            :is-searching-clients="isSearchingClients"
            :clients="clients"
            :selected-client-to-assign="selectedClientToAssign"
            :is-searching-items="isSearchingItems"
            :catalog-items="catalogItems"
            :is-assigning-client="isAssigningClient"
            @cancel="cancelSearch"
            @select-client="selectClient"
            @assign-client="confirmAssignment"
            @add-new-item="addNewItem"
         />

         <!-- Items Editing Mode View -->
         <PurchaseModalEdit
            v-else-if="isEditingItems"
            :cart="cart"
            :temp-items="tempItems"
            :temp-total="tempTotal"
            :is-saving-items="isSavingItems"
            @cancel="cancelEditingItems"
            @search-items="isSearching = true"
            @update-quantity="updateQuantity"
            @confirm-changes="confirmItemChanges"
         />
      </div>
    </div>
    
    <form method="dialog" class="modal-backdrop">
      <button @click.prevent="close">Cerrar</button>
    </form>
  </dialog>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 99px;
}
</style>
