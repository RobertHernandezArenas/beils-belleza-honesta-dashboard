import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Booking, ClientDTO, Sale, CatalogItem } from '~~/shared/types/domain'
import type { IncomingLineItem } from '~~/shared/types/line-item'
import type { ICoupon } from '~~/shared/types/marketing'
import { computeSaleDiscounts, normalizeDiscountKind, type DiscountKind } from '~~/shared/utils/discounts'

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
	const cartItems = ref<IncomingLineItem[]>([])
	const selectedClient = ref<Partial<ClientDTO> | null>(null)
	// Manual discount value; its unit (€ or %) is manualDiscountType
	const discountAmount = ref<number>(0)
	const manualDiscountType = ref<DiscountKind>('fixed')
	const couponCode = ref('')
	const appliedCoupon = ref<ICoupon | null>(null)
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
	const { data: clientsResponse } = useQuery<{ data: ClientDTO[] }>({
		queryKey: ['clients-tpv'],
		queryFn: () => $fetch<{ data: ClientDTO[] }>('/api/clients', { query: { limit: 500 } }),
	})

	const clients = computed(() => clientsResponse.value?.data || [])

	const { data: products } = useQuery<CatalogItem[]>({
		queryKey: ['products-tpv'],
		queryFn: () => $fetch('/api/catalog/products'),
	})

	const { data: services } = useQuery<CatalogItem[]>({
		queryKey: ['services-tpv'],
		queryFn: () => $fetch('/api/services'),
	})

	// Sellable bonos/packages catalog
	const { data: packages } = useQuery<CatalogItem[]>({
		queryKey: ['packages-tpv'],
		queryFn: () => $fetch('/api/packages'),
	})

	// Active bonos/packages owned by the selected client (for consuming sessions)
	const { data: clientPackages } = useQuery<CatalogItem[]>({
		queryKey: ['client-packages-tpv', computed(() => selectedClient.value?.user_id)],
		queryFn: async () => {
			const id = selectedClient.value?.user_id
			if (!id) return []
			return await $fetch<CatalogItem[]>(`/api/clients/${id}/packages`)
		},
		enabled: computed(() => !!selectedClient.value?.user_id),
	})

	// Coupons usable right now (the server re-validates on checkout)
	const { data: validCoupons } = useQuery<ICoupon[]>({
		queryKey: ['coupons-tpv'],
		queryFn: () => $fetch<ICoupon[]>('/api/marketing/coupons', { query: { active: '1' } }),
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
			const bookingData = await $fetch<Booking>(`/api/agenda/bookings/${bookingId}`)
			if (!bookingData) return

			// 1. Set Selected ClientDTO (Reliably!)
			if (bookingData.client && (bookingData.client.user_id || bookingData.client_id)) {
				selectedClient.value = {
					user_id: bookingData.client.user_id || bookingData.client_id,
					name: bookingData.client.name || 'Cliente',
					surname: bookingData.client.surname || '',
					email: bookingData.client.email || '',
					phone: bookingData.client.phone || '',
					avatar: bookingData.client.avatar || undefined
				}
			} else if (bookingData.client_id) {
				const found = (cls || []).find((c: ClientDTO) => c.user_id === bookingData.client_id)
				if (found) {
					selectedClient.value = found
				} else {
					try {
						const directClient = await $fetch<ClientDTO>(`/api/clients/${bookingData.client_id}`)
						if (directClient) selectedClient.value = directClient
					} catch (e) {
						console.error('Failed fallback client fetch:', e)
					}
				}
			}

			// 2. Set Cart Items from Booking Items
			const itemsToAdd: IncomingLineItem[] = []
			if (bookingData.booking_items && bookingData.booking_items.length > 0) {
				for (const it of bookingData.booking_items) {
					let foundItem: CatalogItem | null | undefined = null
					const type = (it.item_type || 'service').toLowerCase()
					
					if (type === 'service') {
						foundItem = (svcs || []).find((s: CatalogItem) => s.service_id === it.item_id)
					} else if (type === 'product') {
						foundItem = (prds || []).find((p: CatalogItem) => p.product_id === it.item_id)
					} else if (type === 'package_sale') {
						foundItem = (pkgs || []).find((p: CatalogItem) => p.package_id === it.item_id)
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
		mutationFn: async (payload: {
			user_id?: string
			status: string
			payment_method: string
			coupon_code?: string
			manual_discount_type: DiscountKind
			manual_discount_value: number
			items: IncomingLineItem[]
			booking_id?: string
		}) => {
			const res = await $fetch<Sale>('/api/sales/carts', {
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
			
			// Broadcast booking and sales refresh across tabs
			emitSync({ type: 'REFRESH_BOOKINGS' })
			// Real-time refresh of every sales/collection view (this tab + broadcast to others)
			notifySalesChanged()
			// Invalidate agenda bookings and client caches
			queryClient.invalidateQueries({ queryKey: ['bookings'] })
			queryClient.invalidateQueries({ queryKey: ['clients-tpv'] })
			queryClient.invalidateQueries({ queryKey: ['clients-agenda'] })
			queryClient.invalidateQueries({ queryKey: ['client-packages-agenda'] })
			queryClient.invalidateQueries({ queryKey: ['client-packages-tpv'] })
			queryClient.invalidateQueries({ queryKey: ['coupons-tpv'] })
			queryClient.invalidateQueries({ queryKey: ['coupons'] })
			clearCart()
		},
		onError: (error: { data?: { statusMessage?: string } }) => {
			displayToast(error.data?.statusMessage || 'Error al procesar la venta', 'error')
		},
	})

	// Filtered Lists
	const filteredCatalog = computed(() => {
		const q = searchQuery.value.toLowerCase()

		if (activeTab.value === 'products' && products.value) {
			return products.value.filter(
				(p: CatalogItem) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
			)
		}
		if (activeTab.value === 'services' && services.value) {
			return services.value.filter(
				(s: CatalogItem) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q),
			)
		}
		if (activeTab.value === 'packages' && packages.value) {
			return packages.value.filter(
				(p: CatalogItem) => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q),
			)
		}
		return []
	})

	const filteredClients = computed(() => {
		if (!clients.value.length || !clientSearch.value) return []
		const q = clientSearch.value.toLowerCase()
		return clients.value
			.filter(
				(c: ClientDTO) =>
					c.name.toLowerCase().includes(q) ||
					c.surname.toLowerCase().includes(q) ||
					c.phone?.includes(q) ||
					c.document_number?.toLowerCase().includes(q),
			)
			.slice(0, 5)
	})

	// Cart Operations
	const addToCart = (item: CatalogItem, type: string) => {
		// A catalog package is SOLD (item_type 'package_sale'), not consumed.
		if (type === 'package') {
			addPackageSale(item)
			return
		}

		let itemId = ''
		if (type === 'service') itemId = item.service_id || ''
		else if (type === 'product') itemId = item.product_id || ''
		else itemId = item.product_id || item.service_id || ''

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
	const addPackageSale = (pkg: CatalogItem) => {
		const existing = cartItems.value.find(
			i => i.item_id === pkg.package_id && i.item_type === 'package_sale',
		)
		if (existing) {
			existing.quantity++
		} else {
			cartItems.value.push({
				item_id: pkg.package_id || '',
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
	const consumeClientPackage = (pkg: CatalogItem) => {
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
				item_id: pkg.client_package_id || '',
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
		manualDiscountType.value = 'fixed'
		couponCode.value = ''
		appliedCoupon.value = null
		paymentMethod.value = 'card'
		processedBookingId.value = null
	}

	const selectClient = (client: ClientDTO) => {
		selectedClient.value = client
		clientSearch.value = ''
	}

	// Computed Totals
	const cartSubtotal = computed(() => {
		return cartItems.value.reduce((acc, item) => {
			return acc + (item.unit_price || 0) * item.quantity
		}, 0)
	})

	const couponRule = (coupon: ICoupon | null) => {
		const type = normalizeDiscountKind(coupon?.discount_type)
		return coupon && type ? { type, value: coupon.discount_value } : null
	}

	// Coupon on the subtotal first, then the manual discount on the remainder (same math as the server)
	const cartPricing = computed(() =>
		computeSaleDiscounts(cartSubtotal.value, {
			coupon: couponRule(appliedCoupon.value),
			manual: { type: manualDiscountType.value, value: Number(discountAmount.value) || 0 },
		}),
	)

	const cartTotal = computed(() => cartPricing.value.total)

	const applyCoupon = () => {
		const code = couponCode.value.trim().toUpperCase()
		if (!code) return
		const coupon = (validCoupons.value || []).find(c => c.code.toUpperCase() === code)
		if (!coupon) {
			displayToast('Cupón no válido o no disponible', 'error')
			return
		}
		if (coupon.min_purchase && cartSubtotal.value < coupon.min_purchase) {
			displayToast(`Este cupón requiere una compra mínima de ${formatCurrency(coupon.min_purchase)}`, 'error')
			return
		}
		appliedCoupon.value = coupon
		couponCode.value = ''
	}

	const removeCoupon = () => {
		appliedCoupon.value = null
	}

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
			coupon_code: appliedCoupon.value?.code,
			manual_discount_type: manualDiscountType.value,
			manual_discount_value: Number(discountAmount.value) || 0,
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
		manualDiscountType,
		couponCode,
		appliedCoupon,
		validCoupons,
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
		cartPricing,
		isCheckingOut,
		applyCoupon,
		removeCoupon,
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
