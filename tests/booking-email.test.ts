import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
	buildBookingConfirmationEmail,
	escapeHtml,
	formatBookingDate,
	formatDuration,
	sendBookingConfirmation,
	type BookingEmailData,
	type MailMessage,
} from '../server/utils/booking-email'

const data: BookingEmailData = {
	salon: { name: 'Beils Belleza Honesta', address: 'Calle Mayor 1, Madrid', phone: '600 000 000' },
	clientName: 'Lucía',
	// Bookings are stored as UTC midnight of the local day
	bookingDate: new Date('2026-10-29T00:00:00.000Z'),
	startTime: '10:30',
	duration: 75,
	services: ['Indiba facial', 'Limpieza'],
	professional: 'Alexandra Victoria',
}

describe('booking email formatting helpers', () => {
	it('escapes every HTML special character', () => {
		assert.equal(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;')
	})

	it('formats the booking day in Spanish without shifting it by timezone', () => {
		assert.equal(formatBookingDate(new Date('2026-10-29T00:00:00.000Z')), 'jueves 29 de octubre de 2026')
	})

	it('formats durations in minutes and hours', () => {
		assert.equal(formatDuration(45), '45 min')
		assert.equal(formatDuration(60), '1 h')
		assert.equal(formatDuration(90), '1 h 30 min')
		assert.equal(formatDuration(0), '0 min')
	})
})

describe('buildBookingConfirmationEmail', () => {
	it('builds the subject with salon name and date', () => {
		assert.equal(buildBookingConfirmationEmail(data).subject, 'Tu cita en Beils Belleza Honesta el jueves 29 de octubre de 2026')
	})

	it('includes all booking details in the plain-text version', () => {
		const { text } = buildBookingConfirmationEmail(data)
		for (const part of ['Hola Lucía', 'jueves 29 de octubre de 2026', '10:30', '1 h 15 min', 'Indiba facial', 'Limpieza', 'Alexandra Victoria', 'Beils Belleza Honesta', 'Calle Mayor 1, Madrid', '600 000 000']) {
			assert.ok(text.includes(part), part)
		}
	})

	it('includes all booking details in the HTML version', () => {
		const { html } = buildBookingConfirmationEmail(data)
		for (const part of ['Hola Lucía', 'jueves 29 de octubre de 2026', '10:30', '1 h 15 min', '<li>Indiba facial</li>', 'Alexandra Victoria', 'Calle Mayor 1, Madrid', '600 000 000']) {
			assert.ok(html.includes(part), part)
		}
	})

	it('escapes interpolated values in the HTML version', () => {
		const { html } = buildBookingConfirmationEmail({
			...data,
			clientName: '<script>alert(1)</script>',
			services: ['Mani & Pedi <b>'],
			professional: '"Ana"',
			salon: { name: 'Salón <x>', address: 'C/ <y>', phone: '<z>' },
		})
		assert.equal(html.includes('<script>'), false)
		assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
		assert.ok(html.includes('Mani &amp; Pedi &lt;b&gt;'))
		assert.ok(html.includes('&quot;Ana&quot;'))
		assert.ok(html.includes('Salón &lt;x&gt;'))
	})

	it('omits the professional, address and phone lines when they are missing', () => {
		const { text, html } = buildBookingConfirmationEmail({ ...data, professional: null, salon: { name: 'Beils' } })
		assert.equal(text.includes('Te atenderá'), false)
		assert.equal(html.includes('Te atenderá'), false)
		assert.equal(text.includes('Dirección'), false)
		assert.equal(text.includes('Teléfono'), false)
	})

	it('keeps the subject on a single line (no header injection)', () => {
		const { subject } = buildBookingConfirmationEmail({ ...data, salon: { name: 'Beils\r\nBcc: x@example.com' } })
		assert.equal(/[\r\n]/.test(subject), false)
	})
})

describe('sendBookingConfirmation', () => {
	const recipient = { name: 'Lucía', surname: 'Pérez', email: 'lucia@example.com' }
	const okSend = () => {
		const sent: MailMessage[] = []
		return { sent, send: async (msg: MailMessage) => void sent.push(msg) }
	}
	const silent = () => {}

	it('sends to an eligible client and reports "sent"', async () => {
		const { sent, send } = okSend()
		const status = await sendBookingConfirmation({ requested: true, mailConfigured: true, recipient, content: data, send, log: silent })
		assert.equal(status, 'sent')
		assert.equal(sent.length, 1)
		assert.equal(sent[0]?.to, 'lucia@example.com')
		assert.ok(sent[0]?.subject.startsWith('Tu cita en'))
		assert.ok(sent[0]?.html && sent[0]?.text)
	})

	it('skips without sending when not requested or not eligible', async () => {
		const cases = [
			{ requested: false, mailConfigured: true, recipient },
			{ requested: true, mailConfigured: false, recipient },
			{ requested: true, mailConfigured: true, recipient: { ...recipient, email: 'sin-correo-1@cliente.local' } },
			{ requested: true, mailConfigured: true, recipient: { name: 'No registrado', surname: '', email: 'x@example.com' } },
			{ requested: true, mailConfigured: true, recipient: null },
		]
		for (const c of cases) {
			const { sent, send } = okSend()
			assert.equal(await sendBookingConfirmation({ ...c, content: data, send, log: silent }), 'skipped')
			assert.equal(sent.length, 0)
		}
	})

	it('reports "failed" and never throws when the transport fails', async () => {
		const status = await sendBookingConfirmation({
			requested: true,
			mailConfigured: true,
			recipient,
			content: data,
			send: async () => {
				throw new Error('550 rejected lucia@example.com')
			},
			log: silent,
		})
		assert.equal(status, 'failed')
	})

	it('reports "failed" when the transport hangs past the timeout', async () => {
		const status = await sendBookingConfirmation({
			requested: true,
			mailConfigured: true,
			recipient,
			content: data,
			send: () => new Promise(() => {}),
			timeoutMs: 20,
			log: silent,
		})
		assert.equal(status, 'failed')
	})

	it('logs only a generic message, never the recipient or the content', async () => {
		const lines: string[] = []
		await sendBookingConfirmation({
			requested: true,
			mailConfigured: true,
			recipient,
			content: data,
			send: async () => {
				throw Object.assign(new Error('550 rejected lucia@example.com'), { code: 'EENVELOPE' })
			},
			log: (...args: unknown[]) => void lines.push(args.map(String).join(' ')),
		})
		assert.equal(lines.length, 1)
		const logged = lines.join('\n')
		assert.ok(logged.includes('EENVELOPE'))
		for (const pii of ['lucia@example.com', 'Lucía', 'Indiba']) assert.equal(logged.includes(pii), false, pii)
	})
})
