'use client'
import { useUI } from './ui'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
      master = ctx.createGain()
      master.connect(ctx.destination)
      musicBus = ctx.createGain()
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -18
      comp.ratio.value = 3
      musicBus.connect(comp).connect(master)
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = noiseBuf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  const st = useUI.getState().settings
  if (master) master.gain.value = st.master
  if (musicBus) musicBus.gain.value = st.musicVolume
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, dest?: AudioNode) {
  const c = ensure()
  if (!c || !master) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  const t = start
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(dest ?? master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

export type Sfx = 'click' | 'coin' | 'success' | 'warn' | 'start' | 'error'
export function sfx(name: Sfx) {
  if (!useUI.getState().settings.sfx) return
  const c = ensure()
  if (!c) return
  const n = c.currentTime
  switch (name) {
    case 'click': tone(660, n, 0.08, 'triangle', 0.1); break
    case 'coin': tone(988, n, 0.1, 'square', 0.07); tone(1319, n + 0.08, 0.16, 'square', 0.07); break
    case 'success': tone(523, n, 0.12, 'triangle'); tone(659, n + 0.1, 0.12, 'triangle'); tone(784, n + 0.2, 0.22, 'triangle'); break
    case 'warn': tone(330, n, 0.14, 'sawtooth', 0.08); tone(262, n + 0.12, 0.2, 'sawtooth', 0.08); break
    case 'error': tone(196, n, 0.2, 'square', 0.07); break
    case 'start': tone(440, n, 0.1, 'triangle'); tone(554, n + 0.08, 0.1, 'triangle'); break
  }
}

/* ============================== music engine ============================== */
export type Mood = 'day' | 'night' | 'club'
let mood: Mood = 'day'
let timer: ReturnType<typeof setInterval> | null = null
let step = 0
let nextTime = 0

// I – IV – V – I highlife progression in G major (MIDI roots + triad)
const PROG = [
  [55, 59, 62],
  [60, 64, 67],
  [62, 66, 69],
  [55, 59, 62],
]
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

function noise(t: number, dur: number, vol: number, hp: number, bp?: number) {
  if (!ctx || !noiseBuf || !musicBus) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = bp ? 'bandpass' : 'highpass'
  f.frequency.value = bp ?? hp
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(musicBus)
  src.start(t, Math.random() * 0.5, dur + 0.05)
}
function kick(t: number, vol = 0.9) {
  if (!ctx || !musicBus) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
  o.connect(g).connect(musicBus)
  o.start(t)
  o.stop(t + 0.35)
}
function pluck(freq: number, t: number, vol: number, dur = 0.28, type: OscillatorType = 'triangle') {
  if (!ctx || !musicBus) return
  const o = ctx.createOscillator()
  const f = ctx.createBiquadFilter()
  const g = ctx.createGain()
  o.type = type
  o.frequency.value = freq
  f.type = 'lowpass'
  f.frequency.setValueAtTime(3200, t)
  f.frequency.exponentialRampToValueAtTime(600, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(f).connect(g).connect(musicBus)
  o.start(t)
  o.stop(t + dur + 0.05)
}
function bass(freq: number, t: number, dur: number, vol: number) {
  if (!ctx || !musicBus) return
  const o = ctx.createOscillator()
  const f = ctx.createBiquadFilter()
  const g = ctx.createGain()
  o.type = 'sawtooth'
  o.frequency.value = freq
  f.type = 'lowpass'
  f.frequency.value = 380
  f.Q.value = 6
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(f).connect(g).connect(musicBus)
  o.start(t)
  o.stop(t + dur + 0.05)
}
function pad(chord: number[], t: number, dur: number, vol: number) {
  if (!ctx || !musicBus) return
  for (const n of chord) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = mtof(n)
    o.detune.value = (Math.random() - 0.5) * 8
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3)
    g.gain.linearRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(musicBus)
    o.start(t)
    o.stop(t + dur + 0.05)
  }
}

// 16-step patterns per bar
const BELL = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0]
const GUITAR = [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2]
const BASS_STEPS: Record<number, number> = { 0: 0, 3: 0, 6: 7, 8: 0, 11: 5, 14: 7 }

function scheduleStep(s: number, t: number) {
  const bar = Math.floor(s / 16)
  const i = s % 16
  const chord = PROG[bar % PROG.length]
  const club = mood === 'club'
  const night = mood !== 'day'
  // drums
  if (club ? i % 4 === 0 : i === 0 || i === 6 || i === 10) kick(t, club ? 0.95 : 0.7)
  if (i === 4 || i === 12) noise(t, 0.16, club ? 0.45 : 0.3, 0, 1800)
  if (i % 2 === 0 || club) noise(t, 0.04, i % 4 === 2 ? 0.14 : 0.07, 7000)
  if (BELL[i]) pluck(i % 4 === 0 ? 1568 : 1319, t, night ? 0.05 : 0.07, 0.09, 'square')
  // bass
  if (BASS_STEPS[i] !== undefined) bass(mtof(chord[0] - 24 + BASS_STEPS[i]), t, club ? 0.22 : 0.3, club ? 0.5 : 0.4)
  // highlife guitar arpeggio
  if (!club || i % 2 === 0) pluck(mtof(chord[GUITAR[i]] + 12), t, night ? 0.07 : 0.1, 0.3)
  if (i === 0) pad(chord, t, (60 / bpm()) * 4, night ? 0.035 : 0.025)
  // little melodic answer every other bar
  if (bar % 2 === 1 && (i === 8 || i === 10 || i === 13)) pluck(mtof(chord[Math.floor(i / 2) % 3] + 24), t, 0.05, 0.22, 'sine')
}
const bpm = () => (mood === 'club' ? 118 : mood === 'night' ? 104 : 98)

function tick() {
  if (!ctx) return
  const stepDur = 60 / bpm() / 4
  while (nextTime < ctx.currentTime + 0.12) {
    // gentle swing
    const swing = step % 2 === 1 ? stepDur * 0.12 : 0
    try {
      scheduleStep(step, nextTime + swing)
    } catch {
      /* never let one bad note stall the scheduler */
    }
    nextTime += stepDur
    step++
  }
}

export function setMood(m: Mood) {
  mood = m
}

export function syncMusic() {
  const st = useUI.getState().settings
  if (st.music && !timer) {
    const c = ensure()
    if (!c || c.state !== 'running') return
    nextTime = c.currentTime + 0.1
    step = 0
    timer = setInterval(() => {
      if (document.hidden) return
      tick()
    }, 25)
  } else if (!st.music && timer) {
    clearInterval(timer)
    timer = null
  }
  if (master) master.gain.value = st.master
  if (musicBus) musicBus.gain.value = st.musicVolume
}

/** Browsers block audio until a user gesture: unlock and start music on first input. */
export function armAudioUnlock() {
  if (typeof window === 'undefined') return
  const go = () => {
    const c = ensure()
    if (!c) return
    void c.resume().then(() => syncMusic())
    window.removeEventListener('pointerdown', go)
    window.removeEventListener('keydown', go)
  }
  window.addEventListener('pointerdown', go)
  window.addEventListener('keydown', go)
}
