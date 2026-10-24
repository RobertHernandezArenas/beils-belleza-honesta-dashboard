import gsap from 'gsap'
import { spring, prefersReducedMotion } from '~/utils/motion'

/**
 * Composable para animar modales con GSAP.
 * Apertura: el modal-box nace desde el punto donde se hizo click (--motion-origin-x/y)
 * y se asienta con un spring. Cierre: rápido, con ease-out, volviendo hacia ese origen.
 * Para los <dialog> nativos + DaisyUI.
 */

// Offset desde el centro del viewport hacia el último pointerdown (ver plugins/motion-origin.client.ts)
const originOffset = (factor: number) => {
	const style = getComputedStyle(document.documentElement)
	const x = parseFloat(style.getPropertyValue('--motion-origin-x'))
	const y = parseFloat(style.getPropertyValue('--motion-origin-y'))
	if (Number.isNaN(x) || Number.isNaN(y)) return { x: 0, y: 0 }
	return { x: (x - window.innerWidth / 2) * factor, y: (y - window.innerHeight / 2) * factor }
}

export function useModalAnimation() {
	/**
	 * Abre el modal: backdrop fade → modal-box desde el origen con spring → contenido en cascada
	 */
	const animateOpen = (dialogRef: HTMLDialogElement | null, options?: { staggerChildren?: boolean }) => {
		if (!dialogRef) return

		const modalBox = dialogRef.querySelector<HTMLElement>('.modal-box')
		const backdrop = dialogRef.querySelector('.modal-backdrop')
		const reduce = prefersReducedMotion()

		// GSAP controla este modal: desactiva las transiciones CSS globales del .modal-box
		gsap.set([dialogRef, modalBox, backdrop], { transition: 'none' })
		if (modalBox) modalBox.dataset.motion = 'gsap'

		dialogRef.classList.add('modal-open')
		dialogRef.showModal()

		const tl = gsap.timeline()

		if (backdrop) {
			tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, 0)
		}

		if (modalBox) {
			const isMobile = window.innerWidth < 640
			const from = reduce
				? { x: 0, y: 0, scale: 1 }
				: isMobile
					? { x: 0, y: 48, scale: 1 }
					: { ...originOffset(0.3), scale: 0.92 }
			from.y += reduce || isMobile ? 0 : 16

			const settle = spring(0.45, 0.25)
			tl.fromTo(modalBox, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0)
			tl.fromTo(
				modalBox,
				from,
				{ x: 0, y: 0, scale: 1, duration: reduce ? 0 : settle.duration, ease: settle.ease, force3D: true },
				0,
			)

			if (options?.staggerChildren && !reduce) {
				const formControls = modalBox.querySelectorAll('.form-control, .modal-action, h3, h2, .divider')
				if (formControls.length) {
					tl.fromTo(
						formControls,
						{ opacity: 0, y: 12 },
						{
							opacity: 1,
							y: 0,
							duration: 0.3,
							ease: 'power3.out',
							// Cascada completa acotada a ~300ms aunque el formulario sea largo
							stagger: { each: 0.04, amount: Math.min(0.3, formControls.length * 0.04) },
							clearProps: 'transform,opacity',
						},
						0.08,
					)
				}
			}
		}

		return tl
	}

	/**
	 * Cierra el modal: salida corta con ease-out (la salida nunca debe ser más lenta que la entrada)
	 */
	const animateClose = (dialogRef: HTMLDialogElement | null, onComplete?: () => void) => {
		if (!dialogRef) return

		const modalBox = dialogRef.querySelector<HTMLElement>('.modal-box')
		const backdrop = dialogRef.querySelector('.modal-backdrop')
		const isMobile = window.innerWidth < 640
		const reduce = prefersReducedMotion()

		const tl = gsap.timeline({
			onComplete: () => {
				dialogRef.close()
				dialogRef.classList.remove('modal-open')

				// Reset para la próxima apertura
				gsap.set([dialogRef, modalBox, backdrop], { clearProps: 'all' })
				if (modalBox) delete modalBox.dataset.motion
				onComplete?.()
			},
		})

		gsap.set([dialogRef, modalBox, backdrop], { transition: 'none' })

		if (modalBox) {
			const to = reduce
				? { x: 0, y: 0, scale: 1 }
				: isMobile
					? { x: 0, y: '100%', scale: 1 }
					: { ...originOffset(0.15), scale: 0.96 }
			tl.to(modalBox, { ...to, opacity: 0, duration: isMobile ? 0.28 : 0.2, ease: 'power3.out', force3D: true }, 0)
		}

		if (backdrop) {
			tl.to(backdrop, { opacity: 0, duration: 0.2, ease: 'power2.out' }, 0)
		}

		return tl
	}

	return {
		animateOpen,
		animateClose,
	}
}
