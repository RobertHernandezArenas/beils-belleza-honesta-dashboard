import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

export function useTpv() {
	const queryClient = useQueryClient()
	const { emitSync } = useSync()
	const { notifySalesChanged } = useRealtimeSales()
	const route = useRoute()
	const router = useRouter()

	// Tab control
	const activeTab = ref<'products' | 'services' | 'packages'>('services')
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

	// Sellable bonos/packages catalog
	const { data: packages } = useQuery<any[]>({
		queryKey: ['packages-tpv'],
		queryFn: () => $fetch('/api/packages'),
	})

	// Active bonos/packages owned by the selected client (for consuming sessions)
	const { data: clientPackages } = useQuery<any[]>({
		queryKey: ['client-packages-tpv', computed(() => selectedClient.value?.user_id)],
		queryFn: async () => {
			const id = selectedClient.value?.user_id
			if (!id) return []
			return await $fetch<any[]>(`/api/clients/${id}/packages`)
		},
		enabled: computed(() => !!selectedClient.value?.user_id),
	})

	const processedBookingId = ref<string | null>(null)

	watch([
		() => route.query.booking_id,
		() => services.value,
		() => products.value,
		() => packages.value,
		() => clients.value
	], async ([bookingId, svcs, prds, pkgs, cls]) => {
		if (!bookingId || typeof bookingId !== 'string' || processedBookingId.value === bookingId) return

		// Wait until the catalog is loaded before resolving booking items. Prices come
		// exclusively from the live catalog (booking_items store no price), so processing
		// too early would set every unit_price to 0 and produce a 0,00 € ticket.
		// The watch re-fires when services/products/packages arrive, so we simply defer.
		if (!svcs || !prds || !pkgs) return

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
					const type = (it.item_type || 'service').toLowerCase()
					
					if (type === 'service') {
						foundItem = (svcs || []).find((s: any) => s.service_id === it.item_id)
					} else if (type === 'product') {
						foundItem = (prds || []).find((p: any) => p.product_id === it.item_id)
					} else if (type === 'package_sale') {
						foundItem = (pkgs || []).find((p: any) => p.package_id === it.item_id)
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
			queryClient.invalidateQueries({ queryKey: ['client-packages-tpv'] })
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
		if (activeTab.value === 'packages' && packages.value) {
			return packages.value.filter(
				(p: any) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q),
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
		// A catalog package is SOLD (item_type 'package_sale'), not consumed.
		if (type === 'package') {
			addPackageSale(item)
			return
		}

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

	// Sell a bono/package from the catalog (assigned to the client on checkout)
	const addPackageSale = (pkg: any) => {
		const existing = cartItems.value.find(
			i => i.item_id === pkg.package_id && i.item_type === 'package_sale',
		)
		if (existing) {
			existing.quantity++
		} else {
			cartItems.value.push({
				item_id: pkg.package_id,
				item_type: 'package_sale',
				name: pkg.name,
				unit_price: Number(pkg.price || 0),
				tax_rate: pkg.tax_rate || 21.0,
				quantity: 1,
			})
		}
		searchQuery.value = ''
	}

	// Consume one session of a bono/package the client already owns (0 € line)
	const consumeClientPackage = (pkg: any) => {
		const remaining = Number(pkg.remaining_sessions || 0)
		const alreadyInCart = cartItems.value
			.filter(i => i.item_id === pkg.client_package_id && i.item_type === 'package')
			.reduce((sum, i) => sum + i.quantity, 0)
		if (remaining - alreadyInCart <= 0) {
			displayToast('Este bono no tiene sesiones disponibles', 'error')
			return
		}

		const existing = cartItems.value.find(
			i => i.item_id === pkg.client_package_id && i.item_type === 'package',
		)
		if (existing) {
			existing.quantity++
		} else {
			cartItems.value.push({
				item_id: pkg.client_package_id,
				item_type: 'package',
				name: `[SESIÓN BONO] ${pkg.name}`,
				unit_price: 0,
				tax_rate: 0,
				quantity: 1,
			})
		}
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

		// Selling a bono/package assigns it to a person -> a registered client is required
		const hasPackageSale = cartItems.value.some(i => i.item_type === 'package_sale')
		if (hasPackageSale && !selectedClient.value?.user_id) {
			displayToast('Selecciona un cliente registrado para vender un bono o paquete', 'error')
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
		clientPackages,
		cartSubtotal,
		cartTotal,
		isCheckingOut,
		addToCart,
		consumeClientPackage,
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
