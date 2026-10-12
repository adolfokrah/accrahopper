'use client'
import { useState } from 'react'
import { syncMusic } from '@/game/audio'
import { formatClock, dayOf } from '@/game/config'
import { saveNow } from '@/game/save'
import { useGame } from '@/game/store'
import { detectQuality, QUALITY, useUI, type Quality, type Settings } from '@/game/ui'
import { Btn, Modal, Sheet } from './kit'

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  )
}

export function SettingsPanel() {
  const st = useUI((s) => s.settings)
  const set = (p: Partial<Settings>) => {
    useUI.getState().setSettings(p)
    setTimeout(syncMusic, 0)
  }
  const [confirm, setConfirm] = useState<null | 'new' | 'menu'>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const game = useGame.getState()
  return (
    <Sheet title="Settings" icon="⚙️" onClose={() => useUI.getState().setPanel('none')} subtitle="The game is paused while this is open.">
      <h3>🔊 Audio</h3>
      <label className="slider"><b>Master volume</b><input type="range" min={0} max={1} step={0.05} value={st.master} onChange={(e) => set({ master: Number(e.target.value) })} aria-label="Master volume" /></label>
      <Toggle label="Sound effects" value={st.sfx} onChange={(sfx) => set({ sfx })} />
      <Toggle label="Background music" hint="Afrobeats and highlife grooves" value={st.music} onChange={(music) => set({ music })} />
      <label className="slider"><b>Music volume</b><input type="range" min={0} max={1} step={0.05} value={st.musicVolume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} aria-label="Music volume" /></label>

      <h3>🖥️ Graphics</h3>
      <div className="pills" role="radiogroup" aria-label="Graphics quality">
        <button role="radio" aria-checked={st.qualityAuto} className={st.qualityAuto ? 'on' : ''} onClick={() => set({ qualityAuto: true, quality: detectQuality() })}>Auto</button>
        {(Object.keys(QUALITY) as Quality[]).map((q) => (
          <button key={q} role="radio" aria-checked={!st.qualityAuto && st.quality === q} className={!st.qualityAuto && st.quality === q ? 'on' : ''} onClick={() => set({ quality: q, qualityAuto: false })}>{q[0].toUpperCase() + q.slice(1)}</button>
        ))}
      </div>
      <small className="muted">{st.qualityAuto ? `Auto picked ${st.quality} for this device and lowers it if the game stutters. ` : ''}Lower settings reduce shadows, resolution, people, traffic and trees.</small>
      <Toggle label="Floating place labels" value={st.showLabels} onChange={(showLabels) => set({ showLabels })} />

      <h3>♿ Accessibility</h3>
      <Toggle label="Reduce motion" hint="Instant camera, calmer water, slower traffic" value={st.reduceMotion} onChange={(reduceMotion) => set({ reduceMotion })} />
      <Toggle label="Large text" value={st.largeText} onChange={(largeText) => set({ largeText })} />
      <Toggle label="High contrast UI" value={st.highContrast} onChange={(highContrast) => set({ highContrast })} />

      <h3>🔞 Content</h3>
      <Toggle label="Mature content (18+)" hint="Hook-ups and night work at clubs. Nothing explicit is shown." value={st.mature} onChange={(mature) => {
        if (mature && !window.confirm('Mature content is for adults only. Confirm you are 18 or older.')) return
        set({ mature })
      }} />

      <h3>💾 Saving</h3>
      <Toggle label="Autosave" hint="Every few seconds and after each activity" value={st.autosave} onChange={(autosave) => set({ autosave })} />
      <div className="row">
        <Btn small onClick={() => setSaved(saveNow() ? `Saved Day ${dayOf(game.minutes)}, ${formatClock(game.minutes)}` : 'Could not save (storage unavailable)')}>Save now</Btn>
        <Btn small kind="ghost" onClick={() => setConfirm('menu')}>Main menu</Btn>
        <Btn small kind="danger" onClick={() => setConfirm('new')}>New game</Btn>
      </div>
      {saved && <small className="ok">{saved}</small>}
      <small className="muted">Progress is saved on this device only. Single-player time stops while the game is closed.</small>

      {confirm && (
        <Modal label="Confirm">
          <h2>{confirm === 'new' ? 'Start a new game?' : 'Return to the main menu?'}</h2>
          <p>{confirm === 'new' ? 'Your saved game is replaced as soon as you start the new character. Backing out of character creation keeps it.' : 'Your progress is saved first.'}</p>
          <div className="row">
            <Btn kind="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
            <Btn kind={confirm === 'new' ? 'danger' : 'primary'} onClick={() => {
              if (confirm === 'new') { useGame.getState().toMenu(); useGame.setState({ screen: 'create' }) } else { saveNow(); useGame.getState().toMenu() }
              setConfirm(null)
            }}>{confirm === 'new' ? 'Yes, start over' : 'Save and exit'}</Btn>
          </div>
        </Modal>
      )}
    </Sheet>
  )
}
