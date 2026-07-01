/**
 * ! Patrón Observer
 * El patrón Observer es un patrón de diseño de comportamiento que establece
 * una relación de uno a muchos entre un objeto, llamado sujeto,
 * y otros objetos, llamados observadores, que son notificados
 * y actualizados automáticamente por el sujeto
 * cuando se producen cambios en su estado.
 *
 * * Es útil cuando necesitamos que varios objetos estén
 * * pendientes de los cambios
 *
 * !No confundirlo con RXJS Observables
 *
 * https://refactoring.guru/es/design-patterns/watcher
 */

interface WatcherX {
  getChannelName(): string
	notify(title: string): void
}

class YoutubeChannel {
	private name: string
	private subscribers: WatcherX[] = []

	constructor(name: string) {
		this.name = name
	}

	subscribe(watcher: WatcherX) {
		this.subscribers.push(watcher)
		console.log(`Suscribed: ${watcher.getChannelName()} al canal ${this.name}`)
	}

	unsubscribe(watcher: WatcherX) {
		this.subscribers = this.subscribers.filter(sub => sub !== watcher)
		console.log(`Unsubscribed: ${watcher.getChannelName()} del canal ${this.name}`)
	}

	notifySubscribers(videoTitle: string) {
		this.subscribers.forEach(sub => sub.notify(videoTitle))
	}

	uploadVideo(videoTitle: string) {
		console.log(`Uploading video: ${videoTitle}`)
		this.notifySubscribers(videoTitle)
	}
}

class Subscriber implements WatcherX {
	private name: string

	constructor(name: string) {
		this.name = name
  }
  
  getChannelName() {
    return this.name
  }

	notify(videoTitle: string) {
		console.log(`${this.name} got notified about ${videoTitle}`)
	}
}

const ytChannel = new YoutubeChannel('Beils Channel')
const sub1 = new Subscriber('Carenalga')
const sub2 = new Subscriber('careloka')

ytChannel.subscribe(sub1)
ytChannel.unsubscribe(sub2)
ytChannel.uploadVideo('El puto fucking video bro!!!')
