import type { Word } from '../types'

/** Draws a 1080×1350 "page from the dictionary" card and shares it (or downloads it). */
export async function shareWordCard(word: Word, streak: number): Promise<void> {
  await Promise.all([
    document.fonts.load('500 140px "Fraunces Variable"'),
    document.fonts.load('italic 400 44px "Fraunces Variable"'),
    document.fonts.load('600 30px "Inter Variable"'),
  ])
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  const pad = 100

  g.fillStyle = '#F7F1E5'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = '#E4D8C3'
  g.lineWidth = 2
  g.strokeRect(48, 48, W - 96, H - 96)

  g.fillStyle = '#5C5249'
  g.font = '600 28px "Inter Variable"'
  g.letterSpacing = '5px'
  g.fillText('WORD OF THE DAY', pad, 190)
  g.letterSpacing = '0px'

  g.fillStyle = '#2A2420'
  let size = 150
  g.font = `500 ${size}px "Fraunces Variable"`
  while (g.measureText(word.word).width > W - pad * 2 && size > 70) {
    size -= 6
    g.font = `500 ${size}px "Fraunces Variable"`
  }
  g.fillText(word.word, pad - 6, 190 + size + 30)

  let y = 190 + size + 110
  g.fillStyle = '#B5482F'
  g.font = 'italic 400 40px "Fraunces Variable"'
  g.fillText(word.pos, pad, y)
  g.fillStyle = '#5C5249'
  g.font = '400 32px "Inter Variable"'
  g.fillText(word.ipa, pad + g.measureText(word.pos).width + 50, y)

  y += 100
  g.fillStyle = '#2A2420'
  g.font = '400 50px "Fraunces Variable"'
  y = wrap(g, word.definition, pad, y, W - pad * 2, 68)

  y += 50
  g.fillStyle = '#D9A441'
  const exStart = y - 40
  g.font = 'italic 400 40px "Fraunces Variable"'
  g.fillStyle = '#5C5249'
  const exEnd = wrap(g, word.examples[0], pad + 34, y, W - pad * 2 - 34, 58)
  g.fillStyle = '#D9A441'
  g.fillRect(pad, exStart, 4, exEnd - exStart - 30)

  g.fillStyle = '#2A2420'
  g.font = '600 30px "Inter Variable"'
  g.fillText('Lexi', pad, H - 120)
  g.fillStyle = '#5C5249'
  g.font = '400 30px "Inter Variable"'
  g.fillText(streak > 1 ? `Day ${streak} of learning a word a day` : 'Learning a word a day', pad + 90, H - 120)

  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'))
  const file = new File([blob], `lexi-${word.id}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: word.word }).catch(() => {})
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): number {
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y)
      line = word
      y += lh
    } else {
      line = test
    }
  }
  g.fillText(line, x, y)
  return y + lh
}
