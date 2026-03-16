<script setup lang="ts">
	import { ChevronRight, Home } from 'lucide-vue-next'

	import { useRoute } from 'vue-router'
	import { useI18n } from 'vue-i18n'

	const { t } = useI18n()

	const props = defineProps<{
		currentLabel: string
	}>()

	const route = useRoute()

	const breadcrumbs = computed(() => {
		const isHome = route.path === '/overview' || route.path === '/'

		if (isHome) {
			return [{ label: t('nav.dashboard'), to: '/overview', active: true, icon: true }]
		}

		return [
			{ label: t('nav.dashboard'), to: '/overview', active: false, icon: true },
			{ label: props.currentLabel, to: route.path, active: true, icon: false },
		]
	})
</script>

<template>
	<nav aria-label="Breadcrumb" class="hidden items-center md:flex">
		<ol class="text-text-muted flex items-center gap-1.5 text-sm font-medium">
			<li v-for="(crumb, index) in breadcrumbs" :key="crumb.to" class="flex items-center">
				<NuxtLink
					v-if="!crumb.active"
					:to="crumb.to"
					class="hover:text-text-secondary flex items-center gap-1.5 transition-colors">
					<Home v-if="crumb.icon" class="mb-[2px] h-3.5 w-3.5 duration-300" />
					<span v-else class="tracking-wide capitalize">{{ crumb.label }}</span>
				</NuxtLink>
				<span
					v-else
					class="text-text-secondary flex items-center gap-1.5 font-bold tracking-wide capitalize"
					aria-current="page">
					<Home v-if="crumb.icon && breadcrumbs.length === 1" class="mb-[2px] h-3.5 w-3.5" />
					<span>{{ crumb.label }}</span>
				</span>

				<ChevronRight
					v-if="index < breadcrumbs.length - 1"
					class="text-border-strong mx-1 mb-px h-3.5 w-3.5 opacity-70" />
			</li>
		</ol>
	</nav>
</template>
