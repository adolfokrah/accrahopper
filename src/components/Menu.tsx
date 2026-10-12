'use client'
import { useEffect, useState } from 'react'
import { sfx } from '@/game/audio'
import { GAME_CONFIG, dayOf, formatMoney } from '@/game/config'
import { readSave, type LoadResult } from '@/game/save'
import { useGame } from '@/game/store'
import { Btn, Modal } from './kit'
import { SettingsPanel } from './SettingsPanel'

export function Menu() {
  const [save, setSave] = useState<LoadResult>({ status: 'none' })
  const [confirm, setConfirm] = useState(false)
  const [howto, setHowto] = useState(false)
  const [settings, setSettings] = useState(false)
  useEffect(() => {
    setSave(readSave())
  }, [])
  const startNew = () => {
    sfx('click')
    if (save.status === 'ok') setConfirm(true)
    else useGame.setState({ screen: 'create' })
  }
  return (
    <div className="menu">
      <div className="menu-card">
        <div className="logo" aria-hidden>🏙️</div>
        <h1>{GAME_CONFIG.title}</h1>
        <p className="tagline">A life-sim in {GAME_CONFIG.cityName}. Work, eat, sleep, make friends and build a better home.</p>
        <div className="menu-actions">
          {save.status === 'ok' && (
            <Btn onClick={() => { sfx('start'); useGame.getState().loadFromSave(save.env.game) }}>
              ▶ Continue
              <small className="btn-sub">
                {save.env.game.profile?.name} · Day {dayOf(save.env.game.minutes)} · {formatMoney(save.env.game.money)}
              </small>
            </Btn>
          )}
          <Btn kind={save.status === 'ok' ? 'soft' : 'primary'} onClick={startNew}>
            {save.status === 'ok' ? '✨ New game' : '🚀 Play as guest'}
          </Btn>
          <div className="row center">
            <Btn small kind="ghost" onClick={() => setHowto(!howto)}>How to play</Btn>
            <Btn small kind="ghost" onClick={() => setSettings(true)}>⚙️ Settings</Btn>
          </div>
        </div>
        {save.status === 'invalid' && (
          <div className="notice warn">
            Your previous save could not be read ({save.reason}). A backup copy was kept and you can safely start a new game.
          </div>
        )}
        {howto && (
          <ul className="howto">
            <li>🖱️ <b>Move:</b> tap or click the ground. Or use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>.</li>
            <li>🏢 <b>Buildings:</b> tap one to see what you can do there.</li>
            <li>✋ <b>Camera:</b> drag to pan, scroll or pinch to zoom, 🎯 to find yourself.</li>
            <li>📱 <b>Phone:</b> jobs, skills, map, wallet and contacts.</li>
            <li>💾 <b>Saves:</b> automatic, on this device. Time pauses while the game is closed.</li>
          </ul>
        )}
        <p className="fineprint">Single-player. Guest play, no account needed. Currency is fictional {GAME_CONFIG.currency.name}. Characters shown with an NPC tag are demo characters, not real players.</p>
      </div>
      {confirm && (
        <Modal label="Confirm new game">
          <h2>Start a new game?</h2>
          <p>You have a saved game ({save.status === 'ok' ? save.env.game.profile?.name : ''}). It will be replaced once you start your new character.</p>
          <div className="row">
            <Btn kind="ghost" onClick={() => setConfirm(false)}>Keep my save</Btn>
            <Btn kind="danger" onClick={() => { setConfirm(false); useGame.setState({ screen: 'create' }) }}>Continue to new game</Btn>
          </div>
        </Modal>
      )}
      {settings && (
        <div className="menu-settings" onClick={(e) => { if (e.target === e.currentTarget) setSettings(false) }}>
          <SettingsPanel onClose={() => setSettings(false)} />
        </div>
      )}
    </div>
  )
}
