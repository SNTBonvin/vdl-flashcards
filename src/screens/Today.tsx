import { useMemo } from 'react'
import { useStore } from '../state/store'
import { requestSession } from '../state/session'
import { useRoute } from '../lib/router'
import { countCards } from '../srs/queue'
import { isReminderPending } from '../reminders/reminders'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, StatRow, plural } from '../components/ui'
import { DAY_MS, dayKey, formatDue, startOfDay } from '../lib/date'

export function TodayScreen() {
  const store = useStore()
  const { navigate } = useRoute()
  const now = Date.now()

  const totals = useMemo(() => countCards(store.cards, now), [store.cards, now])

  const doneToday = useMemo(() => {
    const from = startOfDay(now)
    return store.logs.filter((l) => l.ts >= from).length
  }, [store.logs, now])

  const streak = useMemo(() => computeStreak(store.logs), [store.logs])

  const subjectRows = useMemo(() => {
    return store.subjects
      .map((subject) => {
        const decks = store.decksBySubject.get(subject.id) ?? []
        const cards = decks.flatMap((d) => store.cardsByDeck.get(d.id) ?? [])
        return { subject, decks, counts: countCards(cards, now) }
      })
      .filter((row) => row.counts.total > 0 || row.decks.length > 0)
  }, [store.subjects, store.decksBySubject, store.cardsByDeck, now])

  const reminders = useMemo(
    () => store.decks.filter((deck) => isReminderPending(deck, now)),
    [store.decks, now],
  )

  const pending = totals.due + totals.fresh
  const allDeckIds = store.decks.map((d) => d.id)

  const startDaily = () => {
    requestSession({ deckIds: allDeckIds, mode: 'due', label: 'Révision du jour' })
    navigate({ name: 'review' })
  }

  const today = new Date(now).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (store.cards.length === 0) {
    return (
      <main className="screen stack stack-5">
        <div className="page-title stack" style={{ gap: 4 }}>
          <span className="eyebrow">{today}</span>
          <h1>Aujourd’hui</h1>
        </div>
        <EmptyState
          icon="layers"
          title="Aucune carte pour l’instant"
          text="Créez une matière, puis une catégorie, et ajoutez vos premières flashcards. Vous pouvez aussi importer un fichier existant."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'library' })}>
              <Icon name="plus" size={18} />
              Créer une matière
            </button>
          }
        />
      </main>
    )
  }

  return (
    <main className="screen stack stack-5">
      <div className="page-title stack" style={{ gap: 4 }}>
        <span className="eyebrow">{today}</span>
        <h1>Aujourd’hui</h1>
      </div>

      <StatRow
        items={[
          { value: pending, label: 'à réviser', accent: pending > 0 },
          { value: doneToday, label: 'faites' },
          { value: streak, label: plural(streak, 'jour de suite', 'jours de suite') },
        ]}
      />

      {/* Bloc principal : une seule action pleine */}
      <section className="card card--pad stack stack-4" data-status={pending > 0 ? 'run' : 'ok'}>
        <div className="row">
          <span className="glyph glyph--lg">
            <Icon name={pending > 0 ? 'review' : 'check'} size={21} />
          </span>
          <div className="grow stack" style={{ gap: 2 }}>
            <h2>{pending > 0 ? 'Séance du jour' : 'Tout est à jour'}</h2>
            <span className="meta">
              {pending > 0
                ? `${totals.due} en attente · ${totals.fresh} ${plural(totals.fresh, 'nouvelle')}`
                : totals.nextDue
                  ? `Prochaine révision ${formatDue(totals.nextDue, now)}`
                  : 'Aucune carte planifiée'}
            </span>
          </div>
        </div>

        {pending > 0 ? (
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={startDaily}>
            Réviser {pending} {plural(pending, 'carte')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => navigate({ name: 'review' })}
          >
            <Icon name="shuffle" size={18} />
            Lancer une interrogation
          </button>
        )}
      </section>

      {reminders.length > 0 && (
        <section className="stack stack-3">
          <SectionHead title="Rappels du jour" />
          <div className="stack stack-2">
            {reminders.map((deck) => {
              const counts = countCards(store.cardsByDeck.get(deck.id) ?? [], now)
              return (
                <button
                  key={deck.id}
                  type="button"
                  className="card card--pad card--tap"
                  data-status="warn"
                  onClick={() => {
                    requestSession({ deckIds: [deck.id], mode: 'due', label: deck.name })
                    navigate({ name: 'review' })
                  }}
                >
                  <div className="row">
                    <span className="dot dot--warn" />
                    <div className="grow stack" style={{ gap: 1 }}>
                      <span className="listrow__title truncate">{deck.name}</span>
                      <span className="meta">
                        Rappel de {deck.reminder?.time} · {counts.due + counts.fresh}{' '}
                        {plural(counts.due + counts.fresh, 'carte')}
                      </span>
                    </div>
                    <Icon name="chevron-right" size={18} />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="stack stack-3">
        <SectionHead
          title="Par matière"
          aside={
            <button type="button" className="btn btn--quiet" onClick={() => navigate({ name: 'library' })}>
              Tout voir
            </button>
          }
        />
        <div className="card">
          {subjectRows.map(({ subject, decks, counts }) => {
            const waiting = counts.due + counts.fresh
            return (
              <button
                key={subject.id}
                type="button"
                className="listrow"
                onClick={() => navigate({ name: 'subject', id: subject.id })}
              >
                <span className="glyph glyph--warm mono" style={{ fontSize: 12, fontWeight: 600 }}>
                  {subject.code}
                </span>
                <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
                  <span className="listrow__title truncate">{subject.name}</span>
                  <span className="listrow__sub">
                    {decks.length} {plural(decks.length, 'catégorie')} · {counts.total}{' '}
                    {plural(counts.total, 'carte')}
                  </span>
                </span>
                {waiting > 0 ? (
                  <span className="chip chip--accent">{waiting}</span>
                ) : (
                  <span className="chip chip--ok">à jour</span>
                )}
                <Icon name="chevron-right" size={18} />
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}

/** Nombre de jours consécutifs avec au moins une révision, jusqu'à aujourd'hui. */
function computeStreak(logs: { ts: number }[]): number {
  if (logs.length === 0) return 0
  const days = new Set(logs.map((l) => dayKey(l.ts)))
  let streak = 0
  let cursor = startOfDay()
  // Une journée sans révision ne casse la série tant qu'elle n'est pas terminée.
  if (!days.has(dayKey(cursor))) cursor -= DAY_MS
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor -= DAY_MS
  }
  return streak
}
