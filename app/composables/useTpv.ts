import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

export function useTpv() {
	const queryClient = useQueryClient()
	const { emitSync } = useSync()
	const route = useRoute()
	const router = useRouter()

	// Tab control
	const activeTab = ref<'products' | 'services' | 'packs' | 'bonuses'>('services')
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

	const { data: packs } = useQuery<any[]>({
		queryKey: ['packs-tpv'],
		queryFn: () => $fetch('/api/catalog/packs'),
	})

	const { data: bonuses } = useQuery<any[]>({
		queryKey: ['bonuses-tpv'],
		queryFn: () => $fetch('/api/marketing/bonuses'),
	})

	const processedBookingId = ref<string | null>(null)

	// Promotions & Marketing State
	const clientBonuses = ref<any[]>([])
	const promoCode = ref('')
	const appliedCouponCode = ref<string | undefined>(undefined)
	const appliedGiftcardCode = ref<string | undefined>(undefined)

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

	const validatePromoCode = async () => {
		if (!promoCode.value) return

		try {
			const res: any = await $fetch('/api/marketing/validate-code', {
				method: 'POST',
				body: {
					code: promoCode.value,
					cartTotal: cartSubtotal.value
				}
			})

			if (res.valid) {
				if (res.type === 'coupon') {
					appliedCouponCode.value = res.code
					appliedGiftcardCode.value = undefined
					discountAmount.value = res.discountAmount
				} else if (res.type === 'giftcard') {
					appliedGiftcardCode.value = res.code
					appliedCouponCode.value = undefined
					// If the giftcard has enough balance, it discounts the total cart amount.
					// If it has less, it discounts whatever balance is left.
					discountAmount.value = Math.min(res.balance, cartSubtotal.value)
				}
				displayToast(res.message, 'success')
				promoCode.value = ''
			}
		} catch (error: any) {
			displayToast(error.data?.statusMessage || 'Código inválido', 'error')
		}
	}

	const removePromoCode = () => {
		appliedCouponCode.value = undefined
		appliedGiftcardCode.value = undefined
		discountAmount.value = 0
	}

	// Watcher for booking param from URL
	watch([
		() => route.query.booking_id,
		() => services.value,
		() => packs.value,
		() => bonuses.value,
		() => products.value,
		() => clients.value
	], async ([bookingId, svcs, pks, bns, prds, cls]) => {
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
							if (explicitBonus && explicitBonus.bonus?.service) {
								foundItem = explicitBonus.bonus.service
								appliedBonusId = explicitBonus.client_bonus_id
								type = 'service'
								explicitBonus.remaining_sessions--
							}
						}
					} else if (type === 'product') {
						foundItem = prds?.find((p: any) => p.product_id === it.item_id)
					} else if (type === 'giftcard') {
						// Si agendaron un giftcard_usage, copiamos el ID al input de promo del TPV y descartamos el ítem
						promoCode.value = it.name?.includes('Tarjeta Regalo: ') ? it.name.split('Tarjeta Regalo: ')[1].split(' ')[0] : ''
						if (promoCode.value) {
							setTimeout(() => validatePromoCode(), 500)
						}
						continue // No se añade como ítem de venta
					}

					if (foundItem) {
						itemsToAdd.push({
							item_id: foundItem.product_id || foundItem.service_id || foundItem.pack_id || foundItem.bonus_id,
							item_type: type,
							name: foundItem.name,
							unit_price: foundItem.price,
							tax_rate: foundItem.tax_rate || 21.0,
							quantity: 1,
							applied_client_bonus_id: appliedBonusId
						})
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
		if (activeTab.value === 'packs' && packs.value) {
			return packs.value.filter(
				(p: any) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q),
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
		const existing = cartItems.value.find(
			i => i.item_id === (item.product_id || item.service_id || item.pack_id || item.bonus_id),
		)

		if (existing) {
			existing.quantity++
		} else {
			cartItems.value.push({
				item_id: item.product_id || item.service_id || item.pack_id || item.bonus_id,
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
			applied_coupon: appliedCouponCode.value,
			applied_giftcard: appliedGiftcardCode.value,
			applied_giftcard_amount: appliedGiftcardCode.value ? discountAmount.value : undefined,
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
		promoCode,
		appliedCouponCode,
		appliedGiftcardCode,
		addToCart,
		removeFromCart,
		clearCart,
		selectClient,
		handleCheckout,
		handleAvatarError,
		formatCurrency,
		displayToast,
		validatePromoCode,
		removePromoCode,
	}
}
