// Usage: node scripts/validate-words.mjs <file.json> [...more]
// Checks every entry against the Word schema in src/types.ts.
import { readFileSync } from 'node:fs'

const POS = ['noun', 'verb', 'adjective', 'adverb']
const LEVELS = ['everyday', 'advanced']
const str = (v) => typeof v === 'string' && v.trim().length > 0

function check(w) {
  const errs = []
  const need = (cond, msg) => cond || errs.push(msg)
  need(str(w.id) && w.id === w.id.toLowerCase(), 'id')
  need(str(w.word), 'word')
  need(str(w.ipa) && w.ipa.startsWith('/') && w.ipa.endsWith('/'), 'ipa must be /…/')
  need(POS.includes(w.pos), 'pos')
  need(LEVELS.includes(w.level), 'level')
  need(str(w.definition) && w.definition.length <= 140, 'definition (≤140 chars)')
  need(Array.isArray(w.examples) && w.examples.length === 2 && w.examples.every(str), 'examples: 2')
  need(Array.isArray(w.collocations) && w.collocations.length >= 2 && w.collocations.length <= 3, 'collocations: 2–3')
  need(Array.isArray(w.family) && w.family.every(str), 'family')
  need(w.pattern && str(w.pattern.rule) && str(w.pattern.example), 'pattern')
  need(Array.isArray(w.forms) && w.forms.length >= 1 && w.forms[0] === w.word, 'forms[0] must equal word')
  const blanks = (s) => (s.match(/___/g) || []).length
  need(w.cloze && str(w.cloze.sentence) && blanks(w.cloze.sentence) === 1 && str(w.cloze.answer), 'cloze: one ___')
  need(w.cloze && w.forms?.includes(w.cloze.answer), 'cloze.answer must be in forms')
  need(!w.formDrill || blanks(w.formDrill.sentence ?? '') === 1 && str(w.formDrill.base) && str(w.formDrill.answer), 'formDrill: one ___')
  need(!w.formDrill || w.formDrill.base !== w.formDrill.answer, 'formDrill base must differ from answer')
  need(w.fix && str(w.fix.wrong) && str(w.fix.right) && str(w.fix.why) && w.fix.wrong !== w.fix.right, 'fix')
  need(Array.isArray(w.distractors) && w.distractors.length === 3 && w.distractors.every(str), 'distractors: 3')
  const lower = (s) => s.toLowerCase()
  need(!lower(w.definition).includes(lower(w.word)), 'definition must not contain the word')
  const ex = w.examples ?? []
  need(ex.every((s) => (w.forms ?? []).some((f) => lower(s).includes(lower(f)))), 'each example must use a form of the word')
  return errs
}

let bad = 0
let total = 0
const seen = new Set()
for (const file of process.argv.slice(2)) {
  const words = JSON.parse(readFileSync(file, 'utf8'))
  for (const w of words) {
    total++
    const errs = check(w)
    if (seen.has(w.id)) errs.push('duplicate id')
    seen.add(w.id)
    if (errs.length) {
      bad++
      console.log(`${file} › ${w.id ?? '?'}: ${errs.join('; ')}`)
    }
  }
}
console.log(`${total} entries, ${bad} with problems`)
process.exit(bad ? 1 : 0)
