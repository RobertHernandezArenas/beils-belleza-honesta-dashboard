<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { RotateCcw, Download, Check, PenTool } from 'lucide-vue-next'

const props = withDefaults(
	defineProps<{
		initialSignature?: string | null
		disabled?: boolean
		height?: number
	}>(),
	{
		initialSignature: null,
		disabled: false,
		height: 180
	}
)

const emit = defineEmits<{
	(e: 'change', dataUrl: string | null): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const isDrawing = ref(false)
const isEmpty = ref(true)
const hasInitial = ref(false)

let ctx: CanvasRenderingContext2D | null = null
let lastX = 0
let lastY = 0

// Resize canvas handling devicePixelRatio for high-DPI displays (iPads, Tablets, Retinas)
const setupCanvas = () => {
	const canvas = canvasRef.value
	const container = containerRef.value
	if (!canvas || !container) return

	const rect = container.getBoundingClientRect()
	const dpr = window.devicePixelRatio || 1
	const width = rect.width || 450
	const height = props.height

	canvas.width = width * dpr
	canvas.height = height * dpr
	canvas.style.width = `${width}px`
	canvas.style.height = `${height}px`

	ctx = canvas.getContext('2d')
	if (ctx) {
		ctx.scale(dpr, dpr)
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.strokeStyle = '#1e1e24'
		ctx.lineWidth = 2.5
	}

	if (props.initialSignature) {
		loadExistingSignature(props.initialSignature)
	} else {
		drawGuideLine()
	}
}

const drawGuideLine = () => {
	const canvas = canvasRef.value
	if (!canvas || !ctx) return
	const width = parseFloat(canvas.style.width) || canvas.width
	const height = parseFloat(canvas.style.height) || canvas.height

	// Dotted baseline guide
	ctx.save()
	ctx.beginPath()
	ctx.setLineDash([4, 4])
	ctx.strokeStyle = '#d1d5db'
	ctx.lineWidth = 1
	ctx.moveTo(30, height - 35)
	ctx.lineTo(width - 30, height - 35)
	ctx.stroke()
	ctx.restore()
}

const loadExistingSignature = (dataUrl: string) => {
	const canvas = canvasRef.value
	if (!canvas || !ctx) return
	const img = new Image()
	img.onload = () => {
		clearCanvasVisual()
		const width = parseFloat(canvas.style.width) || canvas.width
		const height = parseFloat(canvas.style.height) || canvas.height
		ctx?.drawImage(img, 0, 0, width, height)
		isEmpty.value = false
		hasInitial.value = true
	}
	img.src = dataUrl
}

const getCoordinates = (e: PointerEvent): { x: number; y: number } => {
	const canvas = canvasRef.value
	if (!canvas) return { x: 0, y: 0 }
	const rect = canvas.getBoundingClientRect()
	return {
		x: e.clientX - rect.left,
		y: e.clientY - rect.top
	}
}

const onPointerDown = (e: PointerEvent) => {
	if (props.disabled) return
	const canvas = canvasRef.value
	if (!canvas) return

	// Capture pointer to track outside canvas bounds smoothly
	canvas.setPointerCapture(e.pointerId)
	isDrawing.value = true

	const coords = getCoordinates(e)
	lastX = coords.x
	lastY = coords.y

	if (isEmpty.value && !hasInitial.value) {
		clearCanvasVisual()
	}
}

const onPointerMove = (e: PointerEvent) => {
	if (!isDrawing.value || !ctx || props.disabled) return

	const coords = getCoordinates(e)
	ctx.beginPath()
	ctx.moveTo(lastX, lastY)
	ctx.lineTo(coords.x, coords.y)
	ctx.stroke()

	lastX = coords.x
	lastY = coords.y
	isEmpty.value = false
}

const onPointerUp = (e: PointerEvent) => {
	if (!isDrawing.value) return
	isDrawing.value = false
	try {
		canvasRef.value?.releasePointerCapture(e.pointerId)
	} catch {
		// Ignore if pointer already released
	}
	emitChange()
}

const onPointerCancel = () => {
	isDrawing.value = false
	emitChange()
}

const clearCanvasVisual = () => {
	const canvas = canvasRef.value
	if (!canvas || !ctx) return
	const width = parseFloat(canvas.style.width) || canvas.width
	const height = parseFloat(canvas.style.height) || canvas.height
	ctx.clearRect(0, 0, width, height)
}

const clear = () => {
	clearCanvasVisual()
	drawGuideLine()
	isEmpty.value = true
	hasInitial.value = false
	emit('change', null)
}

const emitChange = () => {
	const canvas = canvasRef.value
	if (!canvas || isEmpty.value) {
		emit('change', null)
		return
	}
	const dataUrl = canvas.toDataURL('image/png')
	emit('change', dataUrl)
}

const getSignature = (): string | null => {
	if (isEmpty.value || !canvasRef.value) return null
	return canvasRef.value.toDataURL('image/png')
}

const download = () => {
	const dataUrl = getSignature()
	if (!dataUrl) return
	const link = document.createElement('a')
	link.href = dataUrl
	link.download = `firma-cliente-${new Date().toISOString().split('T')[0]}.png`
	link.click()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
	nextTick(() => {
		setupCanvas()
		if (containerRef.value && typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => {
				// preserve content when resizing if possible
				const prevData = getSignature()
				setupCanvas()
				if (prevData) loadExistingSignature(prevData)
			})
			resizeObserver.observe(containerRef.value)
		}
	})
})

onBeforeUnmount(() => {
	if (resizeObserver) resizeObserver.disconnect()
})

watch(
	() => props.initialSignature,
	newVal => {
		if (newVal) {
			loadExistingSignature(newVal)
		} else {
			clear()
		}
	}
)

defineExpose({
	getSignature,
	clear,
	isEmpty
})
</script>

<template>
	<div ref="containerRef" class="w-full space-y-2">
		<div class="flex items-center justify-between text-xs">
			<span class="font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
				<PenTool class="w-3.5 h-3.5 text-primary" />
				Recuadro de Firma Digital (Táctil / Stylus / Ratón)
			</span>
			<div class="flex items-center gap-2">
				<button
					v-if="!disabled"
					type="button"
					class="btn btn-ghost btn-xs text-text-muted hover:text-error gap-1 font-semibold rounded-lg"
					@click="clear"
				>
					<RotateCcw class="w-3 h-3" />
					Limpiar Firma
				</button>
				<button
					v-if="!isEmpty"
					type="button"
					class="btn btn-ghost btn-xs text-text-muted hover:text-primary gap-1 font-semibold rounded-lg"
					title="Descargar firma PNG"
					@click="download"
				>
					<Download class="w-3 h-3" />
					PNG
				</button>
			</div>
		</div>

		<!-- Canvas Surface with touch-action: none for tablet stylus / finger support -->
		<div
			class="relative w-full rounded-2xl border-2 transition-all bg-white overflow-hidden shadow-inner cursor-crosshair select-none"
			:class="[
				disabled ? 'opacity-90 bg-gray-50 border-border-subtle cursor-not-allowed' : 'border-primary/30 hover:border-primary focus-within:border-primary',
				isEmpty ? 'border-dashed' : 'border-solid'
			]"
			style="touch-action: none;"
		>
			<canvas
				ref="canvasRef"
				class="block w-full"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerCancel"
				@pointerleave="onPointerUp"
			></canvas>

			<!-- Placeholder indicator -->
			<div
				v-if="isEmpty && !disabled"
				class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 gap-1"
			>
				<PenTool class="w-5 h-5 opacity-40" />
				<span class="text-xs font-semibold tracking-wide opacity-70">
					Firme aquí con el dedo, stylus o ratón
				</span>
			</div>
		</div>

		<div class="flex items-center justify-between text-[10px] text-text-muted px-1">
			<span>Optimizado para iPad, Tablets Android, Móvil y PC</span>
			<span v-if="!isEmpty" class="text-success font-bold flex items-center gap-1">
				<Check class="w-3 h-3" />
				Firma registrada
			</span>
		</div>
	</div>
</template>
