export default defineEventHandler(async () => {
    try {
        const prisma = await import('../utils/prisma').then(m => m.prisma);
        const user = await prisma.user.findFirst({ where: { name: { contains: 'Luisa' } } });
        if (!user) return { success: false, error: 'No user' };
        
        const bonus = await prisma.bonus.findFirst();
        if (!bonus) return { success: false, error: 'No bonus created in DB' };

        const clientBonus = await prisma.clientBonus.create({
            data: {
                client_id: user.user_id,
                bonus_id: bonus.bonus_id,
                remaining_sessions: bonus.total_sessions,
                status: 'activo'
            }
        });
        
        return { success: true, clientBonus };
    } catch (e: any) {
        return { success: false, error: e.message }
    }
})
