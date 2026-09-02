import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// 1. Domain logic for SHR Laser and Indiba evaluation
export interface AnamnesisQuestion {
	id: number
	question: string
	answer: 'SI' | 'NO' | 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'DEFICIENTE' | string
	details?: string
	isCritical?: boolean
}

export function evaluateAnamnesisRisk(answers: AnamnesisQuestion[]): {
	riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
	contraindications: string[]
} {
	const contraindications: string[] = []

	for (const q of answers) {
		// Preguntas críticas que contraindican el tratamiento con Láser SHR
		if (q.id === 8 && q.answer === 'SI') {
			contraindications.push('Antecedentes o proceso cancerígeno activo')
		}
		if (q.id === 10 && q.answer === 'SI') {
			contraindications.push('Epilepsia no controlada')
		}
		if (q.id === 14 && q.answer === 'SI') {
			contraindications.push('Portador de marcapasos o implante electrónico')
		}
		if (q.id === 17 && q.answer === 'SI') {
			contraindications.push('Embarazo o periodo de lactancia')
		}
		if (q.id === 19 && q.answer === 'SI') {
			contraindications.push('Consumo de sustancias o medicamentos fotosensibilizantes')
		}
	}

	if (contraindications.length > 0) {
		return { riskLevel: 'HIGH', contraindications }
	}

	// Alergias o alteraciones cutáneas leves
	const hasWarnings = answers.some(q => (q.id === 4 || q.id === 5 || q.id === 7) && q.answer === 'SI')
	if (hasWarnings) {
		return { riskLevel: 'MEDIUM', contraindications: ['Requiere precaución dérmica o test de parche'] }
	}

	return { riskLevel: 'LOW', contraindications: [] }
}

export function calculateNextSessionNumber(existingSessionNumbers: number[]): number {
	if (!existingSessionNumbers.length) return 1
	const max = Math.max(...existingSessionNumbers)
	return max + 1
}

export function formatLaserParameters(joules: number, ms: number, hz: number): string {
	if (joules <= 0 || ms <= 0 || hz <= 0) {
		throw new Error('Los parámetros de Láser deben ser valores positivos')
	}
	return `${joules} J/cm² | ${ms} ms | ${hz} Hz`
}

export function formatIndibaParameters(mode: 'CAP' | 'RES' | 'BOTH', capPower: number, resPower: number, durationMin: number): string {
	if (durationMin <= 0) {
		throw new Error('La duración debe ser mayor a 0 minutos')
	}
	if (mode === 'CAP') return `CAP: ${capPower}% (${durationMin} min)`
	if (mode === 'RES') return `RES: ${resPower}% (${durationMin} min)`
	return `CAP: ${capPower}% + RES: ${resPower}% (${durationMin} min)`
}

// 2. Unit Tests
describe('Ficha Técnica & Sesiones Láser SHR / Indiba - Reglas de Negocio', () => {

	describe('Evaluación de Riesgo de Anamnesis (Cuestionario 20 preguntas)', () => {
		it('debe catalogar como HIGH si el cliente declara marcapasos', () => {
			const questions: AnamnesisQuestion[] = [
				{ id: 14, question: '¿Es usted portador de marcapasos?', answer: 'SI' }
			]
			const result = evaluateAnamnesisRisk(questions)
			assert.equal(result.riskLevel, 'HIGH')
			assert.ok(result.contraindications.includes('Portador de marcapasos o implante electrónico'))
		})

		it('debe catalogar como HIGH si toma fotosensibilizantes o está embarazada', () => {
			const questions: AnamnesisQuestion[] = [
				{ id: 17, question: '¿Está embarazada o en periodo de lactancia?', answer: 'SI' },
				{ id: 19, question: '¿Toma alguna sustancia fotosensibilizante?', answer: 'SI' }
			]
			const result = evaluateAnamnesisRisk(questions)
			assert.equal(result.riskLevel, 'HIGH')
			assert.equal(result.contraindications.length, 2)
		})

		it('debe catalogar como LOW cuando todas las respuestas críticas son NO', () => {
			const questions: AnamnesisQuestion[] = [
				{ id: 8, question: '¿Cáncer?', answer: 'NO' },
				{ id: 10, question: '¿Epilepsia?', answer: 'NO' },
				{ id: 14, question: '¿Marcapasos?', answer: 'NO' },
				{ id: 17, question: '¿Embarazo?', answer: 'NO' },
				{ id: 19, question: '¿Fotosensibilizante?', answer: 'NO' }
			]
			const result = evaluateAnamnesisRisk(questions)
			assert.equal(result.riskLevel, 'LOW')
			assert.equal(result.contraindications.length, 0)
		})
	})

	describe('Correlatividad y Numeración de Sesiones por Zona', () => {
		it('debe asignar sesión 1 a una zona nueva sin historial', () => {
			assert.equal(calculateNextSessionNumber([]), 1)
		})

		it('debe autoincrementar correlativamente según el historial existente', () => {
			assert.equal(calculateNextSessionNumber([1, 2, 3]), 4)
			assert.equal(calculateNextSessionNumber([1, 2]), 3)
		})
	})

	describe('Formateo y Validación de Parámetros Técnicos', () => {
		it('debe formatear parámetros estándar de Láser SHR correctamente', () => {
			const formatted = formatLaserParameters(14, 25, 10)
			assert.equal(formatted, '14 J/cm² | 25 ms | 10 Hz')
		})

		it('debe lanzar error si algún parámetro de Láser es menor o igual a cero', () => {
			assert.throws(() => formatLaserParameters(-5, 20, 10), /positivos/)
			assert.throws(() => formatLaserParameters(14, 0, 10), /positivos/)
		})

		it('debe formatear parámetros técnicos de Indiba Deep Care', () => {
			const formatted = formatIndibaParameters('BOTH', 45, 55, 30)
			assert.equal(formatted, 'CAP: 45% + RES: 55% (30 min)')
		})
	})

	describe('Seguridad & Consentimiento Indiba Deep Beauty (Documento Oficial 448 kHz)', () => {
		it('debe catalogar como NO_APTO si presenta marcapasos o embarazo o tromboflebitis', () => {
			const items: IndibaSafetyItem[] = [
				{ key: 'pacemaker', label: 'Marcapasos u otro tipo de implantes electrónicos', isAbsoluteContraindication: true, present: true },
				{ key: 'pregnancy', label: 'Embarazo', isAbsoluteContraindication: true, present: false }
			]
			const res = evaluateIndibaSafety(items)
			assert.equal(res.status, 'NO_APTO')
			assert.equal(res.absoluteCount, 1)
		})

		it('debe catalogar como PRECAUCION si presenta tumor activo o anticoagulantes sin contraindicación absoluta', () => {
			const items: IndibaSafetyItem[] = [
				{ key: 'pacemaker', label: 'Marcapasos', isAbsoluteContraindication: true, present: false },
				{ key: 'oncology_active', label: 'Tumor activo (evitar zona)', isAbsoluteContraindication: false, present: true },
				{ key: 'anticoagulants', label: 'Medicación anticoagulante', isAbsoluteContraindication: false, present: true }
			]
			const res = evaluateIndibaSafety(items)
			assert.equal(res.status, 'PRECAUCION')
			assert.equal(res.warningCount, 2)
		})

		it('debe catalogar como APTO cuando no existen contraindicaciones ni precauciones', () => {
			const items: IndibaSafetyItem[] = [
				{ key: 'pacemaker', label: 'Marcapasos', isAbsoluteContraindication: true, present: false },
				{ key: 'pregnancy', label: 'Embarazo', isAbsoluteContraindication: true, present: false }
			]
			const res = evaluateIndibaSafety(items)
			assert.equal(res.status, 'APTO')
			assert.equal(res.alerts.length, 0)
		})

		it('debe contener los 10 objetivos estéticos oficiales del documento de Indiba', () => {
			assert.equal(INDIBA_OFFICIAL_OBJECTIVES.length, 10)
			assert.ok(INDIBA_OFFICIAL_OBJECTIVES.includes('Reducción de arrugas y líneas de expresión'))
			assert.ok(INDIBA_OFFICIAL_OBJECTIVES.includes('Anticelulitis, antiestrías, antiflacidez'))
			assert.ok(INDIBA_OFFICIAL_OBJECTIVES.includes('Efecto lifting antiedad'))
		})
	})

	describe('Firma Digital en Canvas & Validación de Consentimiento', () => {
		it('debe validar que una firma PNG en base64 tenga formato data:image/png;base64 válido', () => {
			const validSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAYAAADGFbfi'
			assert.ok(isValidPngSignature(validSignature))
		})

		it('debe rechazar firmas vacías o formatos no válidos', () => {
			assert.equal(isValidPngSignature(''), false)
			assert.equal(isValidPngSignature(null), false)
			assert.equal(isValidPngSignature('data:image/jpeg;base64,123'), false)
			assert.equal(isValidPngSignature('texto-plano-invalido'), false)
		})

		it('debe exigir datos del tutor si el cliente es menor de edad en Láser SHR', () => {
			assert.throws(
				() => validateLaserConsentPayload({ isMinor: true, guardianName: '', guardianDni: '', hasSignature: true }),
				/tutor/
			)
			assert.doesNotThrow(() =>
				validateLaserConsentPayload({
					isMinor: true,
					guardianName: 'María Pérez',
					guardianDni: '12345678Z',
					hasSignature: true
				})
			)
		})

		it('debe validar extensiones permitidas (PDF, JPG, PNG) y tamaño máximo de 5MB en autorizaciones', () => {
			assert.ok(validateAuthorizationDocument('autorizacion_padre.pdf', 1024 * 500))
			assert.ok(validateAuthorizationDocument('firma_tutor.png', 1024 * 200))
			assert.ok(validateAuthorizationDocument('foto_dni.jpg', 1024 * 800))
			assert.equal(validateAuthorizationDocument('script.exe', 1024), false)
			assert.equal(validateAuthorizationDocument('pesado.pdf', 6 * 1024 * 1024), false)
		})

		it('debe generar enlace de WhatsApp con formato correcto y teléfono sanitizado', () => {
			const link = buildWhatsAppDossierLink('+34 600 123 456', 'Ana López', 'Láser SHR')
			assert.ok(link.includes('phone=34600123456'))
			assert.ok(link.includes('Ana%20L%C3%B3pez'))
		})
	})
})

export const INDIBA_OFFICIAL_OBJECTIVES = [
	'Reducción de arrugas y líneas de expresión',
	'Mejora del aspecto de bolsas y ojeras',
	'Efecto lifting antiedad',
	'Redefinición del óvalo facial',
	'Modelación de la silueta',
	'Anticelulitis, antiestrías, antiflacidez',
	'Acción tensora del pecho',
	'Bienestar general',
	'Tratamiento capilar',
	'Formación'
] as const

export interface IndibaSafetyItem {
	key: string
	label: string
	isAbsoluteContraindication: boolean
	present: boolean
}

export function evaluateIndibaSafety(items: IndibaSafetyItem[]): {
	status: 'APTO' | 'PRECAUCION' | 'NO_APTO'
	absoluteCount: number
	warningCount: number
	alerts: string[]
} {
	const alerts: string[] = []
	let absoluteCount = 0
	let warningCount = 0

	for (const item of items) {
		if (item.present) {
			if (item.isAbsoluteContraindication) {
				absoluteCount++
				alerts.push(`CONTRAINDICACIÓN ABSOLUTA: ${item.label}`)
			} else {
				warningCount++
				alerts.push(`PRECAUCIÓN: ${item.label}`)
			}
		}
	}

	if (absoluteCount > 0) {
		return { status: 'NO_APTO', absoluteCount, warningCount, alerts }
	}
	if (warningCount > 0) {
		return { status: 'PRECAUCION', absoluteCount, warningCount, alerts }
	}
	return { status: 'APTO', absoluteCount: 0, warningCount: 0, alerts: [] }
}

export function isValidPngSignature(data: string | null | undefined): boolean {
	if (!data) return false
	if (typeof data !== 'string') return false
	return data.startsWith('data:image/png;base64,') && data.length > 30
}

export interface LaserConsentPayload {
	isMinor: boolean
	guardianName?: string
	guardianDni?: string
	hasSignature: boolean
}

export function validateLaserConsentPayload(payload: LaserConsentPayload): boolean {
	if (payload.isMinor) {
		if (!payload.guardianName?.trim() || !payload.guardianDni?.trim()) {
			throw new Error('Es obligatorio indicar el nombre y DNI del tutor legal para menores de edad')
		}
	}
	if (!payload.hasSignature) {
		throw new Error('La firma digital del paciente o tutor es obligatoria')
	}
	return true
}

export function validateAuthorizationDocument(filename: string, sizeBytes: number): boolean {
	const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
	const lower = filename.toLowerCase()
	const hasValidExt = allowedExtensions.some(ext => lower.endsWith(ext))
	if (!hasValidExt) return false
	if (sizeBytes <= 0 || sizeBytes > 5 * 1024 * 1024) return false
	return true
}

export function buildWhatsAppDossierLink(phone: string, clientName: string, treatment: string): string {
	const cleanPhone = phone.replace(/[^0-9]/g, '')
	const message = `Hola ${clientName}, te hacemos entrega de la copia de tu expediente de ${treatment} firmado en Beils Belleza Honesta.`
	const encoded = encodeURIComponent(message)
	return cleanPhone
		? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
		: `https://api.whatsapp.com/send?text=${encoded}`
}
