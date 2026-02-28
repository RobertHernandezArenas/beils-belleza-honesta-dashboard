<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script lang="ts" setup>
	useHead({
		titleTemplate: titleChunk => {
			return titleChunk ? `${titleChunk} - Transpallet+ Plataforma` : 'Transpallet+ Plataforma'
		},
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'description', content: 'Transpallet+ Plataforma' },
			{ name: 'format-detection', content: 'telephone=no' },
			{ name: 'keywords', content: 'Transpallet+ Plataforma' },
			{ name: 'author', content: 'Transpallet+ Plataforma' },
			{ name: 'robots', content: 'index, follow' },
			{ name: 'og:title', content: 'Transpallet+ Plataforma' },
			{ name: 'og:description', content: 'Transpallet+ Plataforma' },
			{ name: 'og:type', content: 'website' },
			{ name: 'og:url', content: 'https://transpallet.com' },
			{ name: 'og:image', content: 'https://transpallet.com/images/tp-dash.svg' },
			{ name: 'og:site_name', content: 'Transpallet+ Plataforma' },
			{ name: 'og:locale', content: 'es_ES' },
		],
	})
</script>
