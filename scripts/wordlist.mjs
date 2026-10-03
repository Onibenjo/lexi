// Curated order: roughly easier → harder. One everyday word after every three advanced words.
const everyday = `afford appreciate convince suggest reliable eventually actually borrow lend recommend mention regret achieve rely affect effect complain aware familiar convenient worth deny encourage consider persuade accurate efficient responsible generous anxious rarely admit insist prefer struggle assume ensure deserve cope hesitate mature decent delay reluctant opportunity approach explain purpose patient honest`.split(/\s+/)
const advanced = `feasible pragmatic ambiguous coherent resilient candid diligent inevitable plausible subtle tangible versatile viable convey credible diverse elaborate emphasize enhance explicit implicit foster fundamental hinder anticipate alleviate advocate compelling comprehensive consensus deliberate eliminate facilitate fluctuate implement innovative integrity intuitive legitimate mundane obsolete optimal persistent precise prominent prudent redundant rigorous robust skeptical sophisticated spontaneous substantial sustainable tedious transparent trivial undermine vague vulnerable overwhelm procrastinate proactive leverage wary insightful daunting empathy dilemma incentive concise mediocre haphazard tentative superficial nostalgia rapport reiterate resonate reconcile consolidate meticulous mitigate nuance articulate eloquent profound scrutinize constrain contemplate conventional depict discern endeavor hypothesis imminent impartial inherent intricate lucid negligible notorious ominous paradox perceive pivotal predominant prevalent proficient succinct tenacious ubiquitous unprecedented adamant apprehensive arbitrary assertive astute benevolent bolster brevity catalyst cohesive complacent conducive conscientious culminate cumbersome deteriorate discrepancy eclectic enigmatic ephemeral exacerbate exemplary frugal immerse impeccable indispensable inadvertent juxtapose lethargic nonchalant oblivious paramount perseverance poignant scrupulous serendipity stagnant trajectory unanimous unwavering vindicate whimsical zealous ambivalent galvanize idiosyncratic inquisitive`.split(/\s+/)
const dup = (a) => a.filter((w, i) => a.indexOf(w) !== i)
const all = [...everyday, ...advanced]
if (dup(all).length) throw new Error('dupes: ' + dup(all))
const out = []
let e = 0, a = 0
while (e < everyday.length || a < advanced.length) {
  for (let k = 0; k < 3 && a < advanced.length; k++) out.push({ word: advanced[a++], level: 'advanced' })
  if (e < everyday.length) out.push({ word: everyday[e++], level: 'everyday' })
}
// start gentle: lead with an everyday word
out.unshift(out.splice(3, 1)[0])
console.log(JSON.stringify(out))
console.error(`everyday=${everyday.length} advanced=${advanced.length} total=${out.length}`)
