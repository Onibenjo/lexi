# Lexi: design spec (v1)

A calm daily English vocabulary and grammar PWA. Each day it teaches one useful word, makes you *use* it, and brings older words back right before you would forget them. Built for the author and a friend. Progress stays on the device.

## Stack
- **Vite + React + TypeScript**, plain CSS with design tokens (no UI kit, so it keeps the editorial look).
- **vite-plugin-pwa**: installable, works offline, app icon and splash screen.
- **ts-fsrs**: spaced repetition scheduling at 0.9 desired retention.
- **Dexie (IndexedDB)**: cards, review log, streak and settings, all local. Export and import as JSON as a backup.
- **Backend**: Vercel serverless functions in `/api`, deployed with the app. They call **OpenRouter**. `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are env vars, and the model defaults to a cheap Claude model. A shared `APP_PASSCODE` keeps strangers from spending the key, and the client caps AI calls per day.
- The app degrades gracefully: with no network or AI, every exercise still works offline using the bundled content.

## Content
- A bundled `words.json` of **~200 curated words**: about 75% "sophisticated but usable" words (e.g. *meticulous, mitigate, nuance, feasible*) and about 25% simpler everyday words that people often misuse or under-use (e.g. *afford, appreciate, borrow vs lend, reluctant*). Easier words come first, and the two kinds are interleaved. Nothing archaic.
- Each entry has: word, IPA, part of speech, plain-English definition, 2 examples, 2–3 collocations, word family, a **grammar pattern** (e.g. "reluctant **to** + verb"), one correct-the-sentence item, and a level tag.
- `/api/examples` asks Claude for a fresh example sentence to add variety.

## Daily loop (about 3–5 minutes)
1. **Today**: the word of the day as the hero (big Fraunces serif, IPA, ▶ pronunciation via the browser's speech synthesis, definition, example, collocations). Button: *Practice it →*.
2. **Learn → Recall → Produce** for the new word:
   - Meaning MCQ (recognise it)
   - Cloze: type the word into a sentence (recall)
   - **Use it**: write your own sentence. `/api/feedback` returns gentle, specific feedback (is it natural, is the grammar right, a better version). Writing is optional and can be skipped.
3. **Reviews**: words due under FSRS, with the exercise type rotating by how well you know the word: MCQ → cloze → collocation match → word-form transform → correct-the-sentence. Typed answers are auto-graded. MCQ gets Again or Good.
4. **Done for today**: an ink-stamp animation, the streak +1, a "use it today" nudge, and an optional share card (PNG). Then the app stops. There's no endless feed.

Rules:
- 1 new word a day by default (setting: 1–3).
- If more than 20 reviews are due, pause new words and say so gently.
- After 3+ days away, the **gentle return** mode serves at most 5 easy reviews first and never shows an overdue count.

## Habit
- A streak day = the new word plus any due reviews (or 10 reviews when nothing is new).
- **Streak freezes**: earn 1 every 7 days, hold 2 at most, and they are applied automatically. Optional weekly rest day.
- Reminders: v1 offers a recurring **calendar event (.ics)** at a time you choose. It works on every phone with no push server. Web Push is v2.
- Copy is never guilt-trippy.

## Screens
- **Today**: the hero card, a small streak indicator, and a quiet "N to review".
- **Session**: one card per screen with a thin progress rule. Swipe or tap.
- **Words**: a library of learned words with search, strength (a 4-dot meter), and word detail.
- **Progress**: a year heatmap (Daylio-style), current and best streak, freezes, and "words in use" (mature cards).
- **Settings**: new words per day, rest day, reminder (.ics), theme, AI passcode, export/import.
- Navigation: a bottom tab bar with 4 items.

## Visual direction: Editorial Dictionary
- Fonts: **Fraunces** (display, the word), **Inter** (UI).
- Light: paper `#F7F1E5`, ink `#2A2420`, brick `#B5482F` (primary), sage `#7A8B6F` (success), rule `#E4D8C3`, highlight `#D9A441`.
- Dark: warm charcoal `#1C1916`, paper text `#EDE5D6`, same accents tuned for contrast.
- Motion: 250–350ms ease-out, page-turn and crossfade, no bounce. The success state is a sage underline plus a soft haptic (`navigator.vibrate`). Confetti is reserved for streak milestones (7, 30, 100).
- WCAG AA contrast, tap targets of at least 44px, `prefers-reduced-motion` respected.

## Out of scope for v1
Accounts and sync, Web Push, leaderboards or a friend streak, audio recordings, a user-imported word list.
