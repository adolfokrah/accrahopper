import type { DestKind } from './content'

/** Google Maps style category colours for place pins (map, minimap and in-world labels). */
const POI_COLOR: Record<DestKind, string> = {
  food: '#f57c00',
  cafe: '#f57c00',
  market: '#1a73e8',
  mall: '#1a73e8',
  dealer: '#1a73e8',
  realty: '#1a73e8',
  hospital: '#ea4335',
  school: '#8d6e63',
  training: '#8d6e63',
  church: '#78858f',
  park: '#34a853',
  beach: '#34a853',
  zoo: '#34a853',
  plot: '#34a853',
  gym: '#34a853',
  stadium: '#34a853',
  arena: '#34a853',
  square: '#0b8043',
  landmark: '#0b8043',
  lounge: '#9334e6',
  hotel: '#e8437b',
  stop: '#12a4af',
  harbour: '#12a4af',
  home: '#1a3d7c',
  office: '#5f6b7a',
  bank: '#5f6b7a',
  gov: '#5f6b7a',
  police: '#5f6b7a',
  court: '#5f6b7a',
  wash: '#5f6b7a',
  mine: '#795548',
}

export const poiColor = (kind: DestKind) => POI_COLOR[kind] ?? '#5f6b7a'
