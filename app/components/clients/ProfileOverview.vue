<script setup lang="ts">
	import {
		Calendar, FileSignature, FileText, ArrowRight, Clock,
		CheckCircle2, XCircle, AlertCircle, ShoppingBag, Sparkles, TrendingUp, Wallet, ArrowUpRight
	} from 'lucide-vue-next'

	const props = defineProps({
		client: { type: Object as PropType<any>, required: true },
	})

    const kpis = computed(() => props.client?.kpis || {
        topServices: [], topProducts: [], ltv: 0, aov: 0, bookingFrequencyDays: 0, totalBookings: 0
    })

	const formatDateTime = (dateStr: string) => {
		if (!dateStr) return 'N/A'
		return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
	}

	const getStatusIcon = (status: string) => {
		switch (status) { case 'completed': return CheckCircle2; case 'cancelled': return XCircle; case 'pending': return Clock; default: return AlertCircle }
	}
	const getStatusColor = (status: string) => {
		switch (status) { case 'completed': return 'text-success'; case 'cancelled': return 'text-error'; case 'pending': return 'text-warning'; default: return 'text-primary' }
	}

	const timeline = computed(() => {
		const activities: any[] = []
		props.client.client_bookings?.forEach((b: any) => {
			activities.push({ id: b.booking_id, date: new Date(b.booking_date), type: 'booking', title: `Cita: ${b.item_type}`, status: b.status, icon: Calendar, color: 'bg-primary/10 text-primary' })
		})
		props.client.consents?.forEach((c: any) => {
			activities.push({ id: c.consent_id, date: new Date(c.signed_date), type: 'consent', title: `Consentimiento: ${c.consent_type || 'General'}`, status: c.status, icon: FileSignature, color: 'bg-success/10 text-success' })
		})
		props.client.questionnaires?.forEach((q: any) => {
			activities.push({ id: q.questionnaire_id, date: new Date(q.created_at), type: 'questionnaire', title: `Formulario: ${q.title}`, status: 'completado', icon: FileText, color: 'bg-info/10 text-info' })
		})
		return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10)
	})
</script>

<template>
    <div class="flex flex-col gap-6 lg:gap-8">
        <!-- Quick KPIs Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 min-[820px]:grid-cols-3 gap-4 lg:gap-6">
            <!-- LTV -->
            <div class="bg-bg-card border-border-subtle rounded-3xl border shadow-sm p-6 flex flex-col justify-between group hover:border-success/30 transition-colors">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-text-muted text-[10px] font-black tracking-widest uppercase mb-1">Valor de Vida (LTV)</p>
                        <h4 class="text-text-primary text-3xl font-black tabular-nums tracking-tight">{{ kpis.ltv.toFixed(2) }}€</h4>
                    </div>
                    <div class="bg-success/10 text-success group-hover:bg-success group-hover:text-bg-card transition-colors h-12 w-12 flex items-center justify-center rounded-2xl">
                        <Wallet class="w-6 h-6" />
                    </div>
                </div>
                <div class="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <CheckCircle2 class="w-4 h-4 text-success" /> {{ kpis.totalBookings }} Visitas históricas
                </div>
            </div>

            <!-- AOV -->
            <div class="bg-bg-card border-border-subtle rounded-3xl border shadow-sm p-6 flex flex-col justify-between group hover:border-info/30 transition-colors">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-text-muted text-[10px] font-black tracking-widest uppercase mb-1">Ticket Medio (AOV)</p>
                        <h4 class="text-text-primary text-3xl font-black tabular-nums tracking-tight">{{ kpis.aov.toFixed(2) }}€</h4>
                    </div>
                    <div class="bg-info/10 text-info group-hover:bg-info group-hover:text-bg-card transition-colors h-12 w-12 flex items-center justify-center rounded-2xl">
                        <ArrowUpRight class="w-6 h-6" />
                    </div>
                </div>
                <div class="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <TrendingUp class="w-4 h-4 text-info" /> Ingreso por sesión
                </div>
            </div>

            <!-- Frequency -->
            <div class="bg-bg-card border-border-subtle rounded-3xl border shadow-sm p-6 flex flex-col justify-between sm:col-span-2 min-[820px]:col-span-1 group hover:border-primary/30 transition-colors">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-text-muted text-[10px] font-black tracking-widest uppercase mb-1">Frecuencia Habitual</p>
                        <h4 class="text-text-primary text-3xl font-black tracking-tight" v-if="kpis.bookingFrequencyDays > 0">
                            {{ kpis.bookingFrequencyDays }} <span class="text-lg text-text-muted font-bold block sm:inline">días</span>
                        </h4>
                        <h4 class="text-text-primary text-2xl font-black" v-else>Indefinida</h4>
                    </div>
                    <div class="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-bg-card transition-colors h-12 w-12 flex items-center justify-center rounded-xl">
                        <Calendar class="w-6 h-6" />
                    </div>
                </div>
                <div class="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <Clock class="w-4 h-4 text-primary" /> Recurrencia natural
                </div>
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            <!-- Left Area (Tops & Notes) - Spans 7 cols on XL -->
            <div class="xl:col-span-7 flex flex-col gap-6 lg:gap-8">
                
                <!-- Favoritos Bento -->
                <div class="bg-bg-card border-border-subtle rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                    <div class="border-border-subtle bg-bg-muted/30 border-b px-6 py-5 flex items-center gap-3">
                        <div class="bg-warning/20 p-2 rounded-xl text-warning">
                             <Sparkles class="w-5 h-5" />
                        </div>
                        <h3 class="text-text-primary text-sm font-bold tracking-wider uppercase">Favoritos Históricos</h3>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-subtle flex-1">
                        <!-- Top Services -->
                        <div class="p-6">
                            <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-5">Top Servicios</h4>
                            <div v-if="kpis.topServices.length > 0" class="space-y-4">
                                <div v-for="(svc, index) in kpis.topServices" :key="svc.name" class="flex items-center gap-4 group">
                                    <div class="bg-bg-muted/50 text-text-primary font-black shadow-inner text-xs w-8 h-8 flex items-center justify-center rounded-xl group-hover:bg-warning group-hover:text-bg-card transition-colors shrink-0">{{ Number(index) + 1 }}</div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-text-primary text-sm font-bold truncate">{{ svc.name }}</p>
                                        <p class="text-text-muted text-[10px] font-black uppercase mt-0.5">{{ svc.qty }} citas</p>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="h-24 flex items-center justify-center border-2 border-dashed border-border-default rounded-2xl">
                                <p class="text-text-muted text-xs font-bold uppercase">Sin histórico</p>
                            </div>
                        </div>
                        
                        <!-- Top Products -->
                        <div class="p-6">
                            <h4 class="text-text-muted text-[10px] font-black uppercase tracking-widest mb-5">Top Productos</h4>
                            <div v-if="kpis.topProducts.length > 0" class="space-y-4">
                                <div v-for="(prd, index) in kpis.topProducts" :key="prd.name" class="flex items-center gap-4 group">
                                    <div class="bg-bg-muted/50 text-text-primary font-black shadow-inner text-xs w-8 h-8 flex items-center justify-center rounded-xl group-hover:bg-primary group-hover:text-bg-card transition-colors shrink-0">{{ Number(index) + 1 }}</div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-text-primary text-sm font-bold truncate">{{ prd.name }}</p>
                                        <p class="text-text-muted text-[10px] font-black uppercase mt-0.5">{{ prd.qty }} Uds</p>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="h-24 flex items-center justify-center border-2 border-dashed border-border-default rounded-2xl">
                                <p class="text-text-muted text-xs font-bold uppercase">Sin compras</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Notes / Quick CRM Box -->
                <div class="bg-bg-card border-border-subtle rounded-3xl border shadow-sm flex flex-col">
                    <div class="border-border-subtle bg-bg-muted/30 border-b px-6 py-5 flex items-center justify-between">
                        <h3 class="text-text-primary text-sm font-bold tracking-wider uppercase">Anotaciones Comerciales</h3>
                    </div>
                    <div class="p-6 flex flex-col gap-4">
                        <textarea class="textarea textarea-bordered border-border-subtle bg-bg-muted/30 focus:border-primary focus:ring-primary h-36 w-full rounded-2xl p-4 text-sm font-medium focus:ring-1 resize-none" placeholder="Escribe aquí notas médicas, incidencias o preferencias especiales de este cliente..."></textarea>
                        <div class="flex justify-end">
                            <button class="btn bg-primary text-bg-card hover:bg-primary/90 rounded-xl font-bold px-8">Guardar</button>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Right Area (Timeline) - Spans 5 cols on XL -->
            <div class="xl:col-span-5 bg-bg-card border-border-subtle overflow-hidden rounded-3xl border shadow-sm flex flex-col xl:sticky xl:top-6">
                <div class="border-border-subtle bg-text-secondary flex items-center justify-between border-b px-6 py-5">
                    <h3 class="text-bg-card text-sm font-bold tracking-wider uppercase">Línea de Tiempo</h3>
                    <span class="bg-white/20 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-lg">{{ timeline.length }} Recientes</span>
                </div>
                
                <div class="p-6 md:p-8 overflow-y-auto max-h-[500px] xl:max-h-[800px] custom-scrollbar">
                    <div v-if="timeline.length > 0" class="before:bg-border-subtle relative space-y-8 before:absolute before:top-2 before:left-3 md:before:left-3.5 before:h-[calc(100%-16px)] before:w-0.5">
                        <div v-for="event in timeline" :key="event.id" class="relative flex gap-5 pl-10 md:pl-12">
                            <!-- Timeline Dot/Icon -->
                            <div class="absolute left-0 flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full shadow-sm ring-4 ring-bg-card bg-bg-card z-10" :class="event.color">
                                <component :is="event.icon" class="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </div>

                            <div class="flex-1 bg-bg-muted/30 border border-border-subtle rounded-2xl p-4 md:p-5 hover:bg-bg-muted/50 transition-colors">
                                <div class="flex items-start justify-between gap-2">
                                    <h4 class="text-text-primary text-sm leading-tight font-bold">{{ event.title }}</h4>
                                    <time class="text-text-muted text-[10px] font-black uppercase text-right shrink-0">
                                        {{ formatDateTime(event.date).replace(', ', '\n') }}
                                    </time>
                                </div>
                                <div class="mt-3 flex items-center gap-1.5">
                                    <component :is="getStatusIcon(event.status)" class="h-3.5 w-3.5" :class="getStatusColor(event.status)" />
                                    <span class="text-text-primary text-[10px] font-black uppercase tracking-widest">{{ event.status }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="flex flex-col items-center justify-center py-24 text-center">
                        <div class="bg-bg-muted text-text-muted mb-4 h-16 w-16 rounded-full flex items-center justify-center">
                            <Clock class="h-8 w-8 opacity-50" />
                        </div>
                        <p class="text-text-primary font-bold">Historial Limpio</p>
                        <p class="text-text-muted text-sm font-medium mt-1">Este cliente no ha generado eventos todavía.</p>
                    </div>
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
