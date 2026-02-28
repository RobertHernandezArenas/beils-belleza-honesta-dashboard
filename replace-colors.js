import fs from 'fs'
import path from 'path'

const dirPath = './app'

const exactReplacements = {
	'bg-[#ffffff]': 'bg-bg-card',
	'text-[#ffffff]': 'text-bg-card',
	'border-[#ffffff]': 'border-bg-card',

	'bg-[#fbfaf9]': 'bg-bg-app',
	'text-[#fbfaf9]': 'text-bg-app',

	'bg-[#f4f1ee]': 'bg-bg-muted',
	'hover:bg-[#f4f1ee]': 'hover:bg-bg-muted',
	'disabled:bg-[#f4f1ee]': 'disabled:bg-bg-muted',
	'border-[#f4f1ee]': 'border-border-subtle',

	'bg-[#f2f0eb]': 'bg-bg-hover',
	'hover:bg-[#f2f0eb]': 'hover:bg-bg-hover',
	'border-[#f2f0eb]': 'border-bg-hover',

	'border-[#dbd2c6]': 'border-border-default',
	'text-[#dbd2c6]': 'text-border-default',

	'border-[#bababa]': 'border-border-strong',
	'hover:border-[#bababa]': 'hover:border-border-strong',
	'text-[#bababa]': 'text-border-strong',
	'placeholder:text-[#bababa]': 'placeholder:text-border-strong',

	'text-[#1a1a1a]': 'text-text-primary',
	'hover:text-[#1a1a1a]': 'hover:text-text-primary',
	'focus-visible:border-[#1a1a1a]': 'focus-visible:border-text-primary',
	'focus-visible:outline-[#1a1a1a]': 'focus-visible:outline-text-primary',
	'focus-visible:ring-[#1a1a1a]': 'focus-visible:ring-text-primary',
	'bg-[#1a1a1a]': 'bg-text-primary',
	'bg-[#1a1a1a]/20': 'bg-text-primary/20',
	'bg-[#1a1a1a]/40': 'bg-text-primary/40',
	'ring-[#1a1a1a]/20': 'ring-text-primary/20',
	'focus-visible:ring-[#1a1a1a]/20': 'focus-visible:ring-text-primary/20',

	'text-[#404040]': 'text-text-secondary',
	'hover:text-[#404040]': 'hover:text-text-secondary',
	'group-focus-within:text-[#404040]': 'group-focus-within:text-text-secondary',

	'text-[#666666]': 'text-text-muted',
	'hover:text-[#666666]': 'hover:text-text-muted',
	'disabled:text-[#666666]': 'disabled:text-text-muted',

	'text-[#8c8c8c]': 'text-text-light',
	'hover:text-[#8c8c8c]': 'hover:text-text-light',
	'placeholder:text-[#8c8c8c]': 'placeholder:text-text-light',

	// also handle some cases mapping variables inside gradient classes
	'from-[#fbfaf9]': 'from-bg-app',
	'to-[#fbfaf9]': 'to-bg-app',
	'from-[#f2f0eb]': 'from-bg-hover',
	'from-[#ffffff]': 'from-bg-card',
}

function walk(dir) {
	let results = []
	const list = fs.readdirSync(dir)
	list.forEach(function (file) {
		file = dir + '/' + file
		const stat = fs.statSync(file)
		if (stat && stat.isDirectory()) {
			results = results.concat(walk(file))
		} else if (file.endsWith('.vue') || file.endsWith('.ts')) {
			results.push(file)
		}
	})
	return results
}

const files = walk(dirPath)
let changedFiles = 0

files.forEach(file => {
	let content = fs.readFileSync(file, 'utf8')
	let newContent = content

	for (const [key, value] of Object.entries(exactReplacements)) {
		// Create a regex to match the exact class ensuring it's surrounded by spaces or quotes,
		// but standard string replacement is usually fine if we just replace universally
		// wait, `text-[#1a1a1a]` is very specific. No risk of accidental substring matches.
		newContent = newContent.split(key).join(value)
	}

	if (newContent !== content) {
		fs.writeFileSync(file, newContent, 'utf8')
		changedFiles++
		console.log(`Updated ${file}`)
	}
})

console.log(`Done. Changed ${changedFiles} files.`)
