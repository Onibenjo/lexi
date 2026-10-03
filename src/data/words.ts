import type { Word } from '../types'
import data from './words.json'

export const WORDS = data as Word[]
export const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]))
export const wordNumber = (id: string) => WORDS.findIndex((w) => w.id === id) + 1
