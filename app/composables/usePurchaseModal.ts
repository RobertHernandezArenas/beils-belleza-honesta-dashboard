import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useDebouncedRef } from '~/composables/useDebouncedRef'

export function usePurchaseModal(emit: any) {
  const queryClient = useQueryClient()
  
  const cart = ref<any>(null)
  const isSearching = ref(false)
  const isEditingItems = ref(false)
  const searchQuery = useDebouncedRef('', 400)
  const selectedClientToAssign = ref<any | null>(null)
  const tempItems = ref<any[]>([])

  // Live totals for editing
  const tempSubtotal = computed(() => tempItems.value.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0))
  const tempTotal = computed(() => Number((tempSubtotal.value - (cart.value?.discount || 0)).toFixed(2)))

  // Fetch clients for search
  const { data: clientSearchResults, isPending: isSearchingClients } = useQuery<any>({
    queryKey: ['clients-search', searchQuery],
    queryFn: () => $fetch('/api/clients', { query: { search: searchQuery.value, limit: 10 } }),
    enabled: computed(() => isSearching.value && !isEditingItems.value)
  })

  const clients = computed(() => clientSearchResults.value?.data || [])

  // Fetch items for search
  const { data: catalogResults, isPending: isSearchingItems } = useQuery<any>({
    queryKey: ['catalog-search', searchQuery],
    queryFn: async () => {
      const [prods, servs, packs, bonuses] = await Promise.all([
        $fetch<any[]>('/api/catalog/products'),
        $fetch<any[]>('/api/services'),
        $fetch<any[]>('/api/catalog/packs'),
        $fetch<any[]>('/api/marketing/bonuses')
      ])
      
      const q = searchQuery.value.toLowerCase()
      const all = [
        ...(prods || []).map(p => ({ ...p, item_type: 'product', item_id: p.product_id })),
        ...(servs || []).map(s => ({ ...s, item_type: 'service', item_id: s.service_id })),
        ...(packs || []).map(pk => ({ ...pk, item_type: 'pack', item_id: pk.pack_id })),
        ...(bonuses || []).map(b => ({ ...b, item_type: 'bonus', item_id: b.bonus_id }))
      ]
      
      if (!q) return all.slice(0, 10)
      return all.filter(i => i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q))
    },
    enabled: computed(() => isEditingItems.value && isSearching.value)
  })

  const catalogItems = computed(() => catalogResults.value || [])

  // Assign Client Mutation
  const { mutate: assignClient, isPending: isAssigningClient } = useMutation({
    mutationFn: (clientId: string | null) => 
      $fetch(`/api/sales/carts/${cart.value.cart_id}`, {
        method: 'PUT',
        body: { user_id: clientId }
      }),
    onSuccess: (updatedCart: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      cart.value = { 
        ...cart.value, 
        user_id: updatedCart.user_id, 
        user: updatedCart.user_id ? selectedClientToAssign.value : null 
      }
      isSearching.value = false
      emit('success')
    }
  })

  // Save Items Mutation
  const { mutate: saveItems, isPending: isSavingItems } = useMutation({
    mutationFn: (items: any[]) => 
      $fetch(`/api/sales/carts/${cart.value.cart_id}`, {
        method: 'PUT',
        body: { items }
      }),
    onSuccess: (updatedCart: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      cart.value = { ...cart.value, ...updatedCart }
      isEditingItems.value = false
      emit('success')
    }
  })

  return {
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
  }
}
