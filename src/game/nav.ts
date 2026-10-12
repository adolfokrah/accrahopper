import { DEST_BY_ID, OUTDOOR_KINDS, homeDestId } from './content'
import { goToTile, runtime } from './runtime'
import { useGame } from './store'
import { useUI } from './ui'
import { nearestWalkable } from './world'

/** True when the player can walk inside this destination. */
export function canEnter(id: string): boolean {
  const d = DEST_BY_ID[id]
  if (!d) return false
  if (d.kind === 'home') return true
  if (d.homeTier) return id === homeDestId(useGame.getState())
  return !OUTDOOR_KINDS.includes(d.kind)
}

/** Enter (or open) whatever building the player is standing at. */
export function enterHere(id: string) {
  if (canEnter(id)) useGame.getState().enterBuilding(id)
  else useUI.getState().selectDest(id, true)
}

/** Distance in tiles from where the player is (or the building they are in) to a destination. */
export function tilesTo(id: string): number {
  const s = useGame.getState()
  const d = DEST_BY_ID[id]
  const from = s.view === 'inside' && s.insideDest ? DEST_BY_ID[s.insideDest].door : s.view === 'home' ? DEST_BY_ID[homeDestId(s)].door : { x: s.player.x, z: s.player.z }
  return Math.hypot(from.x - d.door.x, from.z - d.door.z)
}

/** Walk to a destination door, then go inside (or open its panel). Far trips offer transport first. */
export function walkToDest(id: string, enter = true, walkOnly = false) {
  let s = useGame.getState()
  const d = DEST_BY_ID[id]
  if (!d) return
  if (s.activity) return useUI.getState().toast('Finish your current activity first', 'warn')
  if (!walkOnly && s.nearDest !== id && s.insideDest !== id && tilesTo(id) > 14) {
    useUI.setState({ travelTo: id })
    return
  }
  if (s.view === 'inside') {
    if (s.insideDest === id) return useUI.getState().selectDest(id, true)
    s.exitBuilding()
  } else if (s.view === 'home') {
    if (id === homeDestId(s)) return useUI.getState().setPanel('home')
    s.exitHome()
  }
  s = useGame.getState()
  if (s.view !== 'world') return
  const arrive = () => {
    useGame.getState().syncPlayer()
    if (enter) enterHere(id)
    else useUI.getState().selectDest(id, true)
  }
  if (s.nearDest === id) return arrive()
  const ok = goToTile(d.door.x, d.door.z, arrive)
  if (!ok) useUI.getState().toast('No route found', 'bad')
}

export function walkToPoint(x: number, z: number) {
  const s = useGame.getState()
  if (s.activity) return useUI.getState().toast('Finish your current activity first', 'warn')
  if (s.view !== 'world') return
  const t = nearestWalkable(Math.floor(x), Math.floor(z), 6)
  if (!t) return
  if (!goToTile(t.x, t.z)) useUI.getState().toast('Cannot get there from here', 'warn')
}

export function findMyCharacter() {
  runtime.cam.follow = true
  runtime.cam.snap = false
}
