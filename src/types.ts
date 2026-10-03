export type Level = 'everyday' | 'advanced'
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb'

/** One curated dictionary entry. Content lives in src/data/words.json. */
export interface Word {
  id: string // lowercase slug, equals `word` for single words
  word: string
  ipa: string // e.g. "/məˈtɪk.jə.ləs/"
  pos: PartOfSpeech
  level: Level
  definition: string // plain English, no circular use of the word itself
  examples: [string, string] // natural sentences using the word (any inflection)
  collocations: string[] // 2–3 common pairings, e.g. "meticulous attention"
  family: string[] // related forms with tag, e.g. "meticulously (adv)"
  pattern: { rule: string; example: string } // the grammar the word carries
  forms: string[] // every inflection accepted as a typed answer, base first
  cloze: { sentence: string; answer: string } // sentence contains exactly one "___"
  formDrill?: { sentence: string; base: string; answer: string } // turn `base` into the form that fits "___"; omitted when the word has no natural related form
  fix: { wrong: string; right: string; why: string } // one grammar/usage error to correct
  distractors: [string, string, string] // wrong-but-plausible short definitions for MCQ
  tip?: string // common mistake or nuance, one sentence
}
