import type {
  ActivityDef,
  Appearance,
  CareerId,
  DistrictId,
  FurnitureType,
  HomeTier,
  Lifestyle,
  Needs,
  PetType,
  SkillId,
  TraitId,
} from './types'

/* ------------------------------------------------------------------ */
/* Character customisation                                             */
/* ------------------------------------------------------------------ */
export const SKIN_TONES = ['#f3cfa6', '#e2b183', '#c68a56', '#8d5a34', '#6a4026', '#46291a', '#a86b40', '#5a3520']
export const HAIRSTYLES = ['Short crop', 'Afro', 'Braids', 'Bald', 'Top bun', 'Headwrap', 'Dreadlocks', 'Cornrows', 'High puff', 'Twists', 'Low fade']
export const HAIR_COLORS = ['#1c1a1a', '#3a2418', '#7a4a22', '#c9892f', '#b83a3a', '#6a3aa0', '#d9d4c8']
export const BODY_TYPES = ['Slim', 'Average', 'Broad']
export const SEXES = ['Male', 'Female']
export const PRONOUNS: { id: 'he' | 'she' | 'they'; label: string }[] = [{ id: 'he', label: 'He/him' }, { id: 'she', label: 'She/her' }, { id: 'they', label: 'They/them' }]
export const BEARDS = ['None', 'Stubble', 'Goatee', 'Full beard']
export interface OutfitDef {
  name: string
  bottom: string
  style: 'tee' | 'smart' | 'ankara' | 'sport' | 'jersey' | 'kaftan' | 'hoodie' | 'dress'
}
export const OUTFITS: OutfitDef[] = [
  { name: 'Street casual', bottom: '#3b5a8c', style: 'tee' },
  { name: 'Smart office', bottom: '#2c3442', style: 'smart' },
  { name: 'Kente cloth', bottom: '#f4d9a6', style: 'ankara' },
  { name: 'Sporty set', bottom: '#2f3b52', style: 'sport' },
  { name: 'Football jersey', bottom: '#f4f4f4', style: 'jersey' },
  { name: 'Kaftan', bottom: '#e9dcc0', style: 'kaftan' },
  { name: 'Hoodie & jeans', bottom: '#34507a', style: 'hoodie' },
  { name: 'Office dress', bottom: '#2c3442', style: 'dress' },
]
export const OUTFIT_COLORS = ['#e0524a', '#2e86de', '#f1b82d', '#2fa866', '#8e5bd0', '#f0ede6', '#ee7d2d', '#1b1b1b', '#7a1f3d', '#0f766e']
export const ACCESSORIES = ['None', 'Glasses', 'Cap', 'Gold chain', 'Backpack', 'Headphones', 'Sunglasses', 'Wristwatch', 'Earrings', 'Beanie', 'Kufi cap']
/** A random look for passers-by and staff. */
export function randomAppearance(r: () => number = Math.random): Appearance {
  const pick = (n: number) => Math.floor(r() * n)
  const out: Appearance = {
    skin: pick(SKIN_TONES.length), hair: pick(HAIRSTYLES.length), hairColor: r() < 0.8 ? pick(3) : pick(HAIR_COLORS.length),
    outfit: pick(OUTFITS.length), outfitColor: pick(OUTFIT_COLORS.length), accessory: r() < 0.6 ? 0 : pick(ACCESSORIES.length),
    body: pick(BODY_TYPES.length), beard: 0, sex: r() < 0.5 ? 1 : 0,
  }
  if (!out.sex && r() > 0.6) out.beard = pick(BEARDS.length)
  return out
}

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 3,
  hair: 0,
  hairColor: 0,
  outfit: 0,
  outfitColor: 1,
  accessory: 0,
  body: 1,
  beard: 0,
}

/* ------------------------------------------------------------------ */
/* Traits                                                              */
/* ------------------------------------------------------------------ */
export interface TraitDef {
  id: TraitId
  name: string
  emoji: string
  blurb: string
  wage?: number
  price?: number
  workEnergy?: number
  socialGain?: number
  foodGain?: number
  skillXp?: Partial<Record<SkillId, number>>
  decay?: Partial<Record<keyof Needs, number>>
  nightEnergy?: number
}
export const TRAITS: Record<TraitId, TraitDef> = {
  hardworking: { id: 'hardworking', name: 'Hardworking', emoji: '💼', blurb: '+10% wages, but shifts tire you 15% more.', wage: 1.1, workEnergy: 1.15 },
  charming: { id: 'charming', name: 'Charming', emoji: '😄', blurb: '+25% social gains and faster friendships.', socialGain: 1.25 },
  foodie: { id: 'foodie', name: 'Foodie', emoji: '🍛', blurb: 'Meals fill you 20% more; cooking XP +25%.', foodGain: 1.2, skillXp: { cooking: 1.25 } },
  techie: { id: 'techie', name: 'Techie', emoji: '💻', blurb: 'Technology XP +25%.', skillXp: { technology: 1.25 } },
  frugal: { id: 'frugal', name: 'Frugal', emoji: '🪙', blurb: 'Everything you buy costs 10% less.', price: 0.9 },
  tidy: { id: 'tidy', name: 'Tidy', emoji: '🧼', blurb: 'Hygiene drains 25% slower.', decay: { hygiene: 0.75 } },
  sporty: { id: 'sporty', name: 'Sporty', emoji: '🏃', blurb: 'Fitness XP +25%; energy drains 5% slower.', skillXp: { fitness: 1.25 }, decay: { energy: 0.95 } },
  nightowl: { id: 'nightowl', name: 'Night owl', emoji: '🦉', blurb: 'Energy drains 25% slower between 8pm and 6am.', nightEnergy: 0.75 },
}
export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[]

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */
export const SKILLS: Record<SkillId, { name: string; emoji: string; blurb: string }> = {
  communication: { name: 'Communication', emoji: '🗣️', blurb: 'Unlocks supervisor and management roles in Retail.' },
  cooking: { name: 'Cooking', emoji: '🍳', blurb: 'Better home meals and Hospitality promotions.' },
  technology: { name: 'Technology', emoji: '💻', blurb: 'Required for every Technology career step.' },
  fitness: { name: 'Fitness', emoji: '💪', blurb: 'Each level cuts shift tiredness by 3%.' },
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */
export type DestKind =
  | 'home'
  | 'food'
  | 'market'
  | 'office'
  | 'training'
  | 'gym'
  | 'lounge'
  | 'stop'
  | 'wash'
  | 'hospital'
  | 'school'
  | 'police'
  | 'court'
  | 'mall'
  | 'bank'
  | 'church'
  | 'realty'
  | 'beach'
  | 'park'
  | 'landmark'
  | 'plot'
  | 'hotel'
  | 'stadium'
  | 'square'
  | 'arena'
  | 'mine'
  | 'cafe'
  | 'harbour'
  | 'zoo'
  | 'gov'
  | 'dealer'

export interface Destination {
  id: string
  name: string
  kind: DestKind
  district: DistrictId
  /** Neighbourhood id (see AREAS). */
  area: string
  emoji: string
  x: number
  z: number
  w: number
  d: number
  door: { x: number; z: number }
  color: string
  accent: string
  hours: [number, number]
  blurb: string
  workCareer?: CareerId
  homeTier?: HomeTier
  npcs: string[]
}

/* ---------------------------- city grid ---------------------------- */
/** Grid street layout: 4-wide streets (two lanes each way) every 18 tiles; blocks are 14x14 inside, so buildings have room to breathe. */
export const STREET_START = 10
export const STREET_GAP = 18
/** Map size grows with the street spacing (the city was laid out for 240x172 at a 14-tile gap). */
export const MAP_W = Math.round(10 + 230 * (STREET_GAP / 14))
export const MAP_H = Math.round(10 + 162 * (STREET_GAP / 14))
export const STREET_W = 4
/** Extra block rings added west and north of the original city. */
export const RING = 2
/** Map an x/z from the original 12-tile layout into the current grid. */
export const OX = (x: number) => Math.round((x - 10) * (STREET_GAP / 12) + 10 + STREET_GAP * RING)
export const OZ = OX
export const mapXf = (x: number) => (x - 10) * (STREET_GAP / 12) + 10 + STREET_GAP * RING
/** Inverse: current grid -> original layout coordinate (for shapes like the coastline). */
export const unmapX = (x: number) => (x - 10 - STREET_GAP * RING) * (12 / STREET_GAP) + 10

/* ---------------------------- Accra neighbourhoods ---------------------------- */
export type AreaStyle = 'dense' | 'business' | 'upscale' | 'campus' | 'forest' | 'industrial' | 'coastal'
export interface AreaDef {
  id: string
  name: string
  x0: number
  z0: number
  x1: number
  z1: number
  style: AreaStyle
  district: DistrictId
  blurb: string
  /** Part of the city: north, south (coast), east, west or central. */
  region: RegionId
}
export type RegionId = 'north' | 'south' | 'east' | 'west' | 'central'
/** Rough Accra layout: north at the top (low z), the Gulf of Guinea to the south. */
export const AREAS: AreaDef[] = [
  { id: 'madina', name: 'Madina', x0: OX(96), z0: OZ(0), x1: OX(132) - 1, z1: OZ(23) - 1, style: 'dense', district: 'residential', blurb: 'Busy market town in the north.', region: 'north' },
  { id: 'legon', name: 'Legon', x0: OX(58), z0: OZ(0), x1: OX(96) - 1, z1: OZ(23) - 1, style: 'campus', district: 'commercial', blurb: 'University town, leafy and calm.', region: 'north' },
  { id: 'achimota', name: 'Achimota', x0: OX(0), z0: OZ(0), x1: OX(58) - 1, z1: OZ(35) - 1, style: 'forest', district: 'residential', blurb: 'Forest, zoo and Achimota Mall.', region: 'north' },
  { id: 'eastlegon', name: 'East Legon', x0: OX(96), z0: OZ(23), x1: OX(142) - 1, z1: OZ(47) - 1, style: 'upscale', district: 'waterfront', blurb: 'Gated villas and new money.', region: 'east' },
  { id: 'airport', name: 'Airport City', x0: OX(58), z0: OZ(23), x1: OX(96) - 1, z1: OZ(47) - 1, style: 'business', district: 'commercial', blurb: 'Glass towers, Accra Mall and AICC.', region: 'central' },
  { id: 'spintex', name: 'Spintex', x0: OX(142), z0: OZ(0), x1: OX(161) - 1, z1: OZ(59) - 1, style: 'industrial', district: 'commercial', blurb: 'Factories, warehouses and Palace Mall.', region: 'east' },
  { id: 'kaneshie', name: 'Kaneshie', x0: OX(0), z0: OZ(35), x1: OX(34) - 1, z1: OZ(71) - 1, style: 'dense', district: 'residential', blurb: 'Crowded, lively, cheap.', region: 'west' },
  { id: 'circle', name: 'Circle', x0: OX(34), z0: OZ(35), x1: OX(46) - 1, z1: OZ(59) - 1, style: 'dense', district: 'commercial', blurb: 'Kwame Nkrumah Circle, the trotro heart of Accra.', region: 'central' },
  { id: 'nima', name: 'Nima', x0: OX(46), z0: OZ(35), x1: OX(70) - 1, z1: OZ(59) - 1, style: 'dense', district: 'residential', blurb: 'Tight streets, big community.', region: 'central' },
  { id: 'ridge', name: 'Ridge & Cantonments', x0: OX(70), z0: OZ(47), x1: OX(96) - 1, z1: OZ(71) - 1, style: 'upscale', district: 'waterfront', blurb: 'Embassies, offices and leafy avenues.', region: 'central' },
  { id: 'labadi', name: 'Labadi', x0: OX(96), z0: OZ(47), x1: OX(118) - 1, z1: OZ(101) - 1, style: 'coastal', district: 'waterfront', blurb: 'Beaches, hotels and La town.', region: 'south' },
  { id: 'teshie', name: 'Teshie & Nungua', x0: OX(118), z0: OZ(47), x1: OX(161) - 1, z1: OZ(101) - 1, style: 'coastal', district: 'residential', blurb: 'Fishing towns along the coast.', region: 'east' },
  { id: 'osu', name: 'Osu', x0: OX(70), z0: OZ(71), x1: OX(96) - 1, z1: OZ(111) - 1, style: 'business', district: 'commercial', blurb: 'Oxford Street, nightlife and chop bars.', region: 'south' },
  { id: 'central', name: 'Makola', x0: OX(46), z0: OZ(59), x1: OX(70) - 1, z1: OZ(111) - 1, style: 'business', district: 'commercial', blurb: 'Makola, the courts and Black Star Square.', region: 'central' },
  { id: 'jamestown', name: 'Jamestown', x0: OX(34), z0: OZ(59), x1: OX(46) - 1, z1: OZ(111) - 1, style: 'coastal', district: 'residential', blurb: 'Old Accra: lighthouse, boxing and canoes.', region: 'south' },
  { id: 'korlebu', name: 'Korle Bu & Dansoman', x0: OX(0), z0: OZ(71), x1: OX(34) - 1, z1: OZ(111) - 1, style: 'dense', district: 'residential', blurb: 'The big hospital and quiet suburbs.', region: 'west' },
  // new outer districts (north, west and east rings)
  { id: 'ofankor', name: 'Ofankor & Pokuase', x0: 0, z0: 0, x1: OX(58) - 1, z1: OZ(0) - 1, style: 'dense', district: 'residential', blurb: 'Northern suburbs on the Kumasi road.', region: 'north' },
  { id: 'dome', name: 'Dome & Kwabenya', x0: OX(58), z0: 0, x1: OX(96) - 1, z1: OZ(0) - 1, style: 'dense', district: 'residential', blurb: 'Busy market town north of Legon.', region: 'north' },
  { id: 'adenta', name: 'Adenta', x0: OX(96), z0: 0, x1: OX(142) - 1, z1: OZ(0) - 1, style: 'upscale', district: 'residential', blurb: 'New estates and the Adenta barrier.', region: 'north' },
  { id: 'ashaiman', name: 'Ashaiman', x0: OX(142), z0: 0, x1: 999, z1: OZ(0) - 1, style: 'dense', district: 'residential', blurb: 'Crowded, lively and cheap.', region: 'east' },
  { id: 'lapaz', name: 'Lapaz & Abeka', x0: 0, z0: OZ(0), x1: OX(0) - 1, z1: OZ(58) - 1, style: 'dense', district: 'commercial', blurb: 'Street markets and the N1 interchange.', region: 'west' },
  { id: 'mallam', name: 'Mallam & Odorkor', x0: 0, z0: OZ(58), x1: OX(0) - 1, z1: OZ(90) - 1, style: 'dense', district: 'residential', blurb: 'Mallam junction and big lorry parks.', region: 'west' },
  { id: 'weija', name: 'Weija & Kasoa road', x0: 0, z0: OZ(90), x1: OX(0) - 1, z1: 999, style: 'coastal', district: 'residential', blurb: 'The lagoon, West Hills Mall and the coast road.', region: 'west' },
  { id: 'sakumono', name: 'Sakumono', x0: OX(161), z0: OZ(0), x1: 999, z1: OZ(47) - 1, style: 'upscale', district: 'waterfront', blurb: 'Golf course estates and the Ramsar wetland.', region: 'east' },
  { id: 'tema', name: 'Tema', x0: OX(161), z0: OZ(47), x1: 999, z1: 999, style: 'industrial', district: 'commercial', blurb: 'Harbour city: ships, factories and Community 1.', region: 'east' },
]
export const AREA_BY_ID: Record<string, AreaDef> = Object.fromEntries(AREAS.map((a) => [a.id, a]))
export function areaAt(x: number, z: number): AreaDef {
  return AREAS.find((a) => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1) ?? AREAS[0]
}

/* ------------------------------ road network ------------------------------ */
/** motorway / highway: 6 tiles (three lanes each way); avenue / street: 4 tiles; inner road: 2 tiles (one lane each way).
 *  dirt is an inner road that is not paved. */
export type RoadClass = 'motorway' | 'highway' | 'avenue' | 'street' | 'dirt'
/** Named roads by street origin; everything else is a town street or an inner road. */
export const ROAD_CLASS = {
  // N1 George W. Bush Hwy / Tema Motorway, N6 Kumasi road, Kaneshie Rd, Ring Road, Labadi Rd
  h: { [OZ(34)]: 'motorway', [STREET_START + STREET_GAP]: 'highway', [OZ(46)]: 'avenue', [OZ(58)]: 'avenue', [OZ(70)]: 'avenue' } as Record<number, RoadClass>,
  // Liberation Road, Kasoa road, Oxford St, Independence Ave, Spintex side
  v: { [OX(82)]: 'highway', [STREET_START + STREET_GAP]: 'highway', [OX(70)]: 'avenue', [OX(58)]: 'avenue', [OX(118)]: 'avenue' } as Record<number, RoadClass>,
}
/** Every third unnamed street is a narrow inner road. */
export const isInnerRoad = (axis: 'h' | 'v', r: number) => !ROAD_CLASS[axis][r] && Math.round((r - STREET_START) / STREET_GAP) % 3 === 1
/** First and last tile of a street. Big roads grow away from the doors that face them (south for east-west roads, west for north-south ones). */
export function streetSpan(axis: 'h' | 'v', r: number): [number, number] {
  const c = ROAD_CLASS[axis][r]
  if (c === 'motorway' || c === 'highway') return axis === 'h' ? [r, r + 5] : [r - 2, r + 3]
  if (isInnerRoad(axis, r)) return [r + 1, r + 2]
  return [r, r + STREET_W - 1]
}
/** Shrink a footprint so it never sits on a widened road, keeping its door on the pavement. */
function clearOfRoads(pos: { x: number; z: number; w: number; d: number }) {
  let { x, z, w, d } = pos
  const near = (lo: number, hi: number) => {
    const out: number[] = []
    for (let r = STREET_START; r <= hi + STREET_GAP; r += STREET_GAP) if (r + STREET_GAP >= lo - 6) out.push(r)
    return out
  }
  for (const r of near(x, x + w)) {
    const [a, b] = streetSpan('v', r)
    if (x > b || x + w - 1 < a) continue
    if (x < a) w = a - x
    else { w -= b + 1 - x; x = b + 1 }
  }
  for (const r of near(z, z + d)) {
    const [a, b] = streetSpan('h', r)
    if (z > b || z + d - 1 < a) continue
    if (z < a) d = a - 1 - z
    else { d -= b + 1 - z; z = b + 1 }
  }
  return { x, z, w: Math.max(2, w), d: Math.max(2, d) }
}

/** The Gulf of Guinea coastline (z of the waterline) at a given x (shape kept from the original layout). */
const coastOld = (x: number) => 112 - 0.2 * x + 1.5 * Math.sin(x / 9)
export const coastZ = (x: number) => mapXf(coastOld(unmapX(x)))
/** Korle Lagoon. */
export const LAGOON = { x: mapXf(30), z: mapXf(89.5), r: 3.5 * (STREET_GAP / 12) }

/** Footprint whose door opens onto the sidewalk above the next street south.
 *  c/r are block columns/rows of the original city; the two outer rings (west/north) use negative indexes. */
function at(c: number, r: number, w: number, d: number, xoff = 0) {
  return { x: STREET_START + STREET_W + STREET_GAP * (c + RING) + xoff, z: STREET_START + STREET_GAP * (r + RING + 1) - 1 - d, w, d }
}

type DestInput = Omit<Destination, 'door' | 'npcs' | 'district' | 'x' | 'z' | 'w' | 'd'> & { npcs?: string[]; pos: { x: number; z: number; w: number; d: number } }
const dest = (d: DestInput): Destination => {
  const { pos: raw, ...rest } = d
  const pos = clearOfRoads(raw)
  return {
    ...rest,
    ...pos,
    district: AREA_BY_ID[d.area]?.district ?? 'residential',
    npcs: d.npcs ?? [],
    door: { x: pos.x + Math.floor(pos.w / 2), z: pos.z + pos.d },
  }
}

export const DESTINATIONS: Destination[] = [
  // Nima (start)
  dest({ id: 'home_room', name: "Auntie Akosua's Compound", kind: 'home', area: 'nima', emoji: '🏠', pos: at(3, 3, 6, 5, 0), color: '#f2b98f', accent: '#c8553d', hours: [0, 24], blurb: 'A cosy rented room in a lively family compound house.', homeTier: 'room', npcs: ['akosua'] }),
  dest({ id: 'wash', name: 'Nima Wash House', kind: 'wash', area: 'nima', emoji: '🚿', pos: at(3, 3, 3, 3, 7), color: '#a5d8f3', accent: '#2f80c2', hours: [0, 24], blurb: 'Clean public toilets and showers for a small fee.' }),
  dest({ id: 'foodstall', name: "Auntie Esi's Chop Bar", kind: 'food', area: 'nima', emoji: '🍲', pos: at(4, 3, 5, 4, 0), color: '#f6d365', accent: '#ce1126', hours: [6, 24], blurb: 'Waakye, banku and tilapia, kelewele. The best chop bar in Nima.', npcs: ['kwame'] }),
  dest({ id: 'stop_res', name: 'Nima Trotro Station', kind: 'stop', area: 'nima', emoji: '🚐', pos: at(4, 3, 4, 3, 6), color: '#cfc8b8', accent: '#fcd116', hours: [0, 24], blurb: 'Trotros to every corner of Accra.' }),
  dest({ id: 'church', name: 'Nima Community Church', kind: 'church', area: 'nima', emoji: '⛪', pos: at(3, 2, 6, 6, 2), color: '#f7f3ea', accent: '#2e5f8a', hours: [5, 23], blurb: 'Sunday service, choir practice and weddings.', npcs: ['asante'] }),
  // Circle
  dest({ id: 'stop_com', name: 'Kwame Nkrumah Circle Station', kind: 'stop', area: 'circle', emoji: '🚌', pos: at(2, 3, 8, 5, 1), color: '#59606e', accent: '#ce1126', hours: [0, 24], blurb: '"Circle! Circle!" The busiest trotro hub in Ghana.' }),
  dest({ id: 'training', name: 'Bright Future Institute', kind: 'training', area: 'circle', emoji: '📚', pos: at(2, 2, 8, 6, 1), color: '#b8e0a5', accent: '#006b3f', hours: [7, 22], blurb: 'Short courses to level up your skills.', npcs: ['mensah'] }),
  // Kaneshie / Korle Bu
  dest({ id: 'market_kaneshie', name: 'Kaneshie Market', kind: 'market', area: 'kaneshie', emoji: '🧺', pos: at(0, 3, 8, 6, 1), color: '#ffb085', accent: '#ce1126', hours: [6, 21], blurb: 'Three floors of everything, cheaper than Makola.' }),
  dest({ id: 'stop_kaneshie', name: 'Kaneshie Station', kind: 'stop', area: 'kaneshie', emoji: '🚏', pos: at(1, 3, 7, 4, 1), color: '#d9c9a8', accent: '#006b3f', hours: [0, 24], blurb: 'Trotros west to Kasoa and beyond.' }),
  dest({ id: 'hospital', name: 'Korle Bu Teaching Hospital', kind: 'hospital', area: 'korlebu', emoji: '🏥', pos: at(1, 5, 9, 8, 0), color: '#f4f6f8', accent: '#e0524a', hours: [0, 24], blurb: 'Doctors, nurses and a pharmacy. Register for NHIS to pay less.', npcs: ['ama'] }),
  dest({ id: 'plot_dansoman', name: 'Plot, Dansoman', kind: 'plot', area: 'korlebu', emoji: '🏗️', pos: at(0, 5, 3, 5, 3), color: '#c9a27a', accent: '#8a5a2b', hours: [0, 24], blurb: 'Affordable land in a quiet suburb.', homeTier: 'house' }),
  // Achimota
  dest({ id: 'mall_achimota', name: 'Achimota Mall', kind: 'mall', area: 'achimota', emoji: '🛒', pos: at(1, 1, 9, 7, 0), color: '#e6eef5', accent: '#2fa866', hours: [9, 22], blurb: 'Shops, cinema and food court on the N1.' }),
  dest({ id: 'zoo', name: 'Accra Zoo', kind: 'zoo', area: 'achimota', emoji: '🦒', pos: at(2, 1, 8, 7, 1), color: '#8fbf6a', accent: '#6b4423', hours: [8, 18], blurb: 'Lions, monkeys and crocodiles in Achimota Forest.' }),
  // Legon
  dest({ id: 'university', name: 'University of Ghana, Legon', kind: 'school', area: 'legon', emoji: '🎓', pos: at(5, 0, 8, 9, 0), color: '#c9a27a', accent: '#7a1f2b', hours: [7, 22], blurb: 'Enrol in a degree. Graduates earn 20% more in their field.', npcs: ['danso'] }),
  dest({ id: 'upsa', name: 'UPSA', kind: 'school', area: 'legon', emoji: '🏫', pos: at(6, 0, 8, 7, 1), color: '#dfe7f2', accent: '#1f3a8a', hours: [7, 22], blurb: 'University of Professional Studies.' }),
  // Madina
  dest({ id: 'market_madina', name: 'Madina Market', kind: 'market', area: 'madina', emoji: '🧺', pos: at(8, 0, 8, 6, 1), color: '#ffcf7a', accent: '#2fa866', hours: [6, 21], blurb: 'Fresh food, phones and fabric.' }),
  dest({ id: 'stop_madina', name: 'Madina Station', kind: 'stop', area: 'madina', emoji: '🚐', pos: at(7, 0, 7, 5, 1), color: '#5a6170', accent: '#2fa866', hours: [0, 24], blurb: 'Trotros to Legon, Circle and Tema.' }),
  dest({ id: 'plot_madina', name: 'Plot, Madina Estates', kind: 'plot', area: 'madina', emoji: '🏗️', pos: at(9, 0, 3, 5, 4), color: '#c9a27a', accent: '#8a5a2b', hours: [0, 24], blurb: 'Growing area, fair prices.', homeTier: 'house' }),
  // Airport City
  dest({ id: 'office', name: 'Airport City Tech Hub', kind: 'office', area: 'airport', emoji: '🏢', pos: at(5, 1, 7, 9, 1), color: '#74b9ff', accent: '#0a3d62', hours: [7, 22], blurb: 'Glass offices where Accra startups ship software.', npcs: ['kofi'] }),
  dest({ id: 'arena', name: 'Accra International Conference Centre', kind: 'arena', area: 'airport', emoji: '🏛️', pos: at(6, 1, 10, 9, 0), color: '#efe6d2', accent: '#b5651d', hours: [10, 24], blurb: 'AICC: concerts and live shows every night from 8pm. Buy tickets at the box office.' }),
  dest({ id: 'mall', name: 'Accra Mall', kind: 'mall', area: 'airport', emoji: '🛒', pos: at(5, 2, 8, 6, 0), color: '#dfe9f2', accent: '#e0524a', hours: [9, 23], blurb: 'Shops, cinema, food court and jewellers.' }),
  dest({ id: 'hotel_marriott', name: 'Accra Marriott Hotel', kind: 'hotel', area: 'airport', emoji: '🏨', pos: at(6, 2, 7, 6, 1), color: '#f4f1ea', accent: '#8a6a3f', hours: [0, 24], blurb: 'Luxury rooms, pool and fine dining.' }),
  // East Legon & Spintex
  dest({ id: 'home_premium', name: 'East Legon Villa', kind: 'home', area: 'eastlegon', emoji: '🏡', pos: at(7, 1, 8, 7, 0), color: '#f4f1ea', accent: '#2c7da0', hours: [0, 24], blurb: 'A sleek gated villa with a rooftop terrace.', homeTier: 'premium' }),
  dest({ id: 'plot_eastlegon', name: 'Plot, East Legon', kind: 'plot', area: 'eastlegon', emoji: '🏗️', pos: at(8, 1, 3, 5, 1), color: '#c9a27a', accent: '#8a5a2b', hours: [0, 24], blurb: 'Prime land. Watch out for land guards.', homeTier: 'house' }),
  dest({ id: 'plot_trassaco', name: 'Plot, Trassaco Valley', kind: 'plot', area: 'eastlegon', emoji: '🏗️', pos: at(9, 1, 3, 5, 1), color: '#c9a27a', accent: '#8a5a2b', hours: [0, 24], blurb: 'The most expensive land in Accra.', homeTier: 'house' }),
  dest({ id: 'gym', name: 'East Legon FitHub Gym', kind: 'gym', area: 'eastlegon', emoji: '🏋️', pos: at(8, 2, 8, 6, 0), color: '#ffb35c', accent: '#c2410c', hours: [5, 24], blurb: 'Weights, classes and showers.', npcs: ['yaw'] }),
  dest({ id: 'mall_palace', name: 'Palace Mall', kind: 'mall', area: 'eastlegon', emoji: '🛍️', pos: at(9, 2, 9, 6, 0), color: '#f3e6d4', accent: '#8e5bd0', hours: [9, 22], blurb: 'Big supermarket and shops on Spintex Road.' }),
  dest({ id: 'dealer', name: 'Spintex Motors', kind: 'dealer', area: 'spintex', emoji: '🏍️', pos: at(11, 2, 9, 6, 0), color: '#e3e7ee', accent: '#e0524a', hours: [8, 19], blurb: 'Buy or rent okadas, cars and trotros.' }),
  dest({ id: 'plot_spintex', name: 'Plot, Spintex', kind: 'plot', area: 'spintex', emoji: '🏗️', pos: at(11, 3, 3, 5, 2), color: '#c9a27a', accent: '#8a5a2b', hours: [0, 24], blurb: 'Good value near the factories.', homeTier: 'house' }),
  // Ridge & Cantonments
  dest({ id: 'apartment', name: 'Cantonments Court Apartments', kind: 'home', area: 'ridge', emoji: '🏢', pos: at(5, 3, 7, 8, 0), color: '#f7e7a9', accent: '#3aa6a0', hours: [0, 24], blurb: 'Bright apartments with a proper kitchen.', homeTier: 'apartment' }),
  dest({ id: 'bank', name: 'Gold Coast Bank', kind: 'bank', area: 'ridge', emoji: '🏦', pos: at(6, 3, 5, 6, 0), color: '#f3ecd9', accent: '#b8860b', hours: [8, 18], blurb: 'Open a savings account. Money in the bank cannot be stolen.', npcs: ['kwesi'] }),
  dest({ id: 'realty', name: 'Accra Realty', kind: 'realty', area: 'ridge', emoji: '🏘️', pos: at(6, 3, 4, 5, 6), color: '#e3f1e8', accent: '#2f8a5a', hours: [8, 20], blurb: 'Buy and sell land, houses and upgrades.' }),
  dest({ id: 'lands', name: 'Lands Commission', kind: 'gov', area: 'ridge', emoji: '📜', pos: at(5, 4, 5, 6, 0), color: '#efe6d2', accent: '#006b3f', hours: [8, 17], blurb: 'Building permits and land titles. Expect queues.' }),
  dest({ id: 'dvla', name: 'DVLA Office', kind: 'gov', area: 'ridge', emoji: '🪪', pos: at(5, 4, 3, 5, 5), color: '#e3e9f1', accent: '#1f3a8a', hours: [8, 17], blurb: 'Driving tests and licences.' }),
  dest({ id: 'hospital_37', name: '37 Military Hospital', kind: 'hospital', area: 'ridge', emoji: '🏥', pos: at(6, 4, 8, 7, 1), color: '#eef3ea', accent: '#3f6b3a', hours: [0, 24], blurb: 'Big military hospital near the airport road.' }),
  // Central Accra & Jamestown
  dest({ id: 'police', name: 'Accra Central Police', kind: 'police', area: 'central', emoji: '🚓', pos: at(4, 4, 5, 6, 0), color: '#dfe7f2', accent: '#1f3a8a', hours: [0, 24], blurb: 'Report crimes, volunteer for neighbourhood watch. Cells at the back.', npcs: ['boateng'] }),
  dest({ id: 'court', name: 'Accra High Court', kind: 'court', area: 'central', emoji: '⚖️', pos: at(4, 4, 5, 6, 5), color: '#efe6d2', accent: '#8a6a3f', hours: [8, 18], blurb: 'Hearings every weekday. Do not miss your court date.' }),
  dest({ id: 'market', name: 'Makola Market', kind: 'market', area: 'central', emoji: '🛍️', pos: at(3, 5, 9, 6, 0), color: '#ff8a65', accent: '#006b3f', hours: [6, 22], blurb: 'Stalls full of produce, kente, fabrics and furniture.', npcs: ['abena'] }),
  dest({ id: 'square', name: 'Black Star Square', kind: 'square', area: 'central', emoji: '⭐', pos: at(4, 5, 8, 6, 1), color: '#f4f1ea', accent: '#000000', hours: [0, 24], blurb: 'Independence Arch and the Black Star Gate.' }),
  dest({ id: 'park', name: 'Kwame Nkrumah Memorial Park', kind: 'park', area: 'central', emoji: '🗿', pos: at(3, 6, 6, 4, 1), color: '#e8e2d6', accent: '#3f9f4a', hours: [6, 22], blurb: "Mausoleum and museum of Ghana's first president." }),
  dest({ id: 'jamestown', name: 'Jamestown Lighthouse', kind: 'landmark', area: 'jamestown', emoji: '🗼', pos: at(2, 6, 3, 3, 2), color: '#ffffff', accent: '#d63a2f', hours: [5, 24], blurb: 'Old Accra: the lighthouse, Bukom boxing, the fish market and back alleys.', npcs: ['nii'] }),
  // Osu
  dest({ id: 'stadium', name: 'Accra Sports Stadium', kind: 'stadium', area: 'osu', emoji: '🏟️', pos: at(5, 5, 8, 8, 0), color: '#d9dde3', accent: '#ce1126', hours: [8, 23], blurb: 'Hearts of Oak, the Black Stars and five-a-side.' }),
  dest({ id: 'guesthouse_osu', name: 'Osu Cosy Guest House', kind: 'hotel', area: 'osu', emoji: '🛏️', pos: at(5, 6, 5, 4, 1), color: '#f3e1c7', accent: '#8e5bd0', hours: [0, 24], blurb: 'Small, discreet rooms by the night. No questions asked.' }),
  dest({ id: 'club_osu', name: 'Oxford Street Lounge', kind: 'lounge', area: 'osu', emoji: '🍸', pos: at(6, 5, 6, 5, 0), color: '#2d2a4a', accent: '#ff2d95', hours: [0, 24], blurb: 'Osu nightlife on Oxford Street.' }),
  dest({ id: 'food_osu', name: 'Osu Night Market Chop Bar', kind: 'food', area: 'osu', emoji: '🍢', pos: at(6, 5, 4, 4, 6), color: '#ffd166', accent: '#e0524a', hours: [10, 24], blurb: 'Kebabs, kenkey and fried yam till late.' }),
  // Labadi
  dest({ id: 'lounge', name: 'Labadi Beach Club', kind: 'lounge', area: 'labadi', emoji: '🎶', pos: at(7, 5, 8, 6, 0), color: '#3d2c5e', accent: '#fcd116', hours: [0, 24], blurb: 'Afrobeats, highlife, cocktails and sea breeze. Live DJ nights.', npcs: ['efua'] }),
  dest({ id: 'beach', name: 'Labadi Beach', kind: 'beach', area: 'labadi', emoji: '🏖️', pos: at(7, 5, 2, 2, 8), color: '#e9c46a', accent: '#c8553d', hours: [5, 23], blurb: 'Sun, sea, horse rides, coconut and beach football.' }),
  dest({ id: 'hotel_lapalm', name: 'La Palm Royal Beach Hotel', kind: 'hotel', area: 'labadi', emoji: '🏨', pos: at(8, 5, 9, 6, 0), color: '#f7efe2', accent: '#2a9d8f', hours: [0, 24], blurb: 'Beachfront luxury with a lagoon pool.' }),
  dest({ id: 'stop_wf', name: 'Labadi Trotro Stop', kind: 'stop', area: 'labadi', emoji: '🏝️', pos: at(8, 4, 5, 3, 2), color: '#e9d8a6', accent: '#ff9f43', hours: [0, 24], blurb: 'Gateway to the beach.' }),
  // Teshie & Nungua
  dest({ id: 'food_teshie', name: 'Teshie Chop Bar', kind: 'food', area: 'teshie', emoji: '🐟', pos: at(9, 4, 5, 4, 0), color: '#f4a261', accent: '#2a9d8f', hours: [6, 23], blurb: 'Fresh fish from the canoes, fried and grilled.' }),
  dest({ id: 'stop_teshie', name: 'Teshie Station', kind: 'stop', area: 'teshie', emoji: '🐟', pos: at(10, 4, 6, 3, 1), color: '#cdbb94', accent: '#1f6f8b', hours: [0, 24], blurb: 'Trotros to Tema and Labadi.' }),
  dest({ id: 'beach_teshie', name: 'Teshie Beach', kind: 'beach', area: 'teshie', emoji: '🏝️', pos: at(10, 5, 3, 2, 4), color: '#e9c46a', accent: '#2a9d8f', hours: [5, 22], blurb: 'Quieter beach with fishing canoes.' }),
  dest({ id: 'mall_junction', name: 'Junction Mall', kind: 'mall', area: 'teshie', emoji: '🛒', pos: at(11, 4, 9, 6, 0), color: '#eef0f4', accent: '#2e86de', hours: [9, 22], blurb: 'Nungua’s shopping mall.' }),
  dest({ id: 'plot_teshie', name: 'Plot, Teshie', kind: 'plot', area: 'teshie', emoji: '🏗️', pos: at(9, 5, 3, 5, 2), color: '#c9a27a', accent: '#8a5a2b', hours: [0, 24], blurb: 'Coastal land. Land guards are common here.', homeTier: 'house' }),
  // North ring
  dest({ id: 'stop_dome', name: 'Dome Station', kind: 'stop', area: 'dome', emoji: '🚐', pos: at(5, -1, 6, 3, 1), color: '#f4f1ea', accent: '#2e86de', hours: [0, 24], blurb: 'Trotros to Kwabenya, Legon and Circle.' }),
  dest({ id: 'market_dome', name: 'Dome Market', kind: 'market', area: 'dome', emoji: '🧺', pos: at(4, -1, 8, 6, 1), color: '#ffc285', accent: '#2fa866', hours: [6, 21], blurb: 'Yams, plantain and second-hand clothes.' }),
  dest({ id: 'school_presec', name: 'Presec Legon', kind: 'school', area: 'dome', emoji: '🏫', pos: at(6, -1, 8, 7, 1), color: '#e9e2cf', accent: '#1f3a8a', hours: [7, 20], blurb: 'Science classes and quiz champions.' }),
  dest({ id: 'food_adenta', name: 'Adenta Barrier Chop Bar', kind: 'food', area: 'adenta', emoji: '🍛', pos: at(9, -1, 5, 4, 1), color: '#ffd29d', accent: '#c8553d', hours: [6, 23], blurb: 'Jollof and grilled tilapia by the barrier.' }),
  dest({ id: 'stop_adenta', name: 'Adenta Station', kind: 'stop', area: 'adenta', emoji: '🚐', pos: at(10, -1, 6, 3, 1), color: '#f4f1ea', accent: '#2e86de', hours: [0, 24], blurb: 'Trotros to Madina, Dodowa and Aburi.' }),
  dest({ id: 'mall_achimota_n', name: 'Ofankor Shopping Centre', kind: 'mall', area: 'ofankor', emoji: '🛍️', pos: at(1, -1, 8, 6, 1), color: '#e8eef5', accent: '#e0524a', hours: [9, 22], blurb: 'Supermarket and phone shops on the Kumasi road.' }),
  // West ring
  dest({ id: 'stop_lapaz', name: 'Lapaz Station', kind: 'stop', area: 'lapaz', emoji: '🚐', pos: at(-1, 1, 6, 3, 1), color: '#f4f1ea', accent: '#2e86de', hours: [0, 24], blurb: 'Trotros to Kumasi road and Kaneshie.' }),
  dest({ id: 'food_abeka', name: 'Abeka Waakye Joint', kind: 'food', area: 'lapaz', emoji: '🍚', pos: at(-2, 2, 5, 4, 1), color: '#f7d58b', accent: '#ce1126', hours: [5, 14], blurb: 'Morning waakye queue round the block.' }),
  dest({ id: 'market_mallam', name: 'Mallam Market', kind: 'market', area: 'mallam', emoji: '🧺', pos: at(-1, 4, 8, 6, 1), color: '#ffb085', accent: '#2fa866', hours: [6, 21], blurb: 'Wholesale tomatoes, onions and fish.' }),
  dest({ id: 'mall_westhills', name: 'West Hills Mall', kind: 'mall', area: 'weija', emoji: '🛒', pos: at(-2, 6, 9, 7, 0), color: '#eef0f4', accent: '#2fa866', hours: [9, 22], blurb: 'The big mall on the Kasoa road.' }),
  // East ring
  dest({ id: 'stop_tema', name: 'Tema Station', kind: 'stop', area: 'tema', emoji: '🚐', pos: at(13, 3, 6, 3, 1), color: '#f4f1ea', accent: '#2e86de', hours: [0, 24], blurb: 'Buses to Accra, Ashaiman and Akosombo.' }),
  dest({ id: 'harbour_tema', name: 'Tema Harbour', kind: 'harbour', area: 'tema', emoji: '🚢', pos: at(13, 4, 10, 8, 0), color: '#8a6a3f', accent: '#2e5f8a', hours: [0, 24], blurb: 'Ghana’s biggest port: container cranes, ships and the fishing harbour. Jobs on the docks.' }),
  dest({ id: 'food_tema', name: 'Community 1 Chop Bar', kind: 'food', area: 'tema', emoji: '🐟', pos: at(12, 3, 5, 4, 1), color: '#f4a261', accent: '#2a9d8f', hours: [6, 23], blurb: 'Kenkey and fried fish for dock workers.' }),
  dest({ id: 'gym_sakumono', name: 'Sakumono Golf & Fitness', kind: 'gym', area: 'sakumono', emoji: '⛳', pos: at(13, 1, 8, 6, 1), color: '#cfe8c4', accent: '#2f855a', hours: [5, 22], blurb: 'Golf range, pool and gym.' }),
  // Schools, hustles and the underworld
  dest({ id: 'school_achimota', name: 'Achimota School', kind: 'school', area: 'achimota', emoji: '🏫', pos: at(0, 1, 8, 7, 1), color: '#f1e3c6', accent: '#1f6f3f', hours: [7, 18], blurb: 'Famous secondary school in the forest. Evening classes and teaching jobs.' }),
  dest({ id: 'school_academy', name: 'Accra Academy', kind: 'school', area: 'kaneshie', emoji: '🏫', pos: at(0, 4, 8, 6, 1), color: '#e8dcc6', accent: '#7a1f2b', hours: [7, 20], blurb: 'Bleoo! Remedial WASSCE and evening courses.' }),
  dest({ id: 'netcafe', name: 'Nima Net Café', kind: 'cafe', area: 'nima', emoji: '🖥️', pos: at(4, 2, 5, 4, 1), color: '#d8e2ef', accent: '#2e86de', hours: [0, 24], blurb: 'Cheap browsing out front. Something shady in the back room.' }),
  dest({ id: 'galamsey', name: 'Forest Gold Pits', kind: 'mine', area: 'achimota', emoji: '⛏️', pos: at(3, 0, 7, 6, 1), color: '#a0703c', accent: '#5c4033', hours: [5, 20], blurb: 'Illegal gold pits deep in the forest. Muddy, dangerous, lucrative.' }),
  dest({ id: 'harbour', name: 'Jamestown Harbour', kind: 'harbour', area: 'jamestown', emoji: '⚓', pos: at(2, 6, 4, 3, 6), color: '#8a6a3f', accent: '#2a9d8f', hours: [0, 24], blurb: 'Fishing canoes by day. Quiet deals by night.' }),
]

/* ------------------------------ where you can start ------------------------------ */
/** Neighbourhoods with a compound house where a new player can rent a basic room. Nima is the original. */
export const START_AREAS = ['nima', 'madina', 'kaneshie', 'jamestown', 'teshie', 'ashaiman', 'dome', 'mallam'] as const
/** Basic-room compound house per start area (destination id): the first one in each area. */
export const ROOM_HOMES: Record<string, string> = { nima: 'home_room' }
/** Every compound house in each start area. New players are put in a random one. */
export const ROOM_HOMES_ALL: Record<string, string[]> = { nima: ['home_room'] }
/** Who collects the rent at each compound house. */
export const ROOM_LANDLORD: Record<string, string> = { home_room: 'Auntie Akosua' }
const FIRST_LANDLORDS = ['Madam Comfort', 'Papa Yaw', 'Auntie Efua', 'Mr Quaye', 'Maame Serwaa', 'Alhaji Issah', 'Auntie Dede', 'Papa Nii']
/** Landlords and paint for the extra compound houses, so no two look or read the same. */
const COMPOUNDS = [
  { owner: 'Auntie Esi', color: '#f2c9a0', accent: '#a0522d' },
  { owner: 'Papa Kwesi', color: '#e8d3a9', accent: '#2f6b52' },
  { owner: 'Maame Adwoa', color: '#f0b7a4', accent: '#7a1f3d' },
  { owner: 'Uncle Fiifi', color: '#cfe0d6', accent: '#3d5a80' },
  { owner: 'Nana Yaa', color: '#f6dd8f', accent: '#8a5a2b' },
  { owner: 'Mr Tetteh', color: '#d9c4e8', accent: '#5b3a8c' },
  { owner: 'Sister Abena', color: '#f4c7c3', accent: '#c0392b' },
  { owner: 'Alhaji Musah', color: '#d6e4f0', accent: '#1f3a5f' },
]
/** Compound houses wanted per start area. */
const HOUSES_PER_AREA = 2
{
  const taken = DESTINATIONS.map((d) => ({ x: d.x - 1, z: d.z - 1, w: d.w + 2, d: d.d + 2 }))
  const hits = (x: number, z: number, w: number, d: number) => taken.some((t) => x < t.x + t.w && x + w > t.x && z < t.z + t.d && z + d > t.z)
  let n = 0
  for (const areaId of START_AREAS) {
    const area = AREA_BY_ID[areaId]
    if (!area) continue
    const list = (ROOM_HOMES_ALL[areaId] ??= [])
    for (let c = -2; c <= 13 && list.length < HOUSES_PER_AREA; c++)
      for (let r = -2; r <= 9 && list.length < HOUSES_PER_AREA; r++)
        for (const xoff of [0, 4]) {
          const p = at(c, r, 6, 5, xoff)
          if (p.x < 1 || p.z < 1 || p.x + p.w > MAP_W - 4 || p.z + p.d > MAP_H - 4) continue
          if (areaAt(p.x + 3, p.z + 2.5).id !== areaId) continue
          const safe = clearOfRoads(p)
          if (safe.x !== p.x || safe.z !== p.z || safe.w !== p.w || safe.d !== p.d) continue
          if ([p.x, p.x + p.w].some((x) => p.z + p.d + 5 > coastZ(x))) continue
          if (Math.hypot(p.x + 3 - LAGOON.x, p.z + 2.5 - LAGOON.z) < LAGOON.r * 1.8 + 4) continue
          if (hits(p.x, p.z, p.w, p.d)) continue
          // first house keeps its old id so existing saves still find it
          const id = list.length === 0 ? `home_room_${areaId}` : `home_room_${areaId}_${list.length + 1}`
          const look = list.length === 0 ? { owner: '', color: '#f2c9a0', accent: '#a0522d' } : COMPOUNDS[n++ % COMPOUNDS.length]
          const name = list.length === 0 ? `${area.name.split(' & ')[0]} Compound House` : `${look.owner}'s Compound`
          DESTINATIONS.push(dest({ id, name, kind: 'home', area: areaId, emoji: '🏠', pos: p, color: look.color, accent: look.accent, hours: [0, 24], blurb: 'A rented room in a busy family compound house.', homeTier: 'room' }))
          taken.push({ x: p.x - 1, z: p.z - 1, w: p.w + 2, d: p.d + 2 })
          list.push(id)
          ROOM_LANDLORD[id] = list.length === 1 ? FIRST_LANDLORDS[START_AREAS.indexOf(areaId) % FIRST_LANDLORDS.length] : look.owner
          ROOM_HOMES[areaId] ??= id
          break
        }
  }
}

/** How you start life in Accra. */
export type { Lifestyle }
export const LIFESTYLES: Record<Lifestyle, { name: string; emoji: string; blurb: string; money: number; tier: HomeTier; prepaidWeeks: number; perks: string[] }> = {
  hustler: { name: 'Hustler', emoji: '💪', blurb: 'Nothing in your pocket but big dreams. Start from the bottom.', money: 80, tier: 'room', prepaidWeeks: 1, perks: ['GH₵80 cash', 'Basic room, first week paid', 'Fitness and Communication head start'] },
  worker: { name: 'Working class', emoji: '🧑🏾‍💼', blurb: 'A little saved up and a room of your own. The classic start.', money: 300, tier: 'room', prepaidWeeks: 1, perks: ['GH₵300 cash', 'Basic room, first week paid'] },
  dadaba: { name: 'Dada ba (rich kid)', emoji: '💎', blurb: 'Born with a silver spoon. Your parents set you up in East Legon.', money: 6000, tier: 'premium', prepaidWeeks: 4, perks: ['GH₵6,000 cash', 'East Legon Villa, 4 weeks rent paid', 'Your own car and a driving licence'] },
}

/* ------------------------------ land for sale ------------------------------ */
/** Land prices, growth and land-guard risk by kind of neighbourhood. */
const LAND: Record<AreaStyle, { price: number; growth: number; guards: number; blurb: string }> = {
  dense: { price: 3500, growth: 0.005, guards: 0.3, blurb: 'Cheap land in a busy, crowded area.' },
  coastal: { price: 5000, growth: 0.007, guards: 0.55, blurb: 'Near the sea. Land guards are common here.' },
  upscale: { price: 16000, growth: 0.011, guards: 0.35, blurb: 'Leafy, gated and expensive.' },
  business: { price: 20000, growth: 0.012, guards: 0.2, blurb: 'Prime commercial land. Perfect for a plaza.' },
  campus: { price: 9000, growth: 0.008, guards: 0.2, blurb: 'Quiet land near the universities.' },
  forest: { price: 4500, growth: 0.006, guards: 0.25, blurb: 'Green and peaceful, a little far out.' },
  industrial: { price: 6500, growth: 0.006, guards: 0.3, blurb: 'Good value near the factories and the harbour.' },
}
const PLOTS_PER_AREA = 4
const hash01 = (a: number, b: number, c: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return n - Math.floor(n)
}
/** Extra building plots: a few 3x5 lots in empty spots of every neighbourhood (same every game). */
const GEN_PLOTS: { dest: Destination; price: number; growth: number; guardRisk: number }[] = []
{
  const taken = DESTINATIONS.map((d) => ({ x: d.x - 1, z: d.z - 1, w: d.w + 2, d: d.d + 2 }))
  const hits = (x: number, z: number, w: number, d: number) => taken.some((t) => x < t.x + t.w && x + w > t.x && z < t.z + t.d && z + d > t.z)
  const byArea: Record<string, { c: number; r: number; xoff: number; key: number }[]> = {}
  for (let c = -2; c <= 13; c++)
    for (let r = -2; r <= 9; r++)
      for (const xoff of [0, 3, 6]) {
        const p = at(c, r, 3, 5, xoff)
        if (p.x < 1 || p.z < 1 || p.x + p.w > MAP_W - 4 || p.z + p.d > MAP_H - 4) continue
        const safe = clearOfRoads(p)
        if (safe.x !== p.x || safe.z !== p.z || safe.w !== p.w || safe.d !== p.d) continue
        // dry land with room for a beach between the plot and the sea
        if ([p.x, p.x + p.w].some((x) => p.z + p.d + 5 > coastZ(x))) continue
        if (Math.hypot(p.x + 1.5 - LAGOON.x, p.z + 2.5 - LAGOON.z) < LAGOON.r * 1.8 + 4) continue
        const area = areaAt(p.x + 1.5, p.z + 2.5)
        ;(byArea[area.id] ??= []).push({ c, r, xoff, key: hash01(c, r, xoff) })
      }
  let n = 1
  for (const area of AREAS) {
    const slots = (byArea[area.id] ?? []).sort((a, b) => a.key - b.key)
    const usedBlocks = new Set<string>()
    let made = 0
    for (const sl of slots) {
      if (made >= PLOTS_PER_AREA) break
      if (usedBlocks.has(`${sl.c},${sl.r}`)) continue
      const p = at(sl.c, sl.r, 3, 5, sl.xoff)
      if (hits(p.x, p.z, p.w, p.d)) continue
      const L = LAND[area.style]
      const vary = 0.85 + hash01(sl.r, sl.c, 7) * 0.35
      const d = dest({ id: `plot_${area.id}_${sl.c}_${sl.r}_${sl.xoff}`, name: `Plot ${n * 7 + 3}, ${area.name}`, kind: 'plot', area: area.id, emoji: '🏗️', pos: p, color: '#c9a27a', accent: '#8a5a2b', hours: [0, 24], blurb: L.blurb, homeTier: 'house' })
      DESTINATIONS.push(d)
      taken.push({ x: p.x - 1, z: p.z - 1, w: p.w + 2, d: p.d + 2 })
      GEN_PLOTS.push({ dest: d, price: Math.round((L.price * vary) / 100) * 100, growth: L.growth, guardRisk: L.guards })
      usedBlocks.add(`${sl.c},${sl.r}`)
      made++
      n++
    }
  }
}
export const DEST_BY_ID: Record<string, Destination> = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]))
export const HOME_DEST: Record<HomeTier, string> = { room: 'home_room', apartment: 'apartment', premium: 'home_premium', house: 'plot_dansoman' }
/** The destination you live at (houses live on the plot you built on). */
export const homeDestId = (s: { housing: { tier: HomeTier; plotId?: string | null; roomDest?: string | null } }) =>
  s.housing.tier === 'house' && s.housing.plotId ? s.housing.plotId : s.housing.tier === 'room' && s.housing.roomDest ? s.housing.roomDest : HOME_DEST[s.housing.tier]
/** Places you visit outdoors (no walk-in interior). */
export const OUTDOOR_KINDS: DestKind[] = ['plot']
export const STOPS = DESTINATIONS.filter((d) => d.kind === 'stop')

export const DISTRICTS: Record<DistrictId, { name: string; blurb: string }> = {
  residential: { name: 'Neighbourhoods', blurb: 'Affordable streets, friendly neighbours.' },
  commercial: { name: 'Business', blurb: 'Markets, offices and classrooms.' },
  waterfront: { name: 'Upscale', blurb: 'Leafy, expensive and by the sea.' },
}

/** [from, to] -> fare and ride time in game minutes. */
export const FARES: Record<string, { fare: number; minutes: number }> = {
  'residential>commercial': { fare: 8, minutes: 14 },
  'commercial>residential': { fare: 8, minutes: 14 },
  'commercial>waterfront': { fare: 10, minutes: 12 },
  'waterfront>commercial': { fare: 10, minutes: 12 },
  'residential>waterfront': { fare: 15, minutes: 24 },
  'waterfront>residential': { fare: 15, minutes: 24 },
}

/* ------------------------------------------------------------------ */
/* Careers                                                             */
/* ------------------------------------------------------------------ */
export interface CareerLevel {
  title: string
  pay: number
  minutes: number
  careerXp: number
  /** Total career XP needed to hold this level. */
  promoteAt: number
  requires: Partial<Record<SkillId, number>>
}
export interface CareerDef {
  id: CareerId
  name: string
  emoji: string
  workplace: string
  skill: SkillId
  skillXpPerShift: number
  blurb: string
  levels: CareerLevel[]
  shiftNeeds: Partial<Needs>
  /** Tasks that pop up during a shift. */
  tasks: ShiftTaskDef[]
  /** Illegal work: chance of a police raid per shift and the charge. */
  illegal?: { raid: number; charge: keyof typeof CHARGES }
}
/** A job task you do during a shift (Sims-style). */
export interface ShiftTaskDef {
  key: string
  label: string
  icon: string
  /** Character pose and prop while doing it. */
  pose: string
  prop?: string
  /** Spot key in the workplace layout to stand at. */
  at?: string
  /** Walk around while doing it. */
  wander?: boolean
  /** Tip range paid by customers. */
  tip?: [number, number]
}
const T = (key: string, label: string, icon: string, pose: string, extra: Partial<ShiftTaskDef> = {}): ShiftTaskDef => ({ key, label, icon, pose, ...extra })
export const CAREERS: Record<CareerId, CareerDef> = {
  retail: {
    id: 'retail', name: 'Retail', emoji: '🛍️', workplace: 'market', skill: 'communication', skillXpPerShift: 6,
    blurb: 'Serve customers at Makola Market. No experience needed.',
    shiftNeeds: { energy: -26, hunger: -16, hygiene: -8, bladder: -10, fun: -6, social: 5 },
    tasks: [
      T('serve', 'Serve a customer', '🧾', 'cashier', { at: 'work', tip: [0, 5] }),
      T('restock', 'Restock the stall', '📦', 'carry', { prop: 'box', wander: true }),
      T('haggle', 'Haggle with a tough buyer', '🗣️', 'talk', { at: 'social', tip: [0, 8] }),
      T('sweep', 'Sweep the stall', '🧹', 'clean', { prop: 'broom', at: 'odd' }),
    ],
    levels: [
      { title: 'Shop Assistant', pay: 120, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Sales Supervisor', pay: 170, minutes: 240, careerXp: 50, promoteAt: 200, requires: { communication: 2 } },
      { title: 'Store Manager', pay: 250, minutes: 300, careerXp: 60, promoteAt: 600, requires: { communication: 4 } },
    ],
  },
  hospitality: {
    id: 'hospitality', name: 'Hospitality', emoji: '🍳', workplace: 'foodstall', skill: 'cooking', skillXpPerShift: 7,
    blurb: "Cook and serve at Auntie Esi's Chop Bar. Learn on the job.",
    shiftNeeds: { energy: -24, hunger: -8, hygiene: -12, bladder: -10, fun: -4, social: 4 },
    tasks: [
      T('cook', 'Cook a pot of waakye', '🍲', 'cook', { prop: 'spoon', at: 'work' }),
      T('serve', 'Serve a hungry table', '🍽️', 'carry', { prop: 'plate', at: 'eat', tip: [1, 8] }),
      T('order', 'Take an order', '📝', 'talk', { at: 'eat' }),
      T('dishes', 'Wash the dishes', '🧽', 'clean', { at: 'odd' }),
    ],
    levels: [
      { title: 'Kitchen Hand', pay: 135, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Line Cook', pay: 190, minutes: 240, careerXp: 50, promoteAt: 220, requires: { cooking: 2 } },
      { title: 'Head Chef', pay: 300, minutes: 300, careerXp: 60, promoteAt: 650, requires: { cooking: 4, communication: 2 } },
    ],
  },
  technology: {
    id: 'technology', name: 'Technology', emoji: '💻', workplace: 'office', skill: 'technology', skillXpPerShift: 10,
    blurb: 'Build software at Ridge Tech Hub. Needs a Tech Bootcamp first.',
    shiftNeeds: { energy: -22, hunger: -14, hygiene: -5, bladder: -10, fun: -9, social: 2 },
    tasks: [
      T('bug', 'Fix a bug', '🐞', 'desk', { at: 'work' }),
      T('deploy', 'Ship a release', '🚀', 'desk', { at: 'work' }),
      T('standup', 'Stand-up meeting', '👥', 'talk', { at: 'study' }),
      T('support', 'Answer a support call', '📞', 'phone', { prop: 'phone', at: 'idle' }),
    ],
    levels: [
      { title: 'Support Intern', pay: 200, minutes: 240, careerXp: 40, promoteAt: 0, requires: { technology: 1 } },
      { title: 'Junior Developer', pay: 310, minutes: 240, careerXp: 55, promoteAt: 240, requires: { technology: 3 } },
      { title: 'Software Engineer', pay: 480, minutes: 300, careerXp: 70, promoteAt: 700, requires: { technology: 5 } },
    ],
  },
  teacher: {
    id: 'teacher', name: 'Teaching', emoji: '👩🏾‍🏫', workplace: 'school_achimota', skill: 'communication', skillXpPerShift: 8,
    blurb: 'Teach at Achimota School. Steady pay, long holidays.',
    shiftNeeds: { energy: -24, hunger: -14, hygiene: -6, bladder: -10, fun: -4, social: 8 },
    tasks: [
      T('teach', 'Teach a lesson', '📖', 'talk', { prop: 'book', at: 'teach' }),
      T('mark', 'Mark exercise books', '✏️', 'desk', { at: 'library' }),
      T('question', "Answer a student's question", '🙋', 'talk', { at: 'lecture' }),
      T('assembly', 'Supervise morning assembly', '🔔', 'wave', { at: 'idle' }),
    ],
    levels: [
      { title: 'Teaching Assistant', pay: 140, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Class Teacher', pay: 220, minutes: 240, careerXp: 50, promoteAt: 220, requires: { communication: 2 } },
      { title: 'Headteacher', pay: 340, minutes: 300, careerXp: 60, promoteAt: 650, requires: { communication: 4 } },
    ],
  },
  nurse: {
    id: 'nurse', name: 'Nursing', emoji: '🩺', workplace: 'hospital', skill: 'communication', skillXpPerShift: 7,
    blurb: 'Care for patients at Korle Bu. Hard work, real respect.',
    shiftNeeds: { energy: -28, hunger: -14, hygiene: -10, bladder: -10, fun: -6, social: 6 },
    tasks: [
      T('vitals', "Check a patient's vitals", '🩺', 'work', { at: 'volunteer' }),
      T('meds', 'Hand out medication', '💊', 'cashier', { at: 'pharmacy' }),
      T('triage', 'Triage a new arrival', '🚑', 'talk', { at: 'nhis' }),
      T('beds', 'Change the bed sheets', '🛏️', 'clean', { at: 'idle' }),
    ],
    levels: [
      { title: 'Nursing Aide', pay: 150, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Staff Nurse', pay: 240, minutes: 300, careerXp: 55, promoteAt: 240, requires: { communication: 2, fitness: 1 } },
      { title: 'Senior Nurse', pay: 360, minutes: 300, careerXp: 65, promoteAt: 700, requires: { communication: 4, fitness: 2 } },
    ],
  },
  banker: {
    id: 'banker', name: 'Banking', emoji: '🏦', workplace: 'bank', skill: 'communication', skillXpPerShift: 7,
    blurb: 'Count cedis at Gold Coast Bank. Smart clothes required.',
    shiftNeeds: { energy: -20, hunger: -14, hygiene: -4, bladder: -10, fun: -10, social: 3 },
    tasks: [
      T('deposit', 'Process a deposit', '💵', 'cashier', { at: 'teller' }),
      T('loan', 'Assess a loan application', '📑', 'desk', { at: 'advice' }),
      T('vault', 'Count the vault cash', '💰', 'work', { at: 'teller' }),
      T('angry', 'Calm an angry customer', '😤', 'talk', { at: 'openaccount' }),
    ],
    levels: [
      { title: 'Bank Teller', pay: 170, minutes: 240, careerXp: 40, promoteAt: 0, requires: { communication: 1 } },
      { title: 'Loan Officer', pay: 280, minutes: 240, careerXp: 55, promoteAt: 240, requires: { communication: 3, technology: 1 } },
      { title: 'Branch Manager', pay: 450, minutes: 300, careerXp: 70, promoteAt: 750, requires: { communication: 5, technology: 2 } },
    ],
  },
  bouncer: {
    id: 'bouncer', name: 'Event Security', emoji: '🕶️', workplace: 'arena', skill: 'fitness', skillXpPerShift: 10,
    blurb: 'Bouncer at the AICC. Check tickets, keep the peace, guard the stars.',
    shiftNeeds: { energy: -26, hunger: -16, hygiene: -8, bladder: -8, fun: 4, social: 6 },
    tasks: [
      T('tickets', 'Check tickets at the gate', '🎟️', 'talk', { at: 'gate' }),
      T('patdown', 'Pat down a guest', '🖐️', 'work', { at: 'gate' }),
      T('trouble', 'Throw out a troublemaker', '💪', 'box', { at: 'crowd' }),
      T('vip', 'Escort the artist to the stage', '⭐', 'wave', { at: 'vip', tip: [5, 20] }),
      T('rope', 'Hold the crowd barrier', '🚧', 'lift', { at: 'rope' }),
    ],
    levels: [
      { title: 'Door Security', pay: 140, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Head Bouncer', pay: 210, minutes: 240, careerXp: 50, promoteAt: 220, requires: { fitness: 2 } },
      { title: 'Security Chief', pay: 320, minutes: 300, careerXp: 60, promoteAt: 650, requires: { fitness: 4, communication: 2 } },
    ],
  },
  bartender: {
    id: 'bartender', name: 'Bartending', emoji: '🍹', workplace: 'lounge', skill: 'communication', skillXpPerShift: 6,
    blurb: 'Mix drinks at Labadi Beach Club. Big tips on Friday nights.',
    shiftNeeds: { energy: -24, hunger: -12, hygiene: -8, bladder: -10, fun: 6, social: 10 },
    tasks: [
      T('mix', 'Mix a cocktail', '🍹', 'cashier', { prop: 'drink', at: 'bar', tip: [2, 10] }),
      T('serve', 'Serve a VIP table', '🍾', 'carry', { prop: 'drink', at: 'social', tip: [5, 20] }),
      T('wipe', 'Wipe down the bar', '🧽', 'clean', { at: 'bar' }),
      T('ice', 'Fetch more ice', '🧊', 'carry', { prop: 'box', wander: true }),
    ],
    levels: [
      { title: 'Barback', pay: 120, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Bartender', pay: 180, minutes: 240, careerXp: 50, promoteAt: 200, requires: { communication: 1 } },
      { title: 'Bar Manager', pay: 280, minutes: 300, careerXp: 60, promoteAt: 600, requires: { communication: 3 } },
    ],
  },
  dj: {
    id: 'dj', name: 'Club DJ', emoji: '🎧', workplace: 'club_osu', skill: 'communication', skillXpPerShift: 7,
    blurb: 'Spin Afrobeats and amapiano at Oxford Street Lounge. Shout-outs earn tips.',
    shiftNeeds: { energy: -22, hunger: -10, hygiene: -6, bladder: -8, fun: 14, social: 8 },
    tasks: [
      T('mix', 'Mix the next track', '🎚️', 'dance', { at: 'dj' }),
      T('hype', 'Hype the crowd on the mic', '🎤', 'sing', { prop: 'mic', at: 'dj', tip: [3, 15] }),
      T('request', 'Play a request', '📱', 'phone', { prop: 'phone', at: 'dj', tip: [5, 20] }),
      T('shoutout', 'Birthday shout-out', '🎉', 'cheer', { at: 'dj', tip: [10, 30] }),
    ],
    levels: [
      { title: 'Warm-up DJ', pay: 130, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Resident DJ', pay: 220, minutes: 240, careerXp: 50, promoteAt: 220, requires: { communication: 2 } },
      { title: 'Headline DJ', pay: 380, minutes: 300, careerXp: 60, promoteAt: 650, requires: { communication: 4 } },
    ],
  },
  clubdoor: {
    id: 'clubdoor', name: 'Club Bouncer', emoji: '🕶️', workplace: 'club_osu', skill: 'fitness', skillXpPerShift: 9,
    blurb: 'Work the door at Oxford Street Lounge. Check IDs, keep trouble outside.',
    shiftNeeds: { energy: -24, hunger: -14, hygiene: -6, bladder: -8, fun: 2, social: 6 },
    tasks: [
      T('id', 'Check IDs at the door', '🪪', 'talk', { at: 'door' }),
      T('list', 'Let in the VIP list', '📋', 'wave', { at: 'door', tip: [5, 15] }),
      T('fight', 'Break up a fight', '💪', 'box', { at: 'social' }),
      T('patrol', 'Walk the floor', '👀', 'talk', { wander: true }),
    ],
    levels: [
      { title: 'Door Staff', pay: 130, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Head of Door', pay: 200, minutes: 240, careerXp: 50, promoteAt: 220, requires: { fitness: 2 } },
      { title: 'Security Manager', pay: 300, minutes: 300, careerXp: 60, promoteAt: 650, requires: { fitness: 4, communication: 2 } },
    ],
  },
  clubwaiter: {
    id: 'clubwaiter', name: 'Club Waiter', emoji: '🍾', workplace: 'lounge', skill: 'communication', skillXpPerShift: 5,
    blurb: 'Bottle service at Labadi Beach Club. Sparklers, VIP tables and big tips.',
    shiftNeeds: { energy: -22, hunger: -12, hygiene: -8, bladder: -10, fun: 4, social: 10 },
    tasks: [
      T('order', 'Take a table order', '📝', 'talk', { at: 'mocktail' }),
      T('bottle', 'Bottle service with sparklers', '🍾', 'carry', { prop: 'drink', at: 'social', tip: [8, 25] }),
      T('clear', 'Clear empty glasses', '🥂', 'carry', { prop: 'box', wander: true }),
      T('tab', 'Settle a tab', '💳', 'cashier', { at: 'bar', tip: [2, 10] }),
    ],
    levels: [
      { title: 'Runner', pay: 100, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'VIP Waiter', pay: 160, minutes: 240, careerXp: 50, promoteAt: 200, requires: { communication: 1 } },
      { title: 'Floor Captain', pay: 240, minutes: 300, careerXp: 60, promoteAt: 600, requires: { communication: 3 } },
    ],
  },
  hotel: {
    id: 'hotel', name: 'Hotel', emoji: '🛎️', workplace: 'hotel_lapalm', skill: 'communication', skillXpPerShift: 7,
    blurb: 'Work at La Palm Royal Beach Hotel. Tourists tip in dollars.',
    shiftNeeds: { energy: -24, hunger: -12, hygiene: -6, bladder: -10, fun: -6, social: 6 },
    tasks: [
      T('checkin', 'Check in a guest', '🛎️', 'cashier', { at: 'reception', tip: [0, 10] }),
      T('luggage', 'Carry luggage upstairs', '🧳', 'carry', { prop: 'box', wander: true, tip: [2, 12] }),
      T('room', 'Clean a guest room', '🧹', 'clean', { prop: 'broom', at: 'hotelnight' }),
      T('dining', 'Serve at the restaurant', '🍽️', 'carry', { prop: 'plate', at: 'dining', tip: [2, 10] }),
    ],
    levels: [
      { title: 'Porter', pay: 130, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Receptionist', pay: 200, minutes: 240, careerXp: 50, promoteAt: 220, requires: { communication: 2 } },
      { title: 'Duty Manager', pay: 330, minutes: 300, careerXp: 60, promoteAt: 650, requires: { communication: 4 } },
    ],
  },
  security: {
    id: 'security', name: 'Mall Security', emoji: '👮🏾', workplace: 'mall', skill: 'fitness', skillXpPerShift: 8,
    blurb: 'Guard Accra Mall. Patrol, check bags, catch shoplifters.',
    shiftNeeds: { energy: -24, hunger: -14, hygiene: -6, bladder: -10, fun: -8, social: 3 },
    tasks: [
      T('patrol', 'Patrol the mall', '🔦', 'work', { prop: 'torch', wander: true }),
      T('bags', 'Check bags at the entrance', '🎒', 'work', { at: 'idle' }),
      T('thief', 'Chase a shoplifter', '🏃', 'run', { at: 'pickpocket' }),
      T('child', 'Help a lost child', '🧒', 'talk', { at: 'foodcourt' }),
    ],
    levels: [
      { title: 'Security Guard', pay: 125, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Shift Supervisor', pay: 190, minutes: 240, careerXp: 50, promoteAt: 220, requires: { fitness: 2 } },
      { title: 'Head of Security', pay: 290, minutes: 300, careerXp: 60, promoteAt: 650, requires: { fitness: 3, communication: 2 } },
    ],
  },
  fisher: {
    id: 'fisher', name: 'Fishing', emoji: '🎣', workplace: 'jamestown', skill: 'fitness', skillXpPerShift: 10,
    blurb: 'Crew a canoe out of Jamestown. Early starts, fresh catch.',
    shiftNeeds: { energy: -30, hunger: -18, hygiene: -16, bladder: -8, fun: -2, social: 6 },
    tasks: [
      T('nets', 'Mend the fishing nets', '🕸️', 'sit', { at: 'oware' }),
      T('haul', 'Haul in the canoe', '🛶', 'lift', { at: 'idle' }),
      T('carry', 'Carry the catch to the market women', '🧺', 'carry', { prop: 'basket', wander: true }),
      T('sell', 'Sell fish to a buyer', '🐟', 'talk', { at: 'idle', tip: [0, 6] }),
    ],
    levels: [
      { title: 'Deckhand', pay: 110, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Fisherman', pay: 170, minutes: 240, careerXp: 50, promoteAt: 200, requires: { fitness: 2 } },
      { title: 'Canoe Owner', pay: 280, minutes: 300, careerXp: 60, promoteAt: 600, requires: { fitness: 3, communication: 2 } },
    ],
  },
  porter: {
    id: 'porter', name: 'Kayayo (porter)', emoji: '🧺', workplace: 'market_kaneshie', skill: 'fitness', skillXpPerShift: 10,
    blurb: 'Carry loads on your head at Kaneshie Market. Tough, honest money.',
    shiftNeeds: { energy: -32, hunger: -18, hygiene: -14, bladder: -8, fun: -6, social: 5 },
    tasks: [
      T('load', 'Carry a load on your head', '🧺', 'carry', { prop: 'basket', wander: true, tip: [1, 6] }),
      T('deliver', 'Deliver goods to a car', '📦', 'carry', { prop: 'box', wander: true, tip: [1, 5] }),
      T('find', 'Find a new customer', '🗣️', 'talk', { at: 'social' }),
    ],
    levels: [
      { title: 'Kayayo', pay: 90, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Head Porter', pay: 130, minutes: 240, careerXp: 50, promoteAt: 200, requires: { fitness: 2 } },
      { title: 'Porter Boss', pay: 200, minutes: 240, careerXp: 60, promoteAt: 600, requires: { fitness: 3, communication: 1 } },
    ],
  },
  docker: {
    id: 'docker', name: 'Port work', emoji: '⚓', workplace: 'harbour_tema', skill: 'fitness', skillXpPerShift: 10,
    blurb: 'Load and unload ships at Tema Port. Shifts day and night.',
    shiftNeeds: { energy: -30, hunger: -18, hygiene: -14, bladder: -8, fun: -4, social: 5 },
    tasks: [
      T('lash', 'Lash containers on deck', '⛓️', 'work', { at: 'crates' }),
      T('unload', 'Unload a cargo crate', '📦', 'carry', { prop: 'box', wander: true }),
      T('truck', 'Load a truck at the gate', '🚚', 'lift', { at: 'truck' }),
      T('signal', 'Signal the crane operator', '🙌', 'wave', { at: 'idle' }),
    ],
    levels: [
      { title: 'Dock Hand', pay: 150, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Crane Signaller', pay: 230, minutes: 240, careerXp: 50, promoteAt: 220, requires: { fitness: 2 } },
      { title: 'Port Supervisor', pay: 360, minutes: 300, careerXp: 60, promoteAt: 650, requires: { fitness: 3, communication: 3 } },
    ],
  },
  galamsey: {
    id: 'galamsey', name: 'Galamsey (illegal)', emoji: '⛏️', workplace: 'galamsey', skill: 'fitness', skillXpPerShift: 12,
    blurb: 'Illegal gold mining in the forest. Big money, poisoned rivers, task-force raids.',
    shiftNeeds: { energy: -36, hunger: -20, hygiene: -30, bladder: -8, fun: -10, social: 2 },
    illegal: { raid: 0.14, charge: 'galamsey' },
    tasks: [
      T('dig', 'Dig for gold', '⛏️', 'work', { prop: 'shovel', at: 'pit' }),
      T('wash', 'Wash the gold dust', '🥣', 'clean', { at: 'wash' }),
      T('sacks', 'Carry sacks of ore', '🪨', 'carry', { prop: 'box', wander: true }),
      T('lookout', 'Watch for the task force', '👀', 'phone', { prop: 'phone', at: 'lookout' }),
    ],
    levels: [
      { title: 'Digger', pay: 380, minutes: 300, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Pit Boss', pay: 600, minutes: 300, careerXp: 50, promoteAt: 220, requires: { fitness: 3 } },
      { title: 'Concession Boss', pay: 950, minutes: 300, careerXp: 60, promoteAt: 650, requires: { fitness: 4, communication: 2 } },
    ],
  },
  sakawa: {
    id: 'sakawa', name: 'Sakawa (illegal)', emoji: '🕶️', workplace: 'netcafe', skill: 'technology', skillXpPerShift: 8,
    blurb: 'Online fraud in a back room. Fast cash, cyber-crime police are watching.',
    shiftNeeds: { energy: -18, hunger: -14, hygiene: -6, bladder: -10, fun: -4, social: -6 },
    illegal: { raid: 0.12, charge: 'fraud' },
    tasks: [
      T('chat', 'Chat up a "client" online', '💬', 'desk', { at: 'desk1' }),
      T('photos', 'Edit fake profile photos', '🖼️', 'desk', { at: 'desk2' }),
      T('payout', 'Meet the middleman for a payout', '🤝', 'talk', { at: 'door' }),
      T('tracks', 'Clear your tracks', '🧹', 'desk', { at: 'desk3' }),
    ],
    levels: [
      { title: 'Yahoo Boy', pay: 420, minutes: 240, careerXp: 40, promoteAt: 0, requires: { technology: 1 } },
      { title: 'Big Boy', pay: 700, minutes: 240, careerXp: 50, promoteAt: 220, requires: { technology: 3 } },
      { title: 'Kingpin', pay: 1100, minutes: 240, careerXp: 60, promoteAt: 650, requires: { technology: 5, communication: 2 } },
    ],
  },
  smuggler: {
    id: 'smuggler', name: 'Smuggling (illegal)', emoji: '📦', workplace: 'harbour', skill: 'fitness', skillXpPerShift: 10,
    blurb: 'Night runs of untaxed goods at Jamestown harbour. Customs and marine police patrol.',
    shiftNeeds: { energy: -30, hunger: -16, hygiene: -14, bladder: -8, fun: -4, social: 2 },
    illegal: { raid: 0.15, charge: 'smuggling' },
    tasks: [
      T('unload', 'Unload crates from the canoe', '📦', 'carry', { prop: 'box', wander: true }),
      T('truck', 'Load the truck', '🚚', 'carry', { prop: 'box', at: 'truck' }),
      T('guard', 'Pay off the harbour guard', '💵', 'talk', { at: 'lookout' }),
      T('hide', 'Hide the goods under fish', '🐟', 'work', { at: 'crates' }),
    ],
    levels: [
      { title: 'Loader', pay: 350, minutes: 240, careerXp: 40, promoteAt: 0, requires: {} },
      { title: 'Runner', pay: 560, minutes: 240, careerXp: 50, promoteAt: 220, requires: { fitness: 2 } },
      { title: 'Harbour Boss', pay: 900, minutes: 300, careerXp: 60, promoteAt: 650, requires: { fitness: 3, communication: 3 } },
    ],
  },
}
export const CAREER_IDS = Object.keys(CAREERS) as CareerId[]
/** Careers you can apply for at a destination. */
export const careersAt = (destId: string) => CAREER_IDS.filter((c) => CAREERS[c].workplace === destId)
export const shiftTaskDef = (career: CareerId, key: string) => CAREERS[career]?.tasks.find((t) => t.key === key)

/* ------------------------------------------------------------------ */
/* Furniture and homes                                                 */
/* ------------------------------------------------------------------ */
export interface FurnitureDef {
  type: FurnitureType
  name: string
  emoji: string
  w: number
  d: number
  price: number
  comfort: number
  sleepMult?: number
  blurb: string
  /** You can walk through it (doorways). */
  walkable?: boolean
  /** Walls and doorways for splitting a home into rooms. */
  build?: boolean
  /** Catalogue section. */
  cat?: FurnitureCat
  /** Catalogue range: standard, premium or luxury. */
  tier?: FurnitureTier
}
export type FurnitureCat = 'living' | 'bedroom' | 'kitchen' | 'bath' | 'decor' | 'tech' | 'wellness'
export type FurnitureTier = 'standard' | 'premium' | 'luxury'
export const FURNITURE_CATS: { id: FurnitureCat | 'all'; name: string; emoji: string }[] = [
  { id: 'all', name: 'All', emoji: '✨' },
  { id: 'living', name: 'Living', emoji: '🛋️' },
  { id: 'bedroom', name: 'Bedroom', emoji: '🛏️' },
  { id: 'kitchen', name: 'Kitchen', emoji: '🍽️' },
  { id: 'bath', name: 'Bath', emoji: '🛁' },
  { id: 'decor', name: 'Decor', emoji: '🖼️' },
  { id: 'tech', name: 'Tech', emoji: '🎮' },
  { id: 'wellness', name: 'Wellness', emoji: '💆' },
]
export const FURNITURE: Record<FurnitureType, FurnitureDef> = {
  bed_basic: { type: 'bed_basic', name: 'Foam mattress', emoji: '🛏️', w: 2, d: 1, price: 0, comfort: 0, sleepMult: 0.85, blurb: 'Thin but it works.' },
  bed_comfy: { type: 'bed_comfy', name: 'Queen bed', emoji: '🛏️', w: 2, d: 1, price: 0, comfort: 2, sleepMult: 1.0, blurb: 'A proper bed.' },
  bed_king: { type: 'bed_king', name: 'King bed', emoji: '🛏️', w: 2, d: 2, price: 0, comfort: 4, sleepMult: 1.15, blurb: 'Deep, restful sleep.' },
  bed_double: { type: 'bed_double', name: 'Double bed', emoji: '🛏️', w: 2, d: 2, price: 1400, comfort: 3, sleepMult: 1.1, blurb: 'Sleep restores 10% more.', cat: 'bedroom', tier: 'premium' },
  toilet: { type: 'toilet', name: 'Toilet', emoji: '🚽', w: 1, d: 1, price: 0, comfort: 0, blurb: 'Essential.' },
  shower: { type: 'shower', name: 'Shower', emoji: '🚿', w: 1, d: 1, price: 0, comfort: 0, blurb: 'Hot water most days.' },
  shower_rain: { type: 'shower_rain', name: 'Rain shower', emoji: '🚿', w: 1, d: 1, price: 0, comfort: 2, blurb: 'Feels like a spa.' },
  fridge: { type: 'fridge', name: 'Refrigerator', emoji: '🧊', w: 1, d: 1, price: 900, comfort: 1, blurb: 'Cook meals and grab snacks at home.', cat: 'kitchen', tier: 'standard' },
  sofa: { type: 'sofa', name: 'Sofa', emoji: '🛋️', w: 2, d: 1, price: 1100, comfort: 3, blurb: 'Relax and recover a little energy.', cat: 'living', tier: 'standard' },
  computer: { type: 'computer', name: 'Computer desk', emoji: '🖥️', w: 2, d: 1, price: 1750, comfort: 1, blurb: 'Study, play and take freelance gigs.', cat: 'tech', tier: 'standard' },
  tv: { type: 'tv', name: 'Television', emoji: '📺', w: 2, d: 1, price: 1300, comfort: 2, blurb: 'Big fun boost after a long day.', cat: 'tech', tier: 'standard' },
  bookshelf: { type: 'bookshelf', name: 'Bookshelf', emoji: '📚', w: 1, d: 1, price: 450, comfort: 1, blurb: 'Read to grow Communication.', cat: 'living', tier: 'standard' },
  plant: { type: 'plant', name: 'Potted palm', emoji: '🪴', w: 1, d: 1, price: 120, comfort: 3, blurb: 'Fresh air. Boosts sleep quality.', cat: 'decor', tier: 'standard' },
  fan: { type: 'fan', name: 'Standing fan', emoji: '🌀', w: 1, d: 1, price: 300, comfort: 4, blurb: 'Cooler nights, better sleep.', cat: 'living', tier: 'standard' },
  coalpot: { type: 'coalpot', name: 'Coal pot', emoji: '🔥', w: 1, d: 1, price: 60, comfort: 0, blurb: 'Charcoal stove, the compound-house kitchen. Cook your own meals.', cat: 'kitchen', tier: 'standard' },
  stove: { type: 'stove', name: 'Gas cooker', emoji: '🍳', w: 2, d: 1, price: 650, comfort: 2, blurb: 'Two-burner gas cooker with an oven. Cook faster and better.', cat: 'kitchen', tier: 'standard' },
  bed_luxury: { type: 'bed_luxury', name: 'Four-poster canopy bed', emoji: '🛏️', w: 2, d: 2, price: 9500, comfort: 6, sleepMult: 1.25, cat: 'bedroom', tier: 'luxury', blurb: 'Carved mahogany, silk drapes, Egyptian cotton. Sleep restores 25% more.' },
  armchair: { type: 'armchair', name: 'Velvet armchair', emoji: '💺', w: 1, d: 1, price: 650, comfort: 2, cat: 'living', tier: 'premium', blurb: 'Deep emerald velvet with brass feet.' },
  coffee_table: { type: 'coffee_table', name: 'Marble coffee table', emoji: '🪨', w: 2, d: 1, price: 1200, comfort: 2, cat: 'living', tier: 'premium', blurb: 'Carrara marble top on a gold frame.' },
  sectional: { type: 'sectional', name: 'Italian leather sectional', emoji: '🛋️', w: 3, d: 2, price: 6800, comfort: 7, cat: 'living', tier: 'luxury', blurb: 'L-shaped, hand-stitched leather. The best seat in Accra.' },
  rug: { type: 'rug', name: 'Persian rug', emoji: '🧶', w: 2, d: 2, price: 900, comfort: 3, walkable: true, cat: 'decor', tier: 'premium', blurb: 'Hand-knotted wool. Walk right over it.' },
  floor_lamp: { type: 'floor_lamp', name: 'Arc floor lamp', emoji: '💡', w: 1, d: 1, price: 380, comfort: 2, cat: 'decor', tier: 'standard', blurb: 'Warm light that glows at night.' },
  dining_set: { type: 'dining_set', name: 'Six-seat dining set', emoji: '🍽️', w: 2, d: 2, price: 2600, comfort: 3, cat: 'kitchen', tier: 'premium', blurb: 'Walnut table and upholstered chairs. Dine like a family.' },
  wardrobe: { type: 'wardrobe', name: 'Walk-in wardrobe', emoji: '🚪', w: 2, d: 1, price: 1800, comfort: 2, cat: 'bedroom', tier: 'premium', blurb: 'Mirrored doors and space for every outfit.' },
  vanity: { type: 'vanity', name: 'Hollywood vanity', emoji: '🪞', w: 1, d: 1, price: 1400, comfort: 2, cat: 'bedroom', tier: 'premium', blurb: 'Bulb-lit mirror. Get ready like a star.' },
  espresso: { type: 'espresso', name: 'Espresso bar', emoji: '☕', w: 1, d: 1, price: 1900, comfort: 2, cat: 'kitchen', tier: 'premium', blurb: 'Barista machine. A strong cup gives you energy.' },
  kitchen_island: { type: 'kitchen_island', name: 'Chef’s kitchen island', emoji: '👨‍🍳', w: 2, d: 1, price: 7200, comfort: 4, cat: 'kitchen', tier: 'luxury', blurb: 'Quartz island with induction hob. Best meals, fastest.' },
  bathtub: { type: 'bathtub', name: 'Freestanding bathtub', emoji: '🛁', w: 2, d: 1, price: 4500, comfort: 4, cat: 'bath', tier: 'premium', blurb: 'Clawfoot tub. Soak away the day.' },
  jacuzzi: { type: 'jacuzzi', name: 'Jacuzzi spa', emoji: '♨️', w: 2, d: 2, price: 18000, comfort: 8, cat: 'bath', tier: 'luxury', blurb: 'Bubbling jets and mood lights. Pure luxury.' },
  orchid: { type: 'orchid', name: 'Orchid in gold vase', emoji: '🌸', w: 1, d: 1, price: 280, comfort: 2, cat: 'decor', tier: 'standard', blurb: 'Elegant blooms on a plinth.' },
  gold_mirror: { type: 'gold_mirror', name: 'Gilded floor mirror', emoji: '🪞', w: 1, d: 1, price: 2100, comfort: 2, cat: 'decor', tier: 'luxury', blurb: 'Baroque gold frame. Makes any room look bigger.' },
  sculpture: { type: 'sculpture', name: 'Bronze sculpture', emoji: '🗿', w: 1, d: 1, price: 4800, comfort: 3, cat: 'decor', tier: 'luxury', blurb: 'Signed piece by an Accra artist on a marble plinth.' },
  aquarium: { type: 'aquarium', name: 'Tropical aquarium', emoji: '🐠', w: 2, d: 1, price: 5200, comfort: 5, cat: 'decor', tier: 'luxury', blurb: 'Reef fish and soft blue light. Very calming.' },
  bar_cabinet: { type: 'bar_cabinet', name: 'Home bar', emoji: '🍾', w: 2, d: 1, price: 5600, comfort: 3, cat: 'living', tier: 'luxury', blurb: 'Back-lit shelves of spirits and champagne.' },
  piano: { type: 'piano', name: 'Grand piano', emoji: '🎹', w: 2, d: 2, price: 24000, comfort: 5, cat: 'living', tier: 'luxury', blurb: 'Gloss black concert grand. Play to unwind and charm.' },
  console: { type: 'console', name: 'Gaming console', emoji: '🎮', w: 1, d: 1, price: 2400, comfort: 2, cat: 'tech', tier: 'premium', blurb: 'Latest console with FIFA. Big fun boost.' },
  home_cinema: { type: 'home_cinema', name: 'Home cinema wall', emoji: '🎬', w: 3, d: 1, price: 16000, comfort: 6, cat: 'tech', tier: 'luxury', blurb: '100-inch screen and Dolby sound. Movie night every night.' },
  treadmill: { type: 'treadmill', name: 'Smart treadmill', emoji: '🏃', w: 1, d: 2, price: 3800, comfort: 1, cat: 'wellness', tier: 'premium', blurb: 'Train Fitness without going to the gym.' },
  massage_chair: { type: 'massage_chair', name: 'Massage chair', emoji: '💆', w: 1, d: 1, price: 7500, comfort: 5, cat: 'wellness', tier: 'luxury', blurb: 'Zero-gravity recliner. Melts away tiredness.' },
  wall: { type: 'wall', name: 'Wall (1 m)', emoji: '🧱', w: 1, d: 1, price: 120, comfort: 0, build: true, blurb: 'Block wall section. Rotate to run it the other way.' },
  wall_long: { type: 'wall_long', name: 'Wall (3 m)', emoji: '🧱', w: 3, d: 1, price: 320, comfort: 0, build: true, blurb: 'Long wall to split the room in two.' },
  wall_half: { type: 'wall_half', name: 'Half wall', emoji: '🪵', w: 2, d: 1, price: 180, comfort: 1, build: true, blurb: 'Waist-high divider, like a kitchen counter.' },
  doorway: { type: 'doorway', name: 'Doorway', emoji: '🚪', w: 1, d: 1, price: 250, comfort: 0, build: true, walkable: true, blurb: 'Wall with a door. Join it to walls to make a room.' },
}
/** Walls, half walls and doorways for building rooms inside your home. */
export const BUILD_PIECES: FurnitureType[] = ['wall', 'wall_long', 'wall_half', 'doorway']
/** Share of the price you get back when selling. */
export const SELL_BACK = { furniture: 0.5, vehicle: 0.6 }
/** Renting out homes you own. */
export const RENT_OUT = {
  /** Daily income from a bought home you do not live in, as a share of its weekly rent (after agent fees). */
  homeShare: 0.85 / 7,
  /** Daily rent for a finished house on your land. */
  house: { bungalow: [140, 200], villa: [300, 420] } as Partial<Record<ProjectId, [number, number]>>,
  /** Daily rent from a boys' quarters flat. */
  flat: [90, 140] as [number, number],
}
/** Everything for sale, cheapest first. */
export const SHOP_FURNITURE: FurnitureType[] = (Object.keys(FURNITURE) as FurnitureType[])
  .filter((t) => FURNITURE[t].price > 0 && !FURNITURE[t].build)
  .sort((a, b) => FURNITURE[a].price - FURNITURE[b].price)
export const isBed = (t: FurnitureType) => t.startsWith('bed_')

export interface HomeDef {
  tier: HomeTier
  name: string
  destId: string
  rent: number
  /** Price to buy outright (0 = not for sale). Owned homes pay no rent. */
  buy: number
  grid: { w: number; d: number }
  door: { x: number; y: number }
  comfort: number
  fixtures: { type: FurnitureType; x: number; y: number; rot: 0 | 1 }[]
  amenities: string[]
  floor: string
}
// `house` is added below once its fixtures are defined
export const HOMES: Record<HomeTier, HomeDef> = <Record<HomeTier, HomeDef>>{
  room: {
    tier: 'room', name: 'Basic room', destId: 'home_room', rent: 400, buy: 0, grid: { w: 6, d: 5 }, door: { x: 2, y: 4 }, comfort: 0, floor: '#c9a27a',
    fixtures: [
      { type: 'bed_basic', x: 0, y: 0, rot: 0 },
      { type: 'toilet', x: 5, y: 0, rot: 0 },
      { type: 'shower', x: 5, y: 1, rot: 0 },
      { type: 'coalpot', x: 5, y: 3, rot: 0 },
    ],
    amenities: ['6×5 room', 'Foam mattress', 'Shared compound', 'Shared bucket shower', 'Coal pot for cooking'],
  },
  apartment: {
    tier: 'apartment', name: 'Apartment', destId: 'apartment', rent: 900, buy: 22000, grid: { w: 8, d: 6 }, door: { x: 3, y: 5 }, comfort: 6, floor: '#d8c8a8',
    fixtures: [
      { type: 'bed_comfy', x: 0, y: 0, rot: 0 },
      { type: 'toilet', x: 7, y: 0, rot: 0 },
      { type: 'shower', x: 7, y: 1, rot: 0 },
      { type: 'fridge', x: 0, y: 5, rot: 0 },
      { type: 'stove', x: 1, y: 5, rot: 0 },
    ],
    amenities: ['8×6 flat', 'Queen bed', 'Built-in fridge', 'Balcony', 'Power backup'],
  },
  premium: {
    tier: 'premium', name: 'Premium home', destId: 'home_premium', rent: 2200, buy: 55000, grid: { w: 10, d: 7 }, door: { x: 4, y: 6 }, comfort: 14, floor: '#e8e2d6',
    fixtures: [
      { type: 'bed_king', x: 0, y: 0, rot: 0 },
      { type: 'toilet', x: 9, y: 0, rot: 0 },
      { type: 'shower_rain', x: 9, y: 1, rot: 0 },
      { type: 'fridge', x: 0, y: 6, rot: 0 },
      { type: 'stove', x: 1, y: 6, rot: 0 },
      { type: 'sofa', x: 4, y: 0, rot: 0 },
      { type: 'tv', x: 6, y: 0, rot: 0 },
    ],
    amenities: ['10×7 villa', 'King bed', 'Rain shower', 'Sofa and TV included', 'Sea view terrace', 'Air conditioning'],
  },
}
export const HOME_TIERS: HomeTier[] = ['room', 'apartment', 'premium']
HOMES.house = {
  tier: 'house', name: 'Your own house', destId: 'plot', rent: 0, buy: 0, grid: { w: 10, d: 8 }, door: { x: 4, y: 7 }, comfort: 12, floor: '#d9c7a6',
  fixtures: [
    { type: 'bed_king', x: 0, y: 0, rot: 0 },
    { type: 'toilet', x: 9, y: 0, rot: 0 },
    { type: 'shower_rain', x: 9, y: 1, rot: 0 },
    { type: 'fridge', x: 0, y: 7, rot: 0 },
    { type: 'stove', x: 1, y: 7, rot: 0 },
  ],
  amenities: ['10×8 house you built', 'No rent ever', 'King bed', 'Rain shower', 'Compound and garden'],
}

/* ------------------------------ home upgrades ------------------------------ */
export interface UpgradeDef {
  id: string
  name: string
  emoji: string
  price: number
  comfort: number
  blurb: string
}
export const UPGRADES: UpgradeDef[] = [
  { id: 'paint', name: 'Fresh paint & tiles', emoji: '🎨', price: 300, comfort: 3, blurb: '+3 comfort. Brighter, cleaner room.' },
  { id: 'ac', name: 'Air conditioner', emoji: '❄️', price: 1500, comfort: 6, blurb: '+6 comfort. Cool nights in the Accra heat.' },
  { id: 'generator', name: 'Solar & generator', emoji: '🔋', price: 2000, comfort: 2, blurb: 'Dumsor-proof: power cuts no longer ruin your night.' },
  { id: 'flat', name: 'Boys’ quarters flat', emoji: '🏘️', price: 9000, comfort: 0, blurb: 'Owned homes only. A self-contained flat on your compound, let to a tenant: GH₵90–140 a day.' },
  { id: 'garage', name: 'Parking bay', emoji: '🅿️', price: 1200, comfort: 1, blurb: 'Apartments only. A secure bay for one car.' },
  { id: 'net', name: 'Mosquito nets', emoji: '🦟', price: 80, comfort: 1, blurb: 'Big cut to your malaria risk.' },
  { id: 'extend1', name: 'Room extension', emoji: '🧱', price: 2500, comfort: 2, blurb: 'Owned homes only. Knock through a wall: +2 columns and +1 row.' },
  { id: 'extend2', name: 'Second extension', emoji: '🏗️', price: 6000, comfort: 3, blurb: 'Owned homes only. Even more room. Needs the first extension.' },
  { id: 'extend3', name: 'Third extension', emoji: '🏚️', price: 12000, comfort: 4, blurb: 'Owned homes only. A whole new wing. Needs the second extension.' },
  { id: 'extend4', name: 'Fourth extension', emoji: '🏰', price: 20000, comfort: 5, blurb: 'Owned homes only. Mansion-sized. Needs the third extension.' },
]

/* ------------------------------ land & building ------------------------------ */
export interface PlotDef {
  id: string
  price: number
  /** Daily value growth (compounding). */
  growth: number
  /** Chance land guards contest the land after you buy it. */
  guardRisk: number
}
export const PLOTS: PlotDef[] = [
  { id: 'plot_dansoman', price: 4000, growth: 0.004, guardRisk: 0.15 },
  { id: 'plot_madina', price: 5500, growth: 0.006, guardRisk: 0.3 },
  { id: 'plot_spintex', price: 7000, growth: 0.006, guardRisk: 0.35 },
  { id: 'plot_teshie', price: 6000, growth: 0.007, guardRisk: 0.6 },
  { id: 'plot_eastlegon', price: 14000, growth: 0.01, guardRisk: 0.6 },
  { id: 'plot_trassaco', price: 25000, growth: 0.012, guardRisk: 0.3 },
  ...GEN_PLOTS.map((g) => ({ id: g.dest.id, price: g.price, growth: g.growth, guardRisk: g.guardRisk })),
]
export const PLOT_BY_ID: Record<string, PlotDef> = Object.fromEntries(PLOTS.map((p) => [p.id, p]))
export const PERMIT = { fee: 1500, days: 2, bribe: 700, bribeChance: 0.75, noPermitRisk: 0.35, demolitionFine: 2000 }
export const GUARDS = { settleShare: 0.15, policeShare: 0.06, policeChance: 0.6, reportChance: 0.4 }
/** Kept for older references: cheapest plot price. */
export const LAND_PRICE = 4000
export const BUILD_STAGES = [
  { name: 'Foundation', price: 4000, days: 1, emoji: '🧱' },
  { name: 'Walls', price: 5000, days: 1, emoji: '🏗️' },
  { name: 'Roof', price: 3500, days: 1, emoji: '🏠' },
  { name: 'Finishing & paint', price: 4500, days: 1, emoji: '🎨' },
]

/* ------------------------------ building projects on your land ------------------------------ */
export type ProjectId = 'bungalow' | 'villa' | 'guesthouse' | 'apartments' | 'plaza'
export interface ProjectDef {
  id: ProjectId
  name: string
  emoji: string
  blurb: string
  /** Cost multiplier on the basic stages. */
  cost: number
  /** Extra stages after the basic four (e.g. upper floors). */
  extra: { name: string; price: number; days: number; emoji: string }[]
  /** You can live in it when it is finished. */
  livable: boolean
  /** Daily income once finished (rent, guests or shop tenants). */
  income?: [number, number]
  /** Value of finished work relative to what you spent. */
  valueMult: number
}
export const PROJECTS: Record<ProjectId, ProjectDef> = {
  bungalow: { id: 'bungalow', name: 'Family bungalow', emoji: '🏠', blurb: 'Three bedrooms. Move in and stop paying rent.', cost: 1, extra: [], livable: true, valueMult: 1.25 },
  villa: { id: 'villa', name: 'Luxury villa', emoji: '🏡', blurb: 'Two storeys, pool and boys’ quarters. Live in style; worth a lot more.', cost: 2.4, extra: [{ name: 'Pool & landscaping', price: 9000, days: 1, emoji: '🏊' }], livable: true, valueMult: 1.45 },
  guesthouse: { id: 'guesthouse', name: 'Guesthouse', emoji: '🛏️', blurb: 'Six rooms for travellers and short stays. Earns every day.', cost: 1.6, extra: [{ name: 'Furnish rooms', price: 5000, days: 1, emoji: '🛋️' }], livable: false, income: [180, 320], valueMult: 1.3 },
  apartments: { id: 'apartments', name: 'Apartment block', emoji: '🏢', blurb: 'Eight flats to rent out. Steady monthly-style income.', cost: 2.6, extra: [{ name: 'Upper floors', price: 14000, days: 2, emoji: '🏗️' }], livable: false, income: [380, 560], valueMult: 1.35 },
  plaza: { id: 'plaza', name: 'Shopping plaza', emoji: '🏬', blurb: 'Ground-floor shops let to traders. Best in busy areas.', cost: 2.2, extra: [{ name: 'Shop fronts & signs', price: 7000, days: 1, emoji: '🪧' }], livable: false, income: [300, 520], valueMult: 1.3 },
}
export const PROJECT_IDS = Object.keys(PROJECTS) as ProjectId[]
/** Building stages for a project (old saves without a project build a bungalow). */
export function projectStages(project: ProjectId | null | undefined) {
  const p = PROJECTS[project ?? 'bungalow']
  return [...BUILD_STAGES.map((b) => ({ ...b, price: Math.round(b.price * p.cost) })), ...p.extra]
}
/** Sell-back rate for homes you bought. */
export const HOME_SELL_BACK = 0.9

/* ------------------------------ education ------------------------------ */
export const PROGRAMS = {
  cs: { name: 'BSc Computer Science', skill: 'technology' as SkillId, career: 'technology' as CareerId, fee: 1200 },
  bba: { name: 'BSc Business Admin', skill: 'communication' as SkillId, career: 'retail' as CareerId, fee: 1000 },
  culinary: { name: 'Diploma in Culinary Arts', skill: 'cooking' as SkillId, career: 'hospitality' as CareerId, fee: 900 },
}
export type ProgramId = keyof typeof PROGRAMS
export const CLASSES_TO_GRADUATE = 6
export const DEGREE_WAGE_BONUS = 1.2

/* ------------------------------ health ------------------------------ */
export const ILLNESSES = {
  malaria: { name: 'Malaria', emoji: '🦟', blurb: 'Fever and chills. Energy drains much faster.' },
  flu: { name: 'Flu', emoji: '🤧', blurb: 'Runny nose and aches.' },
  food: { name: 'Food poisoning', emoji: '🤢', blurb: 'Something you ate did not agree with you.' },
  injury: { name: 'Injury', emoji: '🤕', blurb: 'Bruised from a fight.' },
  sti: { name: 'Infection (STI)', emoji: '🦠', blurb: 'Needs a doctor. Always use protection.' },
}
export type IllnessId = keyof typeof ILLNESSES
export const HEALTH = { consult: 80, consultNhis: 15, meds: 35, nhis: 60, ward: 250, wardNhis: 50, untreatedDays: 3 }

/* ------------------------------ legal ------------------------------ */
export const OFFICERS = {
  greedy: { name: 'Corporal Asare', note: 'keeps glancing at your pocket. He looks like he can be persuaded.', accept: 0.9 },
  cautious: { name: 'Sergeant Ofori', note: 'looks around nervously. Hard to read.', accept: 0.5 },
  honest: { name: 'Inspector Badu', note: 'wears a name badge and a body camera. Strictly by the book.', accept: 0 },
}
export const CHARGES = { theft: { name: 'theft', fine: 300 }, robbery: { name: 'armed robbery', fine: 1500 }, laundering: { name: 'money laundering', fine: 2000 }, bribery: { name: 'attempted bribery of a public officer', fine: 800 }, licence: { name: 'licence fraud', fine: 600 }, soliciting: { name: 'soliciting', fine: 400 }, galamsey: { name: 'illegal mining (galamsey)', fine: 2500 }, fraud: { name: 'cyber fraud', fine: 3000 }, smuggling: { name: 'smuggling', fine: 2200 } }
/** Cleaning dirty cash. Business: low fee and risk, but capped by the till each day. Makola forex boys: any amount, pricier, police stings. */
export const LAUNDER = {
  business: { fee: 0.1, auditChance: 0.05, auditFine: 0.3, capDays: 3 },
  forex: { fee: 0.2, streetFee: 0.15, max: 5000, stingChance: 0.1, dest: 'market' },
}
/** Activities that earn respect in the community when completed. */
export const RESPECT_ACTS: Record<string, number> = { service: 3, prayer: 1, choir: 2, volunteer: 4, watch: 4, wedding: 2, donate: 6, lecture: 1, wassce: 1, debate: 1 }
/** Street cred needed to be trusted with illegal work. */
export const STREET_REQ: Partial<Record<string, number>> = { sakawa: 15, smuggler: 30 }
/** Careers that run a background check: minimum respect. */
export const RESPECT_REQ: Partial<Record<string, number>> = { banker: 25, teacher: 20, nurse: 20 }
/** Courts and prison. Scales are game minutes per real second: custody ≈ 18 s, a prison day ≈ 24 s (7 days ≈ 3 min). */
export const LEGAL = { custodyMinutes: 720, custodyScale: 40, courtDays: 2, fine: 300, lawyer: 400, bail: 250, jailGuilty: 3, jailConvicted: 7, jailWarrant: 5, jailScale: 60 }

/* ------------------------------ businesses you can own ------------------------------ */
export interface BusinessDef {
  id: string
  name: string
  emoji: string
  area: string
  price: number
  /** Daily profit range at level 1 (paid into your wallet each morning). */
  income: [number, number]
  blurb: string
}
export const BUSINESSES: BusinessDef[] = [
  { id: 'kiosk', name: 'Provisions kiosk', emoji: '🏪', area: 'Nima', price: 2500, income: [45, 95], blurb: 'Sachet water, Milo, bread and airtime.' },
  { id: 'barber', name: 'Barbering salon', emoji: '💈', area: 'Kaneshie', price: 6000, income: [110, 200], blurb: 'Fades, braids and Premier League on the TV.' },
  { id: 'carwash', name: 'Car wash', emoji: '🧽', area: 'Spintex', price: 8000, income: [140, 260], blurb: 'Busy every weekend on Spintex Road.' },
  { id: 'chopbar', name: 'Chop bar', emoji: '🍲', area: 'Osu', price: 14000, income: [240, 420], blurb: 'Fufu, banku and light soup from noon.' },
  { id: 'pharmacy', name: 'Chemist shop', emoji: '💊', area: 'Madina', price: 22000, income: [360, 560], blurb: 'Licensed over-the-counter medicines.' },
  { id: 'trotrofleet', name: 'Trotro fleet (3 buses)', emoji: '🚐', area: 'Circle', price: 45000, income: [700, 1100], blurb: 'Your drivers pay you "sales" every evening.' },
  { id: 'hostel', name: 'Student hostel', emoji: '🏢', area: 'Legon', price: 90000, income: [1300, 1900], blurb: 'Forty rooms next to the university.' },
]
export const BUSINESS_BY_ID: Record<string, BusinessDef> = Object.fromEntries(BUSINESSES.map((b) => [b.id, b]))
/** Each upgrade level adds 35% income and costs half the purchase price. Max level 3. */
export const BIZ = { upgradeIncome: 0.35, upgradeCost: 0.5, maxLevel: 3, sellBack: 0.75, badDayChance: 0.08 }

/* ------------------------------ live shows at the AICC ------------------------------ */
export const ARTISTS = [
  { name: 'Nana Vybz', genre: 'Afrobeats', emoji: '🔥' },
  { name: 'Lady Adjoa', genre: 'Highlife', emoji: '🎷' },
  { name: 'Kwabena Flow', genre: 'Hiplife', emoji: '🎤' },
  { name: 'DJ Kwesi Wave', genre: 'Amapiano', emoji: '🎧' },
  { name: 'Ama Melody', genre: 'Gospel night', emoji: '🙌' },
  { name: 'Yaw Riddim', genre: 'Dancehall', emoji: '🎶' },
  { name: 'The Highlife Kings', genre: 'Live band', emoji: '🎺' },
]
/** Tonight's headliner at the AICC (a different act every night). */
export const showOn = (day: number) => ARTISTS[((day % ARTISTS.length) + ARTISTS.length) % ARTISTS.length]

/* ------------------------------ romance ------------------------------ */
export const ROMANCE = { askAt: 40, proposeAt: 80, datesToPropose: 3, ring: 1500, wedding: 3000, spouseSupport: 40, dateCost: 60 }

/* ------------------------------ money & investing ------------------------------ */
export const LOAN = { fee: 0.069, days: 7, lateDaily: 0.01, baseLimit: 100, perCredit: 15, minCredit: 20 }
export const FINANCE = { bankDailyRate: 0.0004, eLevy: 0.01, tbillDays: 7, tbillReturn: 0.03, tbillMin: 100 }
export const STOCKS = [
  { id: 'ASHG', name: 'Ashanti Gold Mines', start: 12, vol: 0.04, drift: 0.003 },
  { id: 'COCO', name: 'CocoaBoard Holdings', start: 8, vol: 0.03, drift: 0.002 },
  { id: 'TELG', name: 'TelGhana', start: 3.5, vol: 0.05, drift: 0.004 },
  { id: 'KNTE', name: 'Kente Textiles', start: 1.2, vol: 0.08, drift: 0.002 },
]

/* ------------------------------ transport ------------------------------ */
export type RideMode = 'trotro' | 'taxi' | 'ride' | 'okada' | 'pragia' | 'own'
export const KM_PER_TILE = 0.12
export const RIDES: Record<RideMode, { name: string; emoji: string; blurb: string; base: number; perKm: number; wait: number; minPerKm: number }> = {
  okada: { name: 'Okada', emoji: '🏍️', blurb: 'Motorbike taxi. Fast through traffic, a bit risky.', base: 5, perKm: 1.8, wait: 2, minPerKm: 1.1 },
  pragia: { name: 'Pragia', emoji: '🛺', blurb: 'Tricycle taxi. Cheap, shared, breezy.', base: 4, perKm: 1.2, wait: 4, minPerKm: 1.8 },
  trotro: { name: 'Trotro', emoji: '🚐', blurb: 'Cheapest. Shared minibus, may hit go-slow.', base: 4, perKm: 0.8, wait: 10, minPerKm: 3 },
  taxi: { name: 'Taxi (dropping)', emoji: '🚕', blurb: 'Private drop straight to the door.', base: 12, perKm: 4, wait: 4, minPerKm: 1.6 },
  ride: { name: 'Order a ride', emoji: '📱', blurb: 'App ride with AC. Surge pricing at night.', base: 10, perKm: 3.5, wait: 6, minPerKm: 1.4 },
  own: { name: 'Drive your car', emoji: '🚗', blurb: 'Your own wheels. Pay only for fuel.', base: 2, perKm: 0.9, wait: 1, minPerKm: 1.1 },
}

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */
const A = (a: ActivityDef): ActivityDef => a

export const DEST_ACTIVITIES: Record<string, ActivityDef[]> = {
  guesthouse_osu: [
    A({ id: 'hotelnight', label: 'Rent a room for the night', blurb: 'Clean sheets, a fan and a lock on the door.', icon: '🛏️', kind: 'sleep', minutes: 480, cost: 120, needs: { energy: 90, hygiene: 20, hunger: -12 }, timeScale: 'sleep' }),
    A({ id: 'gh_shower', label: 'Freshen up', blurb: 'Hot shower down the hall.', icon: '🚿', kind: 'generic', minutes: 20, cost: 15, needs: { hygiene: 60 } }),
  ],
  foodstall: [
    A({ id: 'waakye', label: 'Waakye with egg & wele', blurb: 'Rice and beans, shito, gari, spaghetti. The full works.', icon: '🍛', kind: 'meal', minutes: 30, cost: 35, needs: { hunger: 50, fun: 6, bladder: -4 } }),
    A({ id: 'banku', label: 'Banku & grilled tilapia', blurb: 'With hot pepper and onions.', icon: '🐟', kind: 'meal', minutes: 35, cost: 45, needs: { hunger: 56, fun: 9, bladder: -4 } }),
    A({ id: 'kelewele', label: 'Kelewele', blurb: 'Spicy fried plantain. Quick and tasty.', icon: '🍌', kind: 'meal', minutes: 15, cost: 15, needs: { hunger: 24, fun: 6, bladder: -2 } }),
    A({ id: 'sobolo', label: 'Chilled sobolo', blurb: 'Hibiscus drink with ginger.', icon: '🥤', kind: 'meal', minutes: 10, cost: 6, needs: { hunger: 4, fun: 5, bladder: -6 } }),
    A({ id: 'dishes', label: 'Help wash dishes', blurb: 'Free work if you are broke. Auntie Esi feeds you too.', icon: '🧽', kind: 'oddjob', minutes: 60, reward: 30, needs: { energy: -8, hunger: 12, hygiene: -6 }, dailyLimit: 2 }),
  ],
  market: [
    A({ id: 'boli', label: 'Kofi Brokeman', blurb: 'Roasted plantain with groundnuts.', icon: '🥜', kind: 'meal', minutes: 10, cost: 10, needs: { hunger: 18, fun: 3 } }),
    A({ id: 'fruit', label: 'Pineapple & coconut', blurb: 'Fresh from the Volta region.', icon: '🍍', kind: 'meal', minutes: 10, cost: 15, needs: { hunger: 22, fun: 3, bladder: -2 } }),
    A({ id: 'browse', label: 'Browse the stalls', blurb: 'Free window shopping and banter.', icon: '👀', kind: 'social', minutes: 30, needs: { fun: 8, social: 4 }, dailyLimit: 3 }),
    A({ id: 'purewater', label: 'Hustle: sell pure water in traffic', blurb: 'Weave between cars at Circle. Hot work.', icon: '💧', kind: 'oddjob', minutes: 90, reward: 35, needs: { energy: -12, hygiene: -8, hunger: -6 }, dailyLimit: 2 }),
    A({ id: 'obroni', label: 'Hustle: sell second-hand clothes', blurb: 'Obroni wawu from Kantamanto. Good talkers sell more.', icon: '👕', kind: 'oddjob', minutes: 120, reward: 55, needs: { energy: -10, social: 8 }, skillXp: { communication: 5 }, dailyLimit: 1 }),
    A({ id: 'phonefix', label: 'Hustle: phone repairs', blurb: 'Fix screens at a market stall. Needs Technology 2.', icon: '📱', kind: 'oddjob', minutes: 120, reward: 80, needs: { energy: -8 }, skillXp: { technology: 6 }, minSkill: { technology: 2 }, dailyLimit: 1 }),
    A({ id: 'pickpocket', label: 'Pickpocket in the crowd', blurb: 'Crime. Market crowds are easy, but police patrol.', icon: '🫳', kind: 'crime', minutes: 30, crime: { chance: 0.55, min: 25, max: 100 }, needs: { fun: 3 } }),
    A({ id: 'haul', label: 'Carry traders’ goods', blurb: 'Kayayo odd job. No experience needed.', icon: '📦', kind: 'oddjob', minutes: 90, reward: 45, needs: { energy: -14, hunger: -8, hygiene: -6 }, skillXp: { communication: 3 }, dailyLimit: 2 }),
  ],
  office: [
    A({ id: 'cowork', label: 'Coworking desk', blurb: 'Fast Wi-Fi and focus.', icon: '⌨️', kind: 'study', minutes: 120, cost: 25, needs: { energy: -6, hunger: -6, fun: -2 }, skillXp: { technology: 18 }, hours: [8, 18] }),
  ],
  training: [
    A({ id: 'course_comm', label: 'Communication Workshop', blurb: 'Speak with confidence.', icon: '🗣️', kind: 'study', minutes: 120, cost: 75, needs: { energy: -8, hunger: -6, social: 5 }, skillXp: { communication: 40 } }),
    A({ id: 'course_cook', label: 'Cooking Class', blurb: 'Taste as you learn.', icon: '🍳', kind: 'study', minutes: 120, cost: 100, needs: { energy: -8, hunger: 10, fun: 4 }, skillXp: { cooking: 40 } }),
    A({ id: 'course_tech', label: 'Tech Bootcamp', blurb: 'Unlocks Technology careers.', icon: '💻', kind: 'study', minutes: 180, cost: 150, needs: { energy: -12, hunger: -8, fun: -3 }, skillXp: { technology: 55 } }),
  ],
  gym: [
    A({ id: 'workout', label: 'Weights session', blurb: 'Sweat it out.', icon: '🏋️', kind: 'generic', minutes: 60, cost: 35, needs: { energy: -15, hygiene: -12, fun: 8, hunger: -8 }, skillXp: { fitness: 30 } }),
    A({ id: 'yoga', label: 'Yoga class', blurb: 'Gentle and social.', icon: '🧘', kind: 'generic', minutes: 60, cost: 25, needs: { energy: -5, fun: 12, social: 4 }, skillXp: { fitness: 12 } }),
    A({ id: 'gymshower', label: 'Gym shower', blurb: 'Freshen up.', icon: '🚿', kind: 'generic', minutes: 15, cost: 8, needs: { hygiene: 60 } }),
  ],
  lounge: [
    A({ id: 'hangout', label: 'Dance to Afrobeats', blurb: 'Hit the dance floor.', icon: '💃', kind: 'social', minutes: 90, cost: 40, needs: { fun: 25, social: 20, bladder: -6 } }),
    A({ id: 'mocktail', label: 'Drinks at the bar', blurb: 'Sobolo mocktail and a catch-up.', icon: '🍹', kind: 'social', minutes: 60, cost: 25, needs: { fun: 14, social: 10, bladder: -8 } }),
    A({ id: 'popbottle', label: 'Pop a bottle (VIP table)', blurb: 'Champagne, sparklers and the whole club watching you.', icon: '🍾', kind: 'social', minutes: 45, cost: 250, needs: { fun: 35, social: 30, bladder: -6 }, hours: [18, 6] }),
    A({ id: 'spray', label: 'Spray money on the dance floor', blurb: 'Make it rain cedis. The crowd loves you, and people notice.', icon: '💸', kind: 'social', minutes: 30, cost: 100, needs: { fun: 30, social: 25 }, effect: 'spray', hours: [18, 6] }),
    A({ id: 'hookup_m', label: 'Chat up a guy', blurb: '18+. Find a man on the dance floor and see where the night goes.', icon: '😏', kind: 'social', minutes: 45, needs: { social: 10, fun: 6 }, effect: 'hookup_m', require: 'mature', hours: [20, 6], dailyLimit: 2 }),
    A({ id: 'hookup', label: 'Chat up a girl', blurb: '18+. Find a woman on the dance floor and see where the night goes.', icon: '😏', kind: 'social', minutes: 45, needs: { social: 10, fun: 6 }, effect: 'hookup', require: 'mature', hours: [20, 6], dailyLimit: 2 }),
    A({ id: 'nightwork', label: 'Night work (ashawo)', blurb: '18+. Illegal in Ghana: risk of police raids, robbery and infection.', icon: '🌙', kind: 'generic', minutes: 180, needs: { energy: -20, social: 5, hygiene: -15 }, effect: 'nightwork', require: 'mature', hours: [20, 5], dailyLimit: 1 }),
    A({ id: 'livemusic', label: 'Live highlife night', blurb: 'Live band and DJ. Evenings only.', icon: '🎷', kind: 'social', minutes: 120, cost: 60, needs: { fun: 35, social: 25, energy: -6, bladder: -8 }, hours: [18, 2] }),
  ],
  hospital: [
    A({ id: 'consult', label: 'See a doctor', blurb: 'Diagnosis and treatment. Cures any illness.', icon: '🩺', kind: 'generic', minutes: 120, cost: 80, needs: { energy: 5 }, effect: 'consult', require: 'sick' }),
    A({ id: 'pharmacy', label: 'Pharmacy medicine', blurb: 'Cheap meds for mild illness.', icon: '💊', kind: 'generic', minutes: 15, cost: 35, effect: 'meds', require: 'sick' }),
    A({ id: 'condoms', label: 'Buy condoms (3)', blurb: 'Protection. Cuts infection risk to almost nothing.', icon: '🛡️', kind: 'generic', minutes: 5, cost: 10, effect: 'condoms' }),
    A({ id: 'nhis', label: 'Register for NHIS', blurb: 'National health insurance. Doctor visits cost GH₵15.', icon: '🪪', kind: 'generic', minutes: 45, cost: 60, effect: 'nhis', require: 'noNhis' }),
    A({ id: 'checkup', label: 'Health check-up', blurb: 'Peace of mind. Lowers your sickness risk for a week.', icon: '❤️', kind: 'generic', minutes: 60, cost: 40, effect: 'checkup', require: 'healthy' }),
    A({ id: 'volunteer', label: 'Volunteer on the ward', blurb: 'Help the nurses. Good for the soul.', icon: '🤲', kind: 'social', minutes: 120, needs: { social: 15, fun: 5, energy: -10 }, skillXp: { communication: 10 }, dailyLimit: 1 }),
  ],
  university: [
    A({ id: 'enroll_cs', label: 'Enrol: BSc Computer Science', blurb: 'GH₵1,200 tuition. 6 lectures to graduate.', icon: '💻', kind: 'generic', minutes: 60, cost: 1200, effect: 'enroll:cs', require: 'notEnrolled' }),
    A({ id: 'enroll_bba', label: 'Enrol: BSc Business Admin', blurb: 'GH₵1,000 tuition. 6 lectures to graduate.', icon: '📊', kind: 'generic', minutes: 60, cost: 1000, effect: 'enroll:bba', require: 'notEnrolled' }),
    A({ id: 'enroll_culinary', label: 'Enrol: Culinary Arts Diploma', blurb: 'GH₵900 tuition. 6 lectures to graduate.', icon: '🍳', kind: 'generic', minutes: 60, cost: 900, effect: 'enroll:culinary', require: 'notEnrolled' }),
    A({ id: 'lecture', label: 'Attend a lecture', blurb: 'One step closer to your degree.', icon: '🎓', kind: 'study', minutes: 180, needs: { energy: -12, hunger: -8, fun: -3, social: 6 }, effect: 'lecture', require: 'enrolled', hours: [8, 17], dailyLimit: 1 }),
    A({ id: 'library', label: 'Study at Balme Library', blurb: 'Quiet, free and air-conditioned.', icon: '📚', kind: 'study', minutes: 120, needs: { energy: -6, fun: -2 }, skillXp: { communication: 10, technology: 10 } }),
  ],
  school_achimota: [
    A({ id: 'eveningclass', label: 'Evening class: English & Maths', blurb: 'Brush up for interviews. Weekday evenings.', icon: '📘', kind: 'study', minutes: 120, cost: 20, needs: { energy: -8, fun: -3, social: 4 }, skillXp: { communication: 14 }, hours: [16, 20] }),
    A({ id: 'ictclass', label: 'ICT class', blurb: 'Typing, Excel and the internet.', icon: '🖥️', kind: 'study', minutes: 120, cost: 30, needs: { energy: -8, fun: -2 }, skillXp: { technology: 14 }, hours: [9, 18] }),
    A({ id: 'sportsfield', label: 'Run on the sports field', blurb: 'The old track under the trees.', icon: '🏃', kind: 'generic', minutes: 60, needs: { energy: -14, hygiene: -12, fun: 8 }, skillXp: { fitness: 14 } }),
  ],
  school_academy: [
    A({ id: 'wassce', label: 'Remedial WASSCE class', blurb: 'Resit and pass. Opens more jobs.', icon: '📝', kind: 'study', minutes: 150, cost: 25, needs: { energy: -10, fun: -4, social: 4 }, skillXp: { communication: 12, technology: 6 }, hours: [8, 20] }),
    A({ id: 'cookclass', label: 'Home economics class', blurb: 'Jollof, light soup and pastries.', icon: '🍳', kind: 'study', minutes: 120, cost: 30, needs: { hunger: 20, fun: 6 }, skillXp: { cooking: 16 }, hours: [9, 18] }),
    A({ id: 'debate', label: 'Join the debate club', blurb: 'Win arguments, gain confidence.', icon: '🎙️', kind: 'social', minutes: 90, needs: { social: 15, fun: 8 }, skillXp: { communication: 10 }, hours: [15, 19] }),
  ],
  church: [
    A({ id: 'donate', label: 'Give to the church building fund', blurb: 'GH₵200 in the offering bowl. The congregation notices. Raises respect.', icon: '⛪', kind: 'social', minutes: 20, cost: 200, needs: { social: 6, fun: 4 }, dailyLimit: 1 }),
    A({ id: 'service', label: 'Sunday service', blurb: 'Praise, worship and fellowship. Sundays only.', icon: '🙏', kind: 'social', minutes: 180, needs: { social: 25, fun: 15, energy: -6 }, require: 'sunday', hours: [7, 13] }),
    A({ id: 'prayer', label: 'Quiet prayer', blurb: 'A moment of peace.', icon: '🕯️', kind: 'generic', minutes: 30, needs: { fun: 6, social: 3 } }),
    A({ id: 'choir', label: 'Choir practice', blurb: 'Sing your heart out.', icon: '🎤', kind: 'social', minutes: 90, needs: { social: 15, fun: 15, energy: -6 }, skillXp: { communication: 5 }, hours: [16, 20] }),
    A({ id: 'wedding', label: 'Wedding ceremony', blurb: 'Traditional knocking, then the church wedding.', icon: '💒', kind: 'social', minutes: 240, cost: 3000, needs: { fun: 40, social: 40 }, effect: 'wedding', require: 'engaged' }),
  ],
  park: [
    A({ id: 'tour', label: 'Museum tour', blurb: 'The story of independence.', icon: '🏛️', kind: 'study', minutes: 60, cost: 30, needs: { fun: 10 }, skillXp: { communication: 10 } }),
    A({ id: 'picnic', label: 'Relax in the gardens', blurb: 'Fountains and shade.', icon: '🌳', kind: 'generic', minutes: 60, needs: { fun: 12, social: 4, energy: 3 } }),
    A({ id: 'sleeprough', label: 'Sleep on a bench', blurb: 'Free, but cold, dirty and risky. You could be robbed in your sleep.', icon: '🪑', kind: 'sleep', minutes: 360, needs: { energy: 55, hygiene: -20, social: -6, fun: -8, hunger: -12 }, maxNeed: { energy: 92 }, timeScale: 'sleep', effect: 'sleeprough' }),
  ],
  police: [
    A({ id: 'watch', label: 'Volunteer: neighbourhood watch', blurb: 'Help keep the streets safe. Clears your bad reputation.', icon: '🔦', kind: 'social', minutes: 120, needs: { social: 10, energy: -10 }, effect: 'watch', dailyLimit: 1 }),
    A({ id: 'payfine', label: 'Pay your court fine', blurb: 'Settle your case without a trial.', icon: '🧾', kind: 'generic', minutes: 30, cost: 300, effect: 'payfine', require: 'hasCase' }),
  ],
  court: [
    A({ id: 'observe', label: 'Watch a trial', blurb: 'Free and surprisingly dramatic.', icon: '👀', kind: 'study', minutes: 60, needs: { fun: 6 }, skillXp: { communication: 8 } }),
  ],
  mall: [
    A({ id: 'cinema', label: 'Watch a movie', blurb: 'Latest blockbuster, popcorn included.', icon: '🎬', kind: 'social', minutes: 150, cost: 40, needs: { fun: 35, social: 6, hunger: 6 } }),
    A({ id: 'foodcourt', label: 'Food court meal', blurb: 'Fried chicken and chips.', icon: '🍗', kind: 'meal', minutes: 30, cost: 55, needs: { hunger: 55, fun: 8, bladder: -4 } }),
    A({ id: 'shopping', label: 'Buy new clothes', blurb: 'Look sharp, feel sharp.', icon: '👗', kind: 'generic', minutes: 60, cost: 120, needs: { fun: 18, social: 6 } }),
    A({ id: 'condoms', label: 'Buy condoms (3)', blurb: 'From the pharmacy counter.', icon: '🛡️', kind: 'generic', minutes: 5, cost: 12, effect: 'condoms' }),
    A({ id: 'ring', label: 'Buy an engagement ring', blurb: 'Gold from the jewellers. Needed to propose.', icon: '💍', kind: 'generic', minutes: 30, cost: 1500, effect: 'ring', require: 'needRing' }),
    A({ id: 'pickpocket', label: 'Pickpocket a shopper', blurb: 'Crime. Quick cash, but you may be arrested.', icon: '🫳', kind: 'crime', minutes: 30, crime: { chance: 0.5, min: 40, max: 160 }, needs: { fun: 4 } }),
  ],
  bank: [
    A({ id: 'openaccount', label: 'Open a savings account', blurb: 'Free. Earns interest and is safe from robbers.', icon: '🏦', kind: 'generic', minutes: 30, effect: 'openaccount', require: 'noBank' }),
    A({ id: 'advice', label: 'Financial advice session', blurb: 'Learn about T-bills and stocks.', icon: '📈', kind: 'study', minutes: 45, needs: { fun: 2 }, skillXp: { communication: 6 } }),
  ],
  realty: [
    A({ id: 'browsehomes', label: 'Browse listings', blurb: 'Dream a little.', icon: '🏘️', kind: 'generic', minutes: 30, needs: { fun: 5 } }),
  ],
  beach: [
    A({ id: 'swim', label: 'Swim in the sea', blurb: 'Waves and sunshine.', icon: '🏊', kind: 'generic', minutes: 60, needs: { fun: 22, energy: -8, hygiene: -8 }, skillXp: { fitness: 8 } }),
    A({ id: 'horse', label: 'Horse ride on the sand', blurb: 'Classic Labadi.', icon: '🐎', kind: 'generic', minutes: 30, cost: 50, needs: { fun: 22 } }),
    A({ id: 'coconut', label: 'Fresh coconut', blurb: 'Cut fresh by the seller.', icon: '🥥', kind: 'meal', minutes: 10, cost: 10, needs: { hunger: 10, fun: 5 } }),
    A({ id: 'sleeprough', label: 'Sleep on the sand', blurb: 'Free, but sandy, cold and risky. You could be robbed in your sleep.', icon: '🏖️', kind: 'sleep', minutes: 360, needs: { energy: 50, hygiene: -25, social: -6, fun: -6, hunger: -12 }, maxNeed: { energy: 92 }, timeScale: 'sleep', effect: 'sleeprough' }),
    A({ id: 'beachfootball', label: 'Beach football', blurb: 'Join a pickup game.', icon: '⚽', kind: 'social', minutes: 90, needs: { fun: 18, social: 14, energy: -14, hygiene: -10 }, skillXp: { fitness: 12 } }),
    A({ id: 'pickpocket', label: 'Pickpocket a tourist', blurb: 'Crime. Risky in daylight.', icon: '🫳', kind: 'crime', minutes: 30, crime: { chance: 0.55, min: 30, max: 120 }, needs: { fun: 3 } }),
  ],
  jamestown: [
    A({ id: 'lighttour', label: 'Climb the lighthouse', blurb: 'Best view of old Accra.', icon: '🗼', kind: 'generic', minutes: 60, cost: 25, needs: { fun: 18 } }),
    A({ id: 'boxing', label: 'Bukom boxing training', blurb: 'Where champions are made.', icon: '🥊', kind: 'generic', minutes: 90, cost: 30, needs: { energy: -18, fun: 10, hygiene: -10, hunger: -8 }, skillXp: { fitness: 35 } }),
    A({ id: 'oware', label: 'Play oware with the elders', blurb: 'Free, social and sharp.', icon: '🎲', kind: 'social', minutes: 60, needs: { fun: 12, social: 12 } }),
    A({ id: 'porter', label: 'Hustle: fish market porter', blurb: 'Carry fish from the canoes. Smelly but pays.', icon: '🐟', kind: 'oddjob', minutes: 90, reward: 40, needs: { energy: -14, hygiene: -14, hunger: -6 }, dailyLimit: 2 }),
    A({ id: 'tourguide', label: 'Hustle: tour guide', blurb: 'Show tourists around Jamestown.', icon: '🧭', kind: 'oddjob', minutes: 120, reward: 70, needs: { energy: -8, social: 10 }, skillXp: { communication: 6 }, minSkill: { communication: 2 }, dailyLimit: 1 }),
    A({ id: 'alleyrob', label: 'Rob someone in a dark alley', blurb: 'Serious crime. Big money or a cell. Night only.', icon: '🔪', kind: 'crime', minutes: 30, hours: [20, 24], crime: { chance: 0.4, min: 150, max: 400 }, needs: { fun: 2 } }),
  ],
  wash: [
    A({ id: 'wc', label: 'Use the toilet', blurb: 'Quick and clean.', icon: '🚽', kind: 'generic', minutes: 10, cost: 3, needs: { bladder: 100 }, maxNeed: { bladder: 95 } }),
    A({ id: 'washshower', label: 'Take a shower', blurb: 'Hot water, fresh towel.', icon: '🚿', kind: 'generic', minutes: 20, cost: 10, needs: { hygiene: 80 }, maxNeed: { hygiene: 95 } }),
  ],
}

/** Crimes against any passer-by in the street, any time. Police on patrol nearby make arrest far more likely. */
export const STREET_CRIMES: ActivityDef[] = [
  A({ id: 'snatch', label: 'Pickpocket them', blurb: 'Crime. Lift their wallet and walk away.', icon: '🫳', kind: 'crime', minutes: 10, crime: { chance: 0.6, min: 20, max: 110 }, needs: { fun: 2 } }),
  A({ id: 'phonesnatch', label: 'Snatch their phone', blurb: 'Crime. Grab and run. Fitness helps you get away.', icon: '📱', kind: 'crime', minutes: 10, crime: { chance: 0.5, min: 60, max: 220 }, needs: { energy: -5 } }),
  A({ id: 'streetrob', label: 'Rob them at knifepoint', blurb: 'Serious crime. Big money, long sentence if caught.', icon: '🔪', kind: 'crime', minutes: 15, crime: { chance: 0.42, min: 120, max: 450 }, needs: { energy: -4 } }),
]
/** Street crimes count as robbery in court. */
export const STREET_CHARGE = { snatch: 'theft', phonesnatch: 'theft', streetrob: 'robbery' } as const
/** Each patrol officer within this many tiles cuts your odds. */
export const COP_RANGE = 12

/* ------------------------------ pets ------------------------------ */
export const PETS: Record<PetType, { name: string; emoji: string; price: number; blurb: string; walk: boolean; perk: string }> = {
  dog: { name: 'Local dog', emoji: '🐕', price: 300, walk: true, blurb: 'Loyal, street-smart and always happy to see you.', perk: 'Greets you every morning.' },
  guard: { name: 'German Shepherd', emoji: '🐕‍🦺', price: 3500, walk: true, blurb: 'Big, proud and protective. Needs walks and good food.', perk: 'Night robbers think twice when it is happy.' },
  cat: { name: 'Cat', emoji: '🐈', price: 200, walk: false, blurb: 'Independent and cuddly. Keeps the rats away.', perk: 'Low maintenance: gets hungry slower.' },
  parrot: { name: 'African grey parrot', emoji: '🦜', price: 1800, walk: false, blurb: 'Talks back and learns your phrases. Clever and needy.', perk: 'Chatty company: extra social every morning.' },
}
export const PET_TYPES = Object.keys(PETS) as PetType[]
export const PET_NAMES = ['Bingo', 'Simba', 'Tiger', 'Lucky', 'Kofi', 'Ama', 'Bobby', 'Princess', 'Rocky', 'Sugar', 'Jollof', 'Kelewele']
/** Pet needs lost per game hour. */
export const PET_DECAY = { hunger: 2.8, happy: 2.1, clean: 1.4 }
/** Looking after your pet, from anywhere (walks are for dogs). */
export const PET_ACTIVITIES: ActivityDef[] = [
  A({ id: 'petfeed', label: 'Feed your pet', blurb: 'A full bowl and fresh water.', icon: '🍖', kind: 'generic', minutes: 10, cost: 10, needs: { fun: 2 }, effect: 'pet_feed', require: 'pet' }),
  A({ id: 'petplay', label: 'Play together', blurb: 'Fetch, tug-of-war or chatter. Good for you both.', icon: '🎾', kind: 'generic', minutes: 30, needs: { fun: 14, social: 4 }, effect: 'pet_play', require: 'pet' }),
  A({ id: 'petwalk', label: 'Walk the dog', blurb: 'Around the block. Exercise and fresh air.', icon: '🦮', kind: 'generic', minutes: 40, needs: { fun: 8, social: 6, energy: -6 }, skillXp: { fitness: 6 }, effect: 'pet_walk', require: 'petwalk' }),
  A({ id: 'petgroom', label: 'Bath and groom', blurb: 'Shampoo, brush and nails.', icon: '🛁', kind: 'generic', minutes: 25, cost: 15, needs: { hygiene: -4 }, effect: 'pet_groom', require: 'pet' }),
  A({ id: 'petvet', label: 'Vet check-up', blurb: 'Jabs, deworming and a once-over.', icon: '🩺', kind: 'generic', minutes: 60, cost: 80, effect: 'pet_vet', require: 'pet' }),
]

export const FURNITURE_ACTIVITIES: Partial<Record<FurnitureType, ActivityDef[]>> = {
  bed_basic: [], // filled below for all beds
  toilet: [
    A({ id: 'h_toilet', label: 'Use the toilet', blurb: 'Free and private.', icon: '🚽', kind: 'generic', minutes: 5, needs: { bladder: 100 }, maxNeed: { bladder: 95 } }),
  ],
  shower: [
    A({ id: 'h_shower', label: 'Take a shower', blurb: 'Wash the day away.', icon: '🚿', kind: 'generic', minutes: 15, needs: { hygiene: 100 }, maxNeed: { hygiene: 95 } }),
  ],
  shower_rain: [
    A({ id: 'h_shower', label: 'Take a rain shower', blurb: 'Spa-grade comfort.', icon: '🚿', kind: 'generic', minutes: 15, needs: { hygiene: 100, fun: 4 }, maxNeed: { hygiene: 95 } }),
  ],
  coalpot: [
    A({ id: 'cook', label: 'Cook on the coal pot', blurb: 'Light the charcoal and cook jollof or banku. Groceries included.', icon: '🔥', kind: 'meal', minutes: 60, cost: 18, needs: { hunger: 40, fun: 2, hygiene: -3 }, skillXp: { cooking: 6 }, skillNeedBonus: { skill: 'cooking', need: 'hunger', perLevel: 2 } }),
  ],
  stove: [
    A({ id: 'cook', label: 'Cook a meal', blurb: 'Groceries included. Better with Cooking skill.', icon: '🍳', kind: 'meal', minutes: 40, cost: 22, needs: { hunger: 45, fun: 4, bladder: -3 }, skillXp: { cooking: 7 }, skillNeedBonus: { skill: 'cooking', need: 'hunger', perLevel: 2 } }),
  ],
  fridge: [
    A({ id: 'cook', label: 'Cook a meal', blurb: 'Groceries included. Better with Cooking skill.', icon: '🍳', kind: 'meal', minutes: 45, cost: 22, needs: { hunger: 40, fun: 3, bladder: -3 }, skillXp: { cooking: 6 }, skillNeedBonus: { skill: 'cooking', need: 'hunger', perLevel: 2 } }),
    A({ id: 'snack', label: 'Grab a snack', blurb: 'Leftovers and fruit.', icon: '🍎', kind: 'meal', minutes: 10, cost: 8, needs: { hunger: 14 } }),
  ],
  sofa: [
    A({ id: 'relax', label: 'Relax on the sofa', blurb: 'Put your feet up.', icon: '🛋️', kind: 'generic', minutes: 60, needs: { fun: 14, energy: 6 } }),
  ],
  tv: [
    A({ id: 'watch', label: 'Watch TV', blurb: 'Ghallywood movie marathon.', icon: '📺', kind: 'generic', minutes: 90, needs: { fun: 24, energy: 2 } }),
  ],
  computer: [
    A({ id: 'play', label: 'Browse & play', blurb: 'Videos and games.', icon: '🎮', kind: 'generic', minutes: 60, needs: { fun: 18, social: 6 } }),
    A({ id: 'study_online', label: 'Study online', blurb: 'Free tutorials.', icon: '📖', kind: 'study', minutes: 90, needs: { energy: -6, fun: -2 }, skillXp: { technology: 16 } }),
    A({ id: 'freelance', label: 'Freelance gig', blurb: 'Small web fixes for clients.', icon: '💸', kind: 'freelance', minutes: 120, reward: 90, needs: { energy: -10, hunger: -6, fun: -4 }, skillXp: { technology: 8 }, minSkill: { technology: 1 }, dailyLimit: 2 }),
  ],
  bookshelf: [
    A({ id: 'read', label: 'Read a book', blurb: 'Stories and self-help.', icon: '📚', kind: 'study', minutes: 60, needs: { fun: 5, energy: -2 }, skillXp: { communication: 10 } }),
  ],
}
Object.assign(FURNITURE_ACTIVITIES, {
  armchair: [A({ id: 'relax', label: 'Sit and unwind', blurb: 'Sink into velvet.', icon: '💺', kind: 'generic', minutes: 45, needs: { fun: 10, energy: 5 } })],
  sectional: [
    A({ id: 'relax', label: 'Lounge on the sectional', blurb: 'Stretch out in leather.', icon: '🛋️', kind: 'generic', minutes: 60, needs: { fun: 18, energy: 10 } }),
    A({ id: 'host', label: 'Host friends', blurb: 'Drinks and gist with the crew.', icon: '🥂', kind: 'generic', minutes: 120, cost: 60, needs: { social: 35, fun: 20, energy: -8 } }),
  ],
  dining_set: [A({ id: 'dine', label: 'Sit-down dinner', blurb: 'Plated meal at the table. Groceries included.', icon: '🍽️', kind: 'meal', minutes: 50, cost: 30, needs: { hunger: 50, fun: 8, social: 4 }, skillXp: { cooking: 4 } })],
  wardrobe: [A({ id: 'dress', label: 'Pick an outfit', blurb: 'Look sharp, feel sharp.', icon: '👔', kind: 'generic', minutes: 15, needs: { fun: 6, hygiene: 6 } })],
  vanity: [A({ id: 'groom', label: 'Get ready', blurb: 'Skincare, hair and fragrance.', icon: '💄', kind: 'generic', minutes: 25, needs: { hygiene: 25, fun: 5 }, maxNeed: { hygiene: 98 } })],
  espresso: [A({ id: 'espresso', label: 'Pull an espresso', blurb: 'Rich and strong.', icon: '☕', kind: 'meal', minutes: 10, cost: 6, needs: { energy: 14, hunger: 4, bladder: -6 } })],
  kitchen_island: [A({ id: 'cook', label: 'Cook a chef’s meal', blurb: 'Pro hob and prep space. Groceries included.', icon: '👨‍🍳', kind: 'meal', minutes: 35, cost: 30, needs: { hunger: 60, fun: 8, bladder: -3 }, skillXp: { cooking: 10 }, skillNeedBonus: { skill: 'cooking', need: 'hunger', perLevel: 3 } })],
  bathtub: [A({ id: 'h_bath', label: 'Take a bath', blurb: 'Bubbles and quiet.', icon: '🛁', kind: 'generic', minutes: 40, needs: { hygiene: 100, fun: 10, energy: 6 }, maxNeed: { hygiene: 95 } })],
  jacuzzi: [A({ id: 'h_bath', label: 'Soak in the jacuzzi', blurb: 'Jets, bubbles and mood lights.', icon: '♨️', kind: 'generic', minutes: 45, needs: { hygiene: 100, fun: 22, energy: 12 } })],
  aquarium: [A({ id: 'fish', label: 'Watch the fish', blurb: 'Slow, calm, hypnotic.', icon: '🐠', kind: 'generic', minutes: 30, needs: { fun: 12, energy: 3 } })],
  bar_cabinet: [A({ id: 'nightcap', label: 'Pour a drink', blurb: 'Something smooth from the top shelf.', icon: '🥃', kind: 'generic', minutes: 20, cost: 35, needs: { fun: 16, social: 4, bladder: -8 } })],
  piano: [A({ id: 'piano', label: 'Play the piano', blurb: 'Highlife on the keys.', icon: '🎹', kind: 'generic', minutes: 60, needs: { fun: 22, energy: -4 }, skillXp: { communication: 8 } })],
  console: [A({ id: 'gaming', label: 'Play FIFA', blurb: 'One more match.', icon: '🎮', kind: 'generic', minutes: 60, needs: { fun: 26, energy: -3 } })],
  home_cinema: [A({ id: 'movie', label: 'Movie night', blurb: 'Blockbuster on the big screen.', icon: '🎬', kind: 'generic', minutes: 120, needs: { fun: 40, energy: 4, social: 4 } })],
  treadmill: [A({ id: 'run_home', label: 'Run on the treadmill', blurb: 'Cardio at home.', icon: '🏃', kind: 'generic', minutes: 45, needs: { energy: -15, hygiene: -15, fun: 6 }, skillXp: { fitness: 12 } })],
  massage_chair: [A({ id: 'massage', label: 'Get a massage', blurb: 'Twenty minutes of bliss.', icon: '💆', kind: 'generic', minutes: 30, needs: { energy: 14, fun: 12 } })],
} as Partial<Record<FurnitureType, ActivityDef[]>>)
const bedActs = (): ActivityDef[] => [
  A({ id: 'sleep', label: 'Sleep (8 hours)', blurb: 'Restore your energy. Better beds and comfort help.', icon: '😴', kind: 'sleep', minutes: 480, needs: { energy: 100, hunger: -18, bladder: -25, hygiene: -6 }, maxNeed: { energy: 92 }, timeScale: 'sleep' }),
  A({ id: 'nap', label: 'Nap (2 hours)', blurb: 'A quick recharge.', icon: '💤', kind: 'sleep', minutes: 120, needs: { energy: 28, hunger: -5, bladder: -6 }, maxNeed: { energy: 92 }, timeScale: 'sleep' }),
]
for (const t of ['bed_basic', 'bed_comfy', 'bed_king', 'bed_double', 'bed_luxury'] as FurnitureType[]) FURNITURE_ACTIVITIES[t] = bedActs()

/* ------------------------------------------------------------------ */
/* NPCs and conversations (all demo characters)                        */
/* ------------------------------------------------------------------ */
export interface DialogChoice {
  text: string
  reply: string
  friendship: number
  needs?: Partial<Needs>
}
export interface DialogTopic {
  id: string
  prompt: string
  choices: DialogChoice[]
}
export interface NpcDef {
  id: string
  name: string
  role: string
  personality: string
  emoji: string
  destId: string
  appearance: Appearance
  perk: { friendAt: number; text: string; destId?: string; discount?: number }
  topics: DialogTopic[]
  datable?: boolean
  chat?: string[]
}
export const NPCS: NpcDef[] = [
  {
    id: 'akosua', name: 'Auntie Akosua', role: 'Landlady', personality: 'Warm but firm about rent day.', emoji: '👵', destId: 'home_room',
    appearance: { skin: 4, hair: 5, hairColor: 0, outfit: 2, outfitColor: 3, accessory: 3, sex: 1 },
    perk: { friendAt: 40, text: 'Late-rent fee waived once you are friends.' },
    topics: [
      { id: 'rent', prompt: '“Rent is the heartbeat of the house, my dear. Are you saving small small?”', choices: [
        { text: 'Yes, every pesewa counts.', reply: '“Good child. Discipline pays.”', friendship: 6 },
        { text: 'It is tough, but I am trying.', reply: '“Hmm. Work hard, and I will be patient.”', friendship: 4, needs: { social: 4 } },
      ] },
      { id: 'cook', prompt: '“I made too much fufu and light soup. Will you come and chop?”', choices: [
        { text: 'Medaase, Auntie!', reply: '“Eat! You are too thin.”', friendship: 7, needs: { hunger: 12 } },
        { text: 'Maybe later.', reply: '“I will keep a bowl warm.”', friendship: 2 },
      ] },
    ],
  },
  {
    id: 'kwame', name: 'Kwame', role: 'Cook at the chop bar', personality: 'Jolly storyteller who loves gossip.', emoji: '👨‍🍳', destId: 'foodstall',
    appearance: { skin: 4, hair: 3, hairColor: 0, outfit: 0, outfitColor: 5, accessory: 0 },
    perk: { friendAt: 40, text: "15% off everything at Auntie Esi's Chop Bar.", destId: 'foodstall', discount: 0.15 },
    topics: [
      { id: 'gossip', prompt: '“Charley, you heard what happened at Kwame Nkrumah Circle this morning?”', choices: [
        { text: 'Tell me everything!', reply: '“A goat stopped a whole trotro for an hour!”', friendship: 6, needs: { fun: 8 } },
        { text: 'I prefer not to gossip.', reply: '“Ha! Wise one. Take some shito.”', friendship: 4 },
      ] },
      { id: 'jollof', prompt: '“Ghana jollof is the best in the world. Ɛnte saa?”', choices: [
        { text: 'Of course! No contest.', reply: '“You are my person!”', friendship: 7, needs: { fun: 6 } },
        { text: 'Nigerian jollof is good too…', reply: '“Ei! We will settle this another day.”', friendship: 3, needs: { fun: 8 } },
      ] },
    ],
  },
  {
    id: 'abena', name: 'Auntie Abena', role: 'Market queen', personality: 'Sharp, funny, loves a bargain.', emoji: '👩🏾‍🦱', destId: 'market',
    appearance: { skin: 3, hair: 2, hairColor: 1, outfit: 2, outfitColor: 0, accessory: 3, sex: 1 },
    perk: { friendAt: 40, text: '10% off everything at Makola Market.', destId: 'market', discount: 0.1 },
    topics: [
      { id: 'bargain', prompt: '“Ah, my customer! I will do you a special price.”', choices: [
        { text: 'Haggle playfully.', reply: '“Ei, you have the gift!”', friendship: 6, needs: { fun: 6 } },
        { text: 'Accept the price.', reply: '“Nice person! Come again.”', friendship: 3 },
      ] },
      { id: 'fabric', prompt: '“This kente just arrived from Bonwire. Is it your colour?”', choices: [
        { text: 'It is beautiful!', reply: '“I will remember your taste.”', friendship: 5, needs: { social: 5 } },
        { text: 'Not really my style.', reply: '“Honest. I like that.”', friendship: 3 },
      ] },
    ],
  },
  {
    id: 'kofi', name: 'Kofi', role: 'Engineering lead', datable: true, chat: ['Pushed to prod. Pray for me 🙏', 'You coding today?', 'Milo break?'], personality: 'Quiet, nerdy and quietly generous.', emoji: '🧑🏾‍💻', destId: 'office',
    appearance: { skin: 3, hair: 0, hairColor: 0, outfit: 1, outfitColor: 1, accessory: 1 },
    perk: { friendAt: 40, text: 'Shares tips: +20% Technology XP from shifts.' },
    topics: [
      { id: 'code', prompt: '“Have you tried building something small first?”', choices: [
        { text: 'Not yet. Any ideas?', reply: '“A mobile money budget tracker. Start tiny.”', friendship: 6 },
        { text: 'I read about it a lot.', reply: '“Reading is great. Now type something.”', friendship: 4 },
      ] },
      { id: 'coffee', prompt: '“Debugging fuel is Milo, not coffee. Want some?”', choices: [
        { text: 'Cheers!', reply: '“To clean builds.”', friendship: 5, needs: { fun: 5 } },
        { text: 'Not now.', reply: '“Noted. Back to the bug.”', friendship: 2 },
      ] },
    ],
  },
  {
    id: 'mensah', name: 'Mrs. Mensah', role: 'Instructor', personality: 'Patient, encouraging and curious.', emoji: '👩🏾‍🏫', destId: 'training',
    appearance: { skin: 4, hair: 4, hairColor: 0, outfit: 1, outfitColor: 4, accessory: 1, sex: 1 },
    perk: { friendAt: 40, text: '10% off courses at Bright Future Institute.', destId: 'training', discount: 0.1 },
    topics: [
      { id: 'learn', prompt: '“What skill do you want to master first?”', choices: [
        { text: 'Communication.', reply: '“Practise out loud. Even to a mirror.”', friendship: 6 },
        { text: 'Technology.', reply: '“Small projects, big confidence.”', friendship: 6 },
      ] },
      { id: 'pace', prompt: '“Slow progress is still progress.”', choices: [
        { text: 'Thanks, I needed that.', reply: '“Rest too. Your brain learns while you sleep.”', friendship: 5, needs: { social: 4 } },
        { text: 'I want faster results.', reply: '“Then consistency is your shortcut.”', friendship: 3 },
      ] },
    ],
  },
  {
    id: 'yaw', name: 'Yaw', role: 'Gym coach', personality: 'Energetic and endlessly positive.', emoji: '🏋🏾‍♂️', destId: 'gym',
    appearance: { skin: 5, hair: 0, hairColor: 0, outfit: 3, outfitColor: 6, accessory: 5 },
    perk: { friendAt: 40, text: '20% off everything at Osu FitHub Gym.', destId: 'gym', discount: 0.2 },
    topics: [
      { id: 'form', prompt: '“Form first, weight later. Want a quick tip?”', choices: [
        { text: 'Show me!', reply: '“Chest up, breathe out on effort.”', friendship: 6, needs: { fun: 5 } },
        { text: 'I will watch first.', reply: '“Smart. Eyes open, ego low.”', friendship: 4 },
      ] },
      { id: 'game', prompt: '“Gym-and-tonic on Labadi beach Saturday morning. You in?”', choices: [
        { text: 'Count me in!', reply: '“Bring water!”', friendship: 6, needs: { social: 6 } },
        { text: 'Maybe next time.', reply: '“Door is always open.”', friendship: 2 },
      ] },
    ],
  },
  {
    id: 'efua', name: 'Efua', role: 'Beach club host', datable: true, chat: ['Tonight is going to be lit 🔥', 'Come and dance!', 'Saw you at Labadi 😄'], personality: 'Stylish, easygoing, knows everyone.', emoji: '💃🏾', destId: 'lounge',
    appearance: { skin: 3, hair: 4, hairColor: 5, outfit: 2, outfitColor: 4, accessory: 3, sex: 1 },
    perk: { friendAt: 40, text: '15% off everything at Labadi Beach Club.', destId: 'lounge', discount: 0.15 },
    topics: [
      { id: 'music', prompt: '“The DJ is spinning amapiano and highlife tonight.”', choices: [
        { text: 'I will dance all night!', reply: '“That is the spirit.”', friendship: 6, needs: { fun: 8 } },
        { text: 'I am more of a listener.', reply: '“Front row seats then.”', friendship: 4 },
      ] },
      { id: 'sunset', prompt: '“Best sunset in Accra is from this beach.”', choices: [
        { text: 'Join me for a moment.', reply: '“Moments like this keep me here.”', friendship: 7, needs: { social: 6, fun: 4 } },
        { text: 'Another time.', reply: '“It will be here.”', friendship: 2 },
      ] },
    ],
  },
  {
    id: 'ama', name: 'Nurse Ama', role: 'Nurse at Korle Bu', personality: 'Kind, sharp-witted and always tired.', emoji: '👩🏾‍⚕️', destId: 'hospital', datable: true,
    chat: ['Drink water o! 💧', 'Night shift again 😮‍💨', 'Did you take your medicine?'],
    appearance: { skin: 3, hair: 2, hairColor: 0, outfit: 1, outfitColor: 5, accessory: 0, sex: 1 },
    perk: { friendAt: 40, text: 'Free check-ups and quicker recovery.' },
    topics: [
      { id: 'shift', prompt: '“Twelve-hour shift and I still smile. Impressive, right?”', choices: [
        { text: 'You are a hero.', reply: '“Stop it… but thank you.”', friendship: 7, needs: { social: 5 } },
        { text: 'You should rest.', reply: '“Doctor’s orders, eh?”', friendship: 4 },
      ] },
      { id: 'health', prompt: '“Are you sleeping under a mosquito net?”', choices: [
        { text: 'Always!', reply: '“Good. Malaria is no joke.”', friendship: 5 },
        { text: 'Erm… sometimes.', reply: '“Buy one. Today.”', friendship: 4, needs: { fun: 3 } },
      ] },
    ],
  },
  {
    id: 'kwesi', name: 'Kwesi', role: 'Bank manager', personality: 'Smooth, ambitious, loves a good plan.', emoji: '👨🏾‍💼', destId: 'bank', datable: true,
    chat: ['T-bill rates are up 📈', 'Lunch at Osu?', 'Save first, spend later 😉'],
    appearance: { skin: 4, hair: 0, hairColor: 0, outfit: 1, outfitColor: 6, accessory: 3 },
    perk: { friendAt: 40, text: 'VIP rate: +50% bank interest.' },
    topics: [
      { id: 'money', prompt: '“The secret to wealth? Pay yourself first.”', choices: [
        { text: 'Teach me more.', reply: '“Ten percent of every wage. Untouchable.”', friendship: 6 },
        { text: 'I like spending.', reply: '“Ha! Spend on assets then.”', friendship: 3, needs: { fun: 4 } },
      ] },
      { id: 'dream', prompt: '“Where do you see yourself in five years?”', choices: [
        { text: 'In my own house.', reply: '“Then start buying land now.”', friendship: 6 },
        { text: 'On a beach, relaxing.', reply: '“A dreamer. I respect it.”', friendship: 4 },
      ] },
    ],
  },
  {
    id: 'danso', name: 'Prof. Danso', role: 'Lecturer at Legon', personality: 'Stern on the outside, proud of every student.', emoji: '👨🏾‍🏫', destId: 'university',
    appearance: { skin: 5, hair: 3, hairColor: 0, outfit: 1, outfitColor: 5, accessory: 1 },
    perk: { friendAt: 40, text: 'Extra skill XP from lectures.' },
    topics: [
      { id: 'study', prompt: '“Knowledge is the one thing nobody can take from you.”', choices: [
        { text: 'That is why I am here.', reply: '“Good. Sit in front.”', friendship: 6 },
        { text: 'Unless I forget it.', reply: '“Then revise, young one.”', friendship: 4, needs: { fun: 4 } },
      ] },
      { id: 'exam', prompt: '“Ready for exams?”', choices: [
        { text: 'Born ready.', reply: '“We shall see.”', friendship: 5 },
        { text: 'Please pray for me.', reply: '“Prayer and preparation.”', friendship: 5, needs: { social: 3 } },
      ] },
    ],
  },
  {
    id: 'boateng', name: 'Inspector Boateng', role: 'Police inspector', personality: 'Firm but fair. Has seen everything.', emoji: '👮🏾‍♂️', destId: 'police',
    appearance: { skin: 5, hair: 0, hairColor: 0, outfit: 1, outfitColor: 1, accessory: 2 },
    perk: { friendAt: 40, text: 'Lower arrest odds: he looks the other way once in a while.' },
    topics: [
      { id: 'streets', prompt: '“The streets talk. Stay on the right side of the law.”', choices: [
        { text: 'Yes, Inspector.', reply: '“Good citizen.”', friendship: 6 },
        { text: 'What have you heard?', reply: '“Nothing that concerns you… yet.”', friendship: 3 },
      ] },
      { id: 'watch', prompt: '“We need volunteers for neighbourhood watch.”', choices: [
        { text: 'Count me in.', reply: '“Report here any evening.”', friendship: 7 },
        { text: 'I am busy.', reply: '“Hmm.”', friendship: 1 },
      ] },
    ],
  },
  {
    id: 'asante', name: 'Pastor Asante', role: 'Pastor', personality: 'Joyful, generous, a booming voice.', emoji: '🧑🏾‍🦳', destId: 'church',
    appearance: { skin: 4, hair: 3, hairColor: 0, outfit: 1, outfitColor: 2, accessory: 0 },
    perk: { friendAt: 40, text: 'Officiates your wedding at half price.' },
    topics: [
      { id: 'bless', prompt: '“God bless you, my child! How is life treating you?”', choices: [
        { text: 'By His grace, fine.', reply: '“Amen! Keep the faith.”', friendship: 6, needs: { fun: 4 } },
        { text: 'It is hard, Pastor.', reply: '“Every storm passes. Come on Sunday.”', friendship: 6, needs: { social: 6 } },
      ] },
      { id: 'choir', prompt: '“The choir needs a strong voice.”', choices: [
        { text: 'I can sing!', reply: '“Practice is 4pm.”', friendship: 6 },
        { text: 'I sing like a goat.', reply: '“Ha! Make a joyful noise then.”', friendship: 5, needs: { fun: 6 } },
      ] },
    ],
  },
  {
    id: 'nii', name: 'Nii Lartey', role: 'Jamestown hustler', personality: 'Streetwise, funny, knows every shortcut.', emoji: '🧢', destId: 'jamestown',
    chat: ['Charley, any hustle today?', 'Bukom tonight 🥊', 'Police dey around, be careful o'],
    appearance: { skin: 5, hair: 1, hairColor: 0, outfit: 3, outfitColor: 0, accessory: 2 },
    perk: { friendAt: 40, text: '+15% success on street hustles and crimes.' },
    topics: [
      { id: 'hustle', prompt: '“Charley, money no dey fall from sky. You dey hustle?”', choices: [
        { text: 'Always hustling.', reply: '“That is the Accra way!”', friendship: 6, needs: { fun: 5 } },
        { text: 'I prefer a 9 to 5.', reply: '“Safe man. I respect.”', friendship: 4 },
      ] },
      { id: 'box', prompt: '“Bukom has made champions. You fit box?”', choices: [
        { text: 'Teach me!', reply: '“Come train tomorrow.”', friendship: 6 },
        { text: 'I am a lover, not a fighter.', reply: '“Haha! Then Labadi is for you.”', friendship: 4, needs: { fun: 6 } },
      ] },
    ],
  },
]
export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]))

/** NPC hang-out activity, available at friend level. */
export const HANGOUT: ActivityDef = A({
  id: 'npc_hangout', label: 'Hang out', blurb: 'Quality time with a friend.', icon: '🤝', kind: 'social', minutes: 90, cost: 25,
  needs: { fun: 22, social: 28, bladder: -4 },
})

export const DATE_ACT: ActivityDef = A({
  id: 'date', label: 'Go on a date', blurb: 'Quality time with your partner.', icon: '💕', kind: 'date', minutes: 120, cost: 60,
  needs: { fun: 25, social: 30, hunger: 10 }, effect: 'date',
})

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */
export interface EventEffect {
  text: string
  money?: number
  needs?: Partial<Needs>
  skillXp?: Partial<Record<SkillId, number>>
  friendship?: { npc: string; pts: number }
  minutes?: number
  travelExtraMinutes?: number
  activity?: {
    label: string; icon: string; minutes: number; reward?: number; needs?: Partial<Needs>; skillXp?: Partial<Record<SkillId, number>>
    /** Activity id whose animation to play (see ACT_LOOK). */
    look?: string
    /** Go to this place to do it. */
    dest?: string
    /** Friend who joins you there. */
    npc?: string
  }
  custom?: string
}
export interface EventChoice {
  label: string
  hint: string
  cost?: number
  effect: EventEffect
}
export interface GameEventDef {
  id: string
  title: string
  emoji: string
  body: string
  weight: number
  choices: EventChoice[]
}
export const EVENTS: Record<string, GameEventDef> = {
  transport_delay: {
    id: 'transport_delay', title: 'Trotro delay', emoji: '🚧', weight: 0,
    body: 'The trotro is stuck in go-slow near Kwame Nkrumah Circle. The mate says it may be a while.',
    choices: [
      { label: 'Wait it out', hint: 'Adds 25 minutes to your trip. Free.', effect: { text: 'You chatted with fellow passengers while waiting.', travelExtraMinutes: 25 } },
      { label: 'Take a motorbike taxi', hint: 'Costs extra but gets you there on time.', cost: 30, effect: { text: 'The okada zipped through the traffic.', money: -30, travelExtraMinutes: 0 } },
    ],
  },
  celebration: {
    id: 'celebration', title: 'Outdooring ceremony', emoji: '🎉', weight: 3,
    body: 'Neighbours are celebrating a baby’s outdooring with drums, music and food. Someone waves you over.',
    choices: [
      { label: 'Join in (GH₵25 gift)', hint: '90 min · Fun +25 · Social +15', cost: 25, effect: { text: 'You danced, ate and made new memories.', money: -25, friendship: { npc: 'akosua', pts: 3 }, activity: { label: 'Outdooring ceremony', icon: '🎉', look: 'hangout', minutes: 90, needs: { fun: 25, social: 15, hunger: 10 } } } },
      { label: 'Watch from the side', hint: 'Free · Fun +4', effect: { text: 'You enjoyed the music for a minute.', needs: { fun: 4 }, minutes: 10 } },
    ],
  },
  freelance: {
    id: 'freelance', title: 'Freelance opportunity', emoji: '💸', weight: 3,
    body: 'A small business owner messages you: they need a quick website fix today. GH₵150 for two hours, paid by MoMo.',
    choices: [
      { label: 'Take the gig', hint: '2h · +GH₵150 · Energy -10 · Tech XP +10', effect: { text: 'Client delighted. You got paid on the spot.', activity: { label: 'Freelance fix', icon: '💸', look: 'phonefix', minutes: 120, reward: 150, needs: { energy: -10, fun: -4, hunger: -6 }, skillXp: { technology: 10 } } } },
      { label: 'Politely decline', hint: 'No change.', effect: { text: 'You passed on the gig.' } },
    ],
  },
  friend_invite: {
    id: 'friend_invite', title: 'Friend invitation', emoji: '📲', weight: 2,
    body: 'Yaw messages: “Beach football at Labadi in ten minutes. Join us?”',
    choices: [
      { label: 'Join the match', hint: '90 min · Fun +20 · Social +15 · Energy -10', effect: { text: 'Sand, sweat and a last-minute goal.', friendship: { npc: 'yaw', pts: 5 }, activity: { label: 'Beach football with Yaw', icon: '⚽', look: 'beachfootball', dest: 'beach', npc: 'yaw', minutes: 90, needs: { fun: 20, social: 15, energy: -10, hygiene: -8 }, skillXp: { fitness: 10 } } } },
      { label: 'Stay in', hint: 'Friendship with Yaw -1', effect: { text: 'You stayed home.', friendship: { npc: 'yaw', pts: -1 } } },
    ],
  },
  landguards: {
    id: 'landguards', title: 'Land guards!', emoji: '🪓', weight: 0,
    body: 'Six young men with machetes are sitting on your plot. “This land belongs to our family. You must pay us before you build anything here.”',
    choices: [
      { label: 'Pay them off', hint: 'About 15% of the land price. They leave for good.', effect: { text: 'You negotiate under a mango tree…', custom: 'guards_pay' } },
      { label: 'Bribe the police to chase them', hint: 'About 6% of the land price. 60% chance it works.', effect: { text: 'You call a “friend” at the station…', custom: 'guards_police' } },
      { label: 'File an official report', hint: 'Free. 40% chance the law acts.', effect: { text: 'You file a complaint at the Lands Commission.', custom: 'guards_report' } },
      { label: 'Fight them', hint: 'Fitness helps. You could get badly hurt.', effect: { text: 'You roll up your sleeves…', custom: 'guards_fight' } },
    ],
  },
  demolition: {
    id: 'demolition', title: '“Remove by order, AMA”', emoji: '🚧', weight: 0,
    body: 'The city task force has painted a red X on your building. You built without a permit.',
    choices: [
      { label: 'Pay the GH₵2,000 fine', hint: 'Your building is regularised.', effect: { text: 'You go to the Assembly office to pay.', custom: 'demo_pay' } },
      { label: 'Ignore it', hint: '50% chance the bulldozers come.', effect: { text: 'You hope they forget…', custom: 'demo_ignore' } },
    ],
  },
  arrest_offer: {
    id: 'arrest_offer', title: 'Arrested', emoji: '👮', weight: 0,
    body: 'The officer leans in: “My friend, this one we can settle here, or we go to the station. Your choice.”',
    choices: [
      { label: '“Something small for you, officer” (GH₵150)', hint: 'Depends on the officer. If refused: bribery charge, court and a fine or prison.', effect: { text: 'You slip him the notes…', custom: 'arrest_bribe' } },
      { label: 'Go to the station quietly', hint: 'Custody, then a court date.', effect: { text: 'You get into the police pickup.', custom: 'arrest_quiet' } },
    ],
  },
  police_stop: {
    id: 'police_stop', title: 'Police stop', emoji: '🚔', weight: 0,
    body: 'A police officer blows a whistle and waves you over.',
    choices: [
      { label: 'Pay the official fine', hint: 'Get a receipt. Jaywalking GH₵20, red light GH₵100.', effect: { text: 'You pay and get a receipt.', custom: 'stop_fine' } },
      { label: 'Offer a “tip” to settle it', hint: 'Depends on the officer. If they refuse, you are arrested for bribery.', effect: { text: 'You lower your voice…', custom: 'stop_bribe' } },
      { label: 'Argue your case', hint: '40% chance they let you go; otherwise the fine doubles.', effect: { text: '“Officer, the light was yellow…”', custom: 'stop_argue' } },
    ],
  },
  hookup_where: {
    id: 'hookup_where', title: 'It’s a match', emoji: '😏', weight: 0,
    body: 'You hit it off on the dance floor. They lean in: “So… your place or a guest house?”',
    choices: [
      { label: 'Take them home', hint: 'Free. Your landlady (or partner) might notice.', effect: { text: 'You catch an Uber home together.', custom: 'hook_home' } },
      { label: 'Osu Cosy Guest House (GH₵80)', hint: 'Taxi there together. A private room for the night.', cost: 80, effect: { text: 'You take a taxi to Osu Cosy Guest House and book a room.', custom: 'hook_guest', money: -80 } },
      { label: 'Just swap numbers', hint: 'Social +10. Keep it friendly.', effect: { text: 'You swap numbers and promise to call.', needs: { social: 10 } } },
    ],
  },
  checkpoint: {
    id: 'checkpoint', title: 'Police checkpoint', emoji: '🚨', weight: 0,
    body: 'An officer waves you over with a torch. “Licence and papers. Or… you know how it goes.”',
    choices: [
      { label: 'Pay “something for the boys” (GH₵30)', hint: 'Works on most officers. Honest ones arrest you for bribery.', effect: { text: 'You fold a note into your licence.', custom: 'cp_bribe' } },
      { label: 'Show your papers', hint: 'Fine if anything is missing (GH₵150).', effect: { text: 'You hand over your documents.', custom: 'cp_papers' } },
      { label: 'Argue your rights', hint: 'Lose 40 minutes; 50% chance of a fine.', effect: { text: '“Officer, I know my rights…”', custom: 'cp_argue' } },
    ],
  },
  tenant_refuse: {
    id: 'tenant_refuse', title: 'Tenants refuse to leave', emoji: '🚪', weight: 0,
    body: 'You served notice, but your tenants will not go. “We have nowhere to go. Give us time!”',
    choices: [
      { label: 'Offer “cash for keys”', hint: 'Pay them two weeks of rent. They leave tomorrow.', effect: { text: 'You count out the notes…', custom: 'tenant_cash' } },
      { label: 'Take them to court', hint: 'GH₵350 court fee. Eviction order in 4 days; no rent meanwhile.', effect: { text: 'You file at the rent tribunal.', custom: 'tenant_court' } },
      { label: 'Let them stay', hint: 'Keep the lease and the rent.', effect: { text: 'You shrug. Rent is rent.', custom: 'tenant_stay' } },
    ],
  },
  mugged: {
    id: 'mugged', title: 'Robbery!', emoji: '🔪', weight: 0,
    body: 'Two guys block your path in a dark street. “Charley, bring your phone and your money!”',
    choices: [
      { label: 'Hand over your cash', hint: 'Lose 40% of the cash in your wallet. Safe.', effect: { text: 'You hand it over. They disappear into the night.', custom: 'mug_hand' } },
      { label: 'Run for it', hint: 'Fitness helps. Fail and they take more.', effect: { text: 'You sprint for the main road…', custom: 'mug_run' } },
      { label: 'Fight back', hint: 'Risky. Win and keep everything, lose and get hurt.', effect: { text: 'You raise your fists…', custom: 'mug_fight' } },
    ],
  },
  dumsor: {
    id: 'dumsor', title: 'Dumsor!', emoji: '🕯️', weight: 0,
    body: 'Lights off again. The whole street goes dark and the fan stops. (A generator upgrade prevents this.)',
    choices: [
      { label: 'Light candles, sleep early', hint: 'Fun -8, Energy +5', effect: { text: 'You lie in the heat listening to generators hum.', needs: { fun: -8, energy: 5 }, minutes: 30 } },
      { label: 'Sit outside and gist with neighbours', hint: '1h · Social +15 · Fun +6', effect: { text: 'Everyone is outside. Stories, laughter and mosquitoes.', needs: { social: 15, fun: 6 }, minutes: 60 } },
    ],
  },
  partner_call: {
    id: 'partner_call', title: 'Your partner is calling', emoji: '📞', weight: 0,
    body: '“Hey you. I miss you. Do you have a minute to talk?”',
    choices: [
      { label: 'Talk for a while', hint: '30 min · Social +15 · Love +4', effect: { text: 'You talk and laugh for half an hour.', needs: { social: 15, fun: 6 }, minutes: 30, custom: 'partner_love' } },
      { label: '“I’m busy, later”', hint: 'Love -3', effect: { text: '“Okay… later then.”', custom: 'partner_snub' } },
    ],
  },
  market_sale: {
    id: 'market_sale', title: 'Market flash sale', emoji: '🏷️', weight: 2,
    body: 'A trader is selling bags of fresh mangoes at half price, today only.',
    choices: [
      { label: 'Stock up (GH₵20)', hint: 'Hunger +30', cost: 20, effect: { text: 'You ate well for cheap.', money: -20, needs: { hunger: 30 }, minutes: 10 } },
      { label: 'Keep walking', hint: 'No change.', effect: { text: 'You kept your money.' } },
    ],
  },
}


/* ------------------------------ driving jobs ------------------------------ */
export type VehicleId = 'okada' | 'pragia' | 'car' | 'trotro' | 'compact' | 'suv' | 'pickup' | 'sports' | 'luxury'
export interface VehicleDef {
  id: VehicleId
  name: string
  emoji: string
  price: number
  rent: number
  license: boolean
  ride: RideMode
  job: string
  /** Share of the passenger fare the driver keeps (trotro: per seat). */
  payPerKm: number
  base: number
  blurb: string
  /** Bought to drive yourself, not for work. */
  personal?: boolean
  /** Body shape and paint for the 3D model. */
  body?: 'saloon' | 'suv' | 'pickup' | 'sports' | 'luxury' | 'compact'
  color?: string
  /** Comfort/status: shown in the dealer and raises respect when bought. */
  status?: number
}
export const VEHICLES: Record<VehicleId, VehicleDef> = {
  okada: { id: 'okada', name: 'Motorbike', emoji: '🏍️', price: 6000, rent: 40, license: false, ride: 'okada', job: 'Okada rider', payPerKm: 2.5, base: 10, blurb: 'No licence needed. Police may stop you.' },
  pragia: { id: 'pragia', name: 'Pragia tricycle', emoji: '🛺', price: 9000, rent: 50, license: false, ride: 'pragia', job: 'Pragia rider', payPerKm: 3.0, base: 12, blurb: 'Carry three passengers. No licence needed.' },
  car: { id: 'car', name: 'Saloon car', emoji: '🚗', price: 45000, rent: 100, license: true, ride: 'ride', job: 'Ride-hailing driver', payPerKm: 4.5, base: 18, blurb: 'Drive for the ride app. Needs a licence.' },
  trotro: { id: 'trotro', name: 'Trotro bus', emoji: '🚐', price: 80000, rent: 160, license: true, ride: 'trotro', job: 'Trotro driver', payPerKm: 6.0, base: 30, blurb: 'Carry 12 passengers a trip. Needs a licence.' },
  compact: { id: 'compact', name: 'Kia Picanto (used)', emoji: '🚙', price: 28000, rent: 0, license: true, ride: 'own', job: '', payPerKm: 0, base: 0, personal: true, body: 'compact', color: '#e0524a', status: 1, blurb: 'Small, cheap to run, easy to park.' },
  suv: { id: 'suv', name: 'Toyota Land Cruiser Prado', emoji: '🚙', price: 160000, rent: 0, license: true, ride: 'own', job: '', payPerKm: 0, base: 0, personal: true, body: 'suv', color: '#1b1b1b', status: 4, blurb: 'The big man’s SUV. Everybody notices.' },
  pickup: { id: 'pickup', name: 'Toyota Hilux pickup', emoji: '🛻', price: 95000, rent: 0, license: true, ride: 'own', job: '', payPerKm: 0, base: 0, personal: true, body: 'pickup', color: '#f0ede6', status: 2, blurb: 'Tough workhorse for business and bad roads.' },
  sports: { id: 'sports', name: 'Sports coupé', emoji: '🏎️', price: 240000, rent: 0, license: true, ride: 'own', job: '', payPerKm: 0, base: 0, personal: true, body: 'sports', color: '#f5c518', status: 6, blurb: 'Low, loud and fast. Pure flex.' },
  luxury: { id: 'luxury', name: 'Mercedes S-Class', emoji: '🚘', price: 380000, rent: 0, license: true, ride: 'own', job: '', payPerKm: 0, base: 0, personal: true, body: 'luxury', color: '#2c3442', status: 8, blurb: 'Chauffeur-grade luxury. You have arrived.' },
}
/** Cars you can drive yourself (personal cars and the ride-hailing saloon). */
export const DRIVABLE: VehicleId[] = ['car', 'compact', 'suv', 'pickup', 'sports', 'luxury']
/** Garage spaces per home tier (apartments need the parking bay upgrade). */
export const GARAGE_SPACES: Record<HomeTier, number> = { room: 0, apartment: 0, premium: 2, house: 3 }
export const VEHICLE_IDS = Object.keys(VEHICLES) as VehicleId[]
/** Work vehicles (Drive app shifts). */
export const WORK_VEHICLES = VEHICLE_IDS.filter((v) => !VEHICLES[v].personal)
export const DRIVING = { tripsPerShift: 6, licenseTest: 200, licensePass: 0.65, licenseBribe: 600, licenseBribeChance: 0.85, checkpointChance: 0.18, okadaCheckpointBonus: 0.15, bribe: 30, okadaRideRisk: 0.05 }

/* ------------------------------ activities for new kinds ------------------------------ */
const A2 = (a: ActivityDef): ActivityDef => a
export const KIND_ACTIVITIES: Partial<Record<DestKind, ActivityDef[]>> = {
  hotel: [
    A2({ id: 'hotelnight', label: 'Spend the night', blurb: 'King bed, AC, room service. Best sleep in Accra.', icon: '🛏️', kind: 'sleep', minutes: 480, cost: 400, needs: { energy: 100, fun: 20, hygiene: 30, hunger: -10 }, maxNeed: { energy: 92 }, timeScale: 'sleep' }),
    A2({ id: 'pool', label: 'Pool & spa', blurb: 'Swim, sauna and a massage.', icon: '🏊', kind: 'generic', minutes: 120, cost: 120, needs: { fun: 30, hygiene: 40, energy: 10 } }),
    A2({ id: 'dining', label: 'Fine dining', blurb: 'Three courses and a view.', icon: '🍽️', kind: 'meal', minutes: 90, cost: 150, needs: { hunger: 70, fun: 20, social: 10 } }),
    A2({ id: 'waiter', label: 'Hustle: banquet waiter', blurb: 'Serve at a wedding reception.', icon: '🤵', kind: 'oddjob', minutes: 180, reward: 110, needs: { energy: -18, hunger: -6, social: 8 }, skillXp: { communication: 6 }, dailyLimit: 1 }),
  ],
  stadium: [
    A2({ id: 'match', label: 'Watch Hearts vs Kotoko', blurb: 'The biggest derby in Ghana. Evenings.', icon: '⚽', kind: 'social', minutes: 120, cost: 50, needs: { fun: 40, social: 25, energy: -6 }, hours: [16, 23] }),
    A2({ id: 'fiveaside', label: 'Five-a-side football', blurb: 'Pitch hire split between players.', icon: '🥅', kind: 'social', minutes: 90, cost: 15, needs: { fun: 25, social: 15, energy: -16, hygiene: -12 }, skillXp: { fitness: 20 } }),
    A2({ id: 'vendor', label: 'Hustle: sell drinks in the stands', blurb: 'Cold drinks, hot crowd.', icon: '🥤', kind: 'oddjob', minutes: 120, reward: 60, needs: { energy: -12, social: 8 }, dailyLimit: 1 }),
  ],
  square: [
    A2({ id: 'arch', label: 'Visit the Independence Arch', blurb: 'Photos at the Black Star Gate.', icon: '⭐', kind: 'generic', minutes: 45, needs: { fun: 12, social: 4 } }),
    A2({ id: 'parade', label: 'Watch a parade rehearsal', blurb: 'Bands and marching soldiers.', icon: '🎺', kind: 'social', minutes: 60, needs: { fun: 16, social: 8 } }),
  ],
  arena: [
    A2({ id: 'ticket', label: "Buy a ticket for tonight's show", blurb: 'Regular ticket. Doors open at 8pm.', icon: '🎟️', kind: 'generic', minutes: 10, cost: 150, effect: 'ticket', require: 'noTicket' }),
    A2({ id: 'ticketvip', label: 'Buy a VIP ticket', blurb: 'Front row, free drinks and a meet & greet backstage.', icon: '⭐', kind: 'generic', minutes: 10, cost: 450, effect: 'ticketvip', require: 'noTicket' }),
    A2({ id: 'show', label: 'Watch the live show', blurb: 'Lights, bass and the whole crowd singing along.', icon: '🎤', kind: 'social', minutes: 180, needs: { fun: 70, social: 35, energy: -14, hunger: -8 }, effect: 'show', require: 'ticket', hours: [20, 24] }),
    A2({ id: 'sprayartist', label: 'Spray the artist on stage', blurb: 'Climb up and shower them with cedis. The crowd goes wild.', icon: '💸', kind: 'social', minutes: 20, cost: 200, needs: { fun: 30, social: 20 }, effect: 'sprayartist', require: 'ticket', hours: [20, 24] }),
    A2({ id: 'rehearsal', label: 'Sneak into the sound check', blurb: 'Watch the band rehearse in the afternoon.', icon: '🎸', kind: 'generic', minutes: 60, needs: { fun: 18 }, hours: [12, 18] }),
  ],
  mine: [
    A2({ id: 'panning', label: 'Pan for gold (one-off)', blurb: 'Try your luck in the muddy river. Illegal and risky.', icon: '🥣', kind: 'crime', minutes: 120, needs: { energy: -20, hygiene: -25 }, crime: { chance: 0.7, min: 40, max: 260 }, dailyLimit: 1 }),
  ],
  cafe: [
    A2({ id: 'netbrowse', label: 'Browse the internet', blurb: 'GH₵5 an hour. Slow but it works.', icon: '🌐', kind: 'generic', minutes: 60, cost: 5, needs: { fun: 12 }, skillXp: { technology: 6 } }),
    A2({ id: 'printcv', label: 'Print your CV', blurb: 'Look sharp for job applications.', icon: '🖨️', kind: 'generic', minutes: 20, cost: 10, skillXp: { communication: 3 } }),
    A2({ id: 'gaming', label: 'FIFA tournament', blurb: 'Winner takes the pot.', icon: '🎮', kind: 'social', minutes: 90, cost: 10, needs: { fun: 25, social: 12 } }),
  ],
  harbour: [
    A2({ id: 'buyfish', label: 'Buy fresh fish off a canoe', blurb: 'Grill it at home.', icon: '🐟', kind: 'meal', minutes: 30, cost: 25, needs: { hunger: 40 } }),
    A2({ id: 'harbourwalk', label: 'Watch the canoes come in', blurb: 'Drums, chanting and nets full of fish.', icon: '🛶', kind: 'generic', minutes: 45, needs: { fun: 14, social: 6 } }),
  ],
  zoo: [
    A2({ id: 'zootour', label: 'See the animals', blurb: 'Lions, chimps and a very old tortoise.', icon: '🦁', kind: 'generic', minutes: 90, cost: 30, needs: { fun: 25, social: 6 } }),
    A2({ id: 'forestwalk', label: 'Walk in Achimota Forest', blurb: 'Shade, birdsong and fresh air.', icon: '🌳', kind: 'generic', minutes: 60, needs: { fun: 12, energy: -4 }, skillXp: { fitness: 8 } }),
  ],
  dealer: [
    A2({ id: 'testdrive', label: 'Test drive', blurb: 'Feel the engine.', icon: '🔑', kind: 'generic', minutes: 30, needs: { fun: 12 } }),
  ],
}
export const GOV_ACTIVITIES: Record<string, ActivityDef[]> = {
  lands: [
    A2({ id: 'permit', label: 'Apply for a building permit', blurb: 'For your next unpermitted plot. Ready in 2 days.', icon: '📝', kind: 'generic', minutes: 120, cost: 1500, effect: 'permit', require: 'needPermit' }),
    A2({ id: 'permitbribe', label: '“Facilitation fee” fast-track', blurb: 'Pay an officer to speed things up. Risky.', icon: '🤫', kind: 'generic', minutes: 30, cost: 700, effect: 'permitbribe', require: 'needPermit' }),
    A2({ id: 'title', label: 'Search a land title', blurb: 'Check who really owns a plot.', icon: '🔍', kind: 'study', minutes: 60, cost: 50, needs: { fun: -2 }, skillXp: { communication: 6 } }),
  ],
  dvla: [
    A2({ id: 'drivetest', label: 'Take the driving test', blurb: 'Theory and road test. About 65% pass.', icon: '🚦', kind: 'generic', minutes: 120, cost: 200, effect: 'drivetest', require: 'noLicense' }),
    A2({ id: 'licensebribe', label: 'Pay a “goro boy” for a licence', blurb: 'Skip the test. If caught, you are arrested.', icon: '🤫', kind: 'generic', minutes: 30, cost: 600, effect: 'licensebribe', require: 'noLicense' }),
  ],
}
