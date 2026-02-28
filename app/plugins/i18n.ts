import { createI18n } from 'vue-i18n'

import es from '../locales/es.json'
import en from '../locales/en.json'
import pl from '../locales/pl.json'

export default defineNuxtPlugin(({ vueApp }) => {
	const savedLocale = useCookie('i18n_redirected')
	const i18n = createI18n({
		legacy: false,
		globalInjection: true,
		locale: savedLocale.value || 'es',
		messages: {
			es,
			en,
			pl,
		},
	})

	vueApp.use(i18n)
})
