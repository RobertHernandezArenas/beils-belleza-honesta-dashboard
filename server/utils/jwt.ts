import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-tp-plus-dashboard'

export interface JwtPayload {
	userId: string
	email: string
	role: string
}

export const signToken = (payload: object, expiresIn: string | number = '24h') => {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any })
}

export const verifyToken = (token: string): JwtPayload | null => {
	try {
		return jwt.verify(token, JWT_SECRET) as JwtPayload
	} catch (error) {
		return null
	}
}
