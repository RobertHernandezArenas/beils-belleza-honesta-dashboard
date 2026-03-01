<template>
	<transition name="expand">
		<div
			v-show="filtersStore.showFilters"
			class="mb-6 overflow-hidden rounded-[2rem] bg-bg-card p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<!-- ROL -->
				<div>
					<h3 class="mb-3 text-[10px] font-medium tracking-widest text-text-light uppercase">
						{{ $t('users.filters.role') }}
					</h3>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="r in ['all', 'ADMIN', 'USER']"
							:key="r"
							@click="filtersStore.filterRole = r"
							class="rounded-xl px-4 py-2 text-xs font-bold transition-[background-color,color,border-color,box-shadow] focus-visible:outline-none"
							:aria-pressed="filtersStore.filterRole === r"
							:class="
								filtersStore.filterRole === r
									? 'border border-[#1a1a1a] bg-[#404040] text-bg-card shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
									: 'border border-border-subtle bg-bg-app text-text-muted hover:bg-bg-muted hover:text-text-secondary'
							">
							{{ r === 'all' ? $t('users.filters.all') : $t('users.constants.roles.' + r) }}
						</button>
					</div>
				</div>

				<!-- ESTADO -->
				<div>
					<h3 class="mb-3 text-[10px] font-medium tracking-widest text-text-light uppercase">
						{{ $t('users.filters.status') }}
					</h3>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="s in ['all', 'ON', 'OFF']"
							:key="s"
							@click="filtersStore.filterStatus = s"
							class="rounded-xl px-4 py-2 text-xs font-bold transition-[background-color,color,border-color,box-shadow] focus-visible:outline-none"
							:aria-pressed="filtersStore.filterStatus === s"
							:class="
								filtersStore.filterStatus === s
									? 'border border-[#1a1a1a] bg-[#404040] text-bg-card shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
									: 'border border-border-subtle bg-bg-app text-text-muted hover:bg-bg-muted hover:text-text-secondary'
							">
							{{ s === 'all' ? $t('users.filters.all') : $t('users.constants.status.' + s) }}
						</button>
					</div>
				</div>

				<!-- TIPO DOCUMENTO -->
				<div>
					<h3 class="mb-3 text-[10px] font-medium tracking-widest text-text-light uppercase">
						{{ $t('users.filters.document') }}
					</h3>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="d in ['all', 'DNI', 'PASSPORT', 'NIE']"
							:key="d"
							@click="filtersStore.filterDocType = d"
							class="rounded-xl px-4 py-2 text-xs font-bold transition-[background-color,color,border-color,box-shadow] focus-visible:outline-none"
							:aria-pressed="filtersStore.filterDocType === d"
							:class="
								filtersStore.filterDocType === d
									? 'border border-[#1a1a1a] bg-[#404040] text-bg-card shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
									: 'border border-border-subtle bg-bg-app text-text-muted hover:bg-bg-muted hover:text-text-secondary'
							">
							{{ d === 'all' ? $t('users.filters.all') : d }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</transition>
</template>

<script setup lang="ts">
	import { useUsersFilterStore } from '~/stores/useUsersFilterStore'

	const filtersStore = useUsersFilterStore()
</script>

<style scoped>
	/* Animación para el panel de filtros */
	.expand-enter-active,
	.expand-leave-active {
		transition-property: max-height, opacity, transform, padding, margin, border-width;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		max-height: 500px;
		opacity: 1;
		transform: translateY(0);
	}
	.expand-enter-from,
	.expand-leave-to {
		max-height: 0;
		opacity: 0;
		padding-top: 0;
		padding-bottom: 0;
		margin-bottom: 0;
		border-width: 0;
		transform: translateY(-10px);
	}
</style>
