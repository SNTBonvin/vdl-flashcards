import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { takeSession } from '../state/session'
import { buildQueue, countCards, type SessionMode } from '../srs/queue'
import { formatDelay, previewDelay } from '../srs/scheduler'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, Toggle, plural, useToast } from '../components/ui'
import type { Card, Grade, ID } from '../db/types'

const MODES: { value: SessionMode; label: string; hint: string }[] = [
  { value: 'due', label: 'Programmé', hint: 'Les cartes échues du jour, plus les nouvelles.' },
  { value: 'quiz', label: 'Interrogation', hint: 'Toutes les cartes des thèmes choisis, mélangées.' },
  { value: 'hard', label: 'Difficiles', hint: 'Uniquement les cartes déjà ratées au moins une fois.' },
]

export function ReviewScreen({ onSessionChange }: { onSessionChange: (running: boolean) => void }) {
  const store = useStore()
  const [queue, setQueue] = useState<Card[] | null>(null)
  const [label, setLabel] = useState('Révision')

  useEffect(() => {
    onSessionChange(queue !== null)
    return () => onSessionChange(false)
  }, [queue, onSessionChange])

  const startWith = useCallback(
    (deckIds: ID[], mode: SessionMode, sessionLabel: string) => {
      const set = new Set(deckIds)
      const cards = store.cards.filter((c) => set.has(c.deckId))
      const built = buildQueue(cards, {
        mode,
        introducedToday: store.intro.counts,
        settings: store.settings,
      })
      setLabel(sessionLabel)
      setQueue(built)
      return built.length
    },
    [store.cards, store.intro.counts, store.settings],
  )

  // Une demande venue d'un autre écran démarre la session directement.
  useEffect(() => {
    const request = takeSession()
    if (request) startWith(request.deckIds, request.mode, request.label)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (queue === null) return <ReviewSetup onStart={startWith} />
  return <Session queue={queue} label={label} onExit={() => setQueue(null)} />
}

/* ------------------------------ Préparation ------------------------------ */

function ReviewSetup({
  onStart,
}: {
  onStart: (deckIds: ID[], mode: SessionMode, label: string) => number
}) {
  const store = useStore()
  const toast = useToast()
  const [mode, setMode] = useState<SessionMode>('due')
  const [selected, setSelected] = useState<ID[]>([])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const preview = useMemo(() => {
    const cards = store.cards.filter((c) => selectedSet.has(c.deckId))
    return buildQueue(cards, {
      mode,
      introducedToday: store.intro.counts,
      settings: store.settings,
    }).length
  }, [store.cards, store.intro.counts, store.settings, selectedSet, mode])

  const toggle = (deckId: ID) =>
    setSelected((current) =>
      current.includes(deckId) ? current.filter((id) => id !== deckId) : [...current, deckId],
    )

  const allIds = store.decks.map((d) => d.id)
  const allSelected = selected.length === allIds.length && allIds.length > 0

  if (store.decks.length === 0) {
    return (
      <main className="screen stack stack-5">
        <div className="page-title">
          <h1>Réviser</h1>
        </div>
        <EmptyState
          icon="review"
          title="Rien à réviser"
          text="Créez d’abord une matière et un thème, puis ajoutez des cartes pour lancer une session."
        />
      </main>
    )
  }

  return (
    <main className="screen stack stack-5">
      <div className="page-title">
        <h1>Réviser</h1>
      </div>

      <section className="stack stack-3">
        <SectionHead title="Mode" />
        <div className="seg">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              className="seg__item"
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="meta" style={{ padding: '0 2px', lineHeight: 1.55 }}>
          {MODES.find((m) => m.value === mode)?.hint}
        </p>
      </section>

      <section className="stack stack-3">
        <SectionHead
          title="Thèmes"
          aside={
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => setSelected(allSelected ? [] : allIds)}
            >
              {allSelected ? 'Tout décocher' : 'Tout cocher'}
            </button>
          }
        />

        <div className="stack stack-4">
          {store.subjects.map((subject) => {
            const decks = store.decksBySubject.get(subject.id) ?? []
            if (decks.length === 0) return null
            return (
              <div key={subject.id} className="stack stack-2">
                <span className="eyebrow" style={{ paddingLeft: 2 }}>
                  {subject.name}
                </span>
                <div className="picker">
                  {decks.map((deck) => {
                    const counts = countCards(store.cardsByDeck.get(deck.id) ?? [])
                    const waiting = counts.due + counts.fresh
                    return (
                      <button
                        key={deck.id}
                        type="button"
                        className="chip chip--select"
                        aria-pressed={selectedSet.has(deck.id)}
                        onClick={() => toggle(deck.id)}
                      >
                        {deck.name}
                        <span style={{ opacity: 0.65 }}>
                          {mode === 'due' ? waiting : mode === 'hard' ? counts.hard : counts.total}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card card--pad stack stack-4">
        <span className="eyebrow">Options de session</span>
        <Toggle
          checked={store.settings.shuffle}
          onChange={(v) => void store.saveSettings({ shuffle: v })}
          label="Mélanger les cartes"
          hint="Évite d’apprendre l’ordre plutôt que le contenu."
        />
        <hr className="rule" />
        <Toggle
          checked={store.settings.reverse}
          onChange={(v) => void store.saveSettings({ reverse: v })}
          label="Inverser recto et verso"
          hint="La réponse est posée en question."
        />
      </section>

      <button
        type="button"
        className="btn btn--primary btn--lg btn--block"
        disabled={selected.length === 0 || preview === 0}
        onClick={() => {
          const names = store.decks.filter((d) => selectedSet.has(d.id)).map((d) => d.name)
          const started = onStart(
            selected,
            mode,
            names.length === 1 ? names[0] : `${names.length} thèmes`,
          )
          if (started === 0) toast('Aucune carte à réviser avec ces réglages.', 'error')
        }}
      >
        {selected.length === 0
          ? 'Choisissez un thème'
          : preview === 0
            ? 'Aucune carte à réviser'
            : `Commencer — ${preview} ${plural(preview, 'carte')}`}
      </button>
    </main>
  )
}

/* -------------------------------- Session -------------------------------- */

interface Tally {
  again: number
  hard: number
  good: number
}

function Session({ queue, label, onExit }: { queue: Card[]; label: string; onExit: () => void }) {
  const store = useStore()
  const [cards, setCards] = useState<Card[]>(queue)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [tally, setTally] = useState<Tally>({ again: 0, hard: 0, good: 0 })
  const [startedAt] = useState(() => Date.now())

  const total = queue.length
  const card = cards[index]
  const done = index >= cards.length

  const reverse = store.settings.reverse
  const question = card ? (reverse ? card.back : card.front) : ''
  const answer = card ? (reverse ? card.front : card.back) : ''

  const respond = async (grade: Grade) => {
    if (!card) return
    const updated = await store.answer(card, grade)
    setTally((t) => ({ ...t, [grade]: t[grade] + 1 }))

    // Une carte ratée revient avant la fin de la session.
    const soon = updated.srs.due <= Date.now() + 11 * 60_000
    setCards((current) => (soon ? [...current, updated] : current))
    setIndex((i) => i + 1)
    setRevealed(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      if (!card) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        else void respond('good')
      }
      if (revealed && ['1', '2', '3'].includes(e.key)) {
        void respond((['again', 'hard', 'good'] as Grade[])[Number(e.key) - 1])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (done) {
    const reviewed = tally.again + tally.hard + tally.good
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000))
    const success = reviewed > 0 ? Math.round(((tally.good + tally.hard) / reviewed) * 100) : 0

    return (
      <main className="review">
        <div className="finish">
          <span className="glyph glyph--lg">
            <Icon name="check" size={22} />
          </span>
          <div className="stack stack-2" style={{ alignItems: 'center' }}>
            <h1>Session terminée</h1>
            <p className="meta">
              {label} · {minutes} min
            </p>
          </div>

          <div className="card stats" style={{ width: '100%' }}>
            <div className="stat">
              <div className="stat__value stat__value--accent">{success} %</div>
              <div className="stat__label">réussite</div>
            </div>
            <div className="stat">
              <div className="stat__value">{reviewed}</div>
              <div className="stat__label">réponses</div>
            </div>
            <div className="stat">
              <div className="stat__value">{tally.again}</div>
              <div className="stat__label">ratées</div>
            </div>
          </div>

          <div className="stack stack-3" style={{ width: '100%' }}>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onExit}>
              Terminer
            </button>
            <p className="meta" style={{ textAlign: 'center', lineHeight: 1.55 }}>
              Les cartes ratées reviendront dès la prochaine séance, les autres à leur échéance.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="review">
      <div className="review__top stack stack-3">
        <div className="row">
          <button type="button" className="icon-btn icon-btn--bare" onClick={onExit} aria-label="Quitter la session">
            <Icon name="close" size={20} />
          </button>
          <div className="grow stack" style={{ gap: 1, minWidth: 0 }}>
            <span className="appbar__title truncate" style={{ fontSize: 15 }}>
              {label}
            </span>
            <span className="appbar__sub">
              {Math.min(index + 1, cards.length)} / {cards.length}
            </span>
          </div>
          <span className="chip mono">{formatCardBadge(card)}</span>
        </div>
        <div className="bar">
          <div
            className="bar__fill"
            style={{ width: `${Math.round((index / Math.max(total, cards.length)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="review__stage">
        <div className="flashcard" key={`${card.id}-${index}`}>
          <div className="flashcard__side">
            <span className="eyebrow">Question</span>
            <p className="flashcard__text">{question}</p>
          </div>

          {revealed && (
            <>
              <hr className="rule" />
              <div className="flashcard__side">
                <span className="eyebrow">Réponse</span>
                <p className="flashcard__text flashcard__text--answer">{answer}</p>
                {card.notes && <p className="flashcard__notes">{card.notes}</p>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="review__actions">
        {!revealed ? (
          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            onClick={() => setRevealed(true)}
          >
            <Icon name="flip" size={19} />
            Afficher la réponse
          </button>
        ) : (
          <>
            <span className="eyebrow" style={{ textAlign: 'center' }}>
              Avez-vous réussi ?
            </span>
            <div className="grades">
              <button type="button" className="grade grade--again" onClick={() => void respond('again')}>
                Raté
                <span className="grade__eta">{previewDelay(card.srs, 'again', store.settings)}</span>
              </button>
              <button type="button" className="grade" onClick={() => void respond('hard')}>
                Difficile
                <span className="grade__eta">{previewDelay(card.srs, 'hard', store.settings)}</span>
              </button>
              <button type="button" className="grade grade--good" onClick={() => void respond('good')}>
                Su
                <span className="grade__eta">{previewDelay(card.srs, 'good', store.settings)}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function formatCardBadge(card: Card): string {
  if (card.srs.state === 'new') return 'neuve'
  if (card.srs.state === 'relearning') return 'à revoir'
  if (card.srs.interval > 0) return formatDelay(card.srs.interval * 86_400_000)
  return 'apprentissage'
}
