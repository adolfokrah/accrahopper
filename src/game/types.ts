// Shared typed definitions for the City Stories simulation.

export type NeedId = 'hunger' | 'energy' | 'hygiene' | 'bladder' | 'fun' | 'social'
export const NEED_IDS: NeedId[] = ['hunger', 'energy', 'hygiene', 'bladder', 'fun', 'social']
export type Needs = Record<NeedId, number>

export type SkillId = 'communication' | 'cooking' | 'technology' | 'fitness'
export const SKILL_IDS: SkillId[] = ['communication', 'cooking', 'technology', 'fitness']

export type CareerId =
  | 'retail'
  | 'hospitality'
  | 'technology'
  | 'teacher'
  | 'nurse'
  | 'banker'
  | 'bouncer'
  | 'bartender'
  | 'dj'
  | 'clubdoor'
  | 'clubwaiter'
  | 'hotel'
  | 'security'
  | 'fisher'
  | 'porter'
  | 'docker'
  | 'galamsey'
  | 'sakawa'
  | 'smuggler'
export type DistrictId = 'residential' | 'commercial' | 'waterfront'
export type HomeTier = 'room' | 'apartment' | 'premium' | 'house'

export type TraitId =
  | 'hardworking'
  | 'charming'
  | 'foodie'
  | 'techie'
  | 'frugal'
  | 'tidy'
  | 'sporty'
  | 'nightowl'

export type FurnitureType =
  | 'bed_basic'
  | 'bed_comfy'
  | 'bed_king'
  | 'bed_double'
  | 'toilet'
  | 'shower'
  | 'shower_rain'
  | 'fridge'
  | 'sofa'
  | 'computer'
  | 'tv'
  | 'bookshelf'
  | 'plant'
  | 'fan'
  | 'coalpot'
  | 'stove'
  | 'bed_luxury'
  | 'armchair'
  | 'coffee_table'
  | 'sectional'
  | 'rug'
  | 'floor_lamp'
  | 'dining_set'
  | 'wardrobe'
  | 'vanity'
  | 'espresso'
  | 'kitchen_island'
  | 'bathtub'
  | 'jacuzzi'
  | 'orchid'
  | 'gold_mirror'
  | 'sculpture'
  | 'aquarium'
  | 'bar_cabinet'
  | 'piano'
  | 'console'
  | 'home_cinema'
  | 'treadmill'
  | 'massage_chair'
  | 'wall'
  | 'wall_long'
  | 'wall_half'
  | 'doorway'

export interface Appearance {
  skin: number
  hair: number
  hairColor: number
  outfit: number
  outfitColor: number
  accessory: number
}

/** How you started life in Accra. */
export type Lifestyle = 'hustler' | 'worker' | 'dadaba'
export interface Profile {
  name: string
  appearance: Appearance
  traits: [TraitId, TraitId]
  /** Older saves have none: treated as working class. */
  lifestyle?: Lifestyle
}

export type TxCategory =
  | 'wage'
  | 'food'
  | 'transport'
  | 'rent'
  | 'purchase'
  | 'service'
  | 'bonus'
  | 'fee'
  | 'transfer'

export interface Tx {
  id: number
  minute: number
  label: string
  amount: number // + income, - expense
  category: TxCategory
}

export type ActivityKind =
  | 'generic'
  | 'meal'
  | 'sleep'
  | 'study'
  | 'social'
  | 'oddjob'
  | 'freelance'
  | 'work'
  | 'travel'
  | 'event'
  | 'collapse'
  | 'crime'
  | 'custody'
  | 'jail'
  | 'hospital'
  | 'date'

export type TimeScaleKind = 'normal' | 'sleep' | 'travel'

export interface ActivityDef {
  id: string
  label: string
  blurb: string
  icon: string
  kind: ActivityKind
  minutes: number
  cost?: number
  needs?: Partial<Needs>
  skillXp?: Partial<Record<SkillId, number>>
  reward?: number
  /** Extra need gained per level of a skill (e.g. cooking quality). */
  skillNeedBonus?: { skill: SkillId; need: NeedId; perLevel: number }
  minSkill?: Partial<Record<SkillId, number>>
  /** Activity refused when the need is above this value. */
  maxNeed?: Partial<Needs>
  /** Activity refused when the need is below this value. */
  minNeed?: Partial<Needs>
  hours?: [number, number]
  dailyLimit?: number
  timeScale?: TimeScaleKind
  /** Custom completion handler key (see store finishActivity). */
  effect?: string
  /** Custom availability rule key (see activities specialReason). */
  require?: string
  /** For crimes: success chance and reward range. */
  crime?: { chance: number; min: number; max: number }
}

export interface ActivityContext {
  dest?: string
  furnitureUid?: number
  travelTo?: string
  career?: CareerId
  npc?: string
  ride?: 'trotro' | 'taxi' | 'ride' | 'okada' | 'pragia'
  /** Driving-job trip (you are the driver). */
  drive?: boolean
  /** Street crime against a passer-by. */
  street?: boolean
  /** Police officers on patrol close by when the crime started. */
  cops?: number
}

export interface ActiveActivity {
  uid: number
  defId: string
  label: string
  icon: string
  kind: ActivityKind
  ctx: ActivityContext
  total: number
  done: number
  scale: number
  needs: Partial<Needs>
  appliedFrac: number
  reward: number
  skillXp: Partial<Record<SkillId, number>>
  careerXp: number
  cost: number
  travelTo?: string
  startedAt: number
  effect?: string
  crime?: { chance: number; min: number; max: number }
  meta?: Record<string, number | string>
  /** Interactive work shift (tasks pop up; doing them earns pay and tips). */
  shift?: ShiftState
}

export interface ShiftTask {
  id: number
  key: string
  label: string
  icon: string
  /** Pay for finishing it (part of the shift wage). */
  pay: number
  /** Activity minute when it disappears unattended. */
  expires: number
  /** Activity minute it appeared. */
  born: number
}

export interface ShiftState {
  queue: ShiftTask[]
  /** Task being done right now and the activity minute it finishes. */
  current: (ShiftTask & { until: number; startedAt: number }) | null
  done: number
  missed: number
  earned: number
  tips: number
  nextAt: number
  /** Illegal jobs: has a raid already been rolled this shift. */
  raided?: boolean
}

export interface ActivityResult {
  id: number
  title: string
  icon: string
  lines: string[]
  tone: 'good' | 'neutral' | 'bad'
}

export interface OwnedFurniture {
  uid: number
  type: FurnitureType
  placed: { x: number; y: number; rot: 0 | 1 } | null
}

export interface Friendship {
  points: number
  talkDay: number
  talks: number
}

export interface CareerProgress {
  level: number // 1-based
  xp: number
  shifts: number
  /** Warnings for poor shifts (3 = fired). */
  warns?: number
}

export interface Stats {
  mealsEaten: number
  shiftsCompleted: number
  sleeps: number
  moneyEarned: number
  moneySpent: number
  tripsTaken: number
  conversations: number
}

/** Police personality: decides whether a bribe works. */
export type Officer = 'greedy' | 'cautious' | 'honest'

export interface ActiveEvent {
  id: string
  ctx: { travelTo?: string; npc?: string; plot?: string; officer?: Officer; offence?: string; lease?: string }
}
