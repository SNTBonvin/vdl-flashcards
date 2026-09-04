import { useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { requestSession } from '../state/session'
import { countCards } from '../srs/queue'
import { Icon } from '../components/Icon'
import {
  ConfirmSheet,
  EmptyState,
  Field,
  SectionHead,
  Sheet,
  StatRow,
  Toggle,
  plural,
  useToast,
} from '../components/ui'
import { DeckSheet } from './Subject'
import { DEFAULT_REMINDER_TIME, WEEKDAYS, requestPermission } from '../reminders/reminders'
import type { Card, Reminder } from '../db/types'
import { DAY_SHORT, formatDue } from '../lib/date'
import { ImportError, parseRows, readFile } from '../io/transfer'

type Filter = 'all' | 'due' | 'new' | 'hard'

export function DeckScreen({ id }: { id: string }) {
  const store = useStore()
  const { navigate } = useRoute()
  const toast = useToast()

  const [editingDeck, setEditingDeck] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | 'new' | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const deck = store.decks.find((d) => d.id === id)
  const cards = useMemo(() => store.cardsByDeck.get(id) ?? [], [store.cardsByDeck, id])
  const counts = countCards(cards)

  const visible = useMemo(() => {
    const now = Date.now()
    const sorted = cards.slice().sort((a, b) => a.createdAt - b.createdAt)
    switch (filter) {
      case 'due':
        return sorted.filter((c) => !c.suspended && c.srs.state !== 'new' && c.srs.due <= now)
      case 'new':
        return sorted.filter((c) => c.srs.state === 'new')
      case 'hard':
        return sorted.filter((c) => c.srs.lapses > 0 || c.srs.state === 'relearning')
      default:
        return sorted
    }
  }, [cards, filter])

  if (!deck) {
    return (
      <main className="screen">
        <EmptyState
          icon="layers"
          title="Catégorie introuvable"
          text="Elle a peut-être été supprimée."
          action={
            <button type="button" className="btn btn--ghost" onClick={() => navigate({ name: 'library' })}>
              Retour aux matières
            </button>
          }
        />
      </main>
    )
  }

  const waiting = counts.due + counts.fresh

  const start = (mode: 'due' | 'quiz' | 'hard') => {
    requestSession({ deckIds: [deck.id], mode, label: deck.name })
    navigate({ name: 'review' })
  }

  return (
    <main className="screen stack stack-5">
      {deck.description && (
        <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.6, padding: '0 2px' }}>
          {deck.description}
        </p>
      )}

      <StatRow
        items={[
          { value: counts.total, label: plural(counts.total, 'carte') },
          { value: waiting, label: 'à réviser', accent: waiting > 0 },
          { value: counts.hard, label: 'difficiles' },
        ]}
      />

      <div className="row" style={{ gap: 10 }}>
        <button
          type="button"
          className="btn btn--primary grow"
          disabled={counts.total === 0}
          onClick={() => start(waiting > 0 ? 'due' : 'quiz')}
        >
          <Icon name="review" size={18} />
          {waiting > 0 ? `Réviser ${waiting}` : 'Interrogation'}
        </button>
        <button
          type="button"
          className={`icon-btn${deck.reminder?.enabled ? ' chip--accent' : ''}`}
          onClick={() => setReminderOpen(true)}
          aria-label="Rappel"
        >
          <Icon name={deck.reminder?.enabled ? 'bell' : 'bell-off'} size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={() => setEditingDeck(true)} aria-label="Modifier">
          <Icon name="edit" size={18} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={() => setConfirming(true)}
          aria-label="Supprimer"
        >
          <Icon name="trash" size={18} />
        </button>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn btn--ghost grow" onClick={() => setEditingCard('new')}>
          <Icon name="plus" size={18} />
          Ajouter une carte
        </button>
        <button type="button" className="btn btn--ghost grow" onClick={() => setImportOpen(true)}>
          <Icon name="upload" size={18} />
          Importer
        </button>
      </div>

      <section className="stack stack-3">
        <SectionHead title="Cartes" aside={<span className="meta mono">{visible.length}</span>} />

        <div className="seg">
          {(
            [
              ['all', 'Toutes'],
              ['due', 'Dues'],
              ['new', 'Neuves'],
              ['hard', 'Difficiles'],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="seg__item"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="card"
            title={filter === 'all' ? 'Aucune carte' : 'Aucune carte dans ce filtre'}
            text={
              filter === 'all'
                ? 'Ajoutez vos cartes une par une, ou importez une liste depuis un tableur ou un autre logiciel.'
                : 'Changez de filtre pour retrouver le reste des cartes de cette catégorie.'
            }
            action={
              filter === 'all' ? (
                <button type="button" className="btn btn--primary" onClick={() => setEditingCard('new')}>
                  <Icon name="plus" size={18} />
                  Ajouter une carte
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="card">
            {visible.map((card) => (
              <button
                key={card.id}
                type="button"
                className="listrow"
                onClick={() => setEditingCard(card)}
              >
                <span className={`dot dot--${statusOf(card)}`} />
                <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                  <span className="listrow__title clamp-2">{card.front}</span>
                  <span className="listrow__sub truncate">{card.back}</span>
                </span>
                <span className="chip mono">{cardStateLabel(card)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {counts.hard > 0 && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => start('hard')}>
          <Icon name="flag" size={18} />
          Reprendre les {counts.hard} cartes difficiles
        </button>
      )}

      {/* --- Feuilles --- */}

      <CardSheet
        open={editingCard !== null}
        card={editingCard === 'new' ? null : editingCard}
        onClose={() => setEditingCard(null)}
        onSubmit={async (values) => {
          if (editingCard && editingCard !== 'new') {
            await store.updateCard(editingCard.id, values)
            toast('Carte modifiée.')
          } else {
            await store.createCard(deck.id, values)
            toast('Carte ajoutée.')
          }
          setEditingCard(null)
        }}
        onDelete={async () => {
          if (editingCard && editingCard !== 'new') {
            await store.deleteCard(editingCard.id)
            toast('Carte supprimée.')
          }
          setEditingCard(null)
        }}
        onReset={async () => {
          if (editingCard && editingCard !== 'new') {
            await store.resetCards([editingCard.id])
            toast('Progression de la carte réinitialisée.')
          }
          setEditingCard(null)
        }}
      />

      <DeckSheet
        open={editingDeck}
        title="Modifier la catégorie"
        initial={{ name: deck.name, description: deck.description }}
        onClose={() => setEditingDeck(false)}
        onSubmit={async (name, description) => {
          await store.updateDeck(deck.id, { name, description })
          setEditingDeck(false)
          toast('Catégorie mise à jour.')
        }}
      />

      <ReminderSheet
        open={reminderOpen}
        deckName={deck.name}
        reminder={deck.reminder}
        onClose={() => setReminderOpen(false)}
        onSubmit={async (reminder) => {
          if (reminder?.enabled) {
            const permission = await requestPermission()
            if (permission !== 'granted') {
              toast('Les notifications sont refusées par le navigateur.', 'error')
            } else if (!store.settings.notificationsEnabled) {
              await store.saveSettings({ notificationsEnabled: true })
            }
          }
          await store.setReminder(deck.id, reminder)
          setReminderOpen(false)
          toast(reminder?.enabled ? 'Rappel programmé.' : 'Rappel désactivé.')
        }}
      />

      <ImportSheet
        open={importOpen}
        deckName={deck.name}
        onClose={() => setImportOpen(false)}
        onImport={async (rows) => {
          const added = await store.createCards(deck.id, rows)
          setImportOpen(false)
          toast(`${added} ${plural(added, 'carte importée', 'cartes importées')}.`)
        }}
      />

      <ConfirmSheet
        open={confirming}
        title={`Supprimer « ${deck.name} » ?`}
        text={`Les ${counts.total} ${plural(counts.total, 'carte')} de cette catégorie et leur progression seront définitivement supprimées.`}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await store.deleteDeck(deck.id)
          toast('Catégorie supprimée.')
          navigate({ name: 'subject', id: deck.subjectId })
        }}
      />
    </main>
  )
}

function statusOf(card: Card): 'ok' | 'run' | 'warn' | 'err' | 'idle' {
  if (card.suspended) return 'idle'
  if (card.srs.state === 'new') return 'idle'
  if (card.srs.state === 'relearning') return 'err'
  if (card.srs.due <= Date.now()) return 'warn'
  return 'ok'
}

function cardStateLabel(card: Card): string {
  if (card.suspended) return 'suspendue'
  if (card.srs.state === 'new') return 'neuve'
  if (card.srs.state === 'relearning') return 'à revoir'
  if (card.srs.due <= Date.now()) return 'due'
  return formatDue(card.srs.due)
}

/* ------------------------------ Éditeur de carte ------------------------------ */

export function CardSheet({
  open,
  card,
  onClose,
  onSubmit,
  onDelete,
  onReset,
}: {
  open: boolean
  card: Card | null
  onClose: () => void
  onSubmit: (values: { front: string; back: string; notes: string; tags: string[]; suspended: boolean }) => void
  onDelete?: () => void
  onReset?: () => void
}) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [suspended, setSuspended] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const loadedFor = useRef<string | null>(null)

  // Recharge les champs quand la feuille s'ouvre sur une autre carte.
  const key = open ? (card?.id ?? 'new') : null
  if (key !== loadedFor.current) {
    loadedFor.current = key
    if (open) {
      setFront(card?.front ?? '')
      setBack(card?.back ?? '')
      setNotes(card?.notes ?? '')
      setTags(card?.tags.join(' ') ?? '')
      setSuspended(card?.suspended ?? false)
    }
  }

  const submit = () => {
    if (!front.trim() || !back.trim()) return
    onSubmit({
      front: front.trim(),
      back: back.trim(),
      notes: notes.trim(),
      tags: tags.split(/[\s,]+/).filter(Boolean),
      suspended,
    })
  }

  return (
    <>
      <Sheet
        open={open}
        title={card ? 'Modifier la carte' : 'Nouvelle carte'}
        onClose={onClose}
        footer={
          <>
            {card && onDelete && (
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                onClick={() => setConfirmDelete(true)}
                aria-label="Supprimer la carte"
                style={{ height: 46, width: 46 }}
              >
                <Icon name="trash" size={18} />
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary grow"
              onClick={submit}
              disabled={!front.trim() || !back.trim()}
            >
              Enregistrer
            </button>
          </>
        }
      >
        <div className="stack stack-5">
          <Field label="Recto — la question">
            <textarea
              className="textarea"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="En quelle année débute la Ve République ?"
              autoFocus={!card}
            />
          </Field>
          <Field label="Verso — la réponse">
            <textarea
              className="textarea"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="1958"
            />
          </Field>
          <Field label="Note" hint="Précision affichée après la réponse. Facultatif.">
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Field label="Étiquettes" hint="Séparées par des espaces.">
            <input className="input mono" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>

          {card && (
            <>
              <hr className="rule" />
              <Toggle
                checked={suspended}
                onChange={setSuspended}
                label="Suspendre la carte"
                hint="Elle ne sera plus proposée en révision."
              />
              <div className="card card--pad stack stack-3">
                <span className="eyebrow">Progression</span>
                <div className="row row--between">
                  <span className="meta">État</span>
                  <span className="chip mono">{cardStateLabel(card)}</span>
                </div>
                <div className="row row--between">
                  <span className="meta">Révisions · oublis</span>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {card.srs.reps} · {card.srs.lapses}
                  </span>
                </div>
                <div className="row row--between">
                  <span className="meta">Intervalle · facilité</span>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {card.srs.interval} j · {card.srs.ease.toFixed(2)}
                  </span>
                </div>
                {onReset && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
                    <Icon name="reset" size={16} />
                    Réinitialiser la progression
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        title="Supprimer cette carte ?"
        text="La carte et son historique de révision seront perdus."
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => onDelete?.()}
      />
    </>
  )
}

/* -------------------------------- Rappels -------------------------------- */

function ReminderSheet({
  open,
  deckName,
  reminder,
  onClose,
  onSubmit,
}: {
  open: boolean
  deckName: string
  reminder: Reminder | null
  onClose: () => void
  onSubmit: (reminder: Reminder | null) => void
}) {
  const [enabled, setEnabled] = useState(reminder?.enabled ?? false)
  const [time, setTime] = useState(reminder?.time ?? DEFAULT_REMINDER_TIME)
  const [days, setDays] = useState<number[]>(reminder?.days ?? WEEKDAYS)
  const loaded = useRef(false)

  if (open && !loaded.current) {
    loaded.current = true
    setEnabled(reminder?.enabled ?? false)
    setTime(reminder?.time ?? DEFAULT_REMINDER_TIME)
    setDays(reminder?.days ?? WEEKDAYS)
  }
  if (!open && loaded.current) loaded.current = false

  const toggleDay = (day: number) =>
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    )

  return (
    <Sheet
      open={open}
      title="Rappel de révision"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() =>
            onSubmit(
              enabled && days.length > 0
                ? { enabled: true, time, days, lastFiredAt: reminder?.lastFiredAt ?? null }
                : { enabled: false, time, days, lastFiredAt: null },
            )
          }
        >
          Enregistrer
        </button>
      }
    >
      <div className="stack stack-5">
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Me rappeler de réviser"
          hint={`Notification pour « ${deckName} ».`}
        />

        {enabled && (
          <>
            <Field label="Heure">
              <input className="input mono" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>

            <div className="field">
              <span className="label">Jours</span>
              <div className="picker">
                {DAY_SHORT.map((label, index) => (
                  <button
                    key={index}
                    type="button"
                    className="chip chip--select"
                    style={{ width: 42, justifyContent: 'center', padding: 0 }}
                    aria-pressed={days.includes(index)}
                    onClick={() => toggleDay(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card card--pad row" data-status="warn" style={{ gap: 12 }}>
              <span className="glyph glyph--warm">
                <Icon name="info" size={18} />
              </span>
              <p className="meta" style={{ lineHeight: 1.55 }}>
                Le rappel se déclenche à l’ouverture de l’application ou lorsqu’elle est active. Sur iPhone,
                installez-la sur l’écran d’accueil pour recevoir les notifications.
              </p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

/* -------------------------------- Import -------------------------------- */

export function ImportSheet({
  open,
  deckName,
  onClose,
  onImport,
}: {
  open: boolean
  deckName: string
  onClose: () => void
  onImport: (rows: { front: string; back: string; notes?: string; tags?: string[] }[]) => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => (text.trim() ? parseRows(text) : []), [text])

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setText(await readFile(file))
      setError(null)
    } catch (e) {
      setError(e instanceof ImportError ? e.message : 'Lecture du fichier impossible.')
    }
  }

  return (
    <Sheet
      open={open}
      title="Importer des cartes"
      onClose={() => {
        setText('')
        setError(null)
        onClose()
      }}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={rows.length === 0}
          onClick={() => {
            onImport(rows)
            setText('')
          }}
        >
          Importer {rows.length > 0 ? `${rows.length} ${plural(rows.length, 'carte')}` : ''}
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Collez une liste ou choisissez un fichier CSV / TSV. Une carte par ligne, le recto puis le verso,
          séparés par une tabulation, un point-virgule ou une virgule. Les cartes iront dans « {deckName} ».
        </p>

        <button type="button" className="btn btn--ghost btn--block" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" size={18} />
          Choisir un fichier
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.tsv,.txt,text/plain,text/csv"
          hidden
          onChange={(e) => void pickFile(e.target.files?.[0])}
        />

        <Field label="Ou collez vos cartes">
          <textarea
            className="textarea mono"
            style={{ minHeight: 150, fontSize: 13 }}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            placeholder={'1958 ; Début de la Ve République\n1962 ; Élection du président au suffrage universel'}
          />
        </Field>

        {error && (
          <div className="card card--pad" data-status="err">
            <span className="meta" style={{ color: 'var(--err)' }}>
              {error}
            </span>
          </div>
        )}

        {rows.length > 0 && (
          <div className="stack stack-3">
            <SectionHead title={`Aperçu · ${rows.length} ${plural(rows.length, 'carte')}`} />
            <div className="card">
              {rows.slice(0, 5).map((row, index) => (
                <div key={index} className="listrow" style={{ cursor: 'default' }}>
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="listrow__title truncate">{row.front}</span>
                    <span className="listrow__sub truncate">{row.back}</span>
                  </span>
                </div>
              ))}
              {rows.length > 5 && (
                <div className="listrow" style={{ cursor: 'default' }}>
                  <span className="meta mono">+ {rows.length - 5} autres</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
