import { ChevronRight, Search } from 'lucide-react'
import { useState } from 'react'
import { searchInstitutions, type Institution } from '../data/institutions'
import { TextInput } from './ui'

/**
 * Search bar for a bank or card issuer. Results start with what was typed and are listed A–Z;
 * if nothing matches, the typed name can be used as another institution.
 */
export function InstitutionSearch({ onPick, onCustom, autoFocus }: {
  onPick: (institution: Institution) => void
  onCustom: (name: string) => void
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState('')
  const q = query.trim()
  const matches = searchInstitutions(query)

  const submit = () => {
    if (matches[0]) onPick(matches[0])
    else if (q) onCustom(q)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
        <TextInput
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder="Search for your bank or card issuer"
          aria-label="Search for your bank or card issuer"
          className="pl-11"
          maxLength={40}
        />
      </div>
      {!q && <p className="px-1 text-xs text-muted">Start typing the name of your bank or card issuer, for example “Northwind”.</p>}
      {matches.map((b) => (
        <button key={b.id} onClick={() => onPick(b)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-paper p-3.5 text-left transition hover:border-accent-300">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-100 text-sm font-bold text-accent-700">{b.name[0]}</span>
          <span className="flex-1 text-sm font-semibold">{b.name}</span>
          <ChevronRight size={16} className="text-faint" />
        </button>
      ))}
      {q && matches.length === 0 && (
        <button onClick={() => onCustom(q)} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent-200 bg-accent-50/50 p-3.5 text-left transition hover:border-accent-300">
          <span className="grid size-10 place-items-center rounded-xl bg-paper text-accent-600"><Search size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">Use “{q}”</span>
            <span className="text-xs text-muted">No match found. Add it as another institution</span>
          </span>
          <ChevronRight size={16} className="text-faint" />
        </button>
      )}
    </div>
  )
}
