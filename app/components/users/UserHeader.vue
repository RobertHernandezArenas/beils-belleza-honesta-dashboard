<template>
	<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-4xl font-medium tracking-tighter text-[#404040]">
				{{ $t('nav.users') }}
			</h1>
			<p class="mt-1 text-sm font-bold tracking-widest text-[#8c8c8c] uppercase">
				{{ $t('users.header.manage') || 'Administra accesos y roles' }}
			</p>
		</div>

		<div class="flex items-center gap-4">
			<button
				@click="$emit('toggle-filters')"
				class="btn btn-ghost relative h-12 rounded-2xl px-4 font-semibold transition-colors"
				:class="
					filtersActive
						? 'border-[#1a1a1a] bg-[#f4f1ee] text-[#404040] hover:bg-[#eadecc]'
						: 'bg-[#ffffff] text-[#666666] hover:bg-[#f4f1ee] hover:text-[#404040]'
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
				class="group relative flex h-12 items-center justify-center overflow-hidden rounded-2xl bg-[#404040] px-6 font-medium text-[#ffffff] uppercase shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-[transform,box-shadow,color,background-color] hover:scale-105 hover:shadow-lg hover:shadow-[#1a1a1a]/20">
				<span class="relative z-10 flex items-center gap-2">
					<Plus class="h-5 w-5" />
					{{ $t('users.header.create') }}
				</span>
				<div
					class="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-[#ffffff]/30 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
			</button>
		</div>
	</div>

	<!-- Search Bar flotante -->
	<div class="group relative max-w-xl">
		<label for="users-search" class="sr-only">{{ $t('users.header.search') }}</label>
		<input
			id="users-search"
			v-model="searchQuery"
			type="search"
			:placeholder="$t('users.header.search')"
			class="input input-bordered h-14 w-full rounded-2xl border-transparent bg-[#ffffff] pl-14 text-lg font-medium text-[#404040] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-[border-color,background-color,color,box-shadow] placeholder:text-[#8c8c8c] focus-visible:bg-[#ffffff] focus-visible:outline-none" />
		<Search
			class="absolute top-4 left-5 h-6 w-6 text-[#8c8c8c] transition-colors group-focus-within:text-[#404040]"
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
