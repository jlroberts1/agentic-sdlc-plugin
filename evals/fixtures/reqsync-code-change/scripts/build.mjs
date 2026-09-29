// Production build: copy each src module into dist/ with a banner.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

mkdirSync('dist', { recursive: true })
const files = readdirSync('src').filter(f => f.endsWith('.mjs'))
for (const f of files) {
  writeFileSync(`dist/${f}`, `// eval-persona production bundle\n${readFileSync(`src/${f}`, 'utf8')}`)
}
console.log(`build ok: ${files.length} modules -> dist/`)
