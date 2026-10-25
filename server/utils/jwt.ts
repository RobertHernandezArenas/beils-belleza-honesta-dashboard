import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { resolveJwtSecret } from './jwt-secret'

const JWT_SECRET = resolveJwtSecret(process.env)
const ALGORITHM = 'HS256'

export interface JwtPayload {
	userId: string
	email: string
	role: string
}

export const signToken = (payload: object, expiresIn: string | number = '24h') => {
	return jwt.sign(payload, JWT_SECRET, { algorithm: ALGORITHM, expiresIn: expiresIn as SignOptions['expiresIn'] })
}

export const verifyToken = (token: string): JwtPayload | null => {
	try {
		// Pin the algorithm: never let the token header choose how it is verified
		return jwt.verify(token, JWT_SECRET, { algorithms: [ALGORITHM] }) as JwtPayload
	} catch {
		return null
	}
}
