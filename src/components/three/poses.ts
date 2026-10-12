import type { ActiveActivity, FurnitureType } from '@/game/types'
import type { Pose, Prop } from './Character'
import { shiftTaskDef } from '@/game/content'

export interface ActLook {
  pose: Pose
  prop?: Prop
  /** Walk between the layout's wander points while doing it. */
  wander?: boolean
}

/** How each activity looks when performed. Keys are activity ids (prefix before ':'). */
export const ACT_LOOK: Record<string, ActLook> = {
  // chop bar
  waakye: { pose: 'eat', prop: 'plate' }, banku: { pose: 'eat', prop: 'plate' }, kelewele: { pose: 'eat', prop: 'plate' }, sobolo: { pose: 'eat', prop: 'drink' },
  dishes: { pose: 'clean' },
  // market
  boli: { pose: 'snack', prop: 'plate' }, fruit: { pose: 'snack', prop: 'plate' }, browse: { pose: 'talk', wander: true },
  purewater: { pose: 'carry', prop: 'basket', wander: true }, obroni: { pose: 'cashier' }, phonefix: { pose: 'work', prop: 'phone' },
  haul: { pose: 'carry', prop: 'box', wander: true }, pickpocket: { pose: 'talk', wander: true },
  // office / training
  cowork: { pose: 'desk' }, course_comm: { pose: 'desk' }, course_cook: { pose: 'cook', prop: 'spoon' }, course_tech: { pose: 'desk' },
  // gym
  workout: { pose: 'lift', prop: 'dumbbell' }, yoga: { pose: 'kneel' }, gymshower: { pose: 'clean' },
  // club
  hangout: { pose: 'dance' }, livemusic: { pose: 'dance' }, mocktail: { pose: 'eat', prop: 'drink' }, npc_hangout: { pose: 'dance' },
  // wash
  wc: { pose: 'sit' }, washshower: { pose: 'clean' },
  // hospital
  consult: { pose: 'sit' }, pharmacy: { pose: 'talk' }, nhis: { pose: 'talk' }, checkup: { pose: 'sit' }, volunteer: { pose: 'clean', prop: 'broom', wander: true }, ward: { pose: 'lie' },
  // university
  enroll_cs: { pose: 'talk' }, enroll_bba: { pose: 'talk' }, enroll_culinary: { pose: 'talk' }, lecture: { pose: 'desk' }, library: { pose: 'read', prop: 'book' },
  // church
  service: { pose: 'pray' }, prayer: { pose: 'pray' }, choir: { pose: 'sing' }, wedding: { pose: 'cheer' },
  // park / police / court
  tour: { pose: 'talk', wander: true }, picnic: { pose: 'sit' }, watch: { pose: 'talk', wander: true }, payfine: { pose: 'talk' }, observe: { pose: 'sit' },
  // mall / bank / realty
  cinema: { pose: 'sit', prop: 'drink' }, foodcourt: { pose: 'eat', prop: 'plate' }, shopping: { pose: 'talk', wander: true }, ring: { pose: 'talk' },
  openaccount: { pose: 'talk' }, advice: { pose: 'desk' }, browsehomes: { pose: 'desk' },
  // beach
  swim: { pose: 'swim' }, horse: { pose: 'cheer' }, coconut: { pose: 'snack', prop: 'drink' }, beachfootball: { pose: 'run', prop: 'ball', wander: true },
  // jamestown
  lighttour: { pose: 'talk', wander: true }, boxing: { pose: 'box' }, oware: { pose: 'sit' }, porter: { pose: 'carry', prop: 'basket', wander: true },
  tourguide: { pose: 'talk', wander: true }, alleyrob: { pose: 'box' },
  // street crime
  snatch: { pose: 'talk' },
  petfeed: { pose: 'kneel' }, petplay: { pose: 'cheer' }, petwalk: { pose: 'talk' }, petgroom: { pose: 'clean' }, petvet: { pose: 'talk' }, phonesnatch: { pose: 'run' }, streetrob: { pose: 'box' },
  // new places
  zootour: { pose: 'talk', wander: true }, forestwalk: { pose: 'talk', wander: true }, waiter: { pose: 'snack', prop: 'plate', wander: true },
  vendor: { pose: 'carry', prop: 'basket', wander: true }, baggage: { pose: 'carry', prop: 'box', wander: true }, fiveaside: { pose: 'run', prop: 'ball', wander: true },
  match: { pose: 'cheer' }, arch: { pose: 'cheer' }, parade: { pose: 'cheer' }, hotelnight: { pose: 'lie' }, pool: { pose: 'swim' }, dining: { pose: 'eat', prop: 'plate' },
  show: { pose: 'cheer' }, sprayartist: { pose: 'dance' }, rehearsal: { pose: 'sit' }, ticket: { pose: 'talk' }, ticketvip: { pose: 'talk' }, panning: { pose: 'kneel' }, printcv: { pose: 'talk' }, netbrowse: { pose: 'desk' }, gaming: { pose: 'desk' }, buyfish: { pose: 'talk' }, harbourwalk: { pose: 'cheer' }, eveningclass: { pose: 'desk' }, ictclass: { pose: 'desk' }, sportsfield: { pose: 'run', wander: true }, wassce: { pose: 'study' }, cookclass: { pose: 'cook', prop: 'spoon' }, debate: { pose: 'talk' }, permit: { pose: 'talk' }, permitbribe: { pose: 'talk' }, title: { pose: 'talk' },
  drivetest: { pose: 'desk' }, licensebribe: { pose: 'talk' }, testdrive: { pose: 'drive' },
  // dates
  date: { pose: 'talk' }, spray: { pose: 'dance' }, popbottle: { pose: 'cheer', prop: 'drink' }, intimate: { pose: 'lie' }, hookup_m: { pose: 'dance' }, hookup: { pose: 'dance' },
  // jail / custody
  custody: { pose: 'sit' }, jail: { pose: 'sit' }, remand: { pose: 'sit' },
}

/** Job-specific work looks. */
export const WORK_LOOK: Record<string, ActLook> = {
  retail: { pose: 'cashier' },
  hospitality: { pose: 'cook', prop: 'spoon' },
  technology: { pose: 'desk' },
}

export function lookFor(a: ActiveActivity | null): ActLook | null {
  if (!a) return null
  if (a.kind === 'work' && a.ctx.career) {
    const cur = a.shift?.current
    const t = cur ? shiftTaskDef(a.ctx.career, cur.key) : null
    if (t) return { pose: t.pose as Pose, prop: t.prop as Prop | undefined, wander: t.wander }
    return WORK_LOOK[a.ctx.career] ?? { pose: 'work' }
  }
  const look = ACT_LOOK[a.defId.split(':')[0]]
  if (a.kind === 'event') return look ?? { pose: 'cheer' }
  return look ?? null
}

/** Where to stand relative to a piece of furniture (local space: +z is the front). */
export interface FurnUse {
  dx: number
  dz: number
  /** Facing angle in local space: 0 = facing out the front, PI = facing the furniture. */
  face: number
  pose: Pose
  prop?: Prop
  y?: number
}
const PI = Math.PI
export function furnitureUse(type: FurnitureType, actId: string): FurnUse {
  if (type.startsWith('bed_')) return { dx: 0.75, dz: 0, face: PI / 2, pose: 'lie', y: 0.36 }
  switch (type) {
    case 'toilet': return { dx: 0, dz: 0.05, face: 0, pose: 'sit', y: 0.0 }
    case 'shower':
    case 'shower_rain': return { dx: 0, dz: 0, face: 0, pose: 'clean' }
    case 'fridge': return actId === 'snack' ? { dx: 0, dz: 0.75, face: 0, pose: 'snack', prop: 'plate' } : { dx: 0, dz: 0.75, face: PI, pose: 'cook', prop: 'spoon' }
    case 'coalpot': return { dx: 0, dz: 0.7, face: PI, pose: 'cook', prop: 'spoon' }
    case 'stove': return { dx: 0, dz: 0.75, face: PI, pose: 'cook', prop: 'spoon' }
    case 'sofa': return { dx: 0, dz: 0.12, face: 0, pose: 'sit', prop: 'phone' }
    case 'tv': return { dx: 0, dz: 1.6, face: PI, pose: 'kneel' }
    case 'computer': return { dx: 0, dz: 0.62, face: PI, pose: 'desk' }
    case 'bookshelf': return { dx: 0, dz: 0.8, face: 0, pose: 'study', prop: 'book' }
    case 'armchair': return { dx: 0, dz: 0.08, face: 0, pose: 'sit', prop: 'phone' }
    case 'sectional': return actId === 'host' ? { dx: 0, dz: 0.2, face: 0, pose: 'sit', prop: 'drink' } : { dx: -0.4, dz: 0.2, face: 0, pose: 'sit', prop: 'phone' }
    case 'massage_chair': return { dx: 0, dz: 0.05, face: 0, pose: 'sit' }
    case 'dining_set': return { dx: 0, dz: 0.75, face: PI, pose: 'eat', prop: 'plate' }
    case 'kitchen_island': return { dx: 0, dz: 0.75, face: PI, pose: 'cook', prop: 'spoon' }
    case 'espresso': return { dx: 0, dz: 0.7, face: PI, pose: 'snack', prop: 'drink' }
    case 'bar_cabinet': return { dx: 0, dz: 0.8, face: PI, pose: 'snack', prop: 'drink' }
    case 'bathtub':
    case 'jacuzzi': return { dx: 0, dz: 0, face: 0, pose: 'sit', y: 0.05 }
    case 'piano': return { dx: 0, dz: 0.85, face: PI, pose: 'desk' }
    case 'console': return { dx: 0, dz: 1.4, face: PI, pose: 'sit', prop: 'phone' }
    case 'home_cinema': return { dx: 0, dz: 2.0, face: PI, pose: 'sit', prop: 'drink' }
    case 'treadmill': return { dx: 0, dz: 0, face: PI, pose: 'run', y: 0.12 }
    case 'vanity': return { dx: 0, dz: 0.6, face: PI, pose: 'clean' }
    case 'wardrobe': return { dx: 0, dz: 0.8, face: PI, pose: 'talk' }
    default: return { dx: 0, dz: 0.8, face: PI, pose: 'talk' }
  }
}
