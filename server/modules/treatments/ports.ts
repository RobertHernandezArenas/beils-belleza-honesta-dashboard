export interface TreatmentZoneRecord {
	zone_id: string
	user_id: string
	treatment_type: 'LASER_SHR' | 'INDIBA'
	zone_name: string
	phototype: string | null
	hair_thickness: string | null
	hair_color: string | null
	hair_density: string | null
	notes: string | null
	status: string
	created_at?: Date
	updated_at?: Date
	sessions?: TreatmentSessionRecord[]
}

export interface TreatmentSessionRecord {
	session_id: string
	zone_id: string
	client_id: string
	staff_id: string | null
	client_package_id: string | null
	booking_id: string | null
	session_number: number
	session_date: Date
	parameters: string
	skin_reaction: string | null
	observations: string | null
	created_at?: Date
	updated_at?: Date
	staff?: { user_id: string; name: string; surname: string | null }
	client_package?: any
	booking?: { booking_date: Date; start_time: string }
}

export interface NewZoneInput {
	user_id: string
	treatment_type: 'LASER_SHR' | 'INDIBA'
	zone_name: string
	phototype?: string | null
	hair_thickness?: string | null
	hair_color?: string | null
	hair_density?: string | null
	notes?: string | null
}

export interface NewSessionInput {
	zone_id: string
	client_id: string
	staff_id?: string | null
	client_package_id?: string | null
	booking_id?: string | null
	session_number?: number
	session_date: string
	parameters: string
	skin_reaction?: string | null
	observations?: string | null
	decrement_package?: boolean
}

export interface TreatmentSessionUnitOfWork {
	consumePackage(clientPackageId: string, consumerId: string): Promise<void>
	assertPackageAccess(clientPackageId: string, consumerId: string): Promise<void>
	createSession(data: {
		zone_id: string
		client_id: string
		staff_id: string | null
		client_package_id: string | null
		booking_id: string | null
		session_number: number
		session_date: Date
		parameters: string
		skin_reaction: string | null
		observations: string | null
	}): Promise<TreatmentSessionRecord>
}

export interface TreatmentsRepository {
	findZones(clientId: string, treatmentType?: string): Promise<TreatmentZoneRecord[]>
	findZoneByIdAndClient(zoneId: string, clientId: string): Promise<TreatmentZoneRecord | null>
	countSessionsForZone(zoneId: string): Promise<number>
	createZone(data: NewZoneInput): Promise<TreatmentZoneRecord>
	deleteZone(zoneId: string): Promise<void>
	deleteSession(sessionId: string): Promise<void>
	transaction<T>(work: (uow: TreatmentSessionUnitOfWork) => Promise<T>): Promise<T>
}

