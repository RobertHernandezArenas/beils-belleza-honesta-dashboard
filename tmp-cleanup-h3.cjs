const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const serverFiles = walk('server');

serverFiles.forEach(file => {
    if (!file.endsWith('.ts')) return;
    
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const newLines = lines.filter(line => !line.match(/from 'h3'/));
    
    if (lines.length !== newLines.length) {
        console.log(`Cleaning ${file}`);
        fs.writeFileSync(file, newLines.join('\n'), 'utf8');
    }
});
