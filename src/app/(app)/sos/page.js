'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

// ── emergency services config ─────────────────────────────────────────────────
const SERVICES = [
  {
    label:  'Ambulance',
    number: '102',
    emoji:  '🚑',
    bg:     'bg-red-600 hover:bg-red-700',
    desc:   'Medical emergency',
  },
  {
    label:  'Police',
    number: '100',
    emoji:  '🚔',
    bg:     'bg-blue-700 hover:bg-blue-800',
    desc:   'Crime or accident',
  },
  {
    label:  'Fire Brigade',
    number: '101',
    emoji:  '🚒',
    bg:     'bg-orange-600 hover:bg-orange-700',
    desc:   'Fire emergency',
  },
  {
    label:  'Disaster Relief',
    number: '108',
    emoji:  '🆘',
    bg:     'bg-purple-700 hover:bg-purple-800',
    desc:   'Disaster / trauma',
  },
]

const RELATIONS = ['Family', 'Friend', 'Doctor', 'Colleague', 'Other']

// ── page ──────────────────────────────────────────────────────────────────────
export default function SOSPage() {
  const { user } = useAuth()

  const [contacts, setContacts]   = useState([])
  const [loadingCt, setLoadingCt] = useState(true)
  const [ctError, setCtError]     = useState(null)
  const [showForm, setShowForm]   = useState(false)

  function loadContacts() {
    if (!user) return
    setLoadingCt(true)
    supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setCtError(error.message); return }
        setContacts(data ?? [])
        setCtError(null)
      })
      .finally(() => setLoadingCt(false))
  }

  useEffect(() => { loadContacts() }, [user])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Warning banner */}
      <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
        <strong>DriveSarthi does not dispatch emergency services.</strong>{' '}
        These buttons call Indian national emergency numbers directly via your phone.
        In an emergency always call services directly.
      </div>

      {/* Emergency service dials */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Emergency Services
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map(svc => (
            <a
              key={svc.number}
              href={`tel:${svc.number}`}
              className={`flex items-center gap-3 rounded-xl px-4 py-4 text-white transition-colors ${svc.bg}`}
            >
              <span className="text-3xl">{svc.emoji}</span>
              <div>
                <p className="font-bold text-base leading-tight">{svc.label}</p>
                <p className="text-sm opacity-80">{svc.number}</p>
                <p className="text-xs opacity-70">{svc.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Personal emergency contacts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Personal Emergency Contacts
          </h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showForm ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>

        {showForm && (
          <ContactForm
            user={user}
            onSaved={() => { setShowForm(false); loadContacts() }}
          />
        )}

        {loadingCt ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <Skel key={i} />)}</div>
        ) : ctError ? (
          <ErrBox msg={ctError} />
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No contacts yet. Add your emergency contacts above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map(ct => (
              <ContactCard key={ct.id} contact={ct} onDeleted={loadContacts} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ── ContactForm ───────────────────────────────────────────────────────────────
function ContactForm({ user, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', relation: 'Family', is_primary: false })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  function set(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) { setError('Name and phone are required.'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('emergency_contacts').insert({
      user_id:    user.id,
      name:       form.name.trim(),
      phone:      form.phone.trim(),
      relation:   form.relation,
      is_primary: form.is_primary,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-3 mb-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={set('name')}
            placeholder="Priya Sharma"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Phone Number</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={set('phone')}
            placeholder="+91 98765 43210"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Relation</label>
          <select value={form.relation} onChange={set('relation')} className={INPUT_CLS}>
            {RELATIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <input
            id="is_primary"
            type="checkbox"
            checked={form.is_primary}
            onChange={e => setForm(p => ({ ...p, is_primary: e.target.checked }))}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="is_primary" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Primary contact
          </label>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white transition-colors"
      >
        {saving ? 'Saving…' : 'Save Contact'}
      </button>
    </form>
  )
}

// ── ContactCard ───────────────────────────────────────────────────────────────
function ContactCard({ contact, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm]   = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('emergency_contacts').delete().eq('id', contact.id)
    setDeleting(false)
    onDeleted()
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
        {contact.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-800 dark:text-white truncate">{contact.name}</p>
          {contact.is_primary && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
              Primary
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{contact.relation} · {contact.phone}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Call button */}
        <a
          href={`tel:${contact.phone}`}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-xs font-semibold text-white transition-colors"
        >
          📞 Call
        </a>
        {/* Delete */}
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="Delete contact"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold disabled:opacity-50">
              {deleting ? '…' : 'Yes'}
            </button>
            <button onClick={() => setConfirm(false)} className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold">
              No
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────
const INPUT_CLS = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

function Skel() { return <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" /> }
function ErrBox({ msg }) {
  return <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">{msg}</div>
}
