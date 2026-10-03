// Merges src/data/parts/*.json into src/data/words.json in curated order.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
const order = JSON.parse(readFileSync('scripts/wordlist.json', 'utf8')).map((w) => w.word)
const parts = readdirSync('src/data/parts').filter((f) => f.endsWith('.json')).sort()
const all = parts.flatMap((f) => JSON.parse(readFileSync(`src/data/parts/${f}`, 'utf8')))
const byId = new Map(all.map((w) => [w.id, w]))
const missing = order.filter((w) => !byId.has(w))
if (missing.length) throw new Error('missing: ' + missing.join(', '))
writeFileSync('src/data/words.json', JSON.stringify(order.map((w) => byId.get(w)), null, 1))
console.log(`merged ${order.length} words`)
