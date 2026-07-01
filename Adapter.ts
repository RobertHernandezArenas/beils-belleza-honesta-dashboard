/**
 * ! Patrón Adapter
 *  Permite que objetos con interfaces incompatibles trabajen juntos, también es muy
 *  util para utilizar librerías de terceros en nuestra aplicación sin depender
 *  directamente de ellas.
 *
 * * Es útil cuando se quiere reutilizar una clase que no tiene la interfaz que
 * * necesitamos o cuando queremos crear una capa de abstracción para una librería
 * * de terceros.
 *
 * https://refactoring.guru/es/design-patterns/adapter
 */

const COLORS = {
	brown: 'color: brown',
	red: 'color: red',
	green: 'color: green',
	blue: 'color: blue',
	yellow: 'color: yellow',
	purple: 'color: purple',
	cyan: 'color: cyan',
	white: 'color: white',
	black: 'color: black',
	gray: 'color: gray',
	orange: 'color: orange',
	pink: 'color: pink',
	violet: 'color: violet',
}

class LocalLogger {
	constructor(private file: string) {}

	writeMessage(msg: string) {
		console.log(`Writing message to ${this.file}: ${msg}`)
	}

	writeError(msg: string) {
		console.log(`Writing error to ${this.file}: ${msg}`)
	}

	writeWarning(msg: string) {
		console.log(`Writing warning to ${this.file}: ${msg}`)
	}

	writeInfo(msg: string) {
		console.log(`Writing info to ${this.file}: ${msg}`)
	}
}

interface ILoggerAdapter {
	file: string

	writeMessage(msg: string): void
	writeError(msg: string): void
	writeWarning(msg: string): void
	writeInfo(msg: string): void
}

const logger = new LocalLogger('Adapter.ts')

logger.writeMessage('Message')
logger.writeError('Error')
logger.writeWarning('Warning')
logger.writeInfo('Info')

class LoggerAdapter implements ILoggerAdapter {
	public file: string
	// private logger = new Logger() // Winston por ejemplo

	constructor(file: string) {
		this.file = file
	}

	writeMessage(msg: string): void {
		console.log(`Writing message to ${this.file}: ${msg}`)
	}

	writeError(msg: string): void {
		console.log(`Writing error to ${this.file}: ${msg}`)
	}

	writeWarning(msg: string): void {
		console.log(`Writing warning to ${this.file}: ${msg}`)
	}

	writeInfo(msg: string): void {
		console.log(`Writing info to ${this.file}: ${msg}`)
	}
}
