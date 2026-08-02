<script setup lang="ts">
import { computed } from 'vue'
import { Sun, Moon } from 'lucide-vue-next'

const { theme, toggleTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')
</script>

<template>
	<button
		type="button"
		role="switch"
		:aria-checked="isDark"
		aria-label="Cambiar entre tema claro y oscuro"
		@click="toggleTheme"
		class="bg-neutral relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-colors duration-300 focus-visible:outline-none">
		<!-- faint track icons -->
		<Sun class="text-neutral-content/45 pointer-events-none absolute left-2 h-3.5 w-3.5" />
		<Moon class="text-neutral-content/45 pointer-events-none absolute right-2 h-3.5 w-3.5" />
		<!-- sliding knob -->
		<span
			class="bg-neutral-content text-neutral absolute left-1 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
			:class="isDark ? 'translate-x-8' : 'translate-x-0'">
			<Transition
				enter-active-class="transition duration-200"
				enter-from-class="opacity-0 rotate-90 scale-50"
				leave-active-class="transition duration-150 absolute"
				leave-to-class="opacity-0 -rotate-90 scale-50"
				mode="out-in">
				<Moon v-if="isDark" key="moon" class="h-3.5 w-3.5" />
				<Sun v-else key="sun" class="h-3.5 w-3.5" />
			</Transition>
		</span>
	</button>
</template>
