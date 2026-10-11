export type CategoryId = 'restaurants' | 'groceries' | 'shopping' | 'entertainment' | 'transportation' | 'other'
export type HabitId = 'coffee' | 'dining' | 'shopping'

/** Imported bank transaction. Never mutated after import; corrections live in TransactionAdjustment. */
export interface Transaction {
  id: string
  date: string
  merchant: string
  amount: number
  category: CategoryId
  habit?: HabitId
  /** Which linked account this came from. */
  accountId?: string
  memo?: string
}

/** User corrections, stored separately so the original bank record is preserved. */
export interface TransactionAdjustment {
  category?: CategoryId
  excluded?: boolean
  shared?: boolean
  reimbursement?: number
  personalAmount?: number
  visits?: number
}

export type DeadlineType = 'fixed' | 'flexible'
export type TransferMode = 'automatic' | 'manual'

export interface Goal {
  id: string
  name: string
  icon: string
  target: number
  monthlyContribution: number
  contributionDay: number
  nextContributionDate: string
  targetDate?: string
  deadlineType: DeadlineType
  transferMode: TransferMode
  createdAt: string
  /** Which slot of the pie chart palette this goal's card uses (0 to 5). */
  colorIdx?: number
  /** Estimate (ISO) at which the user dismissed the catch-up prompt. */
  catchUpDismissedFor?: string
}

export type ContributionStatus = 'scheduled' | 'pending' | 'completed' | 'failed' | 'skipped' | 'partial'
export type ContributionKind = 'starting' | 'monthly' | 'extra' | 'catchup' | 'challenge' | 'transfer'

/** One goal's allocation from a simulated transfer into the partner-held savings account. */
export interface Contribution {
  id: string
  goalId: string
  transferId: string
  date: string
  planned: number
  settled: number
  status: ContributionStatus
  kind: ContributionKind
  /** The checking account the money came from. */
  fromAccountId?: string
  /** While pending: the status it settles into. */
  settleAs?: 'completed' | 'partial'
}

export interface WishlistEntry {
  id: string
  name: string
  price: number
  category: CategoryId
  icon?: string
  imageUrl?: string
  addedAt: string
  motivation?: string
  wantedFor?: string
}

export interface PurchaseRecord {
  id: string
  name: string
  price: number
  category: CategoryId
  date: string
  source: 'purchase-check' | 'wishlist'
  motivation?: string
}

export type ChallengeStatus = 'active' | 'completed' | 'not_completed' | 'ended'
export type ChallengeMetric = 'visits' | 'spend'

export interface Challenge {
  id: string
  seriesId: string
  attempt: number
  habitId: HabitId
  metric: ChallengeMetric
  /** Weekly baseline and target in the metric's unit (visits or dollars). */
  baseline: number
  /** Average cost per visit when the challenge started (visit-based habits). */
  avgCost?: number
  target: number
  durationWeeks: number
  startDate: string
  status: ChallengeStatus
  finalizedAt?: string
  result?: { total: number; allowed: number; usualSpend: number; actualSpend: number }
}

export type AccountKind = 'checking' | 'credit_card'

/** A bank account or card the user has connected. Only the last four digits are ever kept, never full numbers or credentials. */
export interface LinkedAccount {
  id: string
  kind: AccountKind
  institution: string
  nickname: string
  last4: string
  /** Transactions from this account feed Insights and habit tracking. */
  trackTransactions: boolean
  /** Checking accounts only: can be chosen as the source when moving money into a goal. */
  allowTransfers: boolean
}

export interface Profile {
  email: string
  phone: string
  contributionReminders: boolean
  weeklySummary: boolean
}

export interface AppState {
  version: 1
  userName: string
  /** Optional so older saved demo data still loads; defaults live in DEFAULT_PROFILE. */
  profile?: Partial<Profile>
  /** Connected checking accounts and credit cards (optional so older saved data still loads). */
  linkedAccounts?: LinkedAccount[]
  onboarded: boolean
  demoOffsetDays: number
  primaryGoalId: string
  goals: Goal[]
  contributions: Contribution[]
  transactions: Transaction[]
  adjustments: Record<string, TransactionAdjustment>
  wishlist: WishlistEntry[]
  purchases: PurchaseRecord[]
  challenges: Challenge[]
}
