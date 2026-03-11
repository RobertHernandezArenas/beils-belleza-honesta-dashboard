<script lang="ts" setup>
	import { use } from 'echarts/core'
	import { CanvasRenderer } from 'echarts/renderers'
	import { LineChart, PieChart, BarChart } from 'echarts/charts'
	import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
	import VChart from 'vue-echarts'

	use([
		CanvasRenderer,
		LineChart,
		PieChart,
		BarChart,
		TitleComponent,
		TooltipComponent,
		LegendComponent,
		GridComponent,
	])

	defineProps<{
		option: Record<string, any>
	}>()

	const containerRef = ref<HTMLElement | null>(null)
	const ready = ref(false)
	let observer: ResizeObserver | null = null

	onMounted(() => {
		if (!containerRef.value) return

		observer = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (!entry) return

			const { width, height } = entry.contentRect
			if (width > 0 && height > 0) {
				ready.value = true
				// Stop observing once the chart is ready
				observer?.disconnect()
				observer = null
			}
		})

		observer.observe(containerRef.value)
	})

	onBeforeUnmount(() => {
		observer?.disconnect()
		observer = null
	})
</script>

<template>
	<div ref="containerRef" class="chart">
		<VChart v-if="ready" :option="option" autoresize style="height: 100%; width: 100%" />
	</div>
</template>

<style scoped>
	.chart {
		height: 100%;
		width: 100%;
	}
</style>
