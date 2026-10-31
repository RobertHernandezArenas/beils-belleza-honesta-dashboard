export interface ReportSaleItem {
	item_type: string
	item_id?: string
	name: string
	quantity: number
	unit_price: number
	total?: number
}

export interface ReportSaleUser {
	user_id: string
	name: string
	surname: string
	email: string
	avatar?: string | null
	created_at?: Date | string
}

export interface ReportSaleBookingStaff {
	user_id: string
	name: string
	surname: string
}

export interface ReportSaleBooking {
	booking_date?: Date | string | null
	staff_id?: string | null
	staff?: ReportSaleBookingStaff | null
}

export interface ReportSaleRecord {
	cart_id: string
	total: number
	discount?: number | null
	payment_method?: string | null
	created_at: Date | string
	user_id?: string | null
	user?: ReportSaleUser | null
	booking_id?: string | null
	booking?: ReportSaleBooking | null
	items: ReportSaleItem[]
}

export interface PrevSaleRecord {
	total: number
	discount?: number | null
}

export interface ReportBookingRecord {
	booking_id: string
	status: string
	duration?: number | null
	booking_date: Date | string
	staff_id?: string | null
	staff?: ReportSaleBookingStaff | null
}

export interface DebtsAggregate {
	_sum: {
		amount?: number | null
		remaining?: number | null
	}
}

export interface HistoricalCart {
	user_id: string | null
	created_at: Date | string
}

export interface FetchReportsDataParams {
	startDate: Date | null
	now: Date
	prevStartDate: Date | null
	prevEndDate: Date | null
}

export interface RawReportsData {
	completedSales: ReportSaleRecord[]
	prevSales: PrevSaleRecord[]
	bookings: ReportBookingRecord[]
	prevBookingsCount: number
	newClientsCount: number
	prevNewClientsCount: number
	totalClientsAllTime: number
	totalProductsCount: number
	debtsSummary: DebtsAggregate
	allTimeUsersWithCarts: HistoricalCart[]
}

export interface ReportsRepository {
	fetchReportsData(params: FetchReportsDataParams): Promise<RawReportsData>
}

