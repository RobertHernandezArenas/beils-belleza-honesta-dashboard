import { prisma } from '../server/utils/prisma'

async function test() {
    console.log('--- TEST: CREATING BOOKING ---')
    try {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
        const client = await prisma.user.findFirst({ where: { role: 'CLIENT' } })
        
        if (!admin || !client) {
            console.error('Missing admin or client for test')
            return
        }

        const booking = await prisma.booking.create({
            data: {
                client_id: client.user_id,
                staff_id: admin.user_id,
                status: 'PENDIENTE',
                booking_date: new Date('2026-04-15T00:00:00.000Z'),
                start_time: '12:00',
                end_time: '12:30',
                duration: 30,
                notes: 'Test note',
                booking_items: {
                    create: [
                        {
                            item_type: 'SERVICE',
                            item_id: 'some-id',
                            name: 'Test Service',
                            duration: 30
                        }
                    ]
                }
            }
        })
        console.log('✅ Booking created:', booking.booking_id)
        
        // Cleanup
        await prisma.bookingItem.deleteMany({ where: { booking_id: booking.booking_id } })
        await prisma.booking.delete({ where: { booking_id: booking.booking_id } })
        console.log('✅ Cleanup successful')
    } catch (err: any) {
        console.error('❌ ERROR:', err)
        if (err.code) console.error('Prisma Code:', err.code)
        if (err.meta) console.error('Prisma Meta:', err.meta)
    } finally {
        // No need to disconnect here as it's a short script
    }
}

test()
