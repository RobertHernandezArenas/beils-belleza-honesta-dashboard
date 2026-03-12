import AOS from 'aos'
import 'aos/dist/aos.css'

export default defineNuxtPlugin((nuxtApp) => {
  // Defer AOS init until after hydration to prevent class mismatch
  // (server renders without aos-init/aos-animate, client adds them)
  nuxtApp.hook('app:suspense:resolve', () => {
    nextTick(() => {
      requestAnimationFrame(() => {
        AOS.init({
          disable: false,
          startEvent: 'DOMContentLoaded',
          initClassName: 'aos-init',
          animatedClassName: 'aos-animate',
          useClassNames: false,
          disableMutationObserver: false,
          debounceDelay: 100, 
          throttleDelay: 150, 
          offset: 120, 
          duration: 600,
          easing: 'ease-out-cubic',
          once: true,
          mirror: false,
          anchorPlacement: 'top-bottom',
        })
        
        // Expose to window for components that need it
        // @ts-ignore
        if (typeof window !== 'undefined') window.AOS = AOS

        // Robust refresh using ResizeObserver to prevent reflow violations
        if (typeof window !== 'undefined' && window.ResizeObserver) {
          let rafId: number | null = null
          const ro = new ResizeObserver(() => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(() => {
              AOS.refresh()
            })
          })
          // Observe the body to catch all layout-changing data loads
          ro.observe(document.body)
        }
      })
    })
  })

  // Refresh AOS on client-side page navigation so new elements animate
  nuxtApp.hook('page:finish', () => {
    nextTick(() => {
      AOS.refresh()
    })
  })
})

