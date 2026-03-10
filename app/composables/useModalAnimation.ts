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
		dialogRef.showModal()

		const modalBox = dialogRef.querySelector('.modal-box')
		const backdrop = dialogRef.querySelector('.modal-backdrop')

		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

		// Force display for animation (DaisyUI sometimes hides it)
		dialogRef.classList.add('modal-open')
		
		// Backdrop entrance
		if (backdrop) {
			gsap.set(backdrop, { opacity: 0, transition: 'none' })
			tl.to(backdrop, { opacity: 1, duration: 0.3 }, 0)
		}

		// Modal box entrance
		if (modalBox) {
			gsap.set(modalBox, {
				opacity: 0,
				scale: 0.92,
				y: 30,
				transition: 'none',
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
			defaults: { ease: 'power2.out' },
			onComplete: () => {
				dialogRef.classList.remove('modal-open')
				dialogRef.close()
				
				// Reset transforms for next open
				gsap.set(dialogRef, { clearProps: 'all' })
				if (modalBox) gsap.set(modalBox, { clearProps: 'all' })
				if (backdrop) gsap.set(backdrop, { clearProps: 'all' })
				onComplete?.()
			},
		})

		gsap.set(dialogRef, { transition: 'none' })
		if (modalBox) gsap.set(modalBox, { transition: 'none' })
		if (backdrop) gsap.set(backdrop, { transition: 'none' })

		// Move modal down slightly and fade out entire dialog to prevent any child glitches
		if (modalBox) {
			tl.to(modalBox, { scale: 0.98, y: 10, duration: 0.2 }, 0)
		}
		tl.to(dialogRef, { opacity: 0, duration: 0.2 }, 0)

		return tl
	}

	return {
		animateOpen,
		animateClose,
	}
}
