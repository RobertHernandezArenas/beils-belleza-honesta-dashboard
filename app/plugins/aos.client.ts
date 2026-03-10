import AOS from 'aos'
import 'aos/dist/aos.css'

export default defineNuxtPlugin((nuxtApp) => {
  if (typeof window !== 'undefined') {
    nuxtApp.hook('app:mounted', () => {
      AOS.init({
        disable: false,
        startEvent: 'DOMContentLoaded',
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
  }
})

