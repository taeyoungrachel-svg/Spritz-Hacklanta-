import { Bell, CalendarClock, Mail, Pencil, Phone, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { ConnectedAccounts } from '../components/ConnectedAccounts'
import { Avatar } from '../components/Avatar'
import { Button, Card, ConfirmationModal, Field, ScreenHeader, SectionTitle, Sheet, TextInput, Toggle } from '../components/ui'
import { categoryMeta } from '../data/meta'
import { DEFAULT_PROFILE } from '../data/seed'
import type { Profile as ProfileData } from '../data/types'
import { fmtDate, fmtMonthYear } from '../lib/date'
import { money } from '../lib/format'
import { useStore } from '../state/store'

export function Profile() {
  const { state, today, back, update, resetDemo, toast } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const [editing, setEditing] = useState(false)
  const profile: ProfileData = { ...DEFAULT_PROFILE, ...state.profile }
  const since = state.goals.map((g) => g.createdAt).sort()[0] ?? today
  const setPref = (p: Partial<ProfileData>) => update((s) => ({ ...s, profile: { ...DEFAULT_PROFILE, ...s.profile, ...p } }))

  return (
    <div>
      <ScreenHeader onBack={back} title="Profile & settings" />

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={state.userName} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{state.userName}</p>
            <p className="text-xs text-muted">Member since {fmtMonthYear(since)}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Button>
        </div>
        <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
          <p className="flex items-center gap-2.5"><Mail size={16} className="text-faint" /> <span className="truncate">{profile.email}</span></p>
          <p className="flex items-center gap-2.5"><Phone size={16} className="text-faint" /> {profile.phone || <span className="text-faint">No phone added</span>}</p>
        </div>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <p className="text-xs font-semibold tracking-wide text-faint uppercase">Customize</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bell size={16} className="text-faint" />
              <div>
                <p className="text-sm font-semibold">Contribution reminders</p>
                <p className="text-xs text-muted">A nudge before a deposit is due</p>
              </div>
            </div>
            <Toggle checked={profile.contributionReminders} onChange={(v) => setPref({ contributionReminders: v })} label="Contribution reminders" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarClock size={16} className="text-faint" />
              <div>
                <p className="text-sm font-semibold">Weekly spending summary</p>
                <p className="text-xs text-muted">A recap every Monday</p>
              </div>
            </div>
            <Toggle checked={profile.weeklySummary} onChange={(v) => setPref({ weeklySummary: v })} label="Weekly spending summary" />
          </div>
        </div>
      </Card>

      <ConnectedAccounts />

      <SectionTitle>Purchase history</SectionTitle>
      <Card className="py-1">
        {state.purchases.length ? (
          <div className="divide-y divide-line">
            {state.purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted">{fmtDate(p.date)} · {categoryMeta(p.category).label}{p.motivation ? ` · ${p.motivation}` : ''}</p>
                </div>
                <p className="tabular text-sm font-bold">{money(p.price)}</p>
              </div>
            ))}
          </div>
        ) : <p className="py-5 text-center text-sm text-muted">Purchases you confirm will appear here.</p>}
      </Card>

      <SectionTitle>Demo</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <CalendarClock size={18} className="text-muted" />
          <div className="flex-1">
            <p className="font-semibold">Demo date: {fmtDate(today)}</p>
            <p className="text-xs text-muted">{state.demoOffsetDays ? `${state.demoOffsetDays} days ahead of today (from challenge fast-forward)` : 'Matches today'}</p>
          </div>
          {state.demoOffsetDays > 0 && (
            <Button size="sm" variant="outline" onClick={() => { update((s) => ({ ...s, demoOffsetDays: 0 })); toast('Demo date reset') }}>Reset</Button>
          )}
        </div>
        <Button full variant="outline" onClick={() => update((s) => ({ ...s, onboarded: false }))}>Replay onboarding</Button>
        <Button full variant="danger" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> Reset demo data</Button>
      </Card>
      <p className="mt-4 text-center text-xs text-faint">Prototype build · no banking backend is connected yet, so no real money moves.</p>

      <EditProfileSheet open={editing} onClose={() => setEditing(false)} />

      <ConfirmationModal
        open={confirmReset}
        tone="danger"
        title="Reset demo data?"
        message="This restores Alex's original goals, transactions, wishlist and challenges. Your changes in this browser will be cleared."
        confirmLabel="Reset"
        onConfirm={() => { setConfirmReset(false); resetDemo(); toast('Demo data reset') }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}

function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      {open && <EditBody onClose={onClose} />}
    </Sheet>
  )
}

function EditBody({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useStore()
  const current: ProfileData = { ...DEFAULT_PROFILE, ...state.profile }
  const [name, setName] = useState(state.userName)
  const [email, setEmail] = useState(current.email)
  const [phone, setPhone] = useState(current.phone)
  const [tried, setTried] = useState(false)

  const errors = {
    name: !name.trim() ? 'Enter a name.' : undefined,
    email: !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Enter a valid email address.' : undefined,
  }

  function save() {
    setTried(true)
    if (errors.name || errors.email) return
    update((s) => ({ ...s, userName: name.trim(), profile: { ...DEFAULT_PROFILE, ...s.profile, email: email.trim(), phone: phone.trim() } }))
    toast('Profile updated')
    onClose()
  }

  return (
    <div className="space-y-5 pt-2">
      <Field label="Name" error={tried ? errors.name : undefined} hint="Used in your Home greeting.">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} error={tried && !!errors.name} maxLength={30} />
      </Field>
      <Field label="Email" error={tried ? errors.email : undefined}>
        <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={tried && !!errors.email} />
      </Field>
      <Field label="Phone" optional>
        <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Button full size="lg" onClick={save}>Save changes</Button>
    </div>
  )
}
