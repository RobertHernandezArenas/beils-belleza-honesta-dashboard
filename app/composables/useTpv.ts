import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

export function useTpv() {
	const queryClient = useQueryClient()
	const { emitSync } = useSync()
	const route = useRoute()
	const router = useRouter()

	// Tab control
	const activeTab = ref<'products' | 'services' | 'bonuses'>('services')
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

	// Manejo de errores de avatar
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


	const { data: bonuses } = useQuery<any[]>({
		queryKey: ['bonuses-tpv'],
		queryFn: () => $fetch('/api/marketing/bonuses'),
	})

	const processedBookingId = ref<string | null>(null)

	// Promotions & Marketing State
	const clientBonuses = ref<any[]>([])


	const fetchClientBonuses = async (clientId: string) => {
		try {
			const data: any = await $fetch(`/api/clients/${clientId}/bonuses`)
			clientBonuses.value = data || []
		} catch (error) {
			console.error('Error fetching client bonuses:', error)
			clientBonuses.value = []
		}
	}

	watch(selectedClient, (newClient) => {
		avatarError.value = false
		if (newClient) {
			fetchClientBonuses(newClient.user_id)
		} else {
			clientBonuses.value = []
		}
	})



	// Watcher for booking param from URL
	watch([
		() => route.query.booking_id,
		() => services.value,
		() => bonuses.value,
		() => products.value,
		() => clients.value
	], async ([bookingId, svcs, bns, prds, cls]) => {
		if (!bookingId || typeof bookingId !== 'string' || processedBookingId.value === bookingId) return
		if (!svcs || !cls) return // Wait for crucial catalogs to load

		processedBookingId.value = bookingId

		try {
			const bookingData: any = await $fetch(`/api/agenda/bookings/${bookingId}`)
			if (!bookingData) return

			const client = cls.find((c: any) => c.user_id === bookingData.client_id)
			let currentClientBonuses: any[] = []
			if (client) {
				selectedClient.value = client
				try {
					currentClientBonuses = await $fetch(`/api/clients/${client.user_id}/bonuses`)
				} catch (e) {}
			}

			const itemsToAdd: any[] = []
			if (bookingData.booking_items && bookingData.booking_items.length > 0) {
				for (const it of bookingData.booking_items) {
					let foundItem: any = null
					let type = it.item_type.toLowerCase()
					let appliedBonusId: string | undefined = undefined
					
					if (type === 'service') {
						foundItem = svcs.find((s: any) => s.service_id === it.item_id)
						// Check if client has a bonus for this service
						if (foundItem) {
							const matchingBonus = currentClientBonuses.find(b => b.bonus?.service?.service_id === foundItem.service_id && b.remaining_sessions > 0)
							if (matchingBonus) {
								appliedBonusId = matchingBonus.client_bonus_id
								matchingBonus.remaining_sessions--
							}
						}
					} else if (type === 'pack') {
						foundItem = pks?.find((p: any) => p.pack_id === it.item_id)
					} else if (type === 'bonus') {
						foundItem = bns?.find((b: any) => b.bonus_id === it.item_id)
						// Fallback: If not a template, it might be an explicit ClientBonus from Agenda
						if (!foundItem && currentClientBonuses.length > 0) {
							const explicitBonus = currentClientBonuses.find(b => b.client_bonus_id === it.item_id)
							if (explicitBonus) {
								foundItem = explicitBonus.bonus?.service || {
									service_id: explicitBonus.client_bonus_id, // Fallback ID
									name: explicitBonus.bonus?.name || it.name,
									price: 0,
									tax_rate: 21.0
								}
								appliedBonusId = explicitBonus.client_bonus_id
								type = 'service'
								explicitBonus.remaining_sessions--
							}
						}
					} else if (type === 'product') {
						foundItem = prds?.find((p: any) => p.product_id === it.item_id)
					}

					if (foundItem) {
						const matchingId = foundItem.product_id || foundItem.service_id || foundItem.bonus_id || it.item_id
						const existingCartItem = itemsToAdd.find(i => i.item_id === matchingId && i.applied_client_bonus_id === appliedBonusId)
						
						if (existingCartItem) {
							existingCartItem.quantity++
						} else {
							itemsToAdd.push({
								item_id: matchingId,
								item_type: type,
								name: foundItem.name || it.name,
								unit_price: foundItem.price,
								tax_rate: foundItem.tax_rate || 21.0,
								quantity: 1,
								applied_client_bonus_id: appliedBonusId
							})
						}
					} else {
						const existingCartItem = itemsToAdd.find(i => i.item_id === it.item_id && i.applied_client_bonus_id === appliedBonusId)
						if (existingCartItem) {
							existingCartItem.quantity++
						} else {
							itemsToAdd.push({
								item_id: it.item_id,
								item_type: type,
								name: it.name,
								unit_price: 0,
								tax_rate: 21.0,
								quantity: 1,
								applied_client_bonus_id: appliedBonusId
							})
						}
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

	// Process checkout mutation
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
			
			queryClient.invalidateQueries({ queryKey: ['sales', 'completed'] })
			queryClient.invalidateQueries({ queryKey: ['debts'] })
			queryClient.invalidateQueries({ queryKey: ['clients-tpv'] })
			queryClient.invalidateQueries({ queryKey: ['bookings'] })
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

		if (activeTab.value === 'bonuses' && bonuses.value) {
			return bonuses.value.filter((b: any) => b.name.toLowerCase().includes(q))
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
		if (type === 'bonus') itemId = item.bonus_id
		else if (type === 'service') itemId = item.service_id
		else if (type === 'product') itemId = item.product_id
		else itemId = item.product_id || item.service_id || item.bonus_id

		const existing = cartItems.value.find(
			i => i.item_id === itemId,
		)

		if (existing) {
			existing.quantity++
		} else {
			cartItems.value.push({
				item_id: itemId,
				item_type: type,
				name: item.name,
				unit_price: item.price,
				tax_rate: item.tax_rate || 21.0,
				quantity: 1,
			})
		}
		searchQuery.value = ''
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
			if (item.applied_client_bonus_id) return acc
			return acc + item.unit_price * item.quantity
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
		clientBonuses,
		addToCart,
		removeFromCart,
		clearCart,
		selectClient,
		handleCheckout,
		handleAvatarError,
		formatCurrency,
		displayToast,
	}
}
