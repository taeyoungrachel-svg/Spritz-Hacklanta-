import { useState } from 'react'
import { ArchHero } from '../components/ArchHero'
import { ContributionSheet } from '../components/ContributionSheet'
import { Button, Card, ConfirmationModal, ScreenHeader } from '../components/ui'
import { fmtMetric } from '../lib/calc'
import { money } from '../lib/format'
import { useStore } from '../state/store'
import { HABIT_WORD } from './ChallengeReview'

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four']

export function ChallengeResult({ id }: { id: string }) {
  const { state, back, goTab, push, update, toast } = useStore()
  const c = state.challenges.find((x) => x.id === id)
  const [contributing, setContributing] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  if (!c || !c.result) return <ScreenHeader onBack={back} title="Result unavailable" />
  const r = c.result
  const word = HABIT_WORD[c.habitId]
  const reduction = Math.max(0, r.usualSpend - r.actualSpend)
  const weeksLabel = `${c.durationWeeks} week${c.durationWeeks > 1 ? 's' : ''}`
  const span = c.durationWeeks > 1 ? `${NUM_WORDS[c.durationWeeks] ?? c.durationWeeks} weeks` : 'week'

  if (c.status === 'completed') {
    return (
      <div>
        <ScreenHeader onBack={() => goTab('home')} />
        <Card className="px-5 py-6 text-center!">
          <ArchHero tone="sage" orb="right" small className="-mt-2" />
          <h1 className="mt-2 text-[30px] leading-tight">Challenge <em>completed!</em></h1>
          <p className="mx-auto mt-2 max-w-[290px] text-sm leading-relaxed text-muted">You reached your {word} routine target for the past {span}.</p>

          <div className="mt-6 space-y-3 text-left">
            <Row label={`Your usual spending (${weeksLabel})`} value={money(r.usualSpend)} />
            <Row label="Your actual spending" value={money(r.actualSpend)} />
          </div>
          <div className="my-4 border-t border-line" />
          <div className="flex items-center justify-between text-left">
            <span className="font-bold">You spent less by</span>
            <span className="tabular text-2xl font-extrabold text-mint-500">{money(reduction)}</span>
          </div>
        </Card>

        <h2 className="mt-8 text-xl font-bold tracking-tight">Put your progress toward something meaningful.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">If you can afford to, set aside some of the money you spent less on to one of your goals.</p>
        <div className="mt-5 space-y-2">
          <Button full size="lg" onClick={() => setContributing(true)}>Set Aside Money</Button>
          <Button full variant="ghost" onClick={() => goTab('home')}>Not now</Button>
        </div>

        <ContributionSheet
          open={contributing}
          onClose={() => setContributing(false)}
          onFinished={() => { setContributing(false); toast('Money added to your goal'); goTab('home') }}
          initialAmount={reduction > 0 ? Math.round(reduction) : undefined}
          kind="challenge"
          title="Set aside money"
          note={reduction > 0 ? `Suggested: the ${money(Math.round(reduction))} you spent less. You can change the amount.` : undefined}
        />
      </div>
    )
  }

  const avg = Math.round((r.total / c.durationWeeks) * 10) / 10
  return (
    <div>
      <ScreenHeader onBack={() => goTab('home')} />
      <Card className="px-5 py-6 text-center!">
        <ArchHero tone="peach" orb="left" small className="-mt-2" />
        <h1 className="mt-2 text-[30px] leading-tight">Not quite <em>this time</em></h1>
        <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-muted">
          You didn't meet your {word} target, but you can always give it another try.
        </p>
        <div className="mt-6 space-y-3 text-left">
          <Row label="Your target" value={`${fmtMetric(c.metric, c.target)}/week`} />
          <Row label="Your average" value={`${fmtMetric(c.metric, avg)}/week`} />
          <Row label="Challenge duration" value={weeksLabel} />
        </div>
      </Card>
      <p className="mt-4 px-2 text-center text-xs text-muted">You can still add money to your goals anytime, no challenge required.</p>

      <div className="mt-6 space-y-2.5">
        <Button full size="lg" onClick={() => push({ name: 'startChallenge', habitId: c.habitId, retryOf: c.id })}>Retry Challenge</Button>
        <Button full size="lg" variant="outline" onClick={() => setConfirmEnd(true)}>End Challenge</Button>
      </div>

      <ConfirmationModal
        open={confirmEnd}
        title="End this challenge?"
        message="It will be removed from your active challenges. Its history is kept."
        confirmLabel="End challenge"
        onConfirm={() => {
          update((s) => ({ ...s, challenges: s.challenges.map((x) => (x.id === c.id ? { ...x, status: 'ended' } : x)) }))
          toast('Challenge archived')
          goTab('home')
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular text-base font-semibold">{value}</span>
    </div>
  )
}
