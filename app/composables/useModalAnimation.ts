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
		// Apply GPU acceleration stubs
		gsap.set([dialogRef, modalBox, backdrop], { 
			transition: 'none',
			force3D: true,
			backfaceVisibility: 'hidden',
			perspective: 1000
		})
		
		if (modalBox) {
			gsap.set(modalBox, { willChange: 'transform, opacity' })
		}

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
				scale: 0.95, // Subtler scale for stability
				y: 40,
				z: 0.01 // Force 3D context
			})
			tl.to(
				modalBox,
				{
					opacity: 1,
					scale: 1,
					y: 0,
					z: 0,
					duration: 0.45,
					ease: 'power3.out',
					clearProps: 'willChange' // Performance cleanup
				},
				0.05,
			)

			// Stagger children
			if (options?.staggerChildren) {
				const formControls = modalBox.querySelectorAll('.form-control, .modal-action, h3, h2, .divider')
				if (formControls.length) {
					gsap.set(formControls, { opacity: 0, y: 15 })
					tl.to(
						formControls,
						{
							opacity: 1,
							y: 0,
							duration: 0.4,
							stagger: 0.05,
							ease: 'power2.out',
						},
						0.1,
					)
				}
			}
		}

		return tl
	}

	/**
	 * Cierra el modal con animación GSAP inversa
	 */
	const animateClose = (dialogRef: HTMLDialogElement | null, onComplete?: () => void) => {
		if (!dialogRef) return

		const modalBox = dialogRef.querySelector('.modal-box')
		const backdrop = dialogRef.querySelector('.modal-backdrop')
		const isMobile = window.innerWidth < 640

		const tl = gsap.timeline({
			defaults: { ease: 'power2.inOut' },
			onComplete: () => {
				dialogRef.close()
				dialogRef.classList.remove('modal-open')
				
				// Reset all for next open
				gsap.set([dialogRef, modalBox, backdrop], { clearProps: 'all' })
				onComplete?.()
			},
		})

		gsap.set([dialogRef, modalBox, backdrop], { 
			transition: 'none',
			force3D: true,
			willChange: 'transform, opacity'
		})

		if (modalBox) {
			if (isMobile) {
				// Mobile: Ultra-smooth fluid slide down
				tl.to(modalBox, { 
					scale: 1,
					y: '110%',
					opacity: 0,
					duration: 0.6,
					ease: 'power2.inOut',
					force3D: true
				}, 0)
			} else {
				// Tablet/Desktop: Original feel + smooth fluid animation
				tl.to(modalBox, { 
					scale: 0.95,
					y: 20,
					opacity: 0,
					duration: 0.5,
					ease: 'power2.inOut', // Maintain the smooth fluid feel
					force3D: true
				}, 0)
			}
		}
		
		if (backdrop) {
			tl.to(backdrop, { 
				opacity: 0, 
				duration: isMobile ? 0.5 : 0.4 
			}, 0.1)
		}

		return tl
	}

	return {
		animateOpen,
		animateClose,
	}
}
