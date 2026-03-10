import Stripe from 'stripe'

const config = useRuntimeConfig()

// ==========================================
// STRIPE SDK — Inicialización
// ==========================================
// ⚠️  La SECRET KEY se lee desde runtimeConfig.stripeSecretKey
// 📄 Configúrala en .env → STRIPE_SECRET_KEY=sk_test_XXXXXXXX
// ==========================================

if (!config.stripeSecretKey) {
	console.warn('⚠️  STRIPE_SECRET_KEY no está configurada en .env. Los pagos con Stripe no funcionarán.')
}

export const stripe = new Stripe(config.stripeSecretKey || 'sk_test_placeholder', {
	apiVersion: '2025-03-31.basil' as any,
})
