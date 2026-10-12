'use client'
import { create } from 'zustand'
import { GAME_CONFIG } from './config'

export type PanelId = 'none' | 'building' | 'phone' | 'character' | 'home' | 'settings' | 'help'
export type PhoneTab = 'home' | 'assets' | 'jobs' | 'skills' | 'maps' | 'wallet' | 'contacts' | 'messages' | 'calendar' | 'music' | 'chat' | 'bank' | 'goals' | 'drive'
export type Quality = 'high' | 'medium' | 'low' | 'minimal'

export interface Settings {
  master: number
  sfx: boolean
  music: boolean
  musicVolume: number
  quality: Quality
  showLabels: boolean
  reduceMotion: boolean
  largeText: boolean
  highContrast: boolean
  autosave: boolean
  /** 18+ content (hook-ups, night work). Off by default. */
  mature: boolean
}
export const DEFAULT_SETTINGS: Settings = {
  master: 0.7,
  sfx: true,
  music: true,
  musicVolume: 0.55,
  quality: 'high',
  showLabels: true,
  reduceMotion: false,
  largeText: false,
  highContrast: false,
  autosave: true,
  mature: false,
}

export interface QualityPreset {
  dpr: [number, number]
  shadows: boolean
  shadowMap: number
  peds: number
  cars: number
  treeDensity: number
  antialias: boolean
}
export const QUALITY: Record<Quality, QualityPreset> = {
  high: { dpr: [1, 2], shadows: true, shadowMap: 2048, peds: 26, cars: 12, treeDensity: 1, antialias: true },
  medium: { dpr: [1, 1.5], shadows: true, shadowMap: 1024, peds: 14, cars: 8, treeDensity: 0.8, antialias: true },
  low: { dpr: [1, 1], shadows: false, shadowMap: 512, peds: 6, cars: 4, treeDensity: 0.5, antialias: false },
  minimal: { dpr: [0.75, 0.75], shadows: false, shadowMap: 512, peds: 0, cars: 2, treeDensity: 0.25, antialias: false },
}

export interface Toast {
  id: number
  msg: string
  kind: 'info' | 'good' | 'warn' | 'bad'
}
export interface DialogState {
  npcId: string
  topicId: string
  phase: 'prompt' | 'reply'
  reply?: string
  gained?: number
}

export interface InboxItem {
  id: number
  msg: string
  kind: Toast['kind']
  at: number
}
/** Game-clock getter, registered by the game store (avoids an import cycle). */
export const clockRef = { now: () => 0 }

interface UIState {
  toasts: Toast[]
  inbox: InboxItem[]
  unread: number
  panel: PanelId
  selectedDest: string | null
  phoneTab: PhoneTab
  paused: boolean
  webgl: 'unknown' | 'ok' | 'failed'
  /** Bumped to remount the 3D canvas after a crash or lost GPU context. */
  viewKey: number
  /** 'lost' while the GPU context is gone and we are trying to restore it. */
  gfx: 'ok' | 'lost'
  /** Someone is typing in a chat thread. */
  chatTyping: { chat: string; who: string } | null
  settings: Settings
  dialog: DialogState | null
  // furniture / home editing
  editMode: boolean
  holdingUid: number | null
  /** Furniture being dragged in decorate mode. */
  dragUid: number | null
  /** Ride camera: inside the vehicle or chasing it. */
  rideCam: 'inside' | 'chase'
  holdRot: 0 | 1
  selectedFurniture: number | null
  trackedDest: string | null
  helpSeen: boolean
  /** Destination whose transport options sheet is open. */
  travelTo: string | null
  /** Courtroom hearing modal open. */
  court: boolean
  /** MoMo send target from the phone. */
  momoTo: string | null
  toast: (msg: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  setPanel: (p: PanelId) => void
  selectDest: (id: string | null, open?: boolean) => void
  setSettings: (p: Partial<Settings>) => void
}

let toastId = 1
function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(GAME_CONFIG.save.settingsKey)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const useUI = create<UIState>((set, get) => ({
  toasts: [],
  inbox: [],
  unread: 0,
  panel: 'none',
  selectedDest: null,
  phoneTab: 'home',
  paused: false,
  webgl: 'unknown',
  viewKey: 0,
  gfx: 'ok',
  chatTyping: null,
  settings: DEFAULT_SETTINGS,
  dialog: null,
  editMode: false,
  holdingUid: null,
  dragUid: null,
  rideCam: 'inside',
  holdRot: 0,
  selectedFurniture: null,
  trackedDest: null,
  helpSeen: false,
  travelTo: null,
  court: false,
  momoTo: null,
  toast: (msg, kind = 'info') => {
    const id = toastId++
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, msg, kind }], inbox: [...s.inbox, { id, msg, kind, at: clockRef.now() }].slice(-60), unread: s.unread + 1 }))
    setTimeout(() => get().dismissToast(id), kind === 'bad' || kind === 'warn' ? 6000 : 3800)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setPanel: (p) => set({ panel: p, ...(p !== 'building' ? {} : {}) }),
  selectDest: (id, open = true) => set({ selectedDest: id, ...(open && id ? { panel: 'building' as PanelId } : {}), ...(id === null ? {} : {}) }),
  setSettings: (p) => {
    const next = { ...get().settings, ...p }
    set({ settings: next })
    try {
      localStorage.setItem(GAME_CONFIG.save.settingsKey, JSON.stringify(next))
    } catch {
      /* storage unavailable */
    }
  },
}))

export function hydrateSettings() {
  useUI.setState({ settings: loadSettings() })
}
