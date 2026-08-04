import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useDebouncedRef } from '~/composables/useDebouncedRef'
import type { Sale, ClientDTO, CatalogItem } from '~~/shared/types/domain'
import type { IncomingLineItem } from '~~/shared/types/line-item'

export function usePurchaseModal(emit: (event: 'success') => void) {
  const queryClient = useQueryClient()
  
  const cart = ref<Sale | null>(null)
  const isSearching = ref(false)
  const isEditingItems = ref(false)
  const searchQuery = useDebouncedRef('', 400)
  const selectedClientToAssign = ref<Partial<ClientDTO> | null>(null)
  const tempItems = ref<IncomingLineItem[]>([])

  // Live totals for editing
  const tempSubtotal = computed(() => tempItems.value.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0))
  const tempTotal = computed(() => Number((tempSubtotal.value - (cart.value?.discount || 0)).toFixed(2)))

  // Fetch clients for search
  const { data: clientSearchResults, isPending: isSearchingClients } = useQuery<{ data: ClientDTO[] }>({
    queryKey: ['clients-search', searchQuery],
    queryFn: () => $fetch<{ data: ClientDTO[] }>('/api/clients', { query: { search: searchQuery.value, limit: 10 } }),
    enabled: computed(() => isSearching.value && !isEditingItems.value)
  })

  const clients = computed(() => clientSearchResults.value?.data || [])

  // Fetch items for search
  const { data: catalogResults, isPending: isSearchingItems } = useQuery<CatalogItem[]>({
    queryKey: ['catalog-search', searchQuery],
    queryFn: async () => {
      const [prods, servs, packs] = await Promise.all([
        $fetch<CatalogItem[]>('/api/catalog/products'),
        $fetch<CatalogItem[]>('/api/services'),
        $fetch<CatalogItem[]>('/api/packages')
      ])

      const q = searchQuery.value.toLowerCase()
      const all = [
        ...(prods || []).map(p => ({ ...p, item_type: 'product', item_id: p.product_id })),
        ...(servs || []).map(s => ({ ...s, item_type: 'service', item_id: s.service_id })),
        // Bonos / paquetes (item_type 'package_sale' matches the TPV bono-sale flow)
        ...(packs || []).map(pk => ({ ...pk, item_type: 'package_sale', item_id: pk.package_id, code: 'BONO' }))
      ]

      if (!q) return all.slice(0, 10)
      return all.filter(i => i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q))
    },
    enabled: computed(() => isEditingItems.value && isSearching.value)
  })

  const catalogItems = computed(() => catalogResults.value || [])

  // Assign ClientDTO Mutation
  const { mutate: assignClient, isPending: isAssigningClient } = useMutation({
    mutationFn: (clientId: string | null) => 
      $fetch<Sale>(`/api/sales/carts/${cart.value!.cart_id}`, {
        method: 'PUT',
        body: { user_id: clientId }
      }),
    onSuccess: (updatedCart: Sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      cart.value = { ...cart.value!, 
        user_id: updatedCart.user_id, 
        user: updatedCart.user_id ? selectedClientToAssign.value : null 
      }
      isSearching.value = false
      emit('success')
    }
  })

  // Save Items Mutation
  const { mutate: saveItems, isPending: isSavingItems } = useMutation({
    mutationFn: (items: IncomingLineItem[]) => 
      $fetch<Sale>(`/api/sales/carts/${cart.value!.cart_id}`, {
        method: 'PUT',
        body: { items }
      }),
    onSuccess: (updatedCart: Sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      // A bono line may have provisioned a ClientPackage — refresh everywhere it's shown
      queryClient.invalidateQueries({ queryKey: ['client-packages-agenda'] })
      queryClient.invalidateQueries({ queryKey: ['client-packages-tpv'] })
      queryClient.invalidateQueries({ queryKey: ['client'] })
      cart.value = { ...cart.value!, ...updatedCart }
      isEditingItems.value = false
      emit('success')
    }
  })

  // Update Date Mutation
  const { mutate: updateDate, isPending: isUpdatingDate } = useMutation({
    mutationFn: (newDate: string) => 
      $fetch<Sale>(`/api/sales/carts/${cart.value!.cart_id}`, {
        method: 'PUT',
        body: { created_at: newDate }
      }),
    onSuccess: (updatedCart: Sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      cart.value = { ...cart.value!, created_at: updatedCart.created_at }
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
    isSavingItems,
    updateDate,
    isUpdatingDate
  }
}
