import type { PrismaClient } from '@prisma/client'
import { consumeClientPackage, asConsumptionTx, assertPackageAccess } from '../../utils/package-consumption'
import type {
	TreatmentsRepository,
	TreatmentSessionUnitOfWork,
	TreatmentZoneRecord,
	TreatmentSessionRecord,
	NewZoneInput,
} from './ports'

export function createPrismaTreatmentsRepository(db: PrismaClient): TreatmentsRepository {
	return {
		async findZones(clientId: string, treatmentType?: string): Promise<TreatmentZoneRecord[]> {
			const whereClause: Record<string, unknown> = { user_id: clientId }
			if (treatmentType && ['LASER_SHR', 'INDIBA'].includes(treatmentType)) {
				whereClause.treatment_type = treatmentType
			}

			return (await db.treatmentZone.findMany({
				where: whereClause,
				include: {
					sessions: {
						orderBy: { session_number: 'desc' },
						include: {
							staff: { select: { user_id: true, name: true, surname: true } },
							client_package: {
								include: {
									package: { select: { name: true, type: true } },
								},
							},
							booking: { select: { booking_date: true, start_time: true } },
						},
					},
				},
				orderBy: { created_at: 'asc' },
			})) as TreatmentZoneRecord[]
		},

		async findZoneByIdAndClient(zoneId: string, clientId: string): Promise<TreatmentZoneRecord | null> {
			return (await db.treatmentZone.findFirst({
				where: { zone_id: zoneId, user_id: clientId },
			})) as TreatmentZoneRecord | null
		},

		async countSessionsForZone(zoneId: string): Promise<number> {
			return await db.treatmentSession.count({ where: { zone_id: zoneId } })
		},

		async createZone(data: NewZoneInput): Promise<TreatmentZoneRecord> {
			return (await db.treatmentZone.create({
				data: {
					user_id: data.user_id,
					treatment_type: data.treatment_type,
					zone_name: data.zone_name.trim(),
					phototype: data.phototype?.trim() || null,
					hair_thickness: data.hair_thickness?.trim() || null,
					hair_color: data.hair_color?.trim() || null,
					hair_density: data.hair_density?.trim() || null,
					notes: data.notes?.trim() || null,
					status: 'ACTIVE',
				},
				include: { sessions: true },
			})) as TreatmentZoneRecord
		},

		async deleteZone(zoneId: string): Promise<void> {
			await db.treatmentZone.delete({ where: { zone_id: zoneId } })
		},

		async deleteSession(sessionId: string): Promise<void> {
			await db.treatmentSession.delete({ where: { session_id: sessionId } })
		},

		async transaction<T>(work: (uow: TreatmentSessionUnitOfWork) => Promise<T>): Promise<T> {
			return await db.$transaction(async tx => {
				const uow: TreatmentSessionUnitOfWork = {
					async consumePackage(clientPackageId: string, consumerId: string) {
						await consumeClientPackage(asConsumptionTx(tx), {
							clientPackageId,
							consumerId,
						})
					},
					async assertPackageAccess(clientPackageId: string, consumerId: string) {
						await assertPackageAccess(tx, clientPackageId, consumerId)
					},
					async createSession(data) {
						return (await tx.treatmentSession.create({
							data,
							include: {
								staff: { select: { user_id: true, name: true, surname: true } },
								client_package: {
									include: {
										package: { select: { name: true, type: true } },
									},
								},
								booking: { select: { booking_date: true, start_time: true } },
							},
						})) as TreatmentSessionRecord
					},
				}
				return await work(uow)
			})
		},
	} satisfies TreatmentsRepository
}

