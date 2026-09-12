import { useMemo } from 'react'
import { pendingUpdates } from '../io/updates'
import { useStore } from '../state/store'
import { requestSession } from '../state/session'
import { useRoute } from '../lib/router'
import { countCards } from '../srs/queue'
import { spiralSuggestion } from '../srs/spiral'
import { isReminderPending } from '../reminders/reminders'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, StatRow, plural } from '../components/ui'
import { DAY_MS, dayKey, formatDue, startOfDay } from '../lib/date'

export function TodayScreen() {
  const store = useStore()
  const { navigate } = useRoute()
  const now = Date.now()

  const totals = useMemo(() => countCards(store.studyCards, now), [store.studyCards, now])

  const doneToday = useMemo(() => {
    const from = startOfDay(now)
    return store.logs.filter((l) => l.ts >= from).length
  }, [store.logs, now])

  const streak = useMemo(() => computeStreak(store.logs), [store.logs])

  const subjectRows = useMemo(() => {
    return store.subjects
      .map((subject) => {
        // Les thèmes de réserve ne comptent pas : ils ne se révisent pas.
        const decks = (store.decksBySubject.get(subject.id) ?? []).filter((d) => !d.reserve)
        const cards = decks.flatMap((d) => store.cardsByDeck.get(d.id) ?? [])
        return { subject, decks, counts: countCards(cards, now) }
      })
      .filter((row) => row.counts.total > 0 || row.decks.length > 0)
  }, [store.subjects, store.decksBySubject, store.cardsByDeck, now])

  const reminders = useMemo(
    () => store.studyDecks.filter((deck) => isReminderPending(deck, now)),
    [store.studyDecks, now],
  )

  // Tous les thèmes, réserve comprise : une mise à jour reçue se signale même
  // si le thème est mis de côté pour la révision.
  const updates = useMemo(() => pendingUpdates(store.decks), [store.decks])

  const spiral = useMemo(
    () => spiralSuggestion(store.studyDecks, store.cardsByDeck, now),
    [store.studyDecks, store.cardsByDeck, now],
  )

  const pending = totals.due + totals.fresh
  const allDeckIds = store.studyDecks.map((d) => d.id)

  const startDaily = () => {
    requestSession({ deckIds: allDeckIds, mode: 'due', label: 'Révision du jour' })
    navigate({ name: 'review' })
  }

  const startHard = () => {
    requestSession({ deckIds: allDeckIds, mode: 'hard', label: 'Cartes difficiles' })
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
          text="Créez une matière, puis un thème, et ajoutez vos premières flashcards. Vous pouvez aussi partir d’un exemple pour voir comment tout s’articule."
          action={
            <div className="stack stack-2" style={{ width: '100%', maxWidth: 280 }}>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => navigate({ name: 'library' })}
              >
                <Icon name="plus" size={18} />
                Créer une matière
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--block"
                onClick={() => navigate({ name: 'help' })}
              >
                <Icon name="sparkle" size={18} />
                Découvrir avec un exemple
              </button>
            </div>
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
            <h2>{pending > 0 ? 'Séance du jour' : 'Rien de programmé'}</h2>
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
          <>
            {/* Le tutoiement est réservé à ce qui s'adresse à l'élève : ici,
                c'est lui qu'on encourage, et « vous » sonnerait comme un
                bulletin. */}
            <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.6 }}>
              Bravo, tu es à jour. Rien ne t’oblige à t’arrêter là — tu peux te lancer un défi sur
              un thème, ou reprendre les cartes qui te résistent.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => navigate({ name: 'review' })}
            >
              <Icon name="shuffle" size={18} />
              Me lancer un défi
            </button>
            {totals.hard > 0 && (
              <button type="button" className="btn btn--ghost btn--block" onClick={startHard}>
                <Icon name="flag" size={18} />
                Reprendre mes {totals.hard} cartes difficiles
              </button>
            )}
          </>
        )}
      </section>

      {/* Vérification silencieuse : le professeur a redéposé un jeu reçu. On le
          signale ici parce que c'est le seul écran que l'élève ouvre tous les
          jours — mais rien n'est importé sans qu'il l'ait vu et voulu. */}
      {updates.length > 0 && (
        <section className="stack stack-3">
          <SectionHead title={updates.length > 1 ? 'Mises à jour disponibles' : 'Mise à jour disponible'} />
          <div className="card">
            {updates.map((deck) => (
              <button
                key={deck.id}
                type="button"
                className="listrow"
                onClick={() => navigate({ name: 'set', code: deck.setCode! })}
              >
                <span className="glyph glyph--warm">
                  <Icon name="download" size={18} />
                </span>
                <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
                  <span className="listrow__title truncate">{deck.name}</span>
                  <span className="listrow__sub truncate">
                    Ton professeur a mis ce thème à jour
                  </span>
                </span>
                <Icon name="chevron-right" size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

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

      {spiral && (
        <section className="stack stack-3">
          <SectionHead title="Reprise spiralaire" />
          <div className="card card--pad stack stack-4" data-status="run">
            <div className="row">
              <span className="glyph glyph--warm">
                <Icon name="reset" size={19} />
              </span>
              <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                <span className="listrow__title truncate">{spiral.deck.name}</span>
                <span className="meta">
                  Revu il y a {spiral.days} jours · {spiral.cards} {plural(spiral.cards, 'carte')}
                </span>
              </div>
            </div>
            <p className="meta" style={{ lineHeight: 1.6 }}>
              Repasser sur un chapitre ancien pendant qu’il reste accessible coûte peu et fixe
              durablement : c’est ce qui manque quand on ne révise que le chapitre en cours.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                requestSession({ deckIds: [spiral.deck.id], mode: 'quiz', label: spiral.deck.name })
                navigate({ name: 'review' })
              }}
            >
              <Icon name="shuffle" size={18} />
              Reprendre ce thème
            </button>
          </div>
        </section>
      )}

      {/* L'élève n'a pas besoin d'un tableau de bord par matière sur l'accueil :
          il a un onglet pour cela. L'enseignant, qui surveille plusieurs
          matières, y gagne. */}
      {store.settings.teacherTools && (
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
                    {decks.length} {plural(decks.length, 'thème')} · {counts.total}{' '}
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
      )}
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
