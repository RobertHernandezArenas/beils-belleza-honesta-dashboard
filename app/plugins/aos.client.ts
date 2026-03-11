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
          startEvent: 'load',
          initClassName: 'aos-init',
          animatedClassName: 'aos-animate',
          useClassNames: false,
          disableMutationObserver: false,
          debounceDelay: 50,
          throttleDelay: 99,

          offset: 80,
          delay: 0,
          duration: 600,
          easing: 'ease-out-cubic',
          once: true,
          mirror: false,
          anchorPlacement: 'top-bottom',
        })
      })
    })
  })

  // Refresh AOS on client-side page navigation so new elements animate
  nuxtApp.hook('page:finish', () => {
    nextTick(() => {
      AOS.refreshHard()
    })
  })
})

