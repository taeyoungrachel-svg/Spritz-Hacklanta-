import { Check, ChartPie, ChevronLeft, CircleCheck, Landmark, LoaderCircle, Lock, PiggyBank, Repeat, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { Button, Field, MoneyInput, Note, Segmented, TextInput, cx, inputCls } from '../components/ui'
import { GOAL_ICONS, MAX_GOALS, goalTint, nextColorIdx } from '../data/meta'
import type { Goal } from '../data/types'
import { addMonths, fmtDate, nextAfter } from '../lib/date'
import { money, uid } from '../lib/format'
import { InstitutionSearch } from '../components/InstitutionSearch'
import { useStore } from '../state/store'
import { draftProjection, suggestMonthly, validateDraft, type GoalDraft } from './GoalForm'

export function Onboarding() {
  const { state, update, today, toast, goTab } = useStore()
  const [step, setStep] = useState(0)
  const [d, setD] = useState<GoalDraft>({ name: '', icon: 'plane', target: '', targetDate: addMonths(today, 9), deadlineType: 'fixed', starting: '', monthly: '', day: 10, transferMode: 'automatic' })
  const [tried, setTried] = useState(false)
  const [bank, setBank] = useState<string | null>(null)
  const [conn, setConn] = useState<'idle' | 'connecting' | 'accounts' | 'done'>('idle')
  const [accounts, setAccounts] = useState({ checking: true, savings: false })
  const set = (p: Partial<GoalDraft>) => setD((x) => ({ ...x, ...p }))
  const errors = tried ? validateDraft(d, today) : {}
  const suggestion = suggestMonthly(Number(d.target) || 0, Number(d.starting) || 0, d.targetDate || undefined, d.day, today)
  const p = draftProjection(d, today)

  const finish = (withGoal: boolean) => {
    update((s) => {
      if (!withGoal || s.goals.length >= MAX_GOALS) return { ...s, onboarded: true }
      const gid = uid('g')
      const goal: Goal = {
        id: gid, name: d.name.trim(), icon: d.icon, target: Number(d.target), monthlyContribution: Number(d.monthly) || 0, contributionDay: d.day,
        nextContributionDate: nextAfter(today, d.day), targetDate: d.targetDate || undefined, deadlineType: d.deadlineType, transferMode: d.transferMode, createdAt: today, colorIdx: nextColorIdx(s.goals),
      }
      const starting = Number(d.starting) || 0
      return {
        ...s, onboarded: true, goals: [...s.goals, goal],
        contributions: starting > 0 ? [...s.contributions, { id: uid('c'), goalId: gid, transferId: uid('tr'), date: today, planned: starting, settled: starting, status: 'completed', kind: 'starting' }] : s.contributions,
      }
    })
    goTab('home')
    if (withGoal) toast(state.goals.length >= MAX_GOALS ? `You already have ${MAX_GOALS} goals, so ${d.name.trim()} wasn't added` : `${d.name.trim()} added to your goals`)
  }

  const goalNext = () => {
    setTried(true)
    if (Object.keys(validateDraft(d, today)).length) return
    if (!d.monthly && suggestion) set({ monthly: String(suggestion.amount) })
    setStep(2)
  }

  const connect = (name: string) => {
    setBank(name)
    setConn('connecting')
    window.setTimeout(() => setConn('accounts'), 1400)
  }

  const goalCreated = d.name.trim() && Number(d.target) > 0

  return (
    <div className="flex h-full flex-col">
      {step > 0 && (
        <div className="flex items-center gap-2 px-3 pt-3 sm:px-5 sm:pt-6">
          <button aria-label="Back" onClick={() => setStep((s) => s - 1)} className="grid size-10 place-items-center rounded-full hover:bg-accent-50"><ChevronLeft size={22} /></button>
          <div className="flex flex-1 gap-1.5">
            {[1, 2, 3, 4].map((i) => <div key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= step ? 'bg-accent-500' : 'bg-accent-100')} />)}
          </div>
          <button onClick={() => finish(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink">Skip</button>
        </div>
      )}

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-6 sm:pb-8">
        {step === 0 && (
          <div key="welcome" className="flex min-h-full animate-fade-in flex-col">
            <div className="flex justify-end pt-4 sm:pt-6">
              <button onClick={() => finish(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-ink">Skip to demo</button>
            </div>
            <p className="text-[32px] leading-none font-extrabold tracking-tight text-accent-600">Spritz</p>
            <div className="relative mx-auto mt-6 h-[240px] w-full max-w-[300px]">
              <div aria-hidden="true" className="absolute top-2 left-1/2 size-[240px] -translate-x-1/2 rounded-full bg-[#a78bfa]/35 blur-3xl" />
              <div
                aria-hidden="true"
                className="absolute top-3 left-1/2 size-[220px] -translate-x-1/2 rounded-full border border-white/70 bg-[radial-gradient(circle_at_30%_24%,rgb(255_255_255/0.85)_0,rgb(255_255_255/0)_20%),radial-gradient(circle_at_50%_50%,rgb(196_181_253/0.12)_52%,rgb(139_92_246/0.38)_100%)] shadow-[inset_0_0_36px_rgb(167_139_250/0.6),inset_-16px_-22px_40px_rgb(224_25_140/0.2),inset_14px_16px_34px_rgb(255_255_255/0.6),0_0_50px_rgb(124_58_237/0.28)] backdrop-blur-[2px]"
              >
                <span className="absolute top-[18%] left-[16%] h-[9%] w-[22%] -rotate-[35deg] rounded-full bg-white/80 blur-[1px]" />
                <span className="absolute right-[18%] bottom-[14%] size-[7%] rounded-full bg-white/60 blur-[1px]" />
              </div>
              <div className="absolute top-0 left-0 animate-pop rounded-3xl bg-paper p-3.5 shadow-lift">
                <div className="flex items-center gap-2 text-xs font-semibold"><span className="grid size-7 place-items-center rounded-xl bg-accent-100 text-accent-600"><Target size={14} /></span> Japan Trip</div>
                <div className="mt-2 h-1.5 w-32 rounded-full bg-accent-100"><div className="h-full w-1/2 rounded-full bg-accent-500" /></div>
              </div>
              <div className="absolute top-20 right-0 animate-pop rounded-3xl bg-paper p-3.5 shadow-lift [animation-delay:120ms]">
                <p className="text-[11px] text-muted">Potential savings</p>
                <p className="text-lg font-bold text-accent-600">+$52/mo</p>
              </div>
              <div className="absolute bottom-3 left-8 animate-pop rounded-3xl bg-paper p-3.5 shadow-lift [animation-delay:240ms]">
                <div className="flex items-center gap-2 text-xs font-semibold"><span className="grid size-7 place-items-center rounded-xl bg-[#fde4f3] text-[#e0198c]"><ChartPie size={14} /></span> Coffee 4×/week</div>
              </div>
            </div>
            <h1 className="relative z-10 mt-12 text-[34px] leading-[1.08]">Make room for <em className="text-[#e0198c]!">bigger possibilities</em></h1>
            <p className="relative z-10 mt-3 text-base leading-snug font-medium text-muted">through mindful spending and smarter saving.</p>
            <div className="mt-auto pt-8">
              <Button full size="lg" onClick={() => setStep(1)}>Get Started</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div key="goal" className="animate-screen-in pt-4">
            <h1 className="text-2xl font-extrabold tracking-tight">Create your first goal</h1>
            <p className="mt-1 text-sm text-muted">What are you saving for?</p>
            <div className="mt-6 space-y-5">
              <Field label="Goal name" error={errors.name}>
                <TextInput value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Trip to Lisbon" error={!!errors.name} maxLength={40} />
              </Field>
              <Field label="Icon" optional>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(GOAL_ICONS).slice(0, 10).map(([k, Icon]) => (
                    <button key={k} type="button" aria-label={k} aria-pressed={d.icon === k} onClick={() => set({ icon: k })} className={cx('grid h-11 w-full place-items-center rounded-2xl border transition', d.icon === k ? 'border-accent-500 bg-accent-100 text-accent-700' : 'border-line bg-paper text-muted')}>
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Target amount" error={errors.target}>
                <MoneyInput value={d.target} onChange={(v) => set({ target: v })} error={!!errors.target} placeholder="2,500" ariaLabel="Target amount" />
              </Field>
              <Field label="Deadline">
                <Segmented value={d.deadlineType} onChange={(v) => set({ deadlineType: v })} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'flexible', label: 'Flexible' }]} />
              </Field>
              <Field label="Target date" optional={d.deadlineType === 'flexible'} error={errors.targetDate}>
                <input type="date" value={d.targetDate} min={today} onChange={(e) => set({ targetDate: e.target.value })} className={inputCls(!!errors.targetDate)} />
              </Field>
              <Field label="Already saved" optional error={errors.starting}>
                <MoneyInput value={d.starting} onChange={(v) => set({ starting: v })} error={!!errors.starting} ariaLabel="Already saved" />
              </Field>
            </div>
            <Button full size="lg" className="mt-8" onClick={goalNext}>Continue</Button>
          </div>
        )}

        {step === 2 && (
          <div key="plan" className="animate-screen-in pt-4">
            <h1 className="text-2xl font-extrabold tracking-tight">Set a monthly contribution</h1>
            <p className="mt-1 text-sm text-muted">A steady amount that moves {d.name || 'your goal'} forward.</p>
            {suggestion && (
              <div className="mt-5 rounded-3xl bg-accent-50 p-4">
                <p className="text-xs font-semibold text-accent-700">Suggested</p>
                <p className="tabular text-2xl font-bold">{money(suggestion.amount)}<span className="text-sm font-medium text-muted">/month</span></p>
                <p className="text-xs text-muted">{money((Number(d.target) || 0) - (Number(d.starting) || 0))} over {suggestion.periods} months to reach {fmtDate(d.targetDate)}</p>
              </div>
            )}
            <div className="mt-5 space-y-5">
              <Field label="Monthly amount">
                <MoneyInput value={d.monthly} onChange={(v) => set({ monthly: v })} ariaLabel="Monthly amount" />
              </Field>
              <Field label="Contribution date">
                <select value={d.day} onChange={(e) => set({ day: Number(e.target.value) })} className={inputCls()}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Day {n} of each month</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                {(['automatic', 'manual'] as const).map((m) => (
                  <button key={m} onClick={() => set({ transferMode: m })} aria-pressed={d.transferMode === m} className={cx('rounded-2xl border p-3.5 text-left transition', d.transferMode === m ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-100' : 'border-line bg-paper')}>
                    {m === 'automatic' ? <Repeat size={18} className="text-accent-600" /> : <Check size={18} className="text-accent-600" />}
                    <p className="mt-2 text-sm font-bold">{m === 'automatic' ? 'Automatic' : 'Manual'}</p>
                    <p className="text-xs text-muted">{m === 'automatic' ? 'Recurring transfer' : 'Approve each month'}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-line bg-paper p-4">
              <p className="text-xs text-muted">Estimated completion</p>
              <p key={p.estimate ?? ''} className="animate-fade-in text-xl font-bold">{p.estimate ? fmtDate(p.estimate) : 'Add a monthly amount'}</p>
              {p.status === 'delayed' && <p className="mt-1 text-xs text-[#4c1d95]">After your target date. Try the suggested amount.</p>}
              {p.status === 'on-track' && <p className="mt-1 text-xs text-mint-500">On track for {fmtDate(d.targetDate)}</p>}
            </div>
            <Button full size="lg" className="mt-8" onClick={() => setStep(3)}>Continue</Button>
          </div>
        )}

        {step === 3 && (
          <div key="bank" className="animate-screen-in pt-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-accent-100 text-accent-600"><Landmark size={26} /></div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Connect your bank</h1>
            <p className="mt-1 text-sm text-muted">Connecting an account enables:</p>
            <ul className="mt-3 space-y-2 text-sm">
              {['Spending insights', 'Automatic transaction categories', 'Habit tracking from real activity', 'Funding your savings goals'].map((t) => (
                <li key={t} className="flex items-center gap-2"><CircleCheck size={16} className="text-mint-500" /> {t}</li>
              ))}
            </ul>

            {conn === 'idle' && (
              <div className="mt-6">
                <InstitutionSearch onPick={(i) => connect(i.name)} onCustom={connect} />
              </div>
            )}
            {conn === 'connecting' && (
              <div className="mt-8 flex flex-col items-center text-center">
                <LoaderCircle size={32} className="animate-spin text-accent-600" />
                <p className="mt-3 font-semibold">Connecting securely to {bank}…</p>
                <p className="text-xs text-muted">Your credentials are entered with your bank, never in this app.</p>
              </div>
            )}
            {conn === 'accounts' && (
              <div className="mt-6 animate-fade-in space-y-2">
                <p className="text-sm font-semibold">Choose accounts to connect</p>
                {([['checking', 'Everyday Checking', '••4821', '$3,240.18'], ['savings', 'Rainy Day Savings', '••1934', '$812.40']] as const).map(([k, n, mask, bal]) => (
                  <label key={k} className={cx('flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5', accounts[k] ? 'border-accent-500 bg-accent-50' : 'border-line bg-paper')}>
                    <input type="checkbox" checked={accounts[k]} onChange={(e) => setAccounts((a) => ({ ...a, [k]: e.target.checked }))} className="size-5 accent-[#7c3aed]" />
                    <span className="flex-1"><span className="block text-sm font-semibold">{n} {mask}</span><span className="text-xs text-muted">{bal}</span></span>
                  </label>
                ))}
                <Button full size="lg" className="mt-3" disabled={!accounts.checking && !accounts.savings} onClick={() => setConn('done')}>Connect accounts</Button>
              </div>
            )}
            {conn === 'done' && (
              <div className="mt-6 flex animate-pop flex-col items-center rounded-3xl bg-mint-50 p-5 text-center">
                <CircleCheck size={34} className="text-mint-500" />
                <p className="mt-2 font-bold">Account connected</p>
                <p className="text-xs text-muted">{bank} · {[accounts.checking && 'Checking', accounts.savings && 'Savings'].filter(Boolean).join(' & ')}</p>
              </div>
            )}
            <div className="mt-6"><Note tone="gray" icon={<Lock size={14} />}>You sign in on your bank's secure page. We never see or store your username or password.</Note></div>
            <Button full size="lg" className="mt-6" disabled={conn === 'connecting' || conn === 'accounts'} variant={conn === 'done' ? 'primary' : 'outline'} onClick={() => setStep(4)}>
              {conn === 'done' ? 'Continue' : 'Skip for now'}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div key="done" className="animate-screen-in pt-4">
            <div className="grid size-14 animate-pop place-items-center rounded-2xl bg-mint-50 text-mint-500"><ShieldCheck size={28} /></div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">You're all set</h1>
            <p className="mt-1 text-sm text-muted">Here's your plan. You can change it anytime.</p>
            {goalCreated ? (
              <div className="mt-6 rounded-3xl border border-line bg-paper p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = GOAL_ICONS[d.icon] ?? PiggyBank; const t = goalTint({ icon: d.icon, colorIdx: nextColorIdx(state.goals) }); return <span className="grid size-11 place-items-center rounded-2xl" style={{ background: t.soft, color: t.color }}><Icon size={20} /></span> })()}
                  <div>
                    <p className="font-bold">{d.name}</p>
                    <p className="text-xs text-muted">{d.deadlineType === 'fixed' ? 'Fixed deadline' : 'Flexible'}{d.targetDate ? ` · ${fmtDate(d.targetDate)}` : ''}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="Target" value={money(Number(d.target))} />
                  <Row label="Already saved" value={money(Number(d.starting) || 0)} />
                  <Row label="Monthly contribution" value={`${money(Number(d.monthly) || 0)} on day ${d.day}`} />
                  <Row label="Transfers" value={d.transferMode === 'automatic' ? 'Automatic' : 'Manual approval'} />
                  <Row label="Estimated completion" value={p.estimate ? fmtDate(p.estimate) : 'N/A'} />
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">You can create a goal anytime from the Goals tab.</p>
            )}
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-accent-50 px-4 py-3 text-xs text-accent-700">
              <Sparkles size={15} /> We've also loaded Alex's demo goals and transactions so you can explore everything.
            </div>
            <Button full size="lg" className="mt-8" onClick={() => finish(!!goalCreated)}>Go to Home</Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular text-right font-semibold">{value}</span>
    </div>
  )
}

