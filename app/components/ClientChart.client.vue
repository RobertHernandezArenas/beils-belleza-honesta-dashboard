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
</script>

<template>
	<VChart class="chart" :option="option" autoresize />
</template>

<style scoped>
	.chart {
		height: 100%;
		width: 100%;
	}
</style>
