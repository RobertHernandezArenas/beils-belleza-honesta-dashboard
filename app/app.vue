<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script lang="ts" setup>
	useHead({
		titleTemplate: titleChunk => {
			return titleChunk
				? `${titleChunk} - Beils Bellez Honesta Plataforma`
				: 'Beils Bellez Honesta Plataforma'
		},
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ name: 'description', content: 'Beils Bellez Honesta Plataforma' },
			{ name: 'format-detection', content: 'telephone=no' },
			{ name: 'keywords', content: 'Beils Bellez Honesta Plataforma' },
			{ name: 'author', content: 'Beils Bellez Honesta Plataforma' },
			{ name: 'robots', content: 'index, follow' },
			{ name: 'og:title', content: 'Beils Bellez Honesta Plataforma' },
			{ name: 'og:description', content: 'Beils Bellez Honesta Plataforma' },
			{ name: 'og:type', content: 'website' },
			{ name: 'og:url', content: 'https://beilsbellezhonesta.com' },
			{ name: 'og:image', content: 'https://beilsbellezhonesta.com/images/tp-dash.svg' },
			{ name: 'og:site_name', content: 'Beils Bellez Honesta Plataforma' },
			{ name: 'og:locale', content: 'es_ES' },
		],
	})
</script>
