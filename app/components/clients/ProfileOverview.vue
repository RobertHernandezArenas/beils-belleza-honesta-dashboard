<script setup lang="ts">
import {
	Calendar, FileSignature, FileText, ArrowRight, Clock,
	CheckCircle2, XCircle, AlertCircle, ShoppingBag, Sparkles, TrendingUp, Wallet, ArrowUpRight,
	CalendarClock, History, MapPin, Eye, EyeOff, User, Plus, Search, Filter, ChevronRight, ShieldOff, UserCircle
} from 'lucide-vue-next'

import { useI18n } from 'vue-i18n'
import { useDataPrivacy } from '~/composables/useDataPrivacy'
import EditableField from '~/components/shared/EditableField.vue'

const props = defineProps({
	client: { type: Object as PropType<any>, required: true },
	isUpdating: { type: Boolean, default: false }
})

const emit = defineEmits(['update', 'open-booking', 'open-purchase', 'open-debt'])
const { revealedDocs, revealedLoading, toggleDocumentVisibility } = useDataPrivacy()

const kpis = computed(() => props.client?.kpis || {
	topServices: [], topProducts: [], ltv: 0, aov: 0, bookingFrequencyDays: 0, totalBookings: 0
})

const isSavingNotes = ref(false)
const notesText = ref(props.client?.annotations || '')
watch(() => props.client?.annotations, (newVal) => {
	if (!isSavingNotes.value) notesText.value = newVal || ''
})

const { locale, t } = useI18n()

const saveNotes = () => {
	isSavingNotes.value = true
	emit('update', 'annotations', notesText.value)
	setTimeout(() => { isSavingNotes.value = false }, 500)
}

const formatDate = (dateStr: string) => {
	if (!dateStr) return '---'
	return new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateStr))
}

const upcomingBooking = computed(() => {
	if (!props.client.client_bookings) return null
	const now = new Date(); now.setHours(0,0,0,0)
	const futureBookings = props.client.client_bookings
		.filter((b: any) => {
			const bDate = new Date(b.booking_date); bDate.setHours(0,0,0,0)
			return bDate.getTime() >= now.getTime() && (b.status === 'pending' || b.status === 'confirmed')
		})
		.sort((a: any, b: any) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
	return futureBookings[0] || null
})

const lastVisitDays = computed(() => {
	if (!props.client.client_bookings) return null
	const now = new Date(); now.setHours(0,0,0,0)
	const pastBookings = props.client.client_bookings
		.filter((b: any) => {
			const bDate = new Date(b.booking_date); bDate.setHours(0,0,0,0)
			return bDate.getTime() <= now.getTime() && b.status === 'completed'
		})
		.sort((a: any, b: any) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
	const last = pastBookings[0]
	if (!last) return null
	const lastDate = new Date(last.booking_date); lastDate.setHours(0,0,0,0)
	const diffTime = Math.abs(now.getTime() - lastDate.getTime())
	return { days: Math.floor(diffTime / (1000 * 60 * 60 * 24)), date: last.booking_date }
})

const timeline = computed(() => {
	const activities: any[] = []
	
	// Citas (Bookings)
	props.client.client_bookings?.forEach((b: any) => {
		activities.push({ 
			id: `booking-${b.booking_id}-${b.status}`, 
			date: new Date(b.booking_date), 
			type: 'booking', 
			title: b.item_type === 'service' ? t('catalog.clients.profile.timeline.bookingService') : t('catalog.clients.profile.timeline.bookingPack'),
			professional: b.professional?.name || t('catalog.clients.profile.kpis.unspecified'), 
			status: b.status, 
			icon: Calendar, 
			color: 'text-primary',
			raw: b
		})
	})

	// Compras (Carts)
	props.client.carts?.forEach((c: any) => {
		activities.push({
			id: `cart-${c.cart_id}-${c.status}`,
			date: new Date(c.created_at),
			type: 'purchase',
			title: c.status === 'completed' ? t('catalog.clients.profile.timeline.purchase') : (locale.value === 'es' ? 'Compra Pendiente (Deuda)' : 'Pending Purchase (Debt)'),
			professional: c.payment_method?.toUpperCase() || t('catalog.clients.profile.timeline.posPayment'),
			status: c.status,
			icon: ShoppingBag,
			color: c.status === 'completed' ? 'text-success' : 'text-warning',
			raw: c
		})
	})

	// Deudas (Debts)
	props.client.debts?.forEach((d: any) => {
		activities.push({
			id: `debt-${d.debt_id}-${d.status}`,
			date: new Date(d.created_at),
			type: 'debt',
			title: t('catalog.clients.profile.billing.debts'),
			professional: `${d.amount.toFixed(2)}€`,
			status: d.status,
			icon: Wallet,
			color: 'text-error',
			raw: d
		})
	})

	// Consentimientos (Consents)
	props.client.consents?.forEach((c: any) => {
		activities.push({
			id: `consent-${c.consent_id}`,
			date: new Date(c.signed_date || c.created_at),
			type: 'compliance',
			title: `${t('catalog.clients.profile.compliance.consents')}: ${c.consent_type || 'General'}`,
			professional: c.status,
			status: c.status === 'SIGNED' ? 'completed' : 'pending',
			icon: FileSignature,
			color: 'text-success',
			raw: c
		})
	})

	// Cuestionarios (Questionnaires)
	props.client.questionnaires?.forEach((q: any) => {
		activities.push({
			id: `quest-${q.questionnaire_id}`,
			date: new Date(q.created_at),
			type: 'compliance',
			title: `${t('catalog.clients.profile.compliance.questionnaires')}: ${q.title}`,
			professional: t('catalog.clients.profile.compliance.status.signed'),
			status: 'completed',
			icon: FileText,
			color: 'text-info',
			raw: q
		})
	})

	// Revocaciones (Revokes)
	props.client.revokes?.forEach((r: any) => {
		activities.push({
			id: `revoke-${r.revoke_id}`,
			date: new Date(r.date_revoked || r.created_at),
			type: 'compliance',
			title: t('catalog.clients.profile.compliance.revocations'),
			professional: r.reason || 'N/A',
			status: 'cancelled',
			icon: ShieldOff,
			color: 'text-error',
			raw: r
		})
	})

	return activities.sort((a,b) => b.date.getTime() - a.date.getTime()).slice(0, 10)
})

// Legal & Compliance Logic
const getConsentStatus = (type: string) => {
	const c = props.client.consents?.find((i: any) => i.consent_type?.toLowerCase().includes(type.toLowerCase()))
	return c ? { signed: true, date: formatDate(c.signed_date) } : { signed: false, date: null }
}

const gdprStatus = computed(() => getConsentStatus('GDPR'))
const marketingStatus = computed(() => getConsentStatus('Marketing'))
const photographyStatus = computed(() => getConsentStatus('Photography'))
const medicalStatus = computed(() => {
	const q = props.client.questionnaires?.find((i: any) => i.title?.toLowerCase().includes('historia clínica') || i.title?.toLowerCase().includes('medical'))
	return q ? { signed: true, date: formatDate(q.created_at) } : { signed: false, date: null }
})
const skinStatus = computed(() => {
	const q = props.client.questionnaires?.find((i: any) => i.title?.toLowerCase().includes('piel') || i.title?.toLowerCase().includes('skin'))
	return q ? { signed: true, date: formatDate(q.created_at) } : { signed: false, date: null }
})
</script>

<template>
	<div class="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 transition-all duration-300">
		
		<!-- COLUMN 1: Personal Insights Card (Ultra Premium) -->
		<div class="card bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl p-6 lg:p-8 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
			<div class="space-y-6">
				<div class="flex items-center justify-between border-b border-base-200/80 pb-4">
					<h3 class="text-base-content text-lg font-black tracking-tight flex items-center gap-2">
						<div class="p-2 rounded-xl bg-primary/10 text-primary">
							<UserCircle class="w-5 h-5" />
						</div>
						{{ $t('catalog.clients.profile.sections.insights') }}
					</h3>
					<span class="badge badge-primary badge-outline font-mono text-[10px] font-bold">CLIENT PROFILE</span>
				</div>

				<!-- Location -->
				<div class="space-y-3">
					<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
						<MapPin class="w-3.5 h-3.5 text-primary" />
						{{ $t('catalog.clients.form.address') }} y {{ $t('users.form.phone') }}
					</h4>
					<div class="bg-base-200/50 border border-base-300/50 rounded-2xl p-4 space-y-2 text-sm font-semibold text-base-content">
						<EditableField :model-value="client.address" label="Dirección" :is-mutating="isUpdating" @save="emit('update', 'address', $event)" />
						<div class="flex gap-1 items-center">
							<EditableField :model-value="client.city" label="Ciudad" :is-mutating="isUpdating" @save="emit('update', 'city', $event)" />
							<span>,</span>
							<EditableField :model-value="client.postal_code" label="C.P." :is-mutating="isUpdating" @save="emit('update', 'postal_code', $event)" />
						</div>
						<EditableField :model-value="client.country" label="País" :is-mutating="isUpdating" @save="emit('update', 'country', $event)" />
					</div>
				</div>

				<!-- Demographics -->
				<div class="space-y-3">
					<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest">
						Demografía
					</h4>
					<div class="bg-base-200/50 border border-base-300/50 rounded-2xl p-4 space-y-3 text-xs font-semibold">
						<div class="flex justify-between items-center">
							<span class="text-base-content/70">{{ $t('catalog.clients.form.birthDate') }}:</span>
							<EditableField :model-value="client.birth_date" :label="$t('catalog.clients.form.birthDate')" type="date" :is-mutating="isUpdating" @save="emit('update', 'birth_date', $event)" class="font-bold">
								<template #display>{{ formatDate(client.birth_date) }}</template>
							</EditableField>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-base-content/70">{{ $t('catalog.clients.form.gender') }}:</span>
							<EditableField :model-value="client.gender" :label="$t('catalog.clients.form.gender')" type="select" :options="[{label:$t('catalog.clients.form.female'), value:'Female'}, {label:$t('catalog.clients.form.male'), value:'Male'}]" :is-mutating="isUpdating" @save="emit('update', 'gender', $event)" class="font-bold">
								<template #display="{ value }">{{ value === 'Female' ? 'Mujer' : 'Hombre' }}</template>
							</EditableField>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-base-content/70">{{ $t('catalog.clients.profile.kpis.registered') }}:</span>
							<span class="badge badge-ghost font-bold text-xs">{{ formatDate(client.created_at) }}</span>
						</div>
					</div>
				</div>

				<!-- Identification -->
				<div class="space-y-3">
					<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest">
						{{ $t('users.filters.document') }}
					</h4>
					<div class="bg-gradient-to-r from-base-200/80 to-base-200/40 border border-base-300/70 rounded-2xl p-4 flex items-center justify-between shadow-inner">
						<div class="flex flex-col">
							<span class="text-[10px] text-base-content/60 font-black uppercase">{{ client.document_type || 'PASAPORTE' }}</span>
							<span class="text-sm font-black tracking-widest font-mono text-primary">{{ revealedDocs[client.user_id] || '****' + (client.document_number?.slice(-4) || '3115') }}</span>
						</div>
						<div class="tooltip tooltip-left z-50 relative" :data-tip="revealedDocs[client.user_id] ? (locale === 'es' ? 'Ocultar N° Documento' : 'Hide Document No.') : (locale === 'es' ? 'Mostrar N° Documento' : 'Show Document No.')">
							<button @click="toggleDocumentVisibility(client.user_id, client.document_number)" class="btn btn-ghost btn-circle btn-sm hover:bg-base-300/80" aria-label="Toggle Document">
								<component :is="revealedDocs[client.user_id] ? EyeOff : Eye" class="w-4 h-4 opacity-70" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- COLUMN 2: Luxury DaisyUI Stats Component Stack -->
		<div class="stats stats-vertical overflow-visible bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl w-full h-full justify-between hover:shadow-lg transition-all duration-300">
			<!-- LTV Stat -->
			<div class="stat p-6 border-b border-base-200/80 relative">
				<div class="stat-figure text-primary bg-primary/10 p-3.5 rounded-2xl shadow-sm">
					<TrendingUp class="w-6 h-6 stroke-[2.5]" />
				</div>
				<div class="stat-title text-[11px] font-black uppercase tracking-wider text-base-content/60">Lifetime Value (LTV)</div>
				<div class="stat-value text-3xl lg:text-4xl font-black text-base-content tabular-nums my-1">
					{{ kpis.ltv.toFixed(2) }}€
				</div>
				<div class="stat-desc font-bold text-success flex items-center gap-1">
					<Sparkles class="w-3.5 h-3.5" />
					<span>Valor Acumulado Histórico</span>
				</div>
			</div>

			<!-- AOV Stat -->
			<div class="stat p-6 border-b border-base-200/80">
				<div class="stat-figure text-secondary bg-secondary/10 p-3.5 rounded-2xl shadow-sm">
					<ArrowUpRight class="w-6 h-6 stroke-[2.5]" />
				</div>
				<div class="stat-title text-[11px] font-black uppercase tracking-wider text-base-content/60">Average Order Value (AOV)</div>
				<div class="stat-value text-3xl lg:text-4xl font-black text-base-content tabular-nums my-1">
					{{ kpis.aov.toFixed(2) }}€
				</div>
				<div class="stat-desc font-bold text-secondary">Promedio Ticket Medio por Venta</div>
			</div>

			<!-- Frequency Stat -->
			<div class="stat p-6">
				<div class="stat-figure text-accent bg-accent/10 p-3.5 rounded-2xl shadow-sm">
					<CalendarClock class="w-6 h-6 stroke-[2.5]" />
				</div>
				<div class="stat-title text-[11px] font-black uppercase tracking-wider text-base-content/60">{{ $t('catalog.clients.profile.sections.kpis') }}</div>
				<div class="stat-value text-3xl lg:text-4xl font-black text-base-content my-1">
					{{ kpis.bookingFrequencyDays || 30 }} <span class="text-lg font-bold text-base-content/60">{{ $t('overview.charts.days.sat').toLowerCase() === 's' ? 'Días' : 'Days' }}</span>
				</div>
				<div class="stat-desc font-bold text-base-content/70">Frecuencia habitual entre servicios</div>
			</div>
		</div>

		<!-- COLUMN 3: Appointments & Sales Card -->
		<div class="card bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl p-6 lg:p-8 space-y-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
			<div class="space-y-6">
				<h3 class="text-base-content text-lg font-black tracking-tight border-b border-base-200/80 pb-4 flex items-center gap-2">
					<div class="p-2 rounded-xl bg-secondary/10 text-secondary">
						<Clock class="w-5 h-5" />
					</div>
					{{ $t('catalog.clients.profile.sections.appointments') }}
				</h3>
				
				<div class="grid grid-cols-2 gap-4">
					<div class="bg-base-200/50 border border-base-300/50 rounded-2xl p-4 space-y-2">
						<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest">{{ $t('catalog.clients.profile.appointments.status.upcoming') }}</h4>
						<div v-if="upcomingBooking" class="space-y-1">
							<div class="flex items-center gap-2 text-base-content font-black text-base">
								<Clock class="w-4 h-4 text-primary shrink-0" /> 
								{{ new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(upcomingBooking.booking_date)) }}
							</div>
							<p class="text-[10px] font-bold text-base-content/70 uppercase">{{ upcomingBooking.start_time }} - {{ upcomingBooking.item_type }}</p>
						</div>
						<p v-else class="text-base-content/50 text-xs italic">{{ $t('catalog.clients.profile.compliance.status.pending') }}</p>
					</div>

					<div class="bg-base-200/50 border border-base-300/50 rounded-2xl p-4 space-y-2">
						<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest">{{ $t('catalog.clients.profile.kpis.lastVisit') }}</h4>
						<div v-if="lastVisitDays" class="space-y-1">
							<div class="flex items-center gap-2 text-base-content font-black text-base">
								<History class="w-4 h-4 text-secondary shrink-0" />
								{{ locale === 'es' ? 'Hace' : 'Hace' }} {{ lastVisitDays.days }} {{ locale === 'es' ? 'días' : 'days' }}
							</div>
							<p class="text-[10px] font-bold text-base-content/70 uppercase">{{ new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(lastVisitDays.date)) }}</p>
						</div>
						<p v-else class="text-base-content/50 text-xs italic">{{ locale === 'es' ? 'Nuevo cliente' : 'New client' }}</p>
					</div>
				</div>

				<div class="space-y-3">
					<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest">{{ $t('catalog.clients.profile.kpis.topItems') }}</h4>
					<div class="grid grid-cols-2 gap-4">
						<div class="bg-base-200/50 rounded-2xl p-4 border border-base-300/60 min-h-[90px] flex flex-col items-center justify-center text-center">
							<span class="badge badge-sm badge-primary badge-outline font-black text-[9px] uppercase mb-2">{{ $t('catalog.menu.services').toUpperCase() }}</span>
							<p class="text-xs font-bold text-base-content/90">{{ kpis.topServices[0]?.name || (locale === 'es' ? 'SIN HISTÓRICO' : 'NO HISTORY') }}</p>
						</div>
						<div class="bg-base-200/50 rounded-2xl p-4 border border-base-300/60 min-h-[90px] flex flex-col items-center justify-center text-center">
							<span class="badge badge-sm badge-secondary badge-outline font-black text-[9px] uppercase mb-2">{{ $t('catalog.menu.products').toUpperCase() }}</span>
							<p class="text-xs font-bold text-base-content/90">{{ kpis.topProducts[0]?.name || (locale === 'es' ? 'SIN COMPRAS' : 'NO PURCHASES') }}</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ROW 2: Bottom area / 2 columns -->
		<div class="xl:col-span-1 flex flex-col gap-6">
			<!-- Legal & Compliance Card -->
			<div class="card bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl p-6 lg:p-8 space-y-6 flex flex-col">
				<h3 class="text-base-content text-lg font-black tracking-tight border-b border-base-200/80 pb-4 flex items-center gap-2">
					<FileSignature class="w-5 h-5 text-success" />
					{{ $t('catalog.clients.profile.sections.compliance') }}
				</h3>
				
				<div class="space-y-6">
					<!-- Consents -->
					<div>
						<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest mb-3">{{ $t('catalog.clients.profile.compliance.consents') }}</h4>
						<div class="grid grid-cols-2 gap-3">
							<!-- GDPR -->
							<div class="bg-base-200/50 rounded-2xl p-3.5 border border-base-300/60 flex flex-col justify-between min-h-[105px]">
								<span class="text-[10px] font-black text-base-content/70 uppercase">{{ $t('catalog.clients.profile.compliance.items.gdpr') }}</span>
								<div class="space-y-1 mt-2">
									<div class="badge badge-success badge-sm font-bold gap-1 text-[10px]">
										<CheckCircle2 class="w-3 h-3" />
										<span>{{ $t('catalog.clients.profile.compliance.status.signed') }}</span>
									</div>
									<p class="text-[10px] text-base-content/60 font-semibold">{{ gdprStatus.date || '15/01/2024' }}</p>
								</div>
							</div>

							<!-- Marketing -->
							<div class="bg-base-200/50 rounded-2xl p-3.5 border border-base-300/60 flex flex-col justify-between min-h-[105px]">
								<span class="text-[10px] font-black text-base-content/70 uppercase">{{ $t('catalog.clients.profile.compliance.items.marketing') }}</span>
								<div class="space-y-1 mt-2">
									<div 
										class="badge badge-sm font-bold gap-1 text-[10px]"
										:class="marketingStatus.signed ? 'badge-success' : 'badge-warning'"
									>
										<component :is="marketingStatus.signed ? CheckCircle2 : Clock" class="w-3 h-3" />
										<span>{{ marketingStatus.signed ? $t('catalog.clients.profile.compliance.status.signed') : $t('catalog.clients.profile.compliance.status.pending') }}</span>
									</div>
									<p class="text-[10px] text-base-content/60 font-semibold">{{ marketingStatus.date || '22/02/2024' }}</p>
								</div>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<!-- Questionnaires -->
						<div>
							<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest mb-3">{{ $t('catalog.clients.profile.compliance.questionnaires') }}</h4>
							<div class="bg-base-200/50 rounded-2xl p-3.5 border border-base-300/60 space-y-2">
								<div class="flex flex-col">
									<span class="text-[10px] font-bold text-base-content uppercase leading-tight">{{ $t('catalog.clients.profile.compliance.items.medical') }}</span>
									<div class="badge badge-success badge-sm font-bold text-[10px] mt-1 w-fit">
										{{ $t('catalog.clients.profile.compliance.status.signed') }}
									</div>
								</div>
								<div class="flex flex-col pt-2 border-t border-base-300/60">
									<span class="text-[10px] font-bold text-base-content uppercase leading-tight">{{ $t('catalog.clients.profile.compliance.items.skin') }}</span>
									<p class="text-[10px] text-base-content/60 font-semibold mt-0.5">{{ skinStatus.date || '30/03/2024' }}</p>
								</div>
							</div>
						</div>

						<!-- Revocations -->
						<div>
							<h4 class="text-base-content/60 text-[10px] font-black uppercase tracking-widest mb-3">{{ $t('catalog.clients.profile.compliance.revocations') }}</h4>
							<div class="bg-base-200/50 rounded-2xl p-3.5 border border-base-300/60 flex flex-col justify-between min-h-[105px]">
								<span class="text-[10px] font-black text-base-content/70 uppercase">{{ $t('catalog.clients.profile.compliance.items.phone') }}</span>
								<div class="space-y-1 mt-2">
									<div class="badge badge-error badge-sm font-bold gap-1 text-[10px]">
										<XCircle class="w-3 h-3" />
										<span>{{ $t('catalog.clients.profile.compliance.status.withdrawn') }}</span>
									</div>
									<p class="text-[10px] text-base-content/60 font-semibold">01/02/2024</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Commercial Notes Card -->
			<div class="card bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl p-6 lg:p-8 space-y-4 flex flex-col">
				<h3 class="text-base-content text-lg font-black tracking-tight flex items-center gap-2">
					<FileText class="w-5 h-5 text-primary" />
					{{ $t('catalog.clients.profile.sections.notes') }}
				</h3>
				<textarea 
					v-model="notesText" 
					class="textarea textarea-bordered border-base-300/70 bg-base-200/50 focus:textarea-primary h-28 w-full rounded-2xl p-4 text-sm font-medium focus:ring-2 resize-none shadow-inner" 
					:placeholder="locale === 'es' ? 'Escribe aquí notas médicas, incidencias o preferencias especiales de este cliente...' : 'Write medical notes, incidents or special client preferences here...'"
				></textarea>
				<div class="flex justify-end">
					<button @click="saveNotes" :disabled="isSavingNotes" class="btn btn-primary rounded-xl font-bold px-8 shadow-lg shadow-primary/20">
						<span v-if="isSavingNotes" class="loading loading-spinner loading-xs"></span>
						{{ isSavingNotes ? (locale === 'es' ? 'Guardando...' : 'Saving...') : $t('common.save') }}
					</button>
				</div>
			</div>
		</div>

		<!-- Treatment History & Timeline Card -->
		<div class="xl:col-span-2 card bg-base-100/90 backdrop-blur-md border border-base-200/80 shadow-md rounded-3xl p-6 lg:p-8 space-y-6 flex flex-col relative">
			<h3 class="text-base-content text-lg font-black tracking-tight border-b border-base-200/80 pb-4 flex items-center gap-2">
				<History class="w-5 h-5 text-primary" />
				{{ $t('catalog.clients.profile.sections.timeline') }}
			</h3>
			
			<div class="space-y-3">
				<div 
					v-for="act in timeline" 
					:key="act.id" 
					class="flex gap-4 items-start p-3.5 rounded-2xl bg-base-200/30 hover:bg-base-200/80 transition-all border border-base-300/40 hover:border-base-300 hover:shadow-sm"
				>
					<div 
						class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-base-300/80"
						:class="[
							act.type === 'purchase' || (act.type === 'compliance' && act.status === 'completed') ? 'bg-success/15 text-success' : 
							act.type === 'debt' ? 'bg-error/15 text-error' : 
							'bg-primary/15 text-primary'
						]"
					>
						<component :is="act.icon" class="w-5 h-5" />
					</div>
					
					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between gap-2 flex-wrap">
							<span class="badge badge-sm font-black text-[10px] uppercase border-none px-2.5 py-1"
								:class="[
									act.status === 'completed' ? 'bg-success/20 text-success' :
									act.status === 'pending' ? 'bg-warning/20 text-warning' :
									act.status === 'cancelled' ? 'bg-error/20 text-error' : 'bg-base-300 text-base-content'
								]"
							>
								{{ act.status === 'pending' ? $t('catalog.clients.profile.appointments.status.upcoming') : (act.status === 'cancelled' ? $t('catalog.clients.profile.appointments.status.canceled') : $t('catalog.clients.profile.appointments.status.completed')) }}
							</span>
							<span class="text-[11px] font-semibold text-base-content/60">
								{{ new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(act.date) }}
							</span>
						</div>

						<h5 class="text-base-content text-sm font-black truncate leading-snug mt-1.5">{{ act.title }}</h5>
						<p class="text-xs text-base-content/70 font-medium mt-0.5">
							{{ act.type === 'purchase' ? $t('catalog.clients.profile.timeline.method') : $t('catalog.clients.profile.kpis.professional') }}: 
							<span class="font-bold text-base-content">{{ act.professional }}</span>
						</p>

						<button 
							@click="act.type === 'booking' ? $emit('open-booking', act.raw) : (act.type === 'debt' ? $emit('open-debt', act.raw) : (act.type === 'purchase' ? $emit('open-purchase', act.raw) : null))"
							v-if="act.type !== 'compliance'"
							class="btn btn-ghost btn-xs rounded-xl mt-2 font-bold border border-base-300/80 hover:bg-base-300/80"
						>
							{{ $t('catalog.clients.profile.kpis.viewDetails') }}
						</button>
					</div>
				</div>

				<div v-if="timeline.length === 0" class="py-12 flex flex-col items-center justify-center text-center opacity-40">
					<History class="w-12 h-12 mb-2" />
					<p class="text-sm font-bold uppercase tracking-widest">{{ $t('catalog.clients.profile.timeline.none') }}</p>
				</div>
			</div>
		</div>

	</div>
</template>

<style scoped>
</style>
