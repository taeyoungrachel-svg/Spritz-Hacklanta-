import { CircleCheck, Landmark, LoaderCircle, Lock } from 'lucide-react'
import { useState } from 'react'
import type { ContributionKind } from '../data/types'
import { goalSaved, isSettled, transferAccounts } from '../lib/calc'
import { money, round2 } from '../lib/format'
import { useStore } from '../state/store'
import { GoalIcon } from './goals'
import { Button, Field, MoneyInput, Note, Segmented, Sheet, cx } from './ui'

/**
 * Moves money from a chosen checking account straight into one or more goals.
 * Goal balances only change once the transfer settles. `onFinished` runs when the user leaves after a transfer
 * has been started (Done, or closing the sheet), so callers can take them somewhere else, like Home.
 */
export function ContributionSheet({ open, onClose, onFinished, initialGoalId, lockGoal, initialAmount, kind = 'extra', title = 'Add money to goals', note }: {
  open: boolean; onClose: () => void; onFinished?: () => void; initialGoalId?: string; lockGoal?: boolean; initialAmount?: number; kind?: ContributionKind; title?: string; note?: string
}) {
  const { state } = useStore()
  const [started, setStarted] = useState(false)
  const locked = lockGoal ? state.goals.find((g) => g.id === initialGoalId) : undefined
  const close = () => {
    if (started && onFinished) onFinished()
    else onClose()
    setStarted(false)
  }
  return (
    <Sheet open={open} onClose={close} title={locked && title === 'Add money to goals' ? `Contribute to ${locked.name}` : title}>
      {open && <Body onClose={close} onStarted={() => setStarted(true)} initialGoalId={initialGoalId} lockGoal={lockGoal} initialAmount={initialAmount} kind={kind} note={note} />}
    </Sheet>
  )
}

function Body({ onClose, onStarted, initialGoalId, lockGoal, initialAmount, kind, note }: {
  onClose: () => void; onStarted: () => void; initialGoalId?: string; lockGoal?: boolean; initialAmount?: number; kind: ContributionKind; note?: string
}) {
  const { state, startTransfer, push } = useStore()
  const goals = state.goals
  const accounts = transferAccounts(state)
  const [amount, setAmount] = useState(initialAmount ? String(Math.round(initialAmount * 100) / 100) : '')
  const [mode, setMode] = useState<'single' | 'split'>('single')
  const [goalId, setGoalId] = useState(initialGoalId ?? state.primaryGoalId)
  // Opened from inside a specific goal: contribute to that goal only, with no option to split.
  const lockedGoal = lockGoal ? goals.find((g) => g.id === initialGoalId) : undefined
  const [split, setSplit] = useState<Record<string, string>>({})
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '')
  const [transferId, setTransferId] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  const from = accounts.find((a) => a.id === fromId)
  const fromLabel = from ? `${from.nickname} ••${from.last4}` : 'your checking account'
  const total = Number(amount) || 0
  const splitSum = round2(goals.reduce((s, g) => s + (Number(split[g.id]) || 0), 0))
  const unallocated = round2(total - splitSum)
  const amountError = total <= 0 ? 'Enter an amount greater than $0.' : total > 10000 ? 'Transfers are limited to $10,000 at a time.' : undefined
  const splitError = mode === 'split' && Math.abs(unallocated) > 0.004
    ? unallocated > 0 ? `Allocate the remaining ${money(unallocated, true)}.` : `You've allocated ${money(-unallocated, true)} more than the transfer.`
    : undefined

  /** Starting suggestion: 60% to the primary goal, the rest shared evenly. */
  function autoSplit() {
    const primary = goals.find((g) => g.id === state.primaryGoalId) ?? goals[0]
    const ordered = [primary, ...goals.filter((g) => g !== primary)]
    const next: Record<string, string> = {}
    let left = total
    ordered.forEach((g, i) => {
      const share = ordered.length === 1 ? 1 : i === 0 ? 0.6 : 0.4 / (ordered.length - 1)
      const v = i === ordered.length - 1 ? left : round2(total * share)
      next[g.id] = String(round2(v))
      left = round2(left - v)
    })
    setSplit(next)
  }

  function authorize() {
    setTried(true)
    if (amountError || splitError || !from) return
    const allocations = lockedGoal || mode === 'single'
      ? [{ goalId: lockedGoal?.id ?? goalId, amount: total }]
      : goals.map((g) => ({ goalId: g.id, amount: Number(split[g.id]) || 0 }))
    setTransferId(startTransfer(allocations, kind, from.id))
    onStarted()
  }

  if (accounts.length === 0)
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-accent-100 text-accent-600"><Landmark size={26} /></div>
        <p className="mt-4 text-lg font-bold">Connect a checking account</p>
        <p className="mt-1 max-w-[270px] text-sm text-muted">Choose which checking account to move money from by connecting one in your profile.</p>
        <Button full className="mt-6" onClick={() => { onClose(); push({ name: 'profile' }) }}>Go to connected accounts</Button>
      </div>
    )

  if (transferId) {
    const rows = state.contributions.filter((c) => c.transferId === transferId)
    const done = rows.length > 0 && rows.every(isSettled)
    return (
      <div className="flex flex-col items-center py-6 text-center">
        {done ? (
          <div className="grid size-16 animate-pop place-items-center rounded-full bg-mint-50 text-mint-500"><CircleCheck size={34} /></div>
        ) : (
          <div className="grid size-16 place-items-center rounded-full bg-accent-50 text-accent-600"><LoaderCircle size={32} className="animate-spin" /></div>
        )}
        <p className="mt-4 text-lg font-bold">{done ? 'Deposit complete' : 'Transfer pending…'}</p>
        <p className="mt-1 max-w-[260px] text-sm text-muted">
          {done ? 'Your goal balances have been updated.' : `Moving money from ${fromLabel} into ${lockedGoal ? lockedGoal.name : 'your goals'}.`}
        </p>
        <div className="mt-5 w-full space-y-2 text-left">
          {rows.map((c) => {
            const g = goals.find((x) => x.id === c.goalId)!
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3">
                <GoalIcon goal={g} size={36} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{g.name}</p>
                  <p className="tabular text-xs text-muted">Balance {money(goalSaved(g.id, state.contributions))}</p>
                </div>
                <p className={cx('tabular text-sm font-bold', done ? 'text-mint-500' : 'text-muted')}>+{money(c.settled, true)}</p>
              </div>
            )
          })}
        </div>
        <Button full className="mt-6" disabled={!done} onClick={onClose}>{done ? 'Done' : 'Processing…'}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 pt-2">
      {note && <Note tone="mint">{note}</Note>}
      <Field label="Amount" error={tried ? amountError : undefined}>
        <MoneyInput value={amount} onChange={setAmount} error={tried && !!amountError} autoFocus ariaLabel="Transfer amount" />
      </Field>
      {lockedGoal ? (
        <Field label="Contributing to">
          <div className="flex items-center gap-3 rounded-2xl border border-accent-500 bg-accent-50 p-3 ring-2 ring-accent-100">
            <GoalIcon goal={lockedGoal} size={36} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{lockedGoal.name}</p>
              <p className="tabular text-xs text-muted">{money(goalSaved(lockedGoal.id, state.contributions))} of {money(lockedGoal.target)}</p>
            </div>
          </div>
        </Field>
      ) : (
      <>
      <Segmented
        value={mode}
        onChange={(m) => { setMode(m); if (m === 'split' && splitSum === 0 && total > 0) autoSplit() }}
        options={[{ value: 'single', label: 'One goal' }, { value: 'split', label: 'Split across goals' }]}
      />
      {mode === 'single' ? (
        <div className="space-y-2">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => setGoalId(g.id)}
              className={cx('flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition', goalId === g.id ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-100' : 'border-line bg-paper')}
            >
              <GoalIcon goal={g} size={36} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{g.name}</p>
                <p className="tabular text-xs text-muted">{money(goalSaved(g.id, state.contributions))} of {money(g.target)}</p>
              </div>
              <span className={cx('size-5 rounded-full border-2', goalId === g.id ? 'border-accent-500 bg-accent-500 shadow-[inset_0_0_0_3px_white]' : 'border-line')} />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3">
              <GoalIcon goal={g} size={36} />
              <p className="flex-1 text-sm font-semibold">{g.name}</p>
              <div className="w-28">
                <MoneyInput value={split[g.id] ?? ''} onChange={(v) => setSplit((s) => ({ ...s, [g.id]: v }))} ariaLabel={`Amount for ${g.name}`} />
              </div>
            </div>
          ))}
          <p className={cx('tabular text-xs font-semibold', splitError && tried ? 'text-rose-500' : 'text-muted')}>
            {splitError ?? `All ${money(total, true)} allocated.`}
          </p>
        </div>
      )}
      </>
      )}

      <Field label="Move money from">
        <div className="space-y-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setFromId(a.id)}
              aria-pressed={fromId === a.id}
              className={cx('flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition', fromId === a.id ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-100' : 'border-line bg-paper')}
            >
              <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-500"><Landmark size={17} /></span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{a.nickname} ••{a.last4}</span>
                <span className="text-xs text-muted">{a.institution}</span>
              </span>
              <span className={cx('size-5 rounded-full border-2', fromId === a.id ? 'border-accent-500 bg-accent-500 shadow-[inset_0_0_0_3px_white]' : 'border-line')} />
            </button>
          ))}
        </div>
      </Field>

      <div className="flex items-start gap-2.5 rounded-2xl bg-[#f1f0f4] p-3 text-xs leading-relaxed text-muted">
        <Landmark size={16} className="mt-0.5 shrink-0" />
        <p>Money moves directly from <b className="text-ink">{fromLabel}</b> into {lockedGoal ? <b className="text-ink">{lockedGoal.name}</b> : 'the goals you choose'}. Your goal balances update once the transfer completes.</p>
      </div>
      <Button full size="lg" onClick={authorize}><Lock size={16} /> Transfer {total > 0 ? money(total, true) : ''}</Button>
    </div>
  )
}
