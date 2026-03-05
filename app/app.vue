<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script lang="ts" setup>
	useHead({
		titleTemplate: titleChunk => {
			return titleChunk
				? `${titleChunk} - Beils Belleza Honesta Plataforma`
				: 'Beils Bellez Honesta Plataforma'
		},
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'description', content: 'Beils Belleza Honesta Plataforma' },
			{ name: 'format-detection', content: 'telephone=no' },
			{ name: 'keywords', content: 'Beils Belleza Honesta Plataforma' },
			{ name: 'author', content: 'Beils Belleza Honesta Plataforma' },
			{ name: 'robots', content: 'index, follow' },
			{ name: 'og:title', content: 'Beils Belleza Honesta Plataforma' },
			{ name: 'og:description', content: 'Beils Belleza Honesta Plataforma' },
			{ name: 'og:type', content: 'website' },
			{ name: 'og:url', content: 'https://beilsbellezahonesta.com' },
			{ name: 'og:image', content: 'https://beilsbellezahonesta.com/images/tp-dash.svg' },
			{ name: 'og:site_name', content: 'Beils Belleza Honesta Plataforma' },
			{ name: 'og:locale', content: 'es_ES' },
		],
	})
</script>
