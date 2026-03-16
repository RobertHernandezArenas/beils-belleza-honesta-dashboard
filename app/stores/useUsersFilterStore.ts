import { defineStore } from 'pinia'

export const useUsersFilterStore = defineStore('usersFilter', () => {
	const showFilters = ref(false)
	const filterRole = ref('all')
	const filterStatus = ref('all')
	const filterDocType = ref('all')
	const searchQuery = ref('')

	const activeFiltersCount = computed(() => {
		let count = 0
		if (filterRole.value !== 'all') count++
		if (filterStatus.value !== 'all') count++
		if (filterDocType.value !== 'all') count++
		return count
	})

	const hasActiveFilters = computed(() => activeFiltersCount.value > 0)

	const toggleFilters = () => {
		showFilters.value = !showFilters.value
	}

	const resetFilters = () => {
		filterRole.value = 'all'
		filterStatus.value = 'all'
		filterDocType.value = 'all'
		searchQuery.value = ''
	}

	return {
		showFilters,
		filterRole,
		filterStatus,
		filterDocType,
		searchQuery,
		activeFiltersCount,
		hasActiveFilters,
		toggleFilters,
		resetFilters,
	}
})
