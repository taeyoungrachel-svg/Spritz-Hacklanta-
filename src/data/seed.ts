import { addDays, addMonths, dayOfMonth, nextAfter, parseISO, startOfWeek } from '../lib/date'
import type { AppState, Contribution, Goal, HabitId, LinkedAccount, Profile, Transaction } from './types'

export const DEFAULT_PROFILE: Profile = {
  email: 'alex.demo@example.com',
  phone: '(555) 010-2231',
  contributionReminders: true,
  weeklySummary: false,
}


export const CHECKING_ID = 'acct-checking'
export const VISA_ID = 'acct-visa'
export const MASTERCARD_ID = 'acct-mastercard'

export const DEFAULT_LINKED_ACCOUNTS: LinkedAccount[] = [
  { id: CHECKING_ID, kind: 'checking', institution: 'Northwind Bank', nickname: 'Everyday Checking', last4: '4821', trackTransactions: true, allowTransfers: true },
  { id: VISA_ID, kind: 'credit_card', institution: 'Northwind Bank', nickname: 'Visa', last4: '7302', trackTransactions: true, allowTransfers: false },
  { id: MASTERCARD_ID, kind: 'credit_card', institution: 'Harbor Credit Union', nickname: 'Mastercard', last4: '1156', trackTransactions: true, allowTransfers: false },
]

/** Everyday bills and groceries post to checking; dining, coffee and shopping go on the cards. */
function accountFor(category: string, merchant: string) {
  if (category === 'groceries' || category === 'transportation' || category === 'other') return CHECKING_ID
  return merchant.length % 3 === 0 ? MASTERCARD_ID : VISA_ID
}

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number
const pick = <T,>(r: Rng, arr: T[]) => arr[Math.floor(r() * arr.length)]
const amt = (r: Rng, min: number, max: number, step = 0.01) => Math.round((min + r() * (max - min)) / step) * step

export const COFFEE_SHOPS = ['Blue Bottle Coffee', 'Verve Coffee', 'Philz Coffee', 'Starbucks', 'Sightglass']
const RESTAURANTS = ['Sweetgreen', 'Tacos El Gordo', 'Ramen Nagi', 'Thai Basil', 'Pizzeria Delfina', 'Nopa', 'Burma Love']
const STORES = ['Uniqlo', 'Target', 'Amazon', 'Muji', 'Sephora', 'Aritzia']

/**
 * Generates a realistic day of bank transactions. Coffee ≈ 4×/week at ~$6, dining ≈ 3×/week at ~$22,
 * shopping ≈ $90/month, matching the habit baselines used across the app.
 */
export function generateDay(date: string, r: Rng, skip: HabitId[] = []): Transaction[] {
  const dow = parseISO(date).getDay()
  const dom = dayOfMonth(date)
  const out: Transaction[] = []
  const add = (t: Omit<Transaction, 'id' | 'date'>) =>
    out.push({ id: `t-${date}-${out.length}-${Math.floor(r() * 1e6).toString(36)}`, date, ...t, amount: Math.round(t.amount * 100) / 100, accountId: accountFor(t.category, t.merchant) })

  if (!skip.includes('coffee') && [1, 2, 4, 5].includes(dow))
    add({ merchant: pick(r, COFFEE_SHOPS), amount: amt(r, 5.25, 6.75, 0.25), category: 'restaurants', habit: 'coffee' })
  if (!skip.includes('dining') && [2, 5, 6].includes(dow))
    add({ merchant: pick(r, RESTAURANTS), amount: amt(r, 16, 28), category: 'restaurants', habit: 'dining' })
  if (dow === 0) add({ merchant: r() < 0.75 ? "Trader Joe's" : 'Whole Foods Market', amount: amt(r, 58, 96), category: 'groceries' })
  if (dow === 3 && r() < 0.4) add({ merchant: 'Rainbow Grocery', amount: amt(r, 14, 32), category: 'groceries' })
  if (!skip.includes('shopping') && [4, 14, 24].includes(dom))
    add({ merchant: pick(r, STORES), amount: amt(r, 22, 38), category: 'shopping', habit: 'shopping' })
  if (dom === 1 || dom === 16) add({ merchant: 'Clipper Card', amount: 40, category: 'transportation' })
  if (dow === 3 && r() < 0.5) add({ merchant: pick(r, ['Uber', 'Lyft']), amount: amt(r, 11, 24), category: 'transportation' })
  if (dom === 15) add({ merchant: 'Spotify', amount: 11.99, category: 'entertainment' })
  if (dom === 20) add({ merchant: 'Netflix', amount: 15.49, category: 'entertainment' })
  if (dow === 6 && r() < 0.35) add({ merchant: pick(r, ['AMC Theatres', 'The Fillmore', 'Alamo Drafthouse']), amount: amt(r, 16, 42), category: 'entertainment' })
  if (dom === 3) add({ merchant: 'PG&E Utilities', amount: 68.4, category: 'other' })
  if (dom === 8) add({ merchant: 'T-Mobile', amount: 45, category: 'other' })
  if (dow === 4 && r() < 0.25) add({ merchant: 'CVS Pharmacy', amount: amt(r, 8, 24), category: 'other' })
  return out
}

function seedTransactions(today: string): Transaction[] {
  const r = mulberry32(20261010)
  const weekStart = startOfWeek(today)
  const txs: Transaction[] = []
  for (let i = 69; i >= 0; i--) {
    const date = addDays(today, -i)
    const inCurrentWeek = date >= weekStart
    txs.push(...generateDay(date, r, inCurrentWeek ? ['coffee'] : []))
  }
  // This week's coffee is hand-written so the active challenge has a story:
  // one personal coffee, and one $24 group order that was partly reimbursed.
  txs.push({ id: 't-cw-1', date: weekStart, merchant: 'Verve Coffee', amount: 6, category: 'restaurants', habit: 'coffee', accountId: VISA_ID })
  const groupDay = addDays(weekStart, 2) <= today ? addDays(weekStart, 2) : weekStart
  txs.push({ id: 't-cw-2', date: groupDay, merchant: 'Blue Bottle Coffee', amount: 24, category: 'restaurants', habit: 'coffee', memo: '4 drinks', accountId: VISA_ID })
  return txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

function history(goal: Goal, starting: number, months: number, today: string): Contribution[] {
  const out: Contribution[] = []
  const firstMonthly = addMonths(goal.nextContributionDate, -months, goal.contributionDay)
  const startDate = addDays(firstMonthly, -14)
  out.push({ id: `c-${goal.id}-start`, goalId: goal.id, transferId: `tr-${goal.id}-start`, date: startDate, planned: starting, settled: starting, status: 'completed', kind: 'starting' })
  for (let i = 0; i < months; i++) {
    const date = addMonths(firstMonthly, i, goal.contributionDay)
    if (date > today) break
    out.push({ id: `c-${goal.id}-${i}`, goalId: goal.id, transferId: `tr-${goal.id}-${i}`, date, planned: goal.monthlyContribution, settled: goal.monthlyContribution, status: 'completed', kind: 'monthly' })
  }
  return out
}

export function createSeedState(today: string): AppState {
  const next10 = nextAfter(today, 10)
  const next15 = nextAfter(today, 15)
  const next1 = nextAfter(today, 1)
  const japan: Goal = {
    id: 'g-japan', name: 'Japan Trip', icon: 'plane', target: 3000, monthlyContribution: 250, contributionDay: 10,
    nextContributionDate: next10, targetDate: '2027-06-01', deadlineType: 'fixed', transferMode: 'automatic', createdAt: addMonths(today, -5), colorIdx: 0,
  }
  const laptop: Goal = {
    id: 'g-laptop', name: 'New Laptop', icon: 'laptop', target: 1500, monthlyContribution: 100, contributionDay: 15,
    nextContributionDate: next15, targetDate: '2027-10-01', deadlineType: 'flexible', transferMode: 'manual', createdAt: addMonths(today, -4), colorIdx: 1,
  }
  const emergency: Goal = {
    id: 'g-emergency', name: 'Emergency Fund', icon: 'shield', target: 2000, monthlyContribution: 150, contributionDay: 1,
    nextContributionDate: next1, deadlineType: 'flexible', transferMode: 'automatic', createdAt: addMonths(today, -4), colorIdx: 2,
  }
  const contributions = [
    ...history(japan, 500, 4, today), // 500 + 4 × 250 = 1,500
    ...history(laptop, 100, 3, today), // 100 + 3 × 100 = 400
    ...history(emergency, 250, 3, today), // 250 + 3 × 150 = 700
  ]
  const weekStart = startOfWeek(today)

  return {
    version: 1,
    userName: 'Alex',
    linkedAccounts: DEFAULT_LINKED_ACCOUNTS.map((a) => ({ ...a })),
    onboarded: false,
    demoOffsetDays: 0,
    primaryGoalId: japan.id,
    goals: [japan, laptop, emergency],
    contributions,
    transactions: seedTransactions(today),
    adjustments: {},
    wishlist: [
      { id: 'w-1', name: 'Wireless Headphones', price: 149, category: 'shopping', icon: 'headphones', addedAt: addDays(today, -5), motivation: 'Treating myself', wantedFor: 'A few days' },
      { id: 'w-2', name: 'Everyday Tote', price: 65, category: 'shopping', icon: 'bag', addedAt: addDays(today, -12), motivation: 'I need it', wantedFor: 'A few weeks or longer' },
      { id: 'w-3', name: 'Smartwatch', price: 220, category: 'shopping', icon: 'watch', addedAt: addDays(today, -24), motivation: 'Saw it online', wantedFor: 'Just discovered it' },
    ],
    purchases: [],
    challenges: [
      {
        id: 'ch-coffee-1', seriesId: 'cs-coffee', attempt: 1, habitId: 'coffee', metric: 'visits',
        baseline: 4, target: 2, durationWeeks: 2, startDate: weekStart, status: 'active',
      },
    ],
  }
}

/* ───────────────────────── Imported account history ───────────────────────── */

const CARD_COFFEE = ['Blue Bottle Coffee', 'Verve Coffee', 'Philz Coffee', 'Starbucks', 'Sightglass', 'Peet\'s Coffee']
const CARD_MEALS = ['Sweetgreen', 'Chipotle', 'Ramen Nagi', 'Burma Love', 'Nopa', 'Tartine', 'Shake Shack']
const CARD_STORES = ['Uniqlo', 'Target', 'Amazon', 'Nordstrom Rack', 'REI', 'Sephora', 'Apple']
const SUPERMARKETS = ['Safeway', 'Costco', "Trader Joe's", 'Whole Foods Market']

function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * The past and current transactions pulled in when an account is added: about ten weeks of history, shaped to the
 * account: everyday spending (coffee, meals, shopping, entertainment) on cards, and groceries, bills and transit on checking.
 * Deterministic per account so the same account always imports the same history.
 */
export function generateAccountHistory(account: LinkedAccount, today: string, days = 70): Transaction[] {
  const r = mulberry32(hashSeed(account.id + account.last4 + account.institution))
  const out: Transaction[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const dow = parseISO(date).getDay()
    const dom = dayOfMonth(date)
    const add = (merchant: string, amount: number, category: Transaction['category'], habit?: HabitId) =>
      out.push({ id: `t-${account.id}-${date}-${out.length}`, date, merchant, amount: Math.round(amount * 100) / 100, category, habit, accountId: account.id })

    if (account.kind === 'credit_card') {
      if (dow >= 1 && dow <= 5 && r() < 0.28) add(pick(r, CARD_COFFEE), amt(r, 4.5, 7, 0.25), 'restaurants', 'coffee')
      if ([5, 6, 0].includes(dow) && r() < 0.36) add(pick(r, CARD_MEALS), amt(r, 14, 34), 'restaurants', 'dining')
      if (r() < 0.07) add(pick(r, CARD_STORES), amt(r, 18, 64), 'shopping', 'shopping')
      if (r() < 0.05) add(pick(r, SUPERMARKETS), amt(r, 22, 78), 'groceries')
      if (r() < 0.045) add(pick(r, ['Uber', 'Lyft']), amt(r, 9, 26), 'transportation')
      if (dom === (hashSeed(account.id) % 20) + 5) add(pick(r, ['Hulu', 'Disney+', 'Apple Music', 'Max']), 15.99, 'entertainment')
      if (dow === 6 && r() < 0.12) add(pick(r, ['AMC Theatres', 'The Fillmore', 'Alamo Drafthouse']), amt(r, 16, 46), 'entertainment')
    } else {
      if (dow === 0 && r() < 0.55) add(pick(r, SUPERMARKETS), amt(r, 42, 98), 'groceries')
      if (r() < 0.07) add(pick(r, ['Chevron', 'Shell', '76 Gas']), amt(r, 32, 56), 'transportation')
      if (dom === 6) add('Comcast Internet', 79.99, 'other')
      if (dom === 12) add('Geico Insurance', 112.3, 'other')
      if (dom === 18 && r() < 0.8) add('Water & Sewer', amt(r, 38, 61), 'other')
      if (dow >= 1 && dow <= 5 && r() < 0.06) add(pick(r, CARD_COFFEE), amt(r, 4.5, 7, 0.25), 'restaurants', 'coffee')
    }
  }
  return out
}
