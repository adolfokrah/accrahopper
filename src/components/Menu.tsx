'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { sfx } from '@/game/audio'
import { GAME_CONFIG, dayOf, formatMoney } from '@/game/config'
import { enter, signOut, useAccount } from '@/game/net/account'
import { readCloudSave, readDeviceSave, retireDeviceSave, saveNow, type LoadResult, type SaveEnvelope } from '@/game/save'
import { useGame } from '@/game/store'
import { Btn, Modal } from './kit'
import { SettingsPanel } from './SettingsPanel'

function SignIn() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const r = await enter(username.trim(), password)
    setBusy(false)
    if (!r.ok) {
      sfx('error')
      setError(r.error)
    } else sfx('start')
  }
  return (
    <form className="signin" onSubmit={submit}>
      <input className="text-input" aria-label="Username" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
        autoComplete="username" autoCapitalize="off" spellCheck={false} maxLength={16} required />
      <input className="text-input" aria-label="Password" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password" minLength={6} required />
      <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Entering…' : '🚀 Enter Accra'}</button>
      {error ? <div className="notice warn" role="alert">{error}</div> : <small className="muted">New here? Pick any username and password and you are in.</small>}
    </form>
  )
}

export function Menu() {
  const account = useAccount()
  const [save, setSave] = useState<LoadResult | null>(null)
  const [fromDevice, setFromDevice] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [howto, setHowto] = useState(false)
  const [settings, setSettings] = useState(false)
  const userId = account.user?.id
  useEffect(() => {
    setSave(null)
    if (!userId) return
    let live = true
    void readCloudSave().then((cloud) => {
      if (!live) return
      // first sign-in on a browser that has a pre-account save: offer to bring it along
      const device = cloud.status === 'none' ? readDeviceSave() : null
      setFromDevice(device?.status === 'ok')
      setSave(device?.status === 'ok' ? device : cloud)
    })
    return () => { live = false }
  }, [userId])
  const startNew = () => {
    sfx('click')
    if (save?.status === 'ok') setConfirm(true)
    else useGame.setState({ screen: 'create' })
  }
  const resume = (env: SaveEnvelope) => {
    sfx('start')
    useGame.getState().loadFromSave(env.game)
    if (fromDevice) void saveNow().then((ok) => ok && retireDeviceSave())
  }
  return (
    <div className="menu">
      <div className="menu-card">
        <div className="logo" aria-hidden>🏙️</div>
        <h1>{GAME_CONFIG.title}</h1>
        <p className="tagline">A life-sim in {GAME_CONFIG.cityName}. Work, eat, sleep, make friends and build a better home, alongside real players.</p>
        {account.status === 'checking' && <div className="menu-actions"><small className="muted">Connecting…</small></div>}
        {account.status === 'out' && <SignIn />}
        {account.status === 'in' && (
          <div className="menu-actions">
            {save === null ? (
              <small className="muted">Loading your life…</small>
            ) : (
              <>
                {save.status === 'ok' && (
                  <Btn onClick={() => resume(save.env)}>
                    ▶ Continue
                    <small className="btn-sub">
                      {save.env.game.profile?.name} · Day {dayOf(save.env.game.minutes)} · {formatMoney(save.env.game.money)}{fromDevice ? ' · from this device' : ''}
                    </small>
                  </Btn>
                )}
                <Btn kind={save.status === 'ok' ? 'soft' : 'primary'} onClick={startNew}>
                  {save.status === 'ok' ? '✨ New life' : '✨ Create your character'}
                </Btn>
              </>
            )}
            <div className="row center">
              <Btn small kind="ghost" onClick={() => setHowto(!howto)}>How to play</Btn>
              <Btn small kind="ghost" onClick={() => setSettings(true)}>⚙️ Settings</Btn>
            </div>
            <small className="muted signed-in">
              Signed in as <b>{account.user?.username}</b> · {account.live ? '🟢 Live with other players' : 'Solo for now'} ·{' '}
              <button className="linkish" onClick={() => void signOut()}>Sign out</button>
            </small>
          </div>
        )}
        {save?.status === 'invalid' && (
          <div className="notice warn">
            Your saved life could not be loaded ({save.reason}). Try again in a moment, or start a new life.
          </div>
        )}
        {howto && (
          <ul className="howto">
            <li>🖱️ <b>Move:</b> tap or click the ground. Or use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>.</li>
            <li>🏢 <b>Buildings:</b> tap one to see what you can do there.</li>
            <li>✋ <b>Camera:</b> drag to pan, scroll or pinch to zoom, 🎯 to find yourself.</li>
            <li>📱 <b>Phone:</b> jobs, skills, map, wallet and contacts.</li>
            <li>💾 <b>Saves:</b> automatic, to your account. Play on any device.</li>
            <li>🕰️ <b>One clock:</b> every player shares Accra's time. A game day takes 24 real minutes. While you are away, whatever you were doing finishes, and your needs and bills wait for you.</li>
          </ul>
        )}
        <p className="fineprint">Currency is fictional {GAME_CONFIG.currency.name}. Characters with an NPC tag are computer-controlled; everyone else you meet is a real player.</p>
      </div>
      {confirm && (
        <Modal label="Confirm new game">
          <h2>Start a new game?</h2>
          <p>You have a saved life ({save?.status === 'ok' ? save.env.game.profile?.name : ''}). It will be replaced once you start your new character.</p>
          <div className="row">
            <Btn kind="ghost" onClick={() => setConfirm(false)}>Keep my life</Btn>
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
