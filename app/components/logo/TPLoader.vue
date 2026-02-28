<script lang="ts" setup></script>

<template>
	<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
		<g class="logo-container">
			<circle class="bg-circle" cx="60" cy="60" r="51" fill="#FFFF00" />
			<g>
				<path
					class="letter-path"
					d="M15.639 26.2514C37.5236 26.2321 59.4083 26.2514 81.2928 26.3091C86.9481 26.6683 91.8519 28.8413 96.0044 32.8283C98.1287 35.1528 99.6287 37.8451 100.504 40.9052C100.543 40.8668 100.581 40.8283 100.62 40.7898C100.928 42.1209 101.178 43.4671 101.37 44.8283C87.4464 44.7899 73.5234 44.8283 59.6005 44.9437C58.5249 49.356 57.5057 53.8176 56.5428 58.3283C56.3506 59.3656 56.23 60.6348 56.0761 61.6744C52.8144 61.6744 49.2669 61.6717 45.8698 61.6744C42.2462 61.6744 38.6366 61.6744 34.9082 61.6744C34.4467 61.6744 34.4467 61.6744 34.4467 61.4437C35.2896 57.9243 36.078 54.4628 36.8121 51.0591C37.0147 50.9528 37.0339 50.8181 36.8698 50.6552C37.2519 48.6925 37.7135 46.7503 38.2544 44.8283C29.2544 44.8283 20.2544 44.8283 11.2544 44.8283C11.6807 42.8815 12.4659 38.9437 12.4659 38.9437C12.4659 38.9437 -1.01731 36.7412 11.2425 35.6265C31.8711 33.7508 15.0044 31.8764 15.0044 31.8764C15.0044 31.8764 14.8698 29.3271 15.639 26.2514Z" />
				<path
					class="letter-path"
					d="M80.1347 52.9043C87.2116 52.9043 94.2886 52.9043 101.365 52.9043C101.379 54.1022 101.302 55.2945 101.135 56.4812C99.4152 66.2358 94.6076 73.9859 86.7116 79.7312C81.1893 83.933 74.9585 86.3753 68.0193 87.0581C62.0967 87.1735 56.1737 87.212 50.2501 87.1735C48.9979 93.1056 47.6903 99.1056 46.327 105.174C39.2885 105.174 32.2501 105.174 25.2116 105.174C25.2001 104.518 25.3347 103.903 25.6155 103.327C26.6687 98.1481 27.8034 92.9366 29.0193 87.6928C29.8285 83.7534 30.6747 79.7534 31.5578 75.6928C31.8697 74.7543 32.312 73.889 32.8847 73.0966C33.7545 71.9769 34.8506 71.0347 36.1732 70.2697C36.1347 70.2313 36.0962 70.1927 36.0578 70.1543C36.8581 69.8492 37.6466 69.5223 38.4232 69.1735C39.2028 68.9515 39.9914 68.7785 40.7885 68.6543C49.827 68.6159 58.8655 68.5773 67.9039 68.5389C71.2865 67.9566 74.0365 66.3219 76.1539 63.6351C77.802 61.28 78.9558 58.7031 79.6155 55.9043C79.7377 54.8902 79.9107 53.8901 80.1347 52.9043Z" />
			</g>
		</g>
	</svg>
</template>

<style>
	/* --- Animaciones Originales --- */
	/* Animación para dibujar las líneas */
	@keyframes drawStroke {
		0% {
			stroke-dashoffset: 350;
		}
		100% {
			stroke-dashoffset: 0;
		}
	}
	/* Animación para rellenar el color después de dibujar */
	@keyframes fillFadeIn {
		0% {
			fill-opacity: 0;
			stroke-opacity: 1;
		}
		90% {
			stroke-opacity: 0;
		}
		100% {
			fill-opacity: 1;
			stroke-opacity: 0;
		}
	}
	/* Animación para que aparezca el círculo amarillo */
	@keyframes circlePop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		60% {
			transform: scale(1.1);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* --- Nueva Animación: Rebote Infinito --- */
	@keyframes infiniteBounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		} /* Se mueve 10px hacia arriba */
	}

	/* --- Clases --- */

	/* Nuevo contenedor que agrupa todo para el rebote */
	.logo-container {
		transform-origin: center;
		/* Se aplica la animación de rebote:
         - Duración: 1.75s
         - Tipo: ease-in-out (suave)
         - Repetición: infinite
         - RETRASO: 1.4s (espera a que termine la animación de escritura inicial)
      */
		animation: infiniteBounce 1.75s ease-in-out infinite 1.4s;
	}

	.bg-circle {
		transform-origin: center;
		animation: circlePop 0.35s ease-out forwards;
	}

	.letter-path {
		fill: black;
		fill-opacity: 0; /* Empieza transparente */
		stroke: black;
		stroke-width: 1;
		stroke-dasharray: 250; /* Longitud aproximada del trazo */
		stroke-dashoffset: 500; /* Empieza oculto */
		/* Ejecuta 'drawStroke' primero, espera 0.35s y ejecuta 'fillFadeIn' */
		animation:
			drawStroke .975s ease-in-out ,
			/* Empieza después del círculo */ fillFadeIn 0.55s ease-in-out both .75s; /* Empieza cuando termina de dibujar */
	}
</style>
