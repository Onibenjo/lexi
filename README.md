# Lexi

One useful English word a day: learn it, use it, keep it. A calm PWA for building
vocabulary and grammar that sticks. Built for two people. Progress lives on each device, with optional sync between devices.

- **Daily loop (about 3 min):** read today's word → pick its meaning → type it into a sentence →
  write your own sentence (with optional AI feedback) → review older words that are due.
- **Spaced repetition:** [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) at 90% retention, with one
  review per day at most. Exercises get harder as a word gets stronger: meaning → gap-fill → collocation →
  word form → fix-the-sentence → write your own.
- **Gentle habits:** freezes (earn 1 per 7 days, hold 2), an optional weekly rest day, a short and easy
  "welcome back" set after a break, and new words pause when more than 20 reviews are waiting.
- **Content:** 210 curated words in `src/data/words.json`, mostly advanced but usable, plus everyday
  words people often misuse. Each word has IPA, examples, collocations, a word family, a grammar pattern
  and a common-mistake fix.
- **Sync (optional):** **Settings → Sync across devices** gives a code like `tulip-emerald-lynx-radish-71`.
  Enter it on another device, or open the copied link, and both devices share progress. Devices merge
  rather than overwrite: completed days, reviews and sentences from both sides are kept, and for each
  word the most recently reviewed schedule wins. Turning sync on needs the app passcode; joining only
  needs the code. Sync runs on open, on return to the app, and a few seconds after any change.

Background research and the design spec are in `docs/`.

## Run locally

```sh
npm install
cp .env.example .env.local   # optional: fill in to try AI feedback locally
npm run dev
```

`npm run dev` also serves `/api/*`, so AI feedback works locally once `.env.local` is filled in. Without
Redis variables, local sync keeps its data in memory until the dev server restarts.

## Deploy to Vercel

1. Push the repo and import it in Vercel. The framework preset is detected as Vite.
2. Set the environment variables:
   - `OPENROUTER_API_KEY`: your key from https://openrouter.ai/keys
   - `APP_PASSCODE`: any phrase. You and your friend enter it in **Settings → AI feedback**
   - `OPENROUTER_MODEL` (optional): defaults to `anthropic/claude-haiku-4.5`
   - For sync: **Storage → Upstash for Redis** (free plan), connected to all environments. This sets
     `KV_REST_API_URL` and `KV_REST_API_TOKEN` (a custom prefix such as `STORAGE_DB_` is fine). Without it, `/api/sync` answers 503 and the app stays local-only.
3. Open the URL on each phone and add it to the home screen. On iPhone: Safari → Share → *Add to Home Screen*.
   Then go to **Settings → Daily reminder → Add to calendar**.

Cost control: the passcode gates `/api/*`, each device can make at most 30 AI calls a day, and each
server instance allows at most 60 calls per IP per hour.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests for streaks, session planning, scheduling and answer checking |
| `npm run words` | Validates `src/data/parts/*.json` and merges them into `words.json` |
| `npm run build` | Type-checks and builds the PWA |

To add words, append entries that match `src/types.ts` to a file in `src/data/parts/`, add each word
to `scripts/wordlist.mjs` in the order you want, then run `node scripts/wordlist.mjs > scripts/wordlist.json && npm run words`.
