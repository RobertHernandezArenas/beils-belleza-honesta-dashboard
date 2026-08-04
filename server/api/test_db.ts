export default defineEventHandler(async () => {
    try {
        const prisma = await import('../utils/prisma').then(m => m.prisma);
        const user = await prisma.user.findFirst({ where: { name: { contains: 'Luisa' } } });
        if (!user) return { success: false, error: 'No user' };
        
        return { success: true, user };
    } catch (rawError) {
    	const e = toApiError(rawError)
        return { success: false, error: e.message }
    }
})
