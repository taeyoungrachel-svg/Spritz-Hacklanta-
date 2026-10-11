import type { AccountKind } from './types'

export interface Offer { kind: AccountKind; name: string; last4: string }
export interface Institution { id: string; name: string; offers: Offer[] }

/** The banks and card issuers you can search for when adding an account. */
export const INSTITUTIONS: Institution[] = [
  { id: 'atlas', name: 'Atlas Card Services', offers: [{ kind: 'credit_card', name: 'Atlas Rewards', last4: '3390' }, { kind: 'credit_card', name: 'Atlas Travel', last4: '6672' }] },
  { id: 'beacon', name: 'Beacon Card Co.', offers: [{ kind: 'credit_card', name: 'Beacon Cash Back', last4: '4417' }, { kind: 'credit_card', name: 'Beacon Platinum', last4: '8832' }] },
  { id: 'cedar', name: 'Cedar Valley Bank', offers: [{ kind: 'checking', name: 'Cedar Checking', last4: '6026' }, { kind: 'credit_card', name: 'Cedar Visa', last4: '9150' }] },
  { id: 'evergreen', name: 'Evergreen Bank', offers: [{ kind: 'checking', name: 'Evergreen Checking', last4: '3381' }] },
  { id: 'harbor', name: 'Harbor Credit Union', offers: [{ kind: 'checking', name: 'Primary Checking', last4: '5530' }, { kind: 'credit_card', name: 'Mastercard', last4: '1156' }] },
  { id: 'maple', name: 'Maple Trust', offers: [{ kind: 'checking', name: 'Maple Checking', last4: '1659' }, { kind: 'credit_card', name: 'Maple Rewards', last4: '5073' }] },
  { id: 'northwind', name: 'Northwind Bank', offers: [{ kind: 'checking', name: 'Everyday Checking', last4: '4821' }, { kind: 'checking', name: 'Bills Checking', last4: '9047' }, { kind: 'credit_card', name: 'Visa', last4: '7302' }] },
  { id: 'nova', name: 'Nova Federal Credit Union', offers: [{ kind: 'checking', name: 'Nova Checking', last4: '7714' }, { kind: 'credit_card', name: 'Nova Visa', last4: '2205' }] },
  { id: 'summit', name: 'Summit Federal', offers: [{ kind: 'checking', name: 'Summit Checking', last4: '2218' }, { kind: 'credit_card', name: 'Summit Visa', last4: '8841' }] },
]

/**
 * Alphabetical search: institutions whose name starts with what was typed, in A–Z order.
 * Typing "north" finds only Northwind Bank; typing "n" finds Northwind Bank, then Nova Federal Credit Union.
 */
export function searchInstitutions(query: string): Institution[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return INSTITUTIONS.filter((i) => i.name.toLowerCase().startsWith(q)).sort((a, b) => a.name.localeCompare(b.name))
}
