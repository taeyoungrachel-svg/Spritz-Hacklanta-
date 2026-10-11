import {
  Bike, Bus, Camera, Car, Coffee, Film, Gift, GraduationCap, Headphones, Heart, House, Laptop, Leaf, Music, Package,
  PiggyBank, Plane, Receipt, ShieldCheck, ShoppingBag, ShoppingCart, Shirt, Smartphone, UtensilsCrossed, Watch,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId, HabitId } from './types'

export interface CategoryMeta {
  id: CategoryId
  label: string
  color: string
  soft: string
  icon: LucideIcon
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'restaurants', label: 'Restaurants & Cafés', color: '#e0198c', soft: '#fde4f3', icon: UtensilsCrossed },
  { id: 'groceries', label: 'Groceries', color: '#7c3aed', soft: '#e6dcff', icon: ShoppingCart },
  { id: 'shopping', label: 'Shopping', color: '#f2b705', soft: '#fff4cc', icon: ShoppingBag },
  { id: 'entertainment', label: 'Entertainment', color: '#b9a0ff', soft: '#f1ebff', icon: Film },
  { id: 'transportation', label: 'Transportation', color: '#3b1d8a', soft: '#e3dcf5', icon: Bus },
  { id: 'other', label: 'Other', color: '#9a97a8', soft: '#efeef2', icon: Receipt },
]

export const categoryMeta = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!

export interface HabitDef {
  id: HabitId
  name: string
  routineName: string
  challengeName: string
  icon: LucideIcon
  color: string
  soft: string
  /** Visit-based habits are measured per week; shopping is a monthly dollar amount. */
  metric: 'visits' | 'spend'
  period: 'week' | 'month'
  baseline: number
  avgCost: number
  min: number
  max: number
  step: number
  describe: string
}

export const HABITS: HabitDef[] = [
  {
    id: 'coffee', name: 'Coffee Runs', routineName: 'Coffee Routine', challengeName: 'Coffee Challenge',
    icon: Coffee, color: '#e0198c', soft: '#fde4f3', metric: 'visits', period: 'week',
    baseline: 4, avgCost: 6, min: 0, max: 7, step: 1, describe: 'café visits',
  },
  {
    id: 'dining', name: 'Dining Out', routineName: 'Dining Out Routine', challengeName: 'Dining Out Challenge',
    icon: UtensilsCrossed, color: '#f2b705', soft: '#fff4cc', metric: 'visits', period: 'week',
    baseline: 3, avgCost: 22, min: 0, max: 7, step: 1, describe: 'meals out',
  },
  {
    id: 'shopping', name: 'Shopping', routineName: 'Shopping Routine', challengeName: 'Shopping Challenge',
    icon: ShoppingBag, color: '#7c3aed', soft: '#e6dcff', metric: 'spend', period: 'month',
    baseline: 90, avgCost: 1, min: 0, max: 200, step: 10, describe: 'shopping spend',
  },
]

/** A transaction counts toward a habit only while it is in the habit's own category. */
export const HABIT_CATEGORY: Record<HabitId, CategoryId> = { coffee: 'restaurants', dining: 'restaurants', shopping: 'shopping' }

export const habitDef = (id: HabitId) => HABITS.find((h) => h.id === id)!

/** Monthly cost of a habit at slider value `v`. Weekly habits use visits × cost × 52 / 12. */
export function habitMonthlyCost(h: HabitDef, v: number) {
  return h.period === 'week' ? (v * h.avgCost * 52) / 12 : v
}

/** Convert a slider value into the weekly challenge unit. */
export function toWeeklyUnit(h: HabitDef, v: number) {
  return h.period === 'week' ? v : (v * 12) / 52
}

/** The most savings goals a user can have at once. */
export const MAX_GOALS = 5

export const GOAL_ICONS: Record<string, LucideIcon> = {
  plane: Plane, laptop: Laptop, shield: ShieldCheck, house: House, car: Car, gift: Gift, grad: GraduationCap,
  heart: Heart, piggy: PiggyBank, camera: Camera, bike: Bike, music: Music, leaf: Leaf, phone: Smartphone,
}

/**
 * Goal card colours, one per pie chart category colour: violet, magenta, yellow, charcoal, pink, gray.
 * `color` is a deeper shade for bars and text, `soft` a pale fill, `glow` the exact pie colour (r g b) used for the card's glow.
 */
export const GOAL_PALETTE = [
  { color: '#7c3aed', soft: '#e6dcff', glow: '124 58 237' },
  { color: '#e0198c', soft: '#fde4f3', glow: '224 25 140' },
  { color: '#f2b705', soft: '#fff4cc', glow: '242 183 5' },
  { color: '#3a3744', soft: '#e7e6ea', glow: '58 55 68' },
  { color: '#f48fc7', soft: '#fdeaf5', glow: '244 143 199' },
  { color: '#9a97a8', soft: '#efeef2', glow: '154 151 168' },
]
type GoalColorSource = { icon: string; colorIdx?: number }
/** The palette slot a goal uses. Goals saved before colours existed fall back to a slot based on their icon. */
export const goalColorIdx = (g: GoalColorSource) => g.colorIdx ?? ({ plane: 0, laptop: 1, shield: 2 } as Record<string, number>)[g.icon] ?? 0
export const goalTint = (g: GoalColorSource) => GOAL_PALETTE[goalColorIdx(g) % GOAL_PALETTE.length]
/** CSS variable that colours a card's glow. */
export const goalGlowStyle = (g: GoalColorSource) => ({ ['--glow' as string]: goalTint(g).glow }) as React.CSSProperties
/** The first palette colour no existing goal is using, so each goal gets its own. */
export const nextColorIdx = (goals: GoalColorSource[]) => {
  const used = new Set(goals.map(goalColorIdx))
  for (let i = 0; i < GOAL_PALETTE.length; i++) if (!used.has(i)) return i
  return goals.length % GOAL_PALETTE.length
}

export const ITEM_ICONS: Record<string, LucideIcon> = {
  headphones: Headphones, bag: ShoppingBag, watch: Watch, shirt: Shirt, phone: Smartphone, package: Package,
  laptop: Laptop, camera: Camera, gift: Gift,
}

export function guessItemIcon(name: string, category: CategoryId): string {
  const n = name.toLowerCase()
  if (/head|ear|audio|speaker/.test(n)) return 'headphones'
  if (/watch/.test(n)) return 'watch'
  if (/bag|tote|purse|backpack/.test(n)) return 'bag'
  if (/shirt|jacket|dress|coat|shoe|sneaker|jean/.test(n)) return 'shirt'
  if (/phone|tablet|ipad/.test(n)) return 'phone'
  if (/laptop|computer|macbook/.test(n)) return 'laptop'
  if (/camera/.test(n)) return 'camera'
  return category === 'shopping' ? 'bag' : 'package'
}

export const MOTIVATIONS = ['I need it', "It's on sale", 'Treating myself', 'Saw it online', 'Special occasion', 'Other']
export const WANTED_FOR = ['Just discovered it', 'A few days', 'A few weeks or longer']
