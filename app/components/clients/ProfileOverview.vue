<script setup lang="ts">
	import {
		Calendar, FileSignature, FileText, ArrowRight, Clock,
		CheckCircle2, XCircle, AlertCircle, ShoppingBag, Sparkles, TrendingUp, Wallet, ArrowUpRight,
		CalendarClock, History, MapPin, Eye, EyeOff, User, Plus, Search, Filter, ChevronRight, ShieldOff
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
			.sort((a: any, b: any) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
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

        // Compras (Carts) - Incluye completados y pendientes
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
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 3xl:gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <!-- COLUMN 1: Personal Insights -->
        <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 lg:p-8 space-y-8 flex flex-col shadow-sm border border-border-subtle/20">
            <div class="flex items-center justify-between">
                <h3 class="text-text-primary text-lg font-bold tracking-tight">{{ $t('catalog.clients.profile.sections.insights') }}</h3>
                <div class="flex gap-2">
                    <UserCircle class="w-5 h-5 text-text-muted" />
                    <AlertCircle class="w-5 h-5 text-text-muted" />
                </div>
            </div>

            <div class="space-y-6">
                <!-- Location -->
                <div>
                    <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">{{ $t('catalog.clients.form.address') }} y {{ $t('users.form.phone') }}</h4>
                    <div class="space-y-1 text-sm font-medium text-text-primary">
                        <EditableField :model-value="client.address" label="Dirección" :is-mutating="isUpdating" @save="emit('update', 'address', $event)" />
                        <div class="flex gap-2">
                            <EditableField :model-value="client.city" label="Ciudad" :is-mutating="isUpdating" @save="emit('update', 'city', $event)" />
                            <span>,</span>
                            <EditableField :model-value="client.postal_code" label="C.P." :is-mutating="isUpdating" @save="emit('update', 'postal_code', $event)" />
                        </div>
                        <EditableField :model-value="client.country" label="País" :is-mutating="isUpdating" @save="emit('update', 'country', $event)" />
                    </div>
                </div>

                <!-- Demographics -->
                <div>
                    <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">{{ $t('catalog.clients.profile.sections.insights') }}</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between items-baseline text-sm">
                            <span class="text-text-muted text-xs">{{ $t('catalog.clients.form.birthDate') }}:</span>
                            <EditableField :model-value="client.birth_date" :label="$t('catalog.clients.form.birthDate')" type="date" :is-mutating="isUpdating" @save="emit('update', 'birth_date', $event)" class="font-bold">
                                <template #display>{{ formatDate(client.birth_date) }}</template>
                            </EditableField>
                        </div>
                        <div class="flex justify-between items-baseline text-sm">
                            <span class="text-text-muted text-xs">{{ $t('catalog.clients.form.gender') }}:</span>
                            <EditableField :model-value="client.gender" :label="$t('catalog.clients.form.gender')" type="select" :options="[{label:$t('catalog.clients.form.female'), value:'Female'}, {label:$t('catalog.clients.form.male'), value:'Male'}]" :is-mutating="isUpdating" @save="emit('update', 'gender', $event)" class="font-bold">
                                <template #display="{ value }">{{ value === 'Female' ? 'Mujer' : 'Hombre' }}</template>
                            </EditableField>
                        </div>
                        <div class="flex justify-between items-baseline text-sm">
                            <span class="text-text-muted text-xs">{{ $t('catalog.clients.profile.kpis.registered') }}:</span>
                            <span class="font-bold">{{ formatDate(client.created_at) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Identification -->
                <div>
                    <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-3">{{ $t('users.filters.document') }}</h4>
                    <div class="bg-white/50 dark:bg-black/20 rounded-2xl p-4 flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-[10px] text-text-muted font-black uppercase">{{ client.document_type || 'PASAPORTE' }}</span>
                            <span class="text-sm font-bold tracking-widest font-mono">{{ revealedDocs[client.user_id] || '****' + (client.document_number?.slice(-4) || '3115') }}</span>
                        </div>
                        <button @click="toggleDocumentVisibility(client.user_id, client.document_number)" class="btn btn-ghost btn-circle btn-sm">
                            <component :is="revealedDocs[client.user_id] ? EyeOff : Eye" class="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- COLUMN 2: KPI Metrics Stack -->
        <div class="space-y-6">
            <!-- LTV Card -->
            <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-sm border border-border-subtle/20 flex flex-col justify-between h-[140px] group transition-all hover:scale-[1.02]">
                <div class="flex justify-between items-start">
                    <p class="text-text-muted text-[10px] font-black uppercase tracking-widest">Lifetime Value (LTV)</p>
                    <div class="p-2 rounded-xl bg-primary/10 text-primary"><TrendingUp class="w-4 h-4" /></div>
                </div>
                <h4 class="text-text-primary text-4xl font-black tabular-nums">{{ kpis.ltv.toFixed(2) }}€</h4>
            </div>

            <!-- AOV Card -->
            <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-sm border border-border-subtle/20 flex flex-col justify-between h-[140px] group transition-all hover:scale-[1.02]">
                <div class="flex justify-between items-start">
                    <p class="text-text-muted text-[10px] font-black uppercase tracking-widest">Average Order Value (AOV)</p>
                    <div class="p-2 rounded-xl bg-secondary/10 text-secondary"><ArrowUpRight class="w-4 h-4" /></div>
                </div>
                <h4 class="text-text-primary text-4xl font-black tabular-nums">{{ kpis.aov.toFixed(2) }}€</h4>
            </div>

            <!-- Frequency Card -->
            <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-sm border border-border-subtle/20 flex flex-col justify-between h-[140px] group transition-all hover:scale-[1.02]">
                <div class="flex justify-between items-start">
                    <p class="text-text-muted text-[10px] font-black uppercase tracking-widest">{{ $t('catalog.clients.profile.sections.kpis') }}</p>
                    <div class="p-2 rounded-xl bg-accent/10 text-accent"><CalendarClock class="w-4 h-4" /></div>
                </div>
                <h4 class="text-text-primary text-4xl font-black">{{ kpis.bookingFrequencyDays || 30 }} <span class="text-xl text-text-muted">{{ $t('overview.charts.days.sat').toLowerCase() === 's' ? 'Días' : 'Days' }}</span></h4>
            </div>
        </div>

        <!-- COLUMN 3: Appointments & Sales -->
        <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 lg:p-8 space-y-8 flex flex-col shadow-sm border border-border-subtle/20">
            <h3 class="text-text-primary text-lg font-bold tracking-tight">{{ $t('catalog.clients.profile.sections.appointments') }}</h3>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-3">
                    <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest">{{ $t('catalog.clients.profile.appointments.status.upcoming') }}</h4>
                    <div v-if="upcomingBooking" class="space-y-1">
                        <div class="flex items-center gap-2 text-text-primary font-black text-lg">
                            <Clock class="w-5 h-5 text-text-muted" /> 
                            {{ new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(upcomingBooking.booking_date)) }}
                        </div>
                        <p class="text-[10px] font-bold text-text-muted uppercase pl-7">{{ upcomingBooking.start_time }} - {{ upcomingBooking.item_type }}</p>
                    </div>
                    <p v-else class="text-text-muted text-xs italic">{{ $t('catalog.clients.profile.compliance.status.pending') }}</p>
                </div>

                <div class="space-y-3">
                    <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest">{{ $t('catalog.clients.profile.kpis.lastVisit') }}</h4>
                    <div v-if="lastVisitDays" class="space-y-1">
                        <div class="flex items-center gap-2 text-text-primary font-black text-lg">
                            <History class="w-5 h-5 text-text-muted" />
                            {{ locale === 'es' ? 'Hace' : 'Hace' }} {{ lastVisitDays.days }} {{ locale === 'es' ? 'días' : 'days' }}
                        </div>
                        <p class="text-[10px] font-bold text-text-muted uppercase pl-7">{{ new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(lastVisitDays.date)) }}</p>
                    </div>
                    <p v-else class="text-text-muted text-xs italic">{{ locale === 'es' ? 'Nuevo cliente' : 'New client' }}</p>
                </div>
            </div>

            <div class="space-y-4">
                <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest">{{ $t('catalog.clients.profile.kpis.topItems') }}</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white/30 dark:bg-black/10 rounded-2xl p-4 border border-border-subtle/30 min-h-[100px] flex flex-col items-center justify-center text-center">
                        <span class="text-[9px] font-black text-text-muted uppercase mb-2">{{ $t('catalog.menu.services').toUpperCase() }}</span>
                        <p class="text-[10px] font-bold opacity-50">{{ kpis.topServices[0]?.name || (locale === 'es' ? 'SIN HISTÓRICO' : 'NO HISTORY') }}</p>
                    </div>
                    <div class="bg-white/30 dark:bg-black/10 rounded-2xl p-4 border border-border-subtle/30 min-h-[100px] flex flex-col items-center justify-center text-center">
                        <span class="text-[9px] font-black text-text-muted uppercase mb-2">{{ $t('catalog.menu.products').toUpperCase() }}</span>
                        <p class="text-[10px] font-bold opacity-50">{{ kpis.topProducts[0]?.name || (locale === 'es' ? 'SIN COMPRAS' : 'NO PURCHASES') }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ROW 2: Bottom area / 2 columns -->
        <div class="xl:col-span-1 flex flex-col gap-6 lg:gap-8">
            <!-- Legal & Compliance -->
            <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 lg:p-8 space-y-6 flex flex-col shadow-sm border border-border-subtle/20 h-fit">
                <h3 class="text-text-primary text-lg font-bold tracking-tight">{{ $t('catalog.clients.profile.sections.compliance') }}</h3>
                
                <div class="space-y-6">
                    <!-- Consents -->
                    <div>
                        <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-4">{{ $t('catalog.clients.profile.compliance.consents') }}</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <!-- GDPR -->
                            <div class="bg-white/40 dark:bg-black/20 rounded-2xl p-3 border border-border-subtle/30 flex flex-col justify-between min-h-[110px]">
                                <span class="text-[10px] font-black text-text-muted uppercase">{{ $t('catalog.clients.profile.compliance.items.gdpr') }}</span>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-1.5 text-success text-[11px] font-bold">
                                        <CheckCircle2 class="w-3.5 h-3.5" />
                                        <span>{{ $t('catalog.clients.profile.compliance.status.signed') }}</span>
                                    </div>
                                    <p class="text-[10px] text-text-muted font-bold">{{ gdprStatus.date || '15/01/2024' }}</p>
                                </div>
                                <div v-if="photographyStatus.signed" class="flex items-center gap-1.5 text-error text-[11px] font-bold mt-2">
                                    <XCircle class="w-3.5 h-3.5" />
                                    <span>{{ $t('catalog.clients.profile.compliance.items.photo') }}</span>
                                </div>
                            </div>

                            <!-- Marketing -->
                            <div class="bg-white/40 dark:bg-black/20 rounded-2xl p-3 border border-border-subtle/30 flex flex-col justify-between min-h-[110px]">
                                <span class="text-[10px] font-black text-text-muted uppercase">{{ $t('catalog.clients.profile.compliance.items.marketing') }}</span>
                                <div class="space-y-1">
                                    <div v-if="marketingStatus.signed" class="flex items-center gap-1.5 text-success text-[11px] font-bold">
                                        <CheckCircle2 class="w-3.5 h-3.5" />
                                        <span>{{ $t('catalog.clients.profile.compliance.status.signed') }}</span>
                                    </div>
                                    <div v-else class="flex items-center gap-1.5 text-warning text-[11px] font-bold">
                                        <Clock class="w-3.5 h-3.5" />
                                        <span>{{ $t('catalog.clients.profile.compliance.status.pending') }}</span>
                                    </div>
                                    <p class="text-[10px] text-text-muted font-bold">{{ marketingStatus.date || '22/02/2024' }}</p>
                                </div>
                                <button class="btn btn-ghost btn-xs h-6 min-h-0 w-full mt-2 rounded-lg bg-white/50 dark:bg-black/30 font-bold text-[10px] border border-border-subtle/30">
                                    {{ $t('overview.charts.details') }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <!-- Questionnaires -->
                        <div>
                            <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-4">{{ $t('catalog.clients.profile.compliance.questionnaires') }}</h4>
                            <div class="space-y-3">
                                <div class="bg-white/40 dark:bg-black/20 rounded-2xl p-3 border border-border-subtle/30 space-y-2">
                                    <div class="flex flex-col">
                                        <span class="text-[10px] font-bold text-text-primary uppercase leading-tight">{{ $t('catalog.clients.profile.compliance.items.medical') }}</span>
                                        <div class="flex items-center gap-1.5 text-success text-[11px] font-bold mt-1">
                                            <CheckCircle2 class="w-3.5 h-3.5" />
                                            <span>{{ $t('catalog.clients.profile.compliance.status.signed') }}</span>
                                        </div>
                                    </div>
                                    <div class="flex flex-col pt-1 border-t border-border-subtle/20">
                                        <span class="text-[10px] font-bold text-text-primary uppercase leading-tight">{{ $t('catalog.clients.profile.compliance.items.skin') }}</span>
                                        <p class="text-[10px] text-text-muted font-bold mt-1">{{ skinStatus.date || '30/03/2024' }}</p>
                                    </div>
                                    <button class="btn btn-ghost btn-xs h-6 min-h-0 w-full mt-1 rounded-lg bg-white/50 dark:bg-black/30 font-bold text-[10px] border border-border-subtle/30">
                                        {{ $t('overview.charts.details') }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Revocations -->
                        <div>
                            <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-4">{{ $t('catalog.clients.profile.compliance.revocations') }}</h4>
                            <div class="bg-white/40 dark:bg-black/20 rounded-2xl p-3 border border-border-subtle/30 flex flex-col justify-between min-h-[110px]">
                                <span class="text-[10px] font-black text-text-muted uppercase">{{ $t('catalog.clients.profile.compliance.items.phone') }}</span>
                                <div class="space-y-2">
                                    <div class="flex items-center gap-1.5 text-error text-[11px] font-bold bg-error/10 px-2 py-0.5 rounded-full w-fit">
                                        <XCircle class="w-3.5 h-3.5" />
                                        <span>{{ $t('catalog.clients.profile.compliance.status.withdrawn') }}</span>
                                    </div>
                                    <p class="text-[10px] text-text-muted font-bold">01/02/2024</p>
                                </div>
                                <button class="btn btn-ghost btn-xs h-6 min-h-0 w-full mt-2 rounded-lg bg-white/50 dark:bg-black/30 font-bold text-[10px] border border-border-subtle/30">
                                    {{ $t('overview.charts.details') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Anotaciones Comerciales -->
            <div class="bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 lg:p-8 space-y-4 flex flex-col shadow-sm border border-border-subtle/20">
                <h3 class="text-text-primary text-lg font-bold tracking-tight">{{ $t('catalog.clients.profile.sections.notes') }}</h3>
                <textarea 
                    v-model="notesText" 
                    class="textarea textarea-bordered border-border-subtle bg-white/50 dark:bg-black/20 focus:border-primary focus:ring-primary h-28 w-full rounded-2xl p-4 text-sm font-medium focus:ring-1 resize-none italic" 
                    :placeholder="locale === 'es' ? 'Escribe aquí notas médicas, incidencias o preferencias especiales de este cliente...' : 'Write medical notes, incidents or special client preferences here...'"
                ></textarea>
                <div class="flex justify-end">
                    <button @click="saveNotes" :disabled="isSavingNotes" class="btn bg-[#5D5CDE] text-white hover:bg-[#4B4ABF] border-none rounded-xl font-bold px-10 shadow-lg">
                        <span v-if="isSavingNotes" class="loading loading-spinner w-4 h-4"></span>
                        {{ isSavingNotes ? (locale === 'es' ? 'Guardando...' : 'Saving...') : $t('common.save') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Treatment History & Timeline -->
        <div class="xl:col-span-2 bg-[#E5E5E5] dark:bg-[#1E1E1E] rounded-3xl p-6 lg:p-8 space-y-6 flex flex-col shadow-sm border border-border-subtle/20 relative">
            <h3 class="text-text-primary text-lg font-bold tracking-tight">{{ $t('catalog.clients.profile.sections.timeline') }}</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 relative">
                <!-- Vertical Line (CSS) -->
                <div class="absolute left-[13px] top-6 bottom-6 w-0.5 bg-border-default opacity-30 z-0"></div>

                <div v-for="act in timeline" :key="act.id" class="flex gap-4 relative z-10 group">
                    <div class="shrink-0 w-7 h-7 rounded-full bg-white dark:bg-black border-2 flex items-center justify-center shadow-sm group-hover:border-primary transition-colors" 
                         :class="[
                            act.type === 'purchase' || act.type === 'compliance' ? 'border-success/40' : 
                            act.type === 'debt' ? 'border-error/40' : 
                            'border-border-default'
                         ]">
                        <component :is="act.icon" class="w-3.5 h-3.5" :class="[
                            act.type === 'purchase' || (act.type === 'compliance' && act.status === 'completed') ? 'text-success' : 
                            act.type === 'debt' ? 'text-error' : 
                            (act.status === 'pending' ? 'text-warning' : 'text-primary')
                        ]" />
                        
                        <!-- Small status dot -->
                        <div v-if="act.status === 'completed'" class="absolute -right-0.5 -bottom-0.5 w-2 h-2 bg-success rounded-full border border-white dark:border-black"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-0.5">
                                    {{ act.status === 'pending' ? $t('catalog.clients.profile.appointments.status.upcoming') : (act.status === 'cancelled' ? $t('catalog.clients.profile.appointments.status.canceled') : $t('catalog.clients.profile.appointments.status.completed')) }}: {{ new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(act.date) }}
                                </p>
                                <h5 class="text-text-primary text-sm font-bold truncate leading-tight">{{ act.title }}</h5>
                                <p class="text-[10px] text-text-muted font-bold mt-0.5 leading-none">
                                    {{ act.type === 'purchase' ? $t('catalog.clients.profile.timeline.method') : $t('catalog.clients.profile.kpis.professional') }}: 
                                    <span class="text-text-primary">{{ act.professional }}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            @click="act.type === 'booking' ? $emit('open-booking', act.raw) : (act.type === 'debt' ? $emit('open-debt', act.raw) : (act.type === 'purchase' ? $emit('open-purchase', act.raw) : null))"
                            v-if="act.type !== 'compliance'"
                            class="btn btn-ghost btn-xs rounded-lg mt-2 font-bold opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-black/50 border border-border-subtle/30 px-3"
                        >
                            {{ $t('catalog.clients.profile.kpis.viewDetails') }}
                        </button>
                    </div>
                </div>

                <div v-if="timeline.length === 0" class="col-span-2 py-10 flex flex-col items-center justify-center text-center opacity-30">
                    <History class="w-10 h-10 mb-2" />
                    <p class="text-sm font-bold uppercase tracking-widest">{{ $t('catalog.clients.profile.timeline.none') }}</p>
                </div>
            </div>
        </div>

    </div>
</template>


<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: var(--color-border-subtle);
    border-radius: 10px;
}
</style>
