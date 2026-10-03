# Research notes: daily vocab + grammar app

Decisions so far: a **PWA** (installable on iPhone and Android), a **curated word list with Claude** for example sentences and feedback, and **local-only** progress (no accounts).

## Why people quit word-of-the-day apps
- The words are obscure or archaic, so you never use them.
- The app is passive. You swipe through a word and never actually *use* it.
- Anki-style tools build up a review backlog, and the backlog creates guilt.
- Once a streak breaks, people quit ("I broke it, so why bother").
- Too many notifications, plus ads and upsells during practice.

## Learning science → product rules
- **1 new word a day by default, 3 at most.** Reviews, not new cards, are what make the workload heavy. If reviews pile up, pause new words automatically.
- **Recall, then produce.** After learning a word: a cloze (type it into a sentence), then *write your own sentence*. Claude gives gentle feedback on that sentence. Writing is optional and rewarded, not forced.
- **Spaced repetition: FSRS** via `ts-fsrs` (open-spaced-repetition). It needs about 20–30% fewer reviews than SM-2 at the same retention. Desired retention is 0.9. Typed or cloze answers are auto-graded: correct = Good, wrong = Again.
- **Rotate exercise types**, from easy to hard: meaning MCQ → cloze → collocation match → word-form transform → correct-the-sentence → write your own.
- **Teach grammar through the word.** Each word carries a pattern: a preposition, countable or uncountable, transitive, or its word family. "Correct-the-sentence" targets that pattern.
- **Word source:** high-utility words ranked by frequency, beyond the basics (an upper NGSL band, NAWL/AWL, and common "sophisticated but usable" words). Filter out archaic words. Include the definition, IPA, 2 examples, collocations and the word family.

## Habit mechanics
- The tiny daily goal (1 word + due reviews, about 3 minutes) counts as a streak day.
- **Streak freezes** and an optional rest day. Bending, not breaking (Gentler Streak, ADA 2024).
- **Gentle return:** after a break, say "Welcome back, here are 3 easy reviews." Never show a big overdue number.
- One reminder a day at a time the user picks. Back off after 2 ignored days. No guilt copy.
- **A "done for today" ending**, like Wordle: a natural stopping point and a shareable card.

## UI inspiration (what to steal)
| Reference | Steal |
|---|---|
| Vocabulary (Monkey Taps) | The word as the hero: a big serif word on a calm page |
| Wordle / NYT Games | One thing a day, a "done" state, a share card |
| Gentler Streak (ADA 2024) | A streak that bends: rest days and freezes |
| Finch | A companion that grows with you and never punishes |
| Things 3 | Restrained motion that feels physical, lots of space |
| Readwise | Editorial, book-like reading feel |
| Daylio | A year heatmap: glanceable history that isn't a scoreboard |
| Calm | Slow pacing on the daily entry screen |
| Duolingo | Celebration timing and haptics, at about 20% of the intensity |

Patterns: one card with one job · swipe *and* a visible tap alternative · celebrations of 300ms or less (save confetti for milestones) · warm dark mode, not pure black · empty states with one line of copy and one action.

Anti-patterns: points, gems, leagues and badges stacked together · "your streak is dying" · dashboards with 6+ widgets · confetti on every tap · low-contrast pastel text · ads during practice · long onboarding before the first word.

Sources: making.duolingo.com (streaks), developer.apple.com/design/awards/2024, github.com/open-spaced-repetition/ts-fsrs, newgeneralservicelist.org, dictionaryapi.dev
