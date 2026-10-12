import { BALANCE } from './config'
import { alongPath, approachZone, rideLanePath } from './lanes'
import { PLAYER_START, canStand, findPath, nearestWalkable } from './world'

/** Mutable per-frame state shared by renderers (kept outside React/Zustand for speed). */
export const runtime = {
  player: { x: PLAYER_START.x, z: PLAYER_START.z, rot: 0, moving: false, speed: 0 },
  path: [] as { x: number; z: number }[],
  marker: null as { x: number; z: number } | null,
  onArrive: null as null | (() => void),
  /** Run once when the player's current ride drops them off (e.g. walk on from the trotro station). */
  onRideEnd: null as null | (() => void),
  keys: { up: false, down: false, left: false, right: false },
  cam: {
    x: PLAYER_START.x, z: PLAYER_START.z, zoom: 36, follow: true, snap: true, yaw: Math.PI / 4, yawTarget: Math.PI / 4,
    /** Inside rooms/buildings: true while the camera frames an interior. */
    inside: false,
    /** Interior zoom multiplier (mouse wheel / pinch) and pan offset in room units. */
    inZoom: 1,
    inPan: { x: 0, z: 0 },
  },
  /** Walk target inside rooms and buildings (local room coordinates). */
  insideTarget: null as { x: number; z: number } | null,
  hoverDest: null as string | null,
  /** Pixels the world is shifted up so mobile bottom sheets do not cover the character. */
  uiShift: 0,
  /** Active vehicle ride: the route the car follows while the travel activity runs. */
  ride: null as null | { mode: 'trotro' | 'taxi' | 'ride' | 'okada' | 'pragia'; path: { x: number; z: number }[]; driver?: boolean; holding?: boolean },
  /** Ride camera: inside the vehicle or chasing it. */
  rideCam: 'inside' as 'inside' | 'chase',
  /** Real-time clock for traffic signals (seconds). */
  lightT: 0,
  /** Junction the current ride may cross on red (the player chose to run it). */
  runRedAt: -1,
}

/** Screen-relative ground directions for the current camera yaw. */
export function camBasis() {
  const y = runtime.cam.yaw
  return { fx: -Math.sin(y), fz: -Math.cos(y), rx: Math.cos(y), rz: -Math.sin(y) }
}
export function rotateCam(dir: 1 | -1) {
  runtime.cam.yawTarget += (dir * Math.PI) / 2
}
/** Camera-relative movement vector from WASD/arrow keys (unit length or zero). */
export function keyVector(): { x: number; z: number } {
  const k = runtime.keys
  const ix = (k.right ? 1 : 0) - (k.left ? 1 : 0)
  const iz = (k.up ? 1 : 0) - (k.down ? 1 : 0)
  if (!ix && !iz) return { x: 0, z: 0 }
  const b = camBasis()
  const x = b.rx * ix + b.fx * iz
  const z = b.rz * ix + b.fz * iz
  const l = Math.hypot(x, z) || 1
  return { x: x / l, z: z / l }
}

export const ZOOM_MIN = 16
export const ZOOM_MAX = 80

export function setZoom(z: number) {
  runtime.cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

export const IN_ZOOM_MIN = 0.6
export const IN_ZOOM_MAX = 2.6
/** Zoom by a factor on the map or inside a room (buttons, wheel, pinch). */
export function zoomBy(f: number) {
  const c = runtime.cam
  if (c.inside) c.inZoom = Math.min(IN_ZOOM_MAX, Math.max(IN_ZOOM_MIN, c.inZoom * f))
  else setZoom(c.zoom * f)
}
/** Free camera rotation (radians), e.g. from a mouse drag. */
export function turnCam(da: number) {
  runtime.cam.yaw += da
  runtime.cam.yawTarget = runtime.cam.yaw
}

/** Move the player along the ride route according to trip progress (0..1). */
export function placeOnRide(frac: number) {
  const r = runtime.ride
  if (!r || r.path.length < 2) return
  const at = alongPath(rideLanePath(r.path), frac)
  runtime.player.x = at.x
  runtime.player.z = at.z
  if (at.rot !== null) runtime.player.rot = at.rot
}

/** Should the ride wait at a red light? Looks just ahead along the lane path: if the car is about to
 *  enter a junction box (crosswalk or crossing) whose light is not green, stop before it. */
export function rideShouldHold(frac: number, lightAt: (j: number, axis: 'ns' | 'ew') => string, _junctionOf: (x: number, z: number) => number): boolean {
  const r = runtime.ride
  if (!r || r.path.length < 3) return false
  const lp = rideLanePath(r.path)
  if (lp.total < 1) return false
  const here = alongPath(lp, frac)
  if (approachZone(here.x, here.z) >= 0) return false
  for (const ahead of [0.35, 0.7, 1.05]) {
    const f = frac + ahead / lp.total
    if (f >= 1) return false
    const p = alongPath(lp, f)
    const j = approachZone(p.x, p.z)
    if (j < 0) continue
    if (runtime.runRedAt === j) return false
    const dx = p.x - here.x
    const dz = p.z - here.z
    const axis = Math.abs(dx) > Math.abs(dz) ? 'ew' : 'ns'
    return lightAt(j, axis) !== 'green'
  }
  return false
}

export function cancelPath() {
  runtime.path = []
  runtime.marker = null
  runtime.onArrive = null
}

export function teleport(x: number, z: number) {
  cancelPath()
  runtime.player.x = x
  runtime.player.z = z
  runtime.player.moving = false
  runtime.cam.snap = true
}

/** Request a path to a tile. Returns false when unreachable. */
export function goToTile(tx: number, tz: number, onArrive?: () => void): boolean {
  const target = nearestWalkable(tx, tz, 6)
  if (!target) return false
  const path = findPath(runtime.player.x, runtime.player.z, target.x, target.z)
  if (!path) return false
  runtime.path = path
  runtime.marker = path.length ? { x: target.x + 0.5, z: target.z + 0.5 } : null
  runtime.onArrive = onArrive ?? null
  runtime.cam.follow = true
  if (!path.length) {
    runtime.onArrive = null
    onArrive?.()
  }
  return true
}

const SQ = Math.SQRT1_2
function angleLerp(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * Math.min(1, t)
}

/** Advance the player one frame. `allowed` is false while busy (activity, menus, interior). */
export function stepMovement(dt: number, allowed: boolean) {
  const p = runtime.player
  if (!allowed) {
    p.moving = false
    p.speed = 0
    return
  }
  const kv = keyVector()
  let vx = 0
  let vz = 0
  if (kv.x || kv.z) {
    vx = kv.x
    vz = kv.z
    if (runtime.path.length) cancelPath()
    runtime.cam.follow = true
  } else if (runtime.path.length) {
    const t = runtime.path[0]
    const dx = t.x - p.x
    const dz = t.z - p.z
    const dist = Math.hypot(dx, dz)
    const step = BALANCE.walkSpeed * dt
    if (dist <= step) {
      p.x = t.x
      p.z = t.z
      runtime.path.shift()
      if (!runtime.path.length) {
        const cb = runtime.onArrive
        runtime.marker = null
        runtime.onArrive = null
        p.moving = false
        p.speed = 0
        cb?.()
        return
      }
    } else {
      vx = dx / dist
      vz = dz / dist
    }
  }
  if (vx || vz) {
    const step = BALANCE.walkSpeed * dt
    const nx = p.x + vx * step
    const nz = p.z + vz * step
    if (canStand(nx, p.z)) p.x = nx
    if (canStand(p.x, nz)) p.z = nz
    p.rot = angleLerp(p.rot, Math.atan2(vx, vz), dt * 14)
    p.moving = true
    p.speed = BALANCE.walkSpeed
  } else {
    p.moving = false
    p.speed = 0
  }
}
