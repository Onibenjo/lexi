/** Small wrappers over browser APIs that may be missing (iOS has no vibration, some browsers no voices). */

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === 'en-GB') ?? voices.find((v) => v.lang.startsWith('en')) ?? null
  u.rate = 0.9
  speechSynthesis.speak(u)
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function buzz(pattern: number | number[] = 12): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate?.(pattern)
}

/** A daily repeating calendar event: a reminder that works on every phone without a push server. */
export function downloadReminder(time: string): void {
  const [h, m] = time.split(':')
  const start = new Date()
  start.setHours(Number(h), Number(m), 0, 0)
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const local = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}T${h}${m}00`
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lexi//Daily word//EN',
    'BEGIN:VEVENT',
    `UID:lexi-daily-${Date.now()}@lexi`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${local}`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Lexi · today’s word (3 min)',
    `URL:${location.origin}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your word of the day is waiting',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = 'lexi-reminder.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
