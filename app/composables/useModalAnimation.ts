import gsap from 'gsap'

/**
 * Composable para animar modales con GSAP.
 * Proporciona animaciones de apertura y cierre cinematográficas
 * para los <dialog> nativos + DaisyUI.
 */
export function useModalAnimation() {
	/**
	 * Abre el modal con animación GSAP orquestada:
	 * backdrop blur → modal-box scale+translateY → contenido fade
	 */
	const animateOpen = (dialogRef: HTMLDialogElement | null, options?: { staggerChildren?: boolean }) => {
		if (!dialogRef) return

		const modalBox = dialogRef.querySelector('.modal-box')
		const backdrop = dialogRef.querySelector('.modal-backdrop')

		// Force disable CSS transitions to avoid conflict with GSAP
		gsap.set([dialogRef, modalBox, backdrop], { transition: 'none' })
		
		dialogRef.classList.add('modal-open')
		dialogRef.showModal()

		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

		// Backdrop entrance
		if (backdrop) {
			gsap.set(backdrop, { opacity: 0 })
			tl.to(backdrop, { opacity: 1, duration: 0.3 }, 0)
		}

		// Modal box entrance
		if (modalBox) {
			gsap.set(modalBox, {
				opacity: 0,
				scale: 0.92,
				y: 30,
			})
			tl.to(
				modalBox,
				{
					opacity: 1,
					scale: 1,
					y: 0,
					duration: 0.45,
					ease: 'power3.out',
				},
				0.05,
			)

			// Stagger children if requested
			if (options?.staggerChildren) {
				const formControls = modalBox.querySelectorAll('.form-control, .modal-action, h3, h2')
				if (formControls.length) {
					gsap.set(formControls, { opacity: 0, y: 12 })
					tl.to(
						formControls,
						{
							opacity: 1,
							y: 0,
							duration: 0.35,
							stagger: 0.04,
							ease: 'power2.out',
						},
						0.15,
					)
				}
			}
		}

		return tl
	}

	/**
	 * Cierra el modal con animación GSAP inversa,
	 * luego llama a dialog.close()
	 */
	const animateClose = (dialogRef: HTMLDialogElement | null, onComplete?: () => void) => {
		if (!dialogRef) return

		const modalBox = dialogRef.querySelector('.modal-box')
		const backdrop = dialogRef.querySelector('.modal-backdrop')

		const tl = gsap.timeline({
			defaults: { ease: 'power3.inOut' },
			onComplete: () => {
				dialogRef.close()
				dialogRef.classList.remove('modal-open')
				
				// Reset all for next open
				gsap.set([dialogRef, modalBox, backdrop], { clearProps: 'all' })
				onComplete?.()
			},
		})

		gsap.set([dialogRef, modalBox, backdrop], { transition: 'none' })

		// Cinematic fade-out: slight shrink, move down, slow fade
		if (modalBox) {
			tl.to(modalBox, { scale: 0.96, y: 15, duration: 0.35 }, 0)
		}
		tl.to(dialogRef, { opacity: 0, duration: 0.35 }, 0.05)

		return tl
	}

	return {
		animateOpen,
		animateClose,
	}
}
