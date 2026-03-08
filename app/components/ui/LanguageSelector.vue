<script setup lang="ts">
	import { ref, computed, onMounted, onUnmounted } from 'vue'
	import { ChevronDown } from 'lucide-vue-next'
	import { useI18n } from 'vue-i18n'

	const { locale, setLocale } = useI18n() as any
	const localeCookie = useCookie('i18n_redirected')
	const isOpen = ref(false)
	const dropdownRef = ref<HTMLElement | null>(null)

	const handleClickOutside = (event: MouseEvent) => {
		if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
			isOpen.value = false
		}
	}

	onMounted(() => {
		document.addEventListener('mousedown', handleClickOutside)
	})

	onUnmounted(() => {
		document.removeEventListener('mousedown', handleClickOutside)
	})

	const languageMap: Record<string, { name: string; icon: string }> = {
		es: { name: 'Español', icon: 'https://flagcdn.com/es.svg' },
		en: { name: 'English', icon: 'https://flagcdn.com/gb.svg' },
		pl: { name: 'Polski', icon: 'https://flagcdn.com/pl.svg' },
	}

	const locales = [
		{ code: 'es', name: 'Español' },
		{ code: 'en', name: 'English' },
		{ code: 'pl', name: 'Polski' },
	]

	const currentLanguage = computed(() => {
		return (
			languageMap[locale.value] || { name: locale.value.toUpperCase(), icon: 'https://flagcdn.com/es.svg' }
		)
	})

	const selectLanguage = (code: string) => {
		if (setLocale) {
			setLocale(code)
		}
		locale.value = code
		localeCookie.value = code
		isOpen.value = false
	}
</script>

<template>
	<div ref="dropdownRef" class="relative">
		<!-- Dropdown Button -->
		<button
			@click="isOpen = !isOpen"
			class="group bg-bg-card hover:border-border-strong hover:bg-bg-muted border-border-default flex items-center justify-between gap-2.5 rounded-full border px-3 py-1.5 transition-[background-color,border-color] focus-visible:outline-none"
			aria-haspopup="listbox"
			:aria-expanded="isOpen">
			<div class="flex items-center gap-2">
				<img
					:src="currentLanguage.icon"
					alt="Flag"
					class="h-3.5 w-5 rounded-[2px] object-cover shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
				<span class="text-text-secondary text-xs font-bold tracking-wider uppercase">
					{{ currentLanguage.name }}
				</span>
			</div>
			<ChevronDown
				class="text-text-light group-hover:text-text-secondary h-3 w-3 duration-200"
				:class="{ 'rotate-180': isOpen }" />
		</button>

		<!-- Dropdown Menu -->
		<transition
			enter-active-class="transition duration-150 ease-out"
			enter-from-class="transform scale-95 opacity-0 translate-y-[-10px]"
			enter-to-class="transform scale-100 opacity-100 translate-y-0"
			leave-active-class="transition duration-100 ease-in"
			leave-from-class="transform scale-100 opacity-100 translate-y-0"
			leave-to-class="transform scale-95 opacity-0 translate-y-[-10px]">
			<ul
				v-show="isOpen"
				class="bg-bg-card ring-border-subtle absolute top-full right-0 mt-2 w-[150px] origin-top-right overflow-hidden rounded-2xl py-1 shadow-[0_4px_20px_rgba(0,0,0,0.08)] ring-1 focus-visible:outline-none"
				role="listbox">
				<li
					v-for="l in locales"
					:key="l.code"
					@click.prevent="selectLanguage(l.code)"
					class="hover:bg-bg-hover flex w-full cursor-pointer items-center justify-between px-4 py-2 text-sm transition-colors"
					:class="[locale === l.code ? 'bg-bg-muted text-text-primary' : 'text-text-secondary']"
					role="option"
					:aria-selected="locale === l.code">
					<div class="flex items-center gap-3">
						<img
							:src="languageMap[l.code]?.icon"
							alt="Flag"
							class="h-3.5 w-5 rounded-[2px] object-cover shadow-[0_0_2px_rgba(0,0,0,0.2)]" />
						<span class="text-xs font-medium">{{ languageMap[l.code]?.name || l.name }}</span>
					</div>

					<!-- Active Indicator -->
					<div v-if="locale === l.code" class="bg-text-primary h-1.5 w-1.5 rounded-full"></div>
				</li>
			</ul>
		</transition>
	</div>
</template>
