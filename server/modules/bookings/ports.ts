/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EmailNotificationStatus } from '../../utils/booking-email'

export interface BookingSummaryRecord {
	booking_id: string
	client_id: string
	staff_id: string
	booking_date: Date
	start_time: string
	end_time: string
	duration: number
	status: string
	notes: string | null
	client: {
		user_id: string
		name: string
		surname: string
		phone: string
		avatar: string | null
	}
	staff: {
		user_id: string
		name: string
		surname: string
	}
	booking_items: {
		booking_item_id: string
		item_type: string
		item_id: string
		name: string
		duration: number
	}[]
	carts: {
		cart_id: string
		status: string
		invoice_number: string | null
		total: number
	}[]
}

export interface BookingFilters {
	start?: string
	end?: string
	staff_id?: string
	client_id?: string
	search?: string
}

export interface BookingsRepository {
	findMany(filters: BookingFilters): Promise<BookingSummaryRecord[]>
	findById(id: string): Promise<any | null>
	findFirstAdminId(): Promise<string | null>
	findOverlapping(
		date: Date,
		startTime: string,
		endTime: string,
		staffId: string,
		excludeBookingId?: string,
	): Promise<{ start_time: string; end_time: string } | null>
	hasCompletedCart(bookingId: string): Promise<boolean>
	verifyClientExists(clientId: string): Promise<boolean>
	verifyStaffExists(staffId: string): Promise<boolean>
	create(data: any): Promise<any>
	update(id: string, data: any): Promise<any>
	delete(id: string): Promise<void>
	findRecipient(clientId: string): Promise<{ name: string; surname: string | null; email: string } | null>
}

export interface BookingNotifier {
	notify(booking: any): Promise<EmailNotificationStatus>
}
