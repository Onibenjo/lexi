import { db, getSettings, SYNCED_KEYS, type Settings } from './db'
import { EMPTY, merge, reviewKey, sentenceKey, type ReviewTuple, type Snapshot } from './merge'
import type { StoredCard } from './session'

// Keeps this device and the cloud copy for its sync code in step. Each sync pulls the
// cloud copy, merges it with local data, writes the result here, and pushes it back if
// anything changed. Pushes are compare-and-set, so a write from another device is merged
// in, never overwritten. Without a code, nothing here runs and Lexi stays fully local.

export interface SyncState {
  code: string
  rev: number
  lastSyncAt: number | null
  error: string | null // 'offline', or a message to show in Settings
}

const KEY = 'sync'

export async function getSyncState(): Promise<SyncState | null> {
  return ((await db.kv.get(KEY))?.value as SyncState | undefined) ?? null
}

async function setSyncState(patch: Partial<SyncState>): Promise<void> {
  const cur = await getSyncState()
  if (cur || patch.code) await db.kv.put({ key: KEY, value: { ...cur, ...patch } })
}

/** Accepts the code however it was typed: spaces, capitals, stray punctuation. */
export function normalizeCode(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const syncLink = (code: string) => `${location.origin}/#sync=${code}`

// ── Talking to /api/sync ──────────────────────────────────

class Offline extends Error {}

interface Reply {
  status: number
  body: { rev?: number; data?: Snapshot | null; code?: string; error?: string }
}

async function call(method: string, headers: Record<string, string>, body?: unknown): Promise<Reply> {
  let res: Response
  try {
    res = await fetch('/api/sync', {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Offline('offline')
  }
  const json = await res.json().catch(() => ({}))
  return { status: res.status, body: json }
}

const fail = (r: Reply) => new Error(r.body.error ?? `Sync failed (${r.status}).`)

// ── Local data ↔ snapshot ─────────────────────────────────

const pickSynced = (s: Settings) => ({
  ...Object.fromEntries(SYNCED_KEYS.map((k) => [k, s[k]])),
  at: s.syncedAt,
}) as Snapshot['settings']

export async function localSnapshot(): Promise<Snapshot> {
  const [cards, reviews, days, sentences, settings] = await Promise.all([
    db.cards.toArray(),
    db.reviews.toArray(),
    db.days.toArray(),
    db.sentences.toArray(),
    getSettings(),
  ])
  return {
    v: 1,
    cards,
    reviews: reviews.map((r): ReviewTuple => [r.wordId, r.day, r.at, r.kind, r.rating]),
    days,
    sentences: sentences.map(({ wordId, text, feedback, at }) => ({ wordId, text, feedback, at })),
    settings: pickSynced(settings),
  }
}

/** JSON turns dates into strings; ts-fsrs needs Date objects back. */
function reviveCard(c: StoredCard): StoredCard {
  return {
    ...c,
    card: { ...c.card, due: new Date(c.card.due), last_review: c.card.last_review ? new Date(c.card.last_review) : undefined },
  }
}

let applying = false

/** Writes only what the merge changed, so live queries don't churn on a no-op sync. */
async function apply(merged: Snapshot, local: Snapshot): Promise<void> {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const localCards = new Map(local.cards.map((c) => [c.wordId, c]))
  const localDays = new Map(local.days.map((d) => [d.day, d]))
  const localReviews = new Set(local.reviews.map(reviewKey))

  const cards = merged.cards.filter((c) => !same(c, localCards.get(c.wordId))).map(reviveCard)
  const days = merged.days.filter((d) => !same(d, localDays.get(d.day)))
  const reviews = merged.reviews
    .filter((r) => !localReviews.has(reviewKey(r)))
    .map(([wordId, day, at, kind, rating]) => ({ wordId, day, at, kind: kind as never, rating }))
  const newSettings = merged.settings && local.settings && merged.settings.at > local.settings.at ? merged.settings : null

  applying = true
  try {
    await db.transaction('rw', [db.cards, db.days, db.reviews, db.sentences, db.kv], async () => {
      if (cards.length) await db.cards.bulkPut(cards)
      if (days.length) await db.days.bulkPut(days)
      if (reviews.length) await db.reviews.bulkAdd(reviews)

      const rows = new Map((await db.sentences.toArray()).map((s) => [sentenceKey(s), s]))
      for (const s of merged.sentences) {
        const row = rows.get(sentenceKey(s))
        if (!row) await db.sentences.add({ ...s })
        else if (!row.feedback && s.feedback) await db.sentences.update(row.id!, { feedback: s.feedback })
      }

      if (newSettings) {
        const { at, ...values } = newSettings
        await db.kv.put({ key: 'settings', value: { ...(await getSettings()), ...values, syncedAt: at } })
      }
    })
  } finally {
    applying = false
  }
}

// ── The sync itself ───────────────────────────────────────

let running: Promise<void> | null = null
let again = false

/** Runs one sync. Calls while one is in flight queue a single follow-up run. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await syncOnce()
    } while (again)
  })().finally(() => (running = null))
  return running
}

async function syncOnce(): Promise<void> {
  const st = await getSyncState()
  if (!st) return
  const headers = { 'x-lexi-sync': st.code }
  try {
    const got = await call('GET', headers)
    if (got.status !== 200) throw fail(got)
    let remote = got.body.data ?? EMPTY
    let rev = got.body.rev ?? 0

    for (let attempt = 0; attempt < 3; attempt++) {
      const local = await localSnapshot()
      const merged = merge(local, remote)
      await apply(merged, local)
      if (JSON.stringify(merged) === JSON.stringify(remote)) break

      const put = await call('PUT', headers, { baseRev: rev, data: merged })
      if (put.status === 200) {
        rev = put.body.rev ?? rev + 1
        break
      }
      if (put.status !== 409) throw fail(put)
      remote = put.body.data ?? EMPTY // another device wrote first: merge that in and retry
      rev = put.body.rev ?? rev
    }
    await setSyncState({ rev, lastSyncAt: Date.now(), error: null })
  } catch (e) {
    await setSyncState({ error: e instanceof Offline ? 'offline' : (e as Error).message })
  }
}

// ── Turning sync on and off ───────────────────────────────

/** Makes a new code for this device's progress. Needs the app passcode. */
export async function enableSync(passcode: string): Promise<string> {
  const r = await call('POST', { 'x-lexi-passcode': passcode }).catch(() => {
    throw new Error('You’re offline. Try again when you’re connected.')
  })
  if (r.status !== 200 || !r.body.code) throw fail(r)
  await setSyncState({ code: r.body.code, rev: 0, lastSyncAt: null, error: null })
  await syncNow()
  return r.body.code
}

/** Links this device to an existing code and merges in its progress. */
export async function joinSync(raw: string): Promise<void> {
  const code = normalizeCode(raw)
  const r = await call('GET', { 'x-lexi-sync': code }).catch(() => {
    throw new Error('You’re offline. Try again when you’re connected.')
  })
  if (r.status !== 200) throw fail(r)
  await setSyncState({ code, rev: r.body.rev ?? 0, lastSyncAt: null, error: null })
  await syncNow()
}

/** Unlinks this device. Its local progress stays. */
export async function stopSync(): Promise<void> {
  await db.kv.delete(KEY)
}

/** Erases the cloud copy for this code, then unlinks this device. */
export async function deleteCloudCopy(): Promise<void> {
  const st = await getSyncState()
  if (!st) return
  const r = await call('DELETE', { 'x-lexi-sync': st.code }).catch(() => {
    throw new Error('You’re offline. Try again when you’re connected.')
  })
  if (r.status !== 200 && r.status !== 404) throw fail(r)
  await stopSync()
}

// ── Automatic triggers ────────────────────────────────────

let timer: ReturnType<typeof setTimeout> | undefined
function schedule() {
  if (applying) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    void syncNow()
  }, 3000)
}

let started = false

/**
 * Syncs on open, when the app comes back to the foreground or online, and a few seconds
 * after any change to progress or synced settings. Leaving the app flushes a pending push.
 */
export function startSync(): void {
  if (started) return
  started = true
  // Dexie hooks use their return values, so these must return nothing.
  for (const table of [db.cards, db.reviews, db.days, db.sentences]) {
    table.hook('creating', () => void schedule())
    table.hook('updating', () => void schedule())
    table.hook('deleting', () => void schedule())
  }
  db.kv.hook('creating', (key) => void (key === 'settings' && schedule()))
  db.kv.hook('updating', (_mods, key) => void (key === 'settings' && schedule()))

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
    else if (timer) {
      clearTimeout(timer)
      timer = undefined
      void syncNow()
    }
  })
  window.addEventListener('online', () => void syncNow())
  void syncNow()
}
