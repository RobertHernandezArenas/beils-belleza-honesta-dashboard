import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

export function useTpv() {
	const queryClient = useQueryClient()
	const { emitSync } = useSync()
	const { notifySalesChanged } = useRealtimeSales()
	const route = useRoute()
	const router = useRouter()

	// Tab control
	const activeTab = ref<'products' | 'services'>('services')
	const searchQuery = ref('')
	const clientSearch = ref('')

	// Cart State
	const cartItems = ref<any[]>([])
	const selectedClient = ref<any | null>(null)
	const discountAmount = ref<number>(0)
	const paymentMethod = ref<'cash' | 'card' | 'mixed' | 'debt' | 'bizum' | 'transfer'>('card')

	// Toast State
	const toastMessage = ref('')
	const toastType = ref<'success' | 'error'>('success')
	const showToast = ref(false)

	// Avatar Error Handling
	const avatarError = ref(false)
	const handleAvatarError = () => {
		avatarError.value = true
	}

	watch(selectedClient, () => {
		avatarError.value = false
	})

	// Fetch Data
	const { data: clientsResponse } = useQuery<any>({
		queryKey: ['clients-tpv'],
		queryFn: () => $fetch('/api/clients', { query: { limit: 500 } }),
	})

	const clients = computed(() => clientsResponse.value?.data || [])

	const { data: products } = useQuery<any[]>({
		queryKey: ['products-tpv'],
		queryFn: () => $fetch('/api/catalog/products'),
	})

	const { data: services } = useQuery<any[]>({
		queryKey: ['services-tpv'],
		queryFn: () => $fetch('/api/services'),
	})

	const processedBookingId = ref<string | null>(null)

	watch([
		() => route.query.booking_id,
		() => services.value,
		() => products.value,
		() => clients.value
	], async ([bookingId, svcs, prds, cls]) => {
		if (!bookingId || typeof bookingId !== 'string' || processedBookingId.value === bookingId) return

		processedBookingId.value = bookingId

		try {
			const bookingData: any = await $fetch(`/api/agenda/bookings/${bookingId}`)
			if (!bookingData) return

			// 1. Set Selected Client (Reliably!)
			if (bookingData.client && (bookingData.client.user_id || bookingData.client_id)) {
				selectedClient.value = {
					user_id: bookingData.client.user_id || bookingData.client_id,
					name: bookingData.client.name || 'Cliente',
					surname: bookingData.client.surname || '',
					email: bookingData.client.email || '',
					phone: bookingData.client.phone || '',
					avatar: bookingData.client.avatar || null
				}
			} else if (bookingData.client_id) {
				const found = (cls || []).find((c: any) => c.user_id === bookingData.client_id)
				if (found) {
					selectedClient.value = found
				} else {
					try {
						const directClient: any = await $fetch(`/api/clients/${bookingData.client_id}`)
						if (directClient) selectedClient.value = directClient
					} catch (e) {
						console.error('Failed fallback client fetch:', e)
					}
				}
			}

			// 2. Set Cart Items from Booking Items
			const itemsToAdd: any[] = []
			if (bookingData.booking_items && bookingData.booking_items.length > 0) {
				for (const it of bookingData.booking_items) {
					let foundItem: any = null
					let type = (it.item_type || 'service').toLowerCase()
					
					if (type === 'service') {
						foundItem = (svcs || []).find((s: any) => s.service_id === it.item_id)
					} else if (type === 'product') {
						foundItem = (prds || []).find((p: any) => p.product_id === it.item_id)
					}

					let unitPrice = 0
					if (type === 'package' || (it.name && (it.name.includes('[SESIÓN BONO]') || it.name.includes('[BONO MIXTO]')))) {
						unitPrice = 0 // Package session is 0 EUR in TPV
					} else if (foundItem) {
						unitPrice = Number(foundItem.price || 0)
					} else {
						unitPrice = 0
					}

					const itemName = it.name || foundItem?.name || 'Servicio'
					const matchingId = it.item_id || foundItem?.product_id || foundItem?.service_id || 'item'

					const existingCartItem = itemsToAdd.find(i => i.item_id === matchingId && i.name === itemName)
					
					if (existingCartItem) {
						existingCartItem.quantity++
					} else {
						itemsToAdd.push({
							item_id: matchingId,
							item_type: type,
							name: itemName,
							unit_price: unitPrice,
							tax_rate: foundItem?.tax_rate || 21.0,
							quantity: 1
						})
					}
				}
			}

			if (itemsToAdd.length > 0) {
				cartItems.value = itemsToAdd
			}

			router.replace({ query: { ...route.query, booking_id: undefined } })
			displayToast('Cita cargada correctamente en el TPV', 'success')
		} catch (error) {
			console.error('Error al cargar la cita en el TPV:', error)
			displayToast('Error al cargar la cita en el TPV', 'error')
		}
	}, { immediate: true })

	// Process Checkout Mutation
	const { mutate: processSale, isPending: isCheckingOut } = useMutation({
		mutationFn: async (payload: any) => {
			const res: any = await $fetch('/api/sales/carts', {
				method: 'POST',
				body: payload,
			})

			if (paymentMethod.value === 'debt' && selectedClient.value) {
				await $fetch('/api/sales/debts', {
					method: 'POST',
					body: {
						user_id: selectedClient.value.user_id,
						cart_id: res.cart_id,
						amount: res.total,
						status: 'pending',
					},
				})
			}

			return res
		},
		onSuccess: () => {
			displayToast('Venta registrada con éxito', 'success')
			
			if (selectedClient.value?.user_id) {
				emitSync({ 
					type: 'REFRESH_CLIENT', 
					clientId: selectedClient.value.user_id 
				})
			}
			
			// Real-time refresh of every sales/collection view (this tab + broadcast to others)
			notifySalesChanged()
			// Client-specific caches touched by a sale
			queryClient.invalidateQueries({ queryKey: ['clients-tpv'] })
			queryClient.invalidateQueries({ queryKey: ['clients-agenda'] })
			queryClient.invalidateQueries({ queryKey: ['client-packages-agenda'] })
			clearCart()
		},
		onError: (error: any) => {
			displayToast(error.data?.statusMessage || 'Error al procesar la venta', 'error')
		},
	})

	// Filtered Lists
	const filteredCatalog = computed(() => {
		const q = searchQuery.value.toLowerCase()

		if (activeTab.value === 'products' && products.value) {
			return products.value.filter(
				(p: any) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
			)
		}
		if (activeTab.value === 'services' && services.value) {
			return services.value.filter(
				(s: any) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q),
			)
		}
		return []
	})

	const filteredClients = computed(() => {
		if (!clients.value.length || !clientSearch.value) return []
		const q = clientSearch.value.toLowerCase()
		return clients.value
			.filter(
				(c: any) =>
					c.name.toLowerCase().includes(q) ||
					c.surname.toLowerCase().includes(q) ||
					c.phone?.includes(q) ||
					c.document_number?.toLowerCase().includes(q),
			)
			.slice(0, 5)
	})

	// Cart Operations
	const addToCart = (item: any, type: string) => {
		let itemId = ''
		if (type === 'service') itemId = item.service_id
		else if (type === 'product') itemId = item.product_id
		else itemId = item.product_id || item.service_id

		const existing = cartItems.value.find(
			i => i.item_id === itemId
		)

		if (existing) {
			existing.quantity++
		} else {
			cartItems.value.push({
				item_id: itemId,
				item_type: type,
				name: item.name,
				unit_price: Number(item.price || 0),
				tax_rate: item.tax_rate || 21.0,
				quantity: 1,
			})
		}
		searchQuery.value = ''
	}

	const increaseItemQty = (index: number) => {
		const item = cartItems.value[index]
		if (item) item.quantity++
	}

	const decreaseItemQty = (index: number) => {
		const item = cartItems.value[index]
		if (!item) return
		if (item.quantity > 1) {
			item.quantity--
		} else {
			cartItems.value.splice(index, 1)
		}
	}

	const removeFromCart = (index: number) => {
		cartItems.value.splice(index, 1)
	}

	const clearCart = () => {
		cartItems.value = []
		selectedClient.value = null
		discountAmount.value = 0
		paymentMethod.value = 'card'
		processedBookingId.value = null
	}

	const selectClient = (client: any) => {
		selectedClient.value = client
		clientSearch.value = ''
	}

	// Computed Totals
	const cartSubtotal = computed(() => {
		return cartItems.value.reduce((acc, item) => {
			return acc + (item.unit_price || 0) * item.quantity
		}, 0)
	})

	const cartTotal = computed(() => {
		const total = cartSubtotal.value - discountAmount.value
		return total > 0 ? total : 0
	})

	// Perform Checkout
	const handleCheckout = () => {
		if (cartItems.value.length === 0) return

		if (paymentMethod.value === 'debt' && !selectedClient.value) {
			displayToast('Selecciona un cliente para dejar a deber.', 'error')
			return
		}

		processSale({
			user_id: selectedClient.value?.user_id,
			status: paymentMethod.value === 'debt' ? 'pending' : 'completed',
			payment_method: paymentMethod.value,
			discount: discountAmount.value,
			items: cartItems.value,
			booking_id: processedBookingId.value || undefined,
		})
	}

	const displayToast = (message: string, type: 'success' | 'error') => {
		toastMessage.value = message
		toastType.value = type
		showToast.value = true
		setTimeout(() => (showToast.value = false), 3000)
	}

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)
	}

	return {
		activeTab,
		searchQuery,
		clientSearch,
		cartItems,
		selectedClient,
		discountAmount,
		paymentMethod,
		toastMessage,
		toastType,
		showToast,
		avatarError,
		filteredCatalog,
		filteredClients,
		cartSubtotal,
		cartTotal,
		isCheckingOut,
		addToCart,
		removeFromCart,
		increaseItemQty,
		decreaseItemQty,
		clearCart,
		selectClient,
		handleCheckout,
		handleAvatarError,
		formatCurrency,
		displayToast,
	}
}
