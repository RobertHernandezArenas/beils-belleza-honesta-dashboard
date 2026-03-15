import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('server/**/*.ts');

files.forEach(file => {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const newLines = lines.filter(line => !line.match(/from 'h3'/));
  
  if (lines.length !== newLines.length) {
    console.log(`Cleaning ${file}`);
    writeFileSync(file, newLines.join('\n'), 'utf-8');
  }
});
