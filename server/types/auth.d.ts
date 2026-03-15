import { JwtPayload } from '../utils/jwt'

declare module 'h3' {
	interface H3EventContext {
		user?: JwtPayload
	}
}

export {}
