import { Check, ChevronRight, CircleCheck, CreditCard, Landmark, LoaderCircle, Lock, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { INSTITUTIONS, type Offer } from '../data/institutions'
import { generateAccountHistory } from '../data/seed'
import type { AccountKind, LinkedAccount } from '../data/types'
import { linkedAccountsOf } from '../lib/calc'
import { uid } from '../lib/format'
import { useStore } from '../state/store'
import { InstitutionSearch } from './InstitutionSearch'
import { Badge, Button, Card, ConfirmationModal, EmptyState, Field, IconTile, Note, SectionTitle, Sheet, TextInput, Toggle, cx } from './ui'

const KIND = {
  checking: { label: 'Checking', icon: Landmark, color: '#6b6880', soft: '#eceaf2' },
  credit_card: { label: 'Credit card', icon: CreditCard, color: '#7c3aed', soft: '#e6dcff' },
} as const

/**
 * Connected checking accounts and credit cards. Connected accounts feed transaction history, and checking accounts
 * can be chosen as the source when moving money into a goal. Only the last four digits are ever kept.
 */
export function ConnectedAccounts() {
  const { state } = useStore()
  const accounts = linkedAccountsOf(state)
  const [connecting, setConnecting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const groups: { kind: AccountKind; title: string }[] = [
    { kind: 'checking', title: 'Checking accounts' },
    { kind: 'credit_card', title: 'Credit cards' },
  ]

  return (
    <>
      <SectionTitle action={<Button size="sm" variant="secondary" onClick={() => setConnecting(true)}><Plus size={15} /> Add</Button>}>
        Connected accounts
      </SectionTitle>
      <p className="-mt-1 mb-3 text-xs leading-relaxed text-muted">
        Add all of your checking accounts and credit cards. We import their past and current transactions so Insights sees your whole picture, and checking accounts can fund your goals.
      </p>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark size={22} />}
          title="No accounts added"
          body="Add a checking account to fund your goals and your cards to see all of your spending."
          action={<Button size="sm" onClick={() => setConnecting(true)}><Plus size={15} /> Add an account</Button>}
        />
      ) : (
        <div className="space-y-4">
          {groups.map(({ kind, title }) => {
            const list = accounts.filter((a) => a.kind === kind)
            if (!list.length) return null
            return (
              <div key={kind}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-faint uppercase">{title}</p>
                <Card className="py-1">
                  <div className="divide-y divide-line">
                    {list.map((a) => {
                      const k = KIND[a.kind]
                      return (
                        <button key={a.id} onClick={() => setEditingId(a.id)} className="flex w-full items-center gap-3 py-3 text-left" aria-label={`Edit ${a.nickname}`}>
                          <IconTile icon={k.icon} color={k.color} soft={k.soft} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{a.nickname} ••{a.last4}</p>
                            <p className="truncate text-xs text-muted">{a.institution}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {a.kind === 'checking' && <Badge tone={a.allowTransfers ? 'mint' : 'gray'}>{a.allowTransfers ? 'Funds goals' : 'Transfers off'}</Badge>}
                              <Badge tone={a.trackTransactions ? 'lav' : 'gray'}>{a.trackTransactions ? 'Tracking spending' : 'Not shared'}</Badge>
                            </div>
                          </div>
                          <ChevronRight size={16} className="shrink-0 text-faint" />
                        </button>
                      )
                    })}
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={connecting} onClose={() => setConnecting(false)} title="Add an account">
        {connecting && <ConnectFlow onClose={() => setConnecting(false)} />}
      </Sheet>
      <Sheet open={editingId !== null} onClose={() => setEditingId(null)} title="Edit account">
        {editingId !== null && <EditAccount key={editingId} id={editingId} onClose={() => setEditingId(null)} />}
      </Sheet>
    </>
  )
}

type Step = 'bank' | 'connecting' | 'pick' | 'importing' | 'done'

function ConnectFlow({ onClose }: { onClose: () => void }) {
  const { state, update, toast, today } = useStore()
  const existing = linkedAccountsOf(state)
  const [imported, setImported] = useState(0)
  const [step, setStep] = useState<Step>('bank')
  const [bankId, setBankId] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [added, setAdded] = useState(0)

  const bank = INSTITUTIONS.find((b) => b.id === bankId)
  const institution = bank?.name ?? custom
  const offers: Offer[] = bank?.offers ?? [{ kind: 'checking', name: 'Checking', last4: '0412' }, { kind: 'credit_card', name: 'Credit card', last4: '0987' }]
  const isConnected = (o: Offer) => existing.some((a) => a.institution === institution && a.last4 === o.last4)

  useEffect(() => {
    if (step !== 'connecting') return
    const t = window.setTimeout(() => {
      setPicked({})
      setStep('pick')
    }, 1400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    if (step !== 'importing') return
    const t = window.setTimeout(() => setStep('done'), 1600)
    return () => window.clearTimeout(t)
  }, [step])

  const chooseBank = (id: string) => { setBankId(id); setStep('connecting') }
  const chooseCustom = (name: string) => { setBankId(null); setCustom(name.trim()); setStep('connecting') }

  function connect() {
    const chosen = offers.filter((o) => picked[o.last4] && !isConnected(o))
    if (!chosen.length) return
    const rows: LinkedAccount[] = chosen.map((o) => ({
      id: uid('acct'), kind: o.kind, institution, nickname: o.name, last4: o.last4, trackTransactions: true, allowTransfers: o.kind === 'checking',
    }))
    // Adding an account pulls in its past and current transactions.
    const history = rows.flatMap((a) => generateAccountHistory(a, today))
    update((s) => ({
      ...s,
      linkedAccounts: [...linkedAccountsOf(s), ...rows],
      transactions: [...history, ...s.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    }))
    setAdded(rows.length)
    setImported(history.length)
    setStep('importing')
  }

  if (step === 'bank')
    return (
      <div className="space-y-3 pt-2">
        <p className="text-sm text-muted">Search for your bank or card issuer. You'll sign in on their secure page. We never see or store your username or password. Once added, we import the account's transaction history.</p>
        <InstitutionSearch autoFocus onPick={(i) => chooseBank(i.id)} onCustom={chooseCustom} />
      </div>
    )

  if (step === 'connecting')
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <LoaderCircle size={34} className="animate-spin text-accent-600" />
        <p className="mt-4 font-semibold">Connecting securely to {institution}…</p>
        <p className="mt-1 max-w-[260px] text-xs text-muted">Your credentials are entered with your bank, never in this app.</p>
      </div>
    )

  if (step === 'pick') {
    const count = offers.filter((o) => picked[o.last4] && !isConnected(o)).length
    return (
      <div className="space-y-2.5 pt-2">
        <p className="text-sm font-semibold">Select the accounts to add from {institution}</p>
        {offers.map((o) => {
          const k = KIND[o.kind]
          const done = isConnected(o)
          return (
            <label key={o.last4} className={cx('flex items-center gap-3 rounded-2xl border p-3.5', done ? 'border-line bg-cream opacity-70' : picked[o.last4] ? 'cursor-pointer border-accent-500 bg-accent-50' : 'cursor-pointer border-line bg-paper')}>
              <input type="checkbox" disabled={done} checked={!!picked[o.last4]} onChange={(e) => setPicked((p) => ({ ...p, [o.last4]: e.target.checked }))} className="size-5 accent-[#7c3aed]" />
              <IconTile icon={k.icon} color={k.color} soft={k.soft} size={36} />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{o.name} ••{o.last4}</span>
                <span className="text-xs text-muted">{done ? 'Already added' : k.label}</span>
              </span>
            </label>
          )
        })}
        <Note tone="gray" icon={<Lock size={14} />}>Added accounts share their transaction history with the app. Checking accounts can also be used to move money into your goals.</Note>
        <Button full size="lg" disabled={count === 0} onClick={connect}>{count === 0 ? 'Select accounts to add' : `Add ${count} account${count > 1 ? 's' : ''}`}</Button>
      </div>
    )
  }

  if (step === 'importing')
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <LoaderCircle size={34} className="animate-spin text-accent-600" />
        <p className="mt-4 font-semibold">Importing your transactions…</p>
        <p className="mt-1 max-w-[260px] text-xs text-muted">Bringing in past and recent activity from {institution}.</p>
      </div>
    )

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="grid size-16 animate-pop place-items-center rounded-full bg-mint-50 text-mint-500"><CircleCheck size={34} /></div>
      <p className="mt-4 text-lg font-bold">{added} account{added > 1 ? 's' : ''} added</p>
      <p className="mt-1 max-w-[280px] text-sm text-muted">{imported} transactions from the last 10 weeks were imported. They now appear in Insights and feed your spending patterns.</p>
      <Button full className="mt-6" onClick={() => { toast(`${imported} transactions imported`); onClose() }}>Done</Button>
    </div>
  )
}

function EditAccount({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, update, toast } = useStore()
  const account = linkedAccountsOf(state).find((a) => a.id === id)
  const [nickname, setNickname] = useState(account?.nickname ?? '')
  const [track, setTrack] = useState(account?.trackTransactions ?? true)
  const [transfers, setTransfers] = useState(account?.allowTransfers ?? false)
  const [tried, setTried] = useState(false)
  const [confirm, setConfirm] = useState(false)
  if (!account) return null
  const k = KIND[account.kind]
  const error = !nickname.trim() ? 'Give this account a nickname.' : undefined

  const patch = (fn: (list: LinkedAccount[]) => LinkedAccount[]) => update((s) => ({ ...s, linkedAccounts: fn(linkedAccountsOf(s)) }))

  function save() {
    setTried(true)
    if (error) return
    patch((l) => l.map((a) => (a.id === id ? { ...a, nickname: nickname.trim(), trackTransactions: track, allowTransfers: account!.kind === 'checking' ? transfers : false } : a)))
    toast('Account updated')
    onClose()
  }

  function disconnect() {
    update((s) => ({ ...s, linkedAccounts: linkedAccountsOf(s).filter((a) => a.id !== id), transactions: s.transactions.filter((t) => t.accountId !== id) }))
    toast('Account removed')
    onClose()
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3.5">
        <IconTile icon={k.icon} color={k.color} soft={k.soft} size={40} />
        <div>
          <p className="text-sm font-semibold">{account.institution}</p>
          <p className="text-xs text-muted">{k.label} ••{account.last4}</p>
        </div>
      </div>
      <Field label="Nickname" error={tried ? error : undefined}>
        <TextInput value={nickname} onChange={(e) => setNickname(e.target.value)} error={tried && !!error} maxLength={30} />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Share transaction history</p>
          <p className="text-xs text-muted">Used for Insights and habit tracking</p>
        </div>
        <Toggle checked={track} onChange={setTrack} label="Share transaction history" />
      </div>
      {account.kind === 'checking' && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Use for goal transfers</p>
            <p className="text-xs text-muted">Choose it when moving money into a goal</p>
          </div>
          <Toggle checked={transfers} onChange={setTransfers} label="Use for goal transfers" />
        </div>
      )}
      <Button full size="lg" onClick={save}><Check size={17} /> Save changes</Button>
      <Button full variant="danger" onClick={() => setConfirm(true)}><Trash2 size={16} /> Remove account</Button>
      <ConfirmationModal
        open={confirm}
        tone="danger"
        title={`Remove ${account.nickname}?`}
        message="Its imported transactions will no longer appear in Insights and it won't be available for transfers. Your goal balances and contribution history won't change."
        confirmLabel="Remove"
        onConfirm={disconnect}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}
