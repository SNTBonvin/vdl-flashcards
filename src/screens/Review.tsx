import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { takeSession } from '../state/session'
import { buildQueue, countCards, countSession, type SessionMode } from '../srs/queue'
import { formatDelay, previewDelay } from '../srs/scheduler'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, Sheet, Toggle, plural, useToast } from '../components/ui'
import type { Card, Grade, ID } from '../db/types'

/**
 * Écran Réviser.
 *
 * Trois séances possibles, trois cartes : plus de « mode » à choisir avant de
 * partir. Chacune annonce ce qu'elle contient et porte son propre bouton, la
 * révision du jour étant la seule à prendre l'action principale — les deux
 * autres sont des détours, utiles mais occasionnels. Le choix des thèmes et les
 * options de séance descendent dans une feuille « Ajuster », qui ne s'ouvre que
 * pour qui en a l'usage : un écran de préparation demandait trois décisions à
 * quelqu'un qui en avait déjà pris une en ouvrant l'onglet.
 */

export function ReviewScreen({ onSessionChange }: { onSessionChange: (running: boolean) => void }) {
  const store = useStore()
  const toast = useToast()
  const [queue, setQueue] = useState<Card[] | null>(null)
  const [label, setLabel] = useState('Révision')
  /** Révision blanche : voir SessionRequest.dry. */
  const [dry, setDry] = useState(false)

  useEffect(() => {
    onSessionChange(queue !== null)
    return () => onSessionChange(false)
  }, [queue, onSessionChange])

  const startWith = useCallback(
    (deckIds: ID[], mode: SessionMode, sessionLabel: string, options?: StartOptions) => {
      const set = new Set(deckIds)
      const cards = store.cards.filter((c) => set.has(c.deckId))
      const built = buildQueue(cards, {
        mode,
        introducedToday: store.intro.counts,
        settings: store.settings,
        bonus: options?.bonus,
      })
      // Garde-fou : une file vide affichait l'écran de fin de séance, « 0 % de
      // réussite, 0 réponse », ce qui se lit comme une panne. Mieux vaut ne pas
      // ouvrir la séance du tout et dire pourquoi.
      if (built.length === 0) {
        toast(
          mode === 'due'
            ? 'Rien à réviser pour l’instant : le quota de cartes neuves du jour est atteint.'
            : 'Aucune carte ne correspond à ce mode.',
        )
        return 0
      }
      setLabel(sessionLabel)
      setDry(options?.dry ?? false)
      setQueue(built)
      return built.length
    },
    [store.cards, store.intro.counts, store.settings, toast],
  )

  // Une demande venue d'un autre écran démarre la session directement.
  useEffect(() => {
    const request = takeSession()
    if (request)
      startWith(request.deckIds, request.mode, request.label, {
        bonus: request.bonus,
        dry: request.dry,
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (queue === null) return <ReviewSetup onStart={startWith} />
  return (
    <Session
      queue={queue}
      label={label}
      dry={dry}
      onExit={() => setQueue(null)}
      onRestart={(deckIds, mode, sessionLabel) => startWith(deckIds, mode, sessionLabel, { dry })}
    />
  )
}

/** Réglages d'une séance qui ne survivent pas à la suivante. */
export interface StartOptions {
  bonus?: number
  dry?: boolean
}

/* ------------------------------ Préparation ------------------------------ */

function ReviewSetup({
  onStart,
}: {
  onStart: (deckIds: ID[], mode: SessionMode, label: string, options?: StartOptions) => number
}) {
  const store = useStore()
  const toast = useToast()

  /**
   * Portée de la séance. `null` signifie « tous les thèmes » — l'état normal,
   * et celui qu'on ne devrait jamais avoir à choisir. Restreindre reste
   * possible, mais devient un geste délibéré plutôt qu'un préalable.
   */
  const [scope, setScope] = useState<ID[] | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [picking, setPicking] = useState(false)
  /**
   * Révision blanche. Volontairement **non mémorisée** dans les réglages :
   * laissée allumée par mégarde, elle ferait réviser sans jamais progresser,
   * et rien ne le signalerait d'une séance à l'autre.
   */
  const [dry, setDry] = useState(false)

  const allIds = useMemo(() => store.studyDecks.map((d) => d.id), [store.studyDecks])
  const deckIds = scope ?? allIds
  const scopeSet = useMemo(() => new Set(deckIds), [deckIds])
  const inScope = useMemo(
    () => store.cards.filter((c) => scopeSet.has(c.deckId)),
    [store.cards, scopeSet],
  )

  const compte = useCallback(
    (mode: SessionMode) =>
      buildQueue(inScope, {
        mode,
        introducedToday: store.intro.counts,
        settings: store.settings,
      }).length,
    [inScope, store.intro.counts, store.settings],
  )

  const daily = useMemo(() => compte('due'), [compte])
  const hard = useMemo(() => compte('hard'), [compte])
  const total = useMemo(() => inScope.filter((c) => !c.suspended).length, [inScope])

  /**
   * Cartes neuves retenues par le quota du jour. « Rien à réviser » est vrai
   * mais muet : quand c'est le quota qui retient, le dire évite de croire à
   * une perte de cartes.
   */
  const session = useMemo(
    () =>
      countSession(inScope, {
        introducedToday: store.intro.counts,
        settings: store.settings,
      }),
    [inScope, store.intro.counts, store.settings],
  )
  const held = session.held
  /** Portée vidée à la main : ce n'est pas « rien à réviser », c'est « rien de coché ». */
  const vide = scope !== null && scope.length === 0

  /** Dépasser le quota du jour, en connaissance de cause. */
  const MORE = 10

  const start = (mode: SessionMode, ids: ID[], sessionLabel: string, options?: StartOptions) => {
    const started = onStart(ids, mode, sessionLabel, options)
    if (started === 0) toast('Aucune carte à réviser avec ces réglages.', 'error')
  }

  const scopeLabel =
    scope === null
      ? `Tous les thèmes · ${allIds.length} ${plural(allIds.length, 'thème')}`
      : scope.length === 1
        ? (store.decks.find((d) => d.id === scope[0])?.name ?? '1 thème')
        : `${scope.length} ${plural(scope.length, 'thème')} sur ${allIds.length}`

  const optionsLabel = [
    store.settings.shuffle ? 'mélangées' : 'ordre du thème',
    store.settings.reverse ? 'inversées' : null,
    dry ? 'à blanc' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  if (store.studyDecks.length === 0) {
    return (
      <main className="screen stack stack-5">
        <div className="page-title">
          <h1>Réviser</h1>
        </div>
        <EmptyState
          icon="review"
          title="Rien à réviser"
          text="Crée d’abord une matière et un thème, puis ajoute des cartes pour lancer une séance."
        />
      </main>
    )
  }

  return (
    <main className="screen stack stack-5">
      <div className="page-title">
        <h1>Réviser</h1>
      </div>

      {/* --------------------------- Révision du jour ---------------------------
          La séance quotidienne est la seule qui mérite l'action principale : les
          deux autres sont des détours, utiles mais occasionnels. */}
      <section className="card card--pad stack stack-4" data-status={daily > 0 ? 'ok' : 'run'}>
        <div className="row row--between">
          <span className="listrow__title" style={{ fontSize: 17 }}>
            Révision du jour
          </span>
          <span className="stat__value" style={{ fontSize: 22 }}>
            {daily}
          </span>
        </div>

        {vide ? (
          <p className="meta" style={{ lineHeight: 1.55 }}>
            Aucun thème coché. Ouvre « Ajuster », en bas, pour en choisir au moins un — ou reviens
            à tous tes thèmes d’un geste.
          </p>
        ) : daily > 0 ? (
          <>
            <p className="meta" style={{ lineHeight: 1.55 }}>
              {session.due > 0
                ? `${session.due} ${plural(session.due, 'carte échue', 'cartes échues')}${
                    session.fresh > 0
                      ? `, plus ${session.fresh} ${plural(session.fresh, 'nouvelle', 'nouvelles')}`
                      : ''
                  }.`
                : `${session.fresh} ${plural(session.fresh, 'carte nouvelle', 'cartes nouvelles')} pour commencer.`}{' '}
              C’est le rythme conseillé.
            </p>
            <button
              type="button"
              className="btn btn--primary btn--lg btn--block"
              onClick={() => start('due', deckIds, 'Révision du jour', { dry })}
            >
              <Icon name="review" size={18} />
              Commencer
            </button>
          </>
        ) : held > 0 ? (
          <>
            <p className="meta" style={{ lineHeight: 1.55 }}>
              Quota du jour atteint : {held} {plural(held, 'carte neuve', 'cartes neuves')} t’attendent
              demain. L’étalement est précisément ce qui fait retenir — mais rien ne t’oblige à
              t’arrêter là.
            </p>
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() =>
                start('due', deckIds, 'Aller plus loin', {
                  dry,
                  bonus: Math.min(MORE, held),
                })
              }
            >
              <Icon name="plus" size={18} />
              Aller plus loin — {Math.min(MORE, held)} cartes de plus
            </button>
          </>
        ) : (
          <p className="meta" style={{ lineHeight: 1.55 }}>
            C’est fait pour aujourd’hui. Reviens demain — ou sers-toi d’une des deux séances
            ci-dessous.
          </p>
        )}
      </section>

      {/* ------------------------------ Tout revoir ------------------------------ */}
      <section className="card card--pad stack stack-4">
        <div className="row row--between">
          <span className="listrow__title" style={{ fontSize: 17 }}>
            Tout revoir
          </span>
          <span className="stat__value" style={{ fontSize: 22 }}>
            {total}
          </span>
        </div>
        <p className="meta" style={{ lineHeight: 1.55 }}>
          Un thème entier, échues ou non, dans le désordre. Avant un contrôle. Les réponses
          comptent : pour te tester sans rien déranger, passe la séance « à blanc » dans Ajuster.
        </p>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => setPicking(true)}
        >
          <Icon name="layers" size={18} />
          Choisir un thème
        </button>
      </section>

      {/* ---------------------------- Mes difficultés ---------------------------- */}
      <section className="card card--pad stack stack-4">
        <div className="row row--between">
          <span className="listrow__title" style={{ fontSize: 17 }}>
            Mes difficultés
          </span>
          <span className="stat__value" style={{ fontSize: 22 }}>
            {hard}
          </span>
        </div>
        <p className="meta" style={{ lineHeight: 1.55 }}>
          Les cartes déjà ratées, les plus fautives d’abord. Quand il reste dix minutes et qu’on
          veut qu’elles servent.
        </p>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={hard === 0 || vide}
          onClick={() => start('hard', deckIds, 'Mes difficultés', { dry })}
        >
          <Icon name="flag" size={18} />
          {hard === 0 ? 'Aucune carte ratée' : 'Commencer'}
        </button>
      </section>

      {/* L'ajustement existe, mais ne se réclame pas : une ligne, tout en bas,
          qui dit l'état courant plutôt qu'un formulaire à remplir d'avance. */}
      <div className="row row--between" style={{ gap: 10, padding: '0 2px' }}>
        <span className="meta truncate">
          {scopeLabel} · {optionsLabel}
        </span>
        <button type="button" className="btn btn--quiet" onClick={() => setAdjusting(true)}>
          Ajuster
        </button>
      </div>

      {/* ------------------------------- Feuilles ------------------------------- */}

      <Sheet open={picking} title="Tout revoir" onClose={() => setPicking(false)}>
        <div className="stack stack-4">
          <p className="meta" style={{ lineHeight: 1.6 }}>
            Choisis le thème à repasser en entier. La séance démarre aussitôt.
          </p>

          {/* Repasser plusieurs thèmes d'un coup reste possible : c'est ce que
              faisait l'ancien écran en cochant tout, et cela sert la veille
              d'un contrôle qui porte sur deux chapitres. */}
          <div className="card">
            <button
              type="button"
              className="listrow"
              disabled={total === 0}
              onClick={() => {
                setPicking(false)
                start('quiz', allIds, `${allIds.length} thèmes`, { dry })
              }}
            >
              <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
                <span className="listrow__title">Tous mes thèmes</span>
                <span className="listrow__sub">
                  {total} {plural(total, 'carte')}, toutes matières confondues
                </span>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
          {store.subjects.map((subject) => {
            const decks = (store.decksBySubject.get(subject.id) ?? []).filter((d) => !d.reserve)
            if (decks.length === 0) return null
            return (
              <div key={subject.id} className="stack stack-2">
                <span className="eyebrow" style={{ paddingLeft: 2 }}>
                  {subject.name}
                </span>
                <div className="card">
                  {decks.map((deck) => {
                    const counts = countCards(store.cardsByDeck.get(deck.id) ?? [])
                    return (
                      <button
                        key={deck.id}
                        type="button"
                        className="listrow"
                        disabled={counts.total === 0}
                        onClick={() => {
                          setPicking(false)
                          start('quiz', [deck.id], deck.name, { dry })
                        }}
                      >
                        <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
                          <span className="listrow__title truncate">{deck.name}</span>
                          <span className="listrow__sub">
                            {counts.total} {plural(counts.total, 'carte')}
                          </span>
                        </span>
                        <Icon name="chevron-right" size={18} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Sheet>

      <Sheet
        open={adjusting}
        title="Ajuster"
        onClose={() => setAdjusting(false)}
        footer={
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => setAdjusting(false)}
          >
            C’est noté
          </button>
        }
      >
        <div className="stack stack-5">
          <div className="stack stack-3">
            <div className="row row--between">
              <span className="eyebrow">Thèmes</span>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => setScope(scope === null ? [] : null)}
              >
                {scope === null ? 'Aucun' : 'Tous'}
              </button>
            </div>
            <p className="meta" style={{ lineHeight: 1.55 }}>
              Par défaut, tes séances portent sur tous tes thèmes. Coche pour t’en tenir à
              quelques-uns.
            </p>
            {store.subjects.map((subject) => {
              const decks = (store.decksBySubject.get(subject.id) ?? []).filter((d) => !d.reserve)
              if (decks.length === 0) return null
              return (
                <div key={subject.id} className="stack stack-2">
                  <span className="eyebrow" style={{ paddingLeft: 2 }}>
                    {subject.name}
                  </span>
                  <div className="picker">
                    {decks.map((deck) => {
                      const on = scopeSet.has(deck.id)
                      return (
                        <button
                          key={deck.id}
                          type="button"
                          className="chip chip--select"
                          aria-pressed={on}
                          onClick={() =>
                            setScope(
                              on
                                ? deckIds.filter((id) => id !== deck.id)
                                : [...deckIds, deck.id],
                            )
                          }
                        >
                          <span className="truncate" style={{ maxWidth: 190 }}>
                            {deck.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <hr className="rule" />

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
          <hr className="rule" />
          <Toggle
            checked={dry}
            onChange={setDry}
            label="Ne pas modifier le programme"
            hint="Pour se tester sans rien déranger — la veille d’un contrôle, par exemple. Les réponses ne comptent pas et ne décalent aucune échéance. Cette option s’éteint en quittant l’écran."
          />
        </div>
      </Sheet>
    </main>
  )
}


/* -------------------------------- Session -------------------------------- */

interface Tally {
  again: number
  hard: number
  good: number
}

const EMPTY_TALLY: Tally = { again: 0, hard: 0, good: 0 }

function Session({
  queue,
  label,
  dry,
  onExit,
  onRestart,
}: {
  queue: Card[]
  label: string
  /** Révision blanche : ni échéance modifiée, ni ligne d'historique. */
  dry: boolean
  onExit: () => void
  onRestart: (deckIds: ID[], mode: SessionMode, label: string) => void
}) {
  const store = useStore()
  const [cards, setCards] = useState<Card[]>(queue)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY)
  // Ventilation par thème : c'est elle qui rend le bilan utile quand la session
  // a mélangé plusieurs thèmes, ce que le total global ne dit pas.
  const [byDeck, setByDeck] = useState<Record<ID, Tally>>({})
  const [startedAt] = useState(() => Date.now())

  const total = queue.length
  const card = cards[index]
  const done = index >= cards.length

  const reverse = store.settings.reverse
  const question = card ? (reverse ? card.back : card.front) : ''
  const answer = card ? (reverse ? card.front : card.back) : ''

  const respond = async (grade: Grade) => {
    if (!card) return
    // En révision blanche, rien n'est écrit : ni la progression de la carte, ni
    // la ligne d'historique. Une séance qui ne compte pas ne doit pas non plus
    // fausser les courbes ni le compteur du jour.
    const updated = dry ? card : await store.answer(card, grade)
    setTally((t) => ({ ...t, [grade]: t[grade] + 1 }))
    setByDeck((current) => {
      const previous = current[card.deckId] ?? EMPTY_TALLY
      return { ...current, [card.deckId]: { ...previous, [grade]: previous[grade] + 1 } }
    })

    // Une carte ratée revient avant la fin de la session — y compris à blanc,
    // où c'est la seule chose qui distingue encore « raté » de « su ».
    const soon = dry ? grade === 'again' : updated.srs.due <= Date.now() + 11 * 60_000
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

    // La ventilation n'a d'intérêt que si la session a mêlé plusieurs thèmes.
    const themes = Object.entries(byDeck)
      .map(([deckId, counts]) => {
        const answers = counts.again + counts.hard + counts.good
        return {
          deckId,
          name: store.decks.find((d) => d.id === deckId)?.name ?? 'Thème supprimé',
          answers,
          failed: counts.again,
          rate: answers > 0 ? Math.round(((counts.good + counts.hard) / answers) * 100) : 0,
        }
      })
      .sort((a, b) => a.rate - b.rate)

    return (
      <main className="review">
        <div className="finish">
          <span className="glyph glyph--lg">
            <Icon name="check" size={22} />
          </span>
          <div className="stack stack-2" style={{ alignItems: 'center' }}>
            <h1>Session terminée</h1>
            <p className="meta">
              {label} · {minutes} min{dry && ' · à blanc'}
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

          {themes.length > 1 && (
            <div className="stack stack-3" style={{ width: '100%' }}>
              <SectionHead title="Par thème" />
              <div className="stack stack-2">
                {themes.map((theme) => (
                  <button
                    key={theme.deckId}
                    type="button"
                    className="card card--pad card--tap"
                    data-status={theme.rate >= 80 ? 'ok' : theme.rate >= 60 ? 'warn' : 'err'}
                    disabled={theme.failed === 0}
                    onClick={() => onRestart([theme.deckId], 'hard', theme.name)}
                    style={{ textAlign: 'left' }}
                  >
                    <div className="row">
                      <div className="grow stack" style={{ gap: 3, minWidth: 0 }}>
                        <span className="listrow__title truncate">{theme.name}</span>
                        <span className="row" style={{ gap: 6 }}>
                          <span className="chip mono">{theme.rate} %</span>
                          {theme.failed > 0 && (
                            <span className="chip chip--err">
                              {theme.failed} {plural(theme.failed, 'ratée')}
                            </span>
                          )}
                        </span>
                      </div>
                      {theme.failed > 0 && <Icon name="chevron-right" size={18} />}
                    </div>
                  </button>
                ))}
              </div>
              <p className="meta" style={{ lineHeight: 1.55 }}>
                Touche un thème pour reprendre aussitôt ses cartes difficiles.
              </p>
            </div>
          )}

          <div className="stack stack-3" style={{ width: '100%' }}>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={onExit}>
              Terminer
            </button>
            <p className="meta" style={{ textAlign: 'center', lineHeight: 1.55 }}>
              {dry
                ? 'Rien n’a été enregistré : les échéances sont inchangées, et cette séance ne compte pas dans tes statistiques.'
                : 'Les cartes ratées reviendront dès la prochaine séance, les autres à leur échéance.'}
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
              {dry && ' · à blanc'}
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
              Tu as réussi ?
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
