<script lang="ts" setup>
	import { useI18n } from 'vue-i18n'
	import {
		CircleDollarSign,
		TrendingUp,
		TrendingDown,
		Truck,
		Route,
		Users,
		Clock,
		CheckCircle2,
		AlertCircle,
		MapPin,
	} from 'lucide-vue-next'

	const { t, locale } = useI18n()
	const authStore = useAuthStore()

	// Datos simulados para las tarjetas KPI
	const kpis = computed(() => [
		{
			id: 1,
			title: t('overview.kpis.revenue.title'),
			value: new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'USD' }).format(45231),
			trend: '+12.5%',
			trendColor: 'text-green-600',
			icon: CircleDollarSign,
			iconBg: 'bg-[#f4f1ee]',
			iconColor: 'text-[#404040]',
		},
		{
			id: 2,
			title: t('overview.kpis.fleet.title'),
			value: '42 / 50',
			trend: `84% ${t('overview.kpis.fleet.trend')}`,
			trendColor: 'text-[#666666]',
			icon: Truck,
			iconBg: 'bg-[#f4f1ee]',
			iconColor: 'text-[#404040]',
		},
		{
			id: 3,
			title: t('overview.kpis.routes.title'),
			value: '128',
			trend: `+5 ${t('overview.kpis.routes.trend')}`,
			trendColor: 'text-green-600',
			icon: Route,
			iconBg: 'bg-[#f4f1ee]',
			iconColor: 'text-[#404040]',
		},
		{
			id: 4,
			title: t('overview.kpis.drivers.title'),
			value: '38',
			trend: `-2 ${t('overview.kpis.drivers.trend')}`,
			trendColor: 'text-red-600',
			icon: Users,
			iconBg: 'bg-[#f4f1ee]',
			iconColor: 'text-[#404040]',
		},
	])

	// Datos simulados para eventos recientes (Activity Feed)
	const recentActivities = computed(() => [
		{
			id: 1,
			title: t('overview.activity.mock1.title'),
			description: t('overview.activity.mock1.desc'),
			time: `${t('overview.activity.timeAgo')} 10 min`,
			icon: MapPin,
			color: 'text-[#404040]',
			bg: 'bg-[#f4f1ee]',
		},
		{
			id: 2,
			title: t('overview.activity.mock2.title'),
			description: t('overview.activity.mock2.desc'),
			time: `${t('overview.activity.timeAgo')} 45 min`,
			icon: CheckCircle2,
			color: 'text-green-600',
			bg: 'bg-green-100',
		},
		{
			id: 3,
			title: t('overview.activity.mock3.title'),
			description: t('overview.activity.mock3.desc'),
			time: `${t('overview.activity.timeAgo')} 2 h`,
			icon: AlertCircle,
			color: 'text-red-600',
			bg: 'bg-red-100',
		},
		{
			id: 4,
			title: t('overview.activity.mock4.title'),
			description: t('overview.activity.mock4.desc'),
			time: `${t('overview.activity.timeAgo')} 3 h`,
			icon: CircleDollarSign,
			color: 'text-green-600',
			bg: 'bg-green-100',
		},
	])
</script>

<template>
	<div class="flex h-full w-full flex-col gap-8 p-6 lg:p-10">
		<!-- HEADER / HERO -->
		<header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
			<div>
				<h1 class="text-4xl font-medium tracking-tighter text-[#404040] md:text-5xl">
					{{ $t('overview.hero.title') }},
					<span class="font-light text-[#666666]">
						{{ authStore.user?.name || $t('overview.hero.guest') }}
					</span>
					!
				</h1>
				<p class="mt-2 text-sm font-semibold tracking-wider text-[#8c8c8c] uppercase">
					{{ $t('overview.hero.subtitle') }}
				</p>
			</div>

			<!-- Quick Period Selector -->
			<div
				class="inline-flex items-center rounded-2xl border border-transparent bg-[#ffffff] p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
				<button
					class="rounded-xl px-4 py-2 text-xs font-bold text-[#8c8c8c] transition duration-300 hover:bg-[#f4f1ee] hover:text-[#404040]">
					{{ $t('overview.period.yesterday') }}
				</button>
				<button
					class="rounded-xl bg-[#404040] px-4 py-2 text-xs font-medium text-[#ffffff] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition duration-300">
					{{ $t('overview.period.today') }}
				</button>
				<button
					class="rounded-xl px-4 py-2 text-xs font-bold text-[#8c8c8c] transition duration-300 hover:bg-[#f4f1ee] hover:text-[#404040]">
					{{ $t('overview.period.month') }}
				</button>
			</div>
		</header>

		<!-- KPI WIDGETS -->
		<section class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
			<div
				v-for="kpi in kpis"
				:key="kpi.id"
				class="group relative overflow-hidden rounded-[2rem] border border-transparent bg-[#ffffff] p-6 shadow-xs transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
				<!-- Fondo radial on Hover -->
				<div
					class="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#f4f1ee] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"></div>

				<div class="flex items-center justify-between">
					<div :class="['flex h-12 w-12 items-center justify-center rounded-2xl', kpi.iconBg]">
						<component :is="kpi.icon" :class="['h-6 w-6', kpi.iconColor]" />
					</div>
					<div
						class="flex items-center gap-1 rounded-full border border-[#f4f1ee] bg-[#fbfaf9] px-3 py-1">
						<TrendingUp
							v-if="kpi.trend.includes('+') || kpi.trend.includes('Operativos')"
							:class="['h-3 w-3', kpi.trendColor]" />
						<TrendingDown v-if="kpi.trend.includes('-')" :class="['h-3 w-3', kpi.trendColor]" />
						<span :class="['text-[10px] font-bold uppercase', kpi.trendColor]">{{ kpi.trend }}</span>
					</div>
				</div>

				<div class="mt-6 flex flex-col gap-1">
					<span class="text-xs font-bold tracking-widest text-[#8c8c8c] uppercase">
						{{ kpi.title }}
					</span>
					<span class="text-3xl font-medium tracking-tight text-[#404040]">{{ kpi.value }}</span>
				</div>
			</div>
		</section>

		<!-- MAIN DASHBOARD CONTENT -->
		<section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Gráfico Simulado (Izquierda - 2/3) -->
			<div
				class="flex flex-col overflow-hidden rounded-[2rem] border border-transparent bg-[#ffffff] p-1 shadow-xs lg:col-span-2">
				<div
					class="relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] bg-[#fbfaf9] p-6">
					<div
						class="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-[#ffffff] to-transparent"></div>

					<div class="relative z-10 mb-8 flex items-center justify-between">
						<h2 class="text-xl font-medium tracking-wide text-[#404040]">
							{{ $t('overview.charts.weekly') }}
						</h2>
						<button
							class="btn btn-sm btn-ghost rounded-full border border-transparent bg-[#ffffff] text-xs font-bold text-[#666666] hover:border-[#bababa] hover:bg-[#f2f0eb] hover:text-[#404040]">
							{{ $t('overview.charts.details') }}
						</button>
					</div>

					<!-- Bar Chart Mock -->
					<div
						class="relative z-10 mt-auto flex h-full min-h-[300px] items-end justify-between gap-2 md:gap-4">
						<!-- Líneas de fondo -->
						<div class="pointer-events-none absolute inset-0 flex flex-col justify-between">
							<div class="h-0 w-full border-t border-transparent/60"></div>
							<div class="h-0 w-full border-t border-transparent/60"></div>
							<div class="h-0 w-full border-t border-transparent/60"></div>
							<div class="h-0 w-full border-t border-transparent/60"></div>
						</div>

						<!-- Barras -->
						<div
							v-for="(h, i) in [40, 65, 30, 85, 55, 95, 70]"
							:key="i"
							class="group relative flex h-full w-full flex-col items-center justify-end">
							<div
								class="w-full rounded-t-xl bg-[#dbd2c6] transition-colors duration-500 ease-out group-hover:bg-[#404040]"
								:style="{ height: `${h}%` }">
								<!-- Tooltip on hover -->
								<div
									class="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg border border-transparent bg-[#ffffff] px-3 py-1 opacity-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-opacity group-hover:opacity-100">
									<span class="text-xs font-medium text-[#404040]">{{ h * 10 }}</span>
								</div>
							</div>
							<span class="mt-3 text-[10px] font-bold text-[#8c8c8c] uppercase">
								{{
									[
										$t('overview.charts.days.mon'),
										$t('overview.charts.days.tue'),
										$t('overview.charts.days.wed'),
										$t('overview.charts.days.thu'),
										$t('overview.charts.days.fri'),
										$t('overview.charts.days.sat'),
										$t('overview.charts.days.sun'),
									][i]
								}}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Actividades Recientes (Derecha - 1/3) -->
			<div
				class="flex flex-col overflow-hidden rounded-[2rem] border border-transparent bg-[#ffffff] p-1 shadow-xs">
				<div
					class="relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] bg-[#fbfaf9] p-6">
					<div class="relative z-10 mb-8 flex items-center justify-between">
						<h2 class="text-xl font-medium tracking-wide text-[#404040]">
							{{ $t('overview.activity.title') }}
						</h2>
					</div>

					<div class="relative z-10 flex flex-col gap-6 overflow-y-auto">
						<!-- Timeline items -->
						<div v-for="(act, idx) in recentActivities" :key="act.id" class="relative pl-6">
							<!-- Line connecting -->
							<div
								v-if="idx !== recentActivities.length - 1"
								class="absolute top-6 bottom-[-24px] left-2.5 w-px bg-[#dbd2c6]"></div>

							<!-- Bullet -->
							<div
								:class="[
									'absolute top-1 left-0 flex h-5 w-5 items-center justify-center rounded-full',
									act.bg,
								]">
								<component :is="act.icon" :class="['h-3 w-3', act.color]" />
							</div>

							<div class="flex flex-col gap-1">
								<span class="text-sm font-bold text-[#404040]">{{ act.title }}</span>
								<p class="line-clamp-2 text-xs leading-relaxed text-[#666666]">
									{{ act.description }}
								</p>
								<span
									class="mt-1 flex items-center gap-1 text-[10px] font-medium tracking-widest text-[#8c8c8c] uppercase">
									<Clock class="h-3 w-3" />
									{{ act.time }}
								</span>
							</div>
						</div>
					</div>

					<button
						class="mt-6 w-full rounded-xl border border-transparent bg-[#ffffff] py-3 text-xs font-bold text-[#666666] transition-colors hover:bg-[#f4f1ee] hover:text-[#404040]">
						{{ $t('overview.activity.viewAll') }}
					</button>
				</div>
			</div>
		</section>
	</div>
</template>
