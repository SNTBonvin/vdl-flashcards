import { useMemo } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { requestSession } from '../state/session'
import { countCards } from '../srs/queue'
import { Icon } from '../components/Icon'
import { SectionHead, StatRow, EmptyState, plural } from '../components/ui'
import { DAY_MS, dayKey, startOfDay } from '../lib/date'

const WEEKS = 14

/**
 * Nombre minimum de réponses sur la fenêtre pour qu'un thème soit comparé aux
 * autres. En dessous, un seul échec suffirait à le propulser en tête du
 * classement : le chiffre serait du bruit, pas un signal.
 */
const MIN_ANSWERS = 6

/** Fenêtre d'observation, en jours. */
const WINDOW = 30

export function StatsScreen() {
  const store = useStore()
  const { navigate } = useRoute()
  const now = Date.now()

  const totals = useMemo(() => countCards(store.cards, now), [store.cards, now])

  const perDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of store.logs) map.set(dayKey(log.ts), (map.get(dayKey(log.ts)) ?? 0) + 1)
    return map
  }, [store.logs])

  const grid = useMemo(() => {
    // Colonnes = semaines, lignes = jours (dimanche en haut).
    const end = startOfDay(now)
    const endDay = new Date(end).getDay()
    const start = end - (WEEKS * 7 - 1 - (6 - endDay)) * DAY_MS
    const cells: { date: number; count: number }[] = []
    for (let i = 0; i < WEEKS * 7; i++) {
      const date = start + i * DAY_MS
      cells.push({ date, count: date <= end ? (perDay.get(dayKey(date)) ?? 0) : -1 })
    }
    return cells
  }, [perDay, now])

  const last30 = useMemo(() => {
    const from = now - 30 * DAY_MS
    const recent = store.logs.filter((l) => l.ts >= from)
    const good = recent.filter((l) => l.grade !== 'again').length
    return {
      total: recent.length,
      rate: recent.length > 0 ? Math.round((good / recent.length) * 100) : 0,
    }
  }, [store.logs, now])

  const states = useMemo(() => {
    let fresh = 0
    let learning = 0
    let review = 0
    let relearning = 0
    let suspended = 0
    for (const card of store.cards) {
      if (card.suspended) suspended += 1
      else if (card.srs.state === 'new') fresh += 1
      else if (card.srs.state === 'learning') learning += 1
      else if (card.srs.state === 'relearning') relearning += 1
      else review += 1
    }
    return { fresh, learning, review, relearning, suspended }
  }, [store.cards])

  /**
   * Thèmes à retravailler, classés par taux d'échec sur la fenêtre.
   *
   * Le `deckId` étant enregistré sur chaque réponse et non sur la session, une
   * interrogation mêlant plusieurs thèmes est correctement ventilée : chaque
   * réponse compte pour le thème de sa carte.
   */
  const toReview = useMemo(() => {
    const from = now - WINDOW * DAY_MS
    const tally = new Map<string, { answers: number; failed: number }>()
    for (const log of store.logs) {
      if (log.ts < from) continue
      const current = tally.get(log.deckId) ?? { answers: 0, failed: 0 }
      current.answers += 1
      if (log.grade === 'again') current.failed += 1
      tally.set(log.deckId, current)
    }

    return store.decks
      .map((deck) => {
        const stat = tally.get(deck.id) ?? { answers: 0, failed: 0 }
        const counts = countCards(store.cardsByDeck.get(deck.id) ?? [], now)
        return {
          deck,
          subject: store.subjects.find((s) => s.id === deck.subjectId),
          answers: stat.answers,
          rate: stat.answers > 0 ? Math.round((stat.failed / stat.answers) * 100) : 0,
          hard: counts.hard,
        }
      })
      .filter((row) => row.answers >= MIN_ANSWERS && row.rate > 0)
      .sort((a, b) => b.rate - a.rate || b.hard - a.hard)
      .slice(0, 6)
  }, [store.logs, store.decks, store.subjects, store.cardsByDeck, now])

  const bySubject = useMemo(
    () =>
      store.subjects
        .map((subject) => {
          const decks = store.decksBySubject.get(subject.id) ?? []
          const cards = decks.flatMap((d) => store.cardsByDeck.get(d.id) ?? [])
          const logs = store.logs.filter((l) => decks.some((d) => d.id === l.deckId))
          const good = logs.filter((l) => l.grade !== 'again').length
          return {
            subject,
            total: cards.length,
            reviews: logs.length,
            rate: logs.length > 0 ? Math.round((good / logs.length) * 100) : null,
          }
        })
        .filter((row) => row.total > 0),
    [store.subjects, store.decksBySubject, store.cardsByDeck, store.logs],
  )

  if (store.cards.length === 0) {
    return (
      <main className="screen">
        <EmptyState
          icon="chart"
          title="Pas encore de statistiques"
          text="Elles apparaîtront dès votre première session de révision."
        />
      </main>
    )
  }

  return (
    <main className="screen stack stack-5">
      <StatRow
        items={[
          { value: store.cards.length, label: plural(store.cards.length, 'carte') },
          { value: store.logs.length, label: 'révisions' },
          { value: `${last30.rate} %`, label: 'réussite 30 j', accent: true },
        ]}
      />

      <section className="stack stack-3">
        <SectionHead
          title="À retravailler"
          aside={<span className="meta mono">{WINDOW} derniers jours</span>}
        />
        {toReview.length === 0 ? (
          <div className="card card--pad">
            <p className="meta" style={{ lineHeight: 1.6 }}>
              Rien à signaler pour l’instant. Un thème apparaît ici dès qu’il compte au moins{' '}
              {MIN_ANSWERS} réponses sur la période et que certaines ont été ratées.
            </p>
          </div>
        ) : (
          <div className="stack stack-2">
            {toReview.map((row) => (
              <button
                key={row.deck.id}
                type="button"
                className="card card--pad card--tap"
                data-status={row.rate >= 40 ? 'err' : row.rate >= 20 ? 'warn' : 'ok'}
                onClick={() => {
                  // Chaque ligne mène à une action : sans quoi ce n'est qu'un
                  // bulletin de notes de plus.
                  requestSession({
                    deckIds: [row.deck.id],
                    mode: row.hard > 0 ? 'hard' : 'quiz',
                    label: row.deck.name,
                  })
                  navigate({ name: 'review' })
                }}
              >
                <div className="row">
                  <div className="grow stack" style={{ gap: 4, minWidth: 0 }}>
                    <span className="listrow__title truncate">{row.deck.name}</span>
                    <span className="listrow__sub truncate">{row.subject?.name}</span>
                    <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <span className="chip mono">{100 - row.rate} % de réussite</span>
                      {row.hard > 0 && (
                        <span className="chip chip--warn">
                          {row.hard} {plural(row.hard, 'carte difficile', 'cartes difficiles')}
                        </span>
                      )}
                    </span>
                  </div>
                  <Icon name="chevron-right" size={18} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="stack stack-3">
        <SectionHead title="Activité" aside={<span className="meta mono">{WEEKS} semaines</span>} />
        <div className="card card--pad stack stack-3">
          <div className="heat">
            {grid.map((cell, index) => (
              <div
                key={index}
                className="heat__cell"
                data-level={cell.count < 0 ? undefined : level(cell.count)}
                style={cell.count < 0 ? { opacity: 0.25 } : undefined}
                title={
                  cell.count >= 0
                    ? `${new Date(cell.date).toLocaleDateString('fr-FR')} — ${cell.count} révisions`
                    : undefined
                }
              />
            ))}
          </div>
          <div className="row row--between">
            <span className="meta mono">moins</span>
            <div className="row" style={{ gap: 3 }}>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="heat__cell" data-level={l || undefined} />
              ))}
            </div>
            <span className="meta mono">plus</span>
          </div>
        </div>
      </section>

      <section className="stack stack-3">
        <SectionHead title="Répartition des cartes" />
        <div className="card">
          <StatLine label="Neuves" value={states.fresh} status="idle" />
          <StatLine label="En apprentissage" value={states.learning} status="run" />
          <StatLine label="Acquises" value={states.review} status="ok" />
          <StatLine label="À reprendre" value={states.relearning} status="err" />
          <StatLine label="Échues aujourd’hui" value={totals.due} status="warn" />
          {states.suspended > 0 && <StatLine label="Archivées" value={states.suspended} status="idle" />}
        </div>
      </section>

      {bySubject.length > 0 && (
        <section className="stack stack-3">
          <SectionHead title="Par matière" />
          <div className="card">
            {bySubject.map((row) => (
              <div key={row.subject.id} className="listrow" style={{ cursor: 'default' }}>
                <span className="glyph glyph--warm mono" style={{ fontSize: 12, fontWeight: 600 }}>
                  {row.subject.code}
                </span>
                <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
                  <span className="listrow__title truncate">{row.subject.name}</span>
                  <span className="listrow__sub">
                    {row.total} {plural(row.total, 'carte')} · {row.reviews} révisions
                  </span>
                </span>
                <span className={`chip ${row.rate === null ? '' : row.rate >= 80 ? 'chip--ok' : row.rate >= 60 ? 'chip--warn' : 'chip--err'}`}>
                  {row.rate === null ? '—' : `${row.rate} %`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function StatLine({
  label,
  value,
  status,
}: {
  label: string
  value: number
  status: 'ok' | 'run' | 'warn' | 'err' | 'idle'
}) {
  return (
    <div className="listrow" style={{ cursor: 'default' }}>
      <span className={`dot dot--${status}`} />
      <span className="grow" style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}

function level(count: number): number | undefined {
  if (count === 0) return undefined
  if (count < 5) return 1
  if (count < 15) return 2
  if (count < 40) return 3
  return 4
}
