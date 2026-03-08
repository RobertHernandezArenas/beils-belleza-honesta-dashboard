<template>
	<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-text-secondary text-4xl font-medium tracking-tighter">
				{{ $t('nav.users') }}
			</h1>
			<p class="text-text-light mt-1 text-sm font-bold tracking-widest uppercase">
				{{ $t('users.header.manage') || 'Administra accesos y roles' }}
			</p>
		</div>

		<div class="flex items-center gap-4">
			<button
				@click="$emit('toggle-filters')"
				class="btn btn-ghost ring-border-subtle relative h-12 rounded-2xl px-5 font-bold transition-colors duration-300"
				:class="
					filtersActive
						? 'border-text-primary bg-bg-muted text-text-primary ring-text-primary shadow-sm ring-1'
						: 'border-border-default bg-bg-card text-text-secondary hover:bg-bg-muted hover:shadow-sm'
				">
				<Filter class="mr-2 h-5 w-5" />
				{{ $t('users.header.filters') }}
				<!-- Punto indicador -->
				<span v-if="filtersActive" class="absolute -top-1 -right-1 flex h-3 w-3">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
					<span class="relative inline-flex h-3 w-3 rounded-full bg-green-600"></span>
				</span>
			</button>
			<button
				@click="$emit('create')"
				class="group text-bg-card bg-text-primary hover:bg-text-primary/90 hover:shadow-text-primary/30 relative flex h-12 items-center justify-center overflow-hidden rounded-2xl px-6 font-bold tracking-wide uppercase shadow-[0_4px_15px_rgba(26,26,26,0.3)] transition-[transform,box-shadow,color,background-color] hover:shadow-lg">
				<span class="relative z-10 flex items-center gap-2">
					{{ $t('users.header.create') }}
				</span>
				<div
					class="via-bg-card/20 absolute inset-0 -translate-x-full bg-linear-to-r from-transparent to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
			</button>
		</div>
	</div>

	<!-- Search Bar flotante -->
	<div class="group relative flex max-w-xl items-center">
		<label for="users-search" class="sr-only">{{ $t('users.header.search') }}</label>
		<input
			id="users-search"
			v-model="searchQuery"
			type="search"
			:placeholder="$t('users.header.search')"
			class="input bg-bg-card text-text-primary placeholder:text-text-light focus:bg-bg-card focus:ring-border-subtle/40 h-12 w-full rounded-2xl border-transparent pr-5 pl-11 text-sm font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors duration-300 placeholder:font-normal hover:shadow-md focus:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus:ring-4 focus-visible:outline-none sm:h-14 sm:pl-12 sm:text-base lg:text-lg" />
		<Search
			class="text-text-light group-focus-within:text-text-secondary absolute left-4 h-5 w-5 transition-colors duration-300 sm:h-6 sm:w-6"
			aria-hidden="true" />
	</div>
</template>

<script setup lang="ts">
	import { Filter, Plus, Search } from 'lucide-vue-next'

	const searchQuery = defineModel<string>()

	defineProps<{
		filtersActive?: boolean
	}>()

	defineEmits(['create', 'toggle-filters'])
</script>
