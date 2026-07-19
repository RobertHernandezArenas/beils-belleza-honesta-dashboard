import { computed, type Ref } from 'vue'

export function useSalesAnalytics(
	sales: Ref<any[] | undefined>,
	summaryTimeframe: Ref<'day' | 'week' | 'month' | 'year'>
) {
	const getStartOfDate = (type: 'day' | 'week' | 'month' | 'year') => {
		const now = new Date()
		now.setHours(0, 0, 0, 0)

		if (type === 'day') return now
		if (type === 'week') {
			const day = now.getDay() || 7 // 1 is Monday, 7 is Sunday
			now.setDate(now.getDate() - day + 1)
			return now
		}
		if (type === 'month') {
			now.setDate(1)
			return now
		}
		if (type === 'year') {
			now.setMonth(0, 1)
			return now
		}
		return now
	}

	const getEndOfDate = (type: 'day' | 'week' | 'month' | 'year', start: Date) => {
		const end = new Date(start)
		if (type === 'day') end.setDate(end.getDate() + 1)
		if (type === 'week') end.setDate(end.getDate() + 7)
		if (type === 'month') end.setMonth(end.getMonth() + 1)
		if (type === 'year') end.setFullYear(end.getFullYear() + 1)
		return end
	}

	const getPreviousPeriodBounds = (type: 'day' | 'week' | 'month' | 'year', currentStart: Date, elapsedMs: number) => {
		const prevStart = new Date(currentStart)
		if (type === 'day') prevStart.setDate(prevStart.getDate() - 1)
		if (type === 'week') prevStart.setDate(prevStart.getDate() - 7)
		if (type === 'month') prevStart.setMonth(prevStart.getMonth() - 1)
		if (type === 'year') prevStart.setFullYear(prevStart.getFullYear() - 1)
		const prevEnd = new Date(prevStart.getTime() + elapsedMs)
		return { start: prevStart, end: prevEnd }
	}

	const pctChange = (curr: number, prev: number) => {
		if (prev > 0) return ((curr - prev) / prev) * 100
		return curr > 0 ? 100 : 0
	}

	const timeframeLabels: Record<'day' | 'week' | 'month' | 'year', string> = {
		day: 'HOY',
		week: 'ESTA SEMANA',
		month: 'ESTE MES',
		year: 'ESTE AÑO',
	}

	const summaryStats = computed(() => {
		const empty = { total: 0, count: 0, average: 0, totalChange: 0, countChange: 0, averageChange: 0 }
		if (!sales.value) return empty

		const now = new Date()
		const startDate = getStartOfDate(summaryTimeframe.value)
		const elapsed = now.getTime() - startDate.getTime()

		const current = sales.value.filter((s: any) => {
			const d = new Date(s.created_at)
			return d >= startDate && d <= now
		})

		const { start: prevStart, end: prevEnd } = getPreviousPeriodBounds(summaryTimeframe.value, startDate, elapsed)
		const previous = sales.value.filter((s: any) => {
			const d = new Date(s.created_at)
			return d >= prevStart && d <= prevEnd
		})

		const total = current.reduce((sum, s) => sum + s.total, 0)
		const count = current.length
		const average = count > 0 ? total / count : 0

		const prevTotal = previous.reduce((sum, s) => sum + s.total, 0)
		const prevCount = previous.length
		const prevAverage = prevCount > 0 ? prevTotal / prevCount : 0

		return {
			total,
			count,
			average,
			totalChange: pctChange(total, prevTotal),
			countChange: pctChange(count, prevCount),
			averageChange: pctChange(average, prevAverage),
		}
	})

	const bucketCount = computed(() => {
		if (summaryTimeframe.value === 'day') return 8
		if (summaryTimeframe.value === 'week') return 7
		if (summaryTimeframe.value === 'month') {
			const now = new Date()
			return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
		}
		return 12
	})

	const sparklineSeries = computed(() => {
		const buckets = bucketCount.value
		const totals = Array(buckets).fill(0)
		const counts = Array(buckets).fill(0)

		if (sales.value) {
			const start = getStartOfDate(summaryTimeframe.value)
			const end = getEndOfDate(summaryTimeframe.value, start)
			const bucketMs = (end.getTime() - start.getTime()) / buckets

			sales.value.forEach((s: any) => {
				const t = new Date(s.created_at).getTime()
				if (t >= start.getTime() && t < end.getTime()) {
					const idx = Math.min(buckets - 1, Math.floor((t - start.getTime()) / bucketMs))
					totals[idx] += s.total
					counts[idx] += 1
				}
			})
		}

		const averages = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 0))
		return { totals, counts, averages }
	})

	const toSparklinePath = (values: number[]) => {
		if (!values.length) return ''
		const max = Math.max(...values)
		const min = Math.min(...values, 0)
		const range = max - min || 1
		const stepX = values.length > 1 ? 100 / (values.length - 1) : 100
		return values
			.map((v, i) => {
				const x = i * stepX
				const y = 18 - ((v - min) / range) * 16
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
			})
			.join(' ')
	}

	const toSparklineAreaPath = (values: number[]) => {
		if (!values.length) return ''
		const max = Math.max(...values)
		const min = Math.min(...values, 0)
		const range = max - min || 1
		const stepX = values.length > 1 ? 100 / (values.length - 1) : 100
		const points = values.map((v, i) => {
			const x = i * stepX
			const y = 18 - ((v - min) / range) * 16
			return `${x.toFixed(1)},${y.toFixed(1)}`
		})
		return `M0,20 L${points.join(' L')} L100,20 Z`
	}

	const totalSparkline = computed(() => toSparklinePath(sparklineSeries.value.totals))
	const totalSparklineArea = computed(() => toSparklineAreaPath(sparklineSeries.value.totals))
	const countSparkline = computed(() => toSparklinePath(sparklineSeries.value.counts))
	const countSparklineArea = computed(() => toSparklineAreaPath(sparklineSeries.value.counts))
	const averageSparkline = computed(() => toSparklinePath(sparklineSeries.value.averages))
	const averageSparklineArea = computed(() => toSparklineAreaPath(sparklineSeries.value.averages))

	const monthlyProjection = computed(() => {
		if (!sales.value) return { projected: 0, changeVsLastMonth: 0 }

		const now = new Date()
		const startMonth = getStartOfDate('month')
		const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startMonth.getTime()) / (1000 * 60 * 60 * 24)))
		const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

		const monthTotal = sales.value
			.filter((s: any) => new Date(s.created_at) >= startMonth && new Date(s.created_at) <= now)
			.reduce((sum, s) => sum + s.total, 0)

		const projected = (monthTotal / daysElapsed) * daysInMonth

		const lastMonthStart = new Date(startMonth)
		lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
		const lastMonthEnd = new Date(startMonth)
		const lastMonthTotal = sales.value
			.filter((s: any) => new Date(s.created_at) >= lastMonthStart && new Date(s.created_at) < lastMonthEnd)
			.reduce((sum, s) => sum + s.total, 0)

		return { projected, changeVsLastMonth: pctChange(projected, lastMonthTotal) }
	})

	return {
		timeframeLabels,
		summaryStats,
		totalSparkline,
		totalSparklineArea,
		countSparkline,
		countSparklineArea,
		averageSparkline,
		averageSparklineArea,
		monthlyProjection,
	}
}
