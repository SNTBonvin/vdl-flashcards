import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { EmptyState, Sheet, plural } from './ui'
import { cardKey } from '../io/share'
import type { Card, ID } from '../db/types'

/** Au-delà, on ne déroule plus : on demande d'affiner. */
const MAX_ROWS = 50
/** Cartes récentes proposées tant qu'aucune recherche n'est lancée. */
const SUGGESTIONS = 15

/**
 * Reprendre une carte déjà écrite, pour la remettre dans un autre thème.
 *
 * Le principe qui gouverne l'écran : on ne déroule jamais la bibliothèque
 * entière. On cherche, on filtre, on coche — sinon la liste devient illisible
 * dès la centaine de cartes. Le panier se garde d'une recherche à l'autre, de
 * sorte qu'on puisse composer en plusieurs passes avant de valider.
 */
export function PickCardsSheet({
  open,
  deckId,
  onClose,
  onPick,
}: {
  open: boolean
  /** Thème de destination : ses propres cartes sont exclues du choix. */
  deckId: ID
  onClose: () => void
  onPick: (ids: ID[]) => void
}) {
  const store = useStore()
  const [query, setQuery] = useState('')
  const [subjectId, setSubjectId] = useState<ID | null>(null)
  const [sourceDeckId, setSourceDeckId] = useState<ID | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<ID>>(new Set())

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSubjectId(null)
    setSourceDeckId(null)
    setTag(null)
    setPicked(new Set())
  }, [open])

  // Rectos déjà présents dans le thème : reprendre un doublon n'aurait pas de sens.
  const alreadyHere = useMemo(() => {
    const here = store.cardsByDeck.get(deckId) ?? []
    return new Set(here.map((c) => cardKey(c.front)))
  }, [store.cardsByDeck, deckId])

  const pool = useMemo(
    () => store.cards.filter((c) => c.deckId !== deckId && !c.suspended),
    [store.cards, deckId],
  )

  /** Étiquettes les plus portées, pour un filtre qui tient sur une ligne. */
  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const card of pool) {
      for (const t of card.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name)
  }, [pool])

  const search = query.trim().toLowerCase()

  const results = useMemo(() => {
    let list = pool
    if (subjectId) {
      const deckIds = new Set((store.decksBySubject.get(subjectId) ?? []).map((d) => d.id))
      list = list.filter((c) => deckIds.has(c.deckId))
    }
    if (sourceDeckId) list = list.filter((c) => c.deckId === sourceDeckId)
    if (tag) list = list.filter((c) => c.tags.includes(tag))
    if (search.length >= 2) {
      list = list.filter(
        (c) =>
          c.front.toLowerCase().includes(search) ||
          c.back.toLowerCase().includes(search) ||
          c.tags.some((t) => t.toLowerCase().includes(search)),
      )
    } else if (!subjectId && !sourceDeckId && !tag) {
      // Ni recherche ni filtre : on montre les dernières écrites, pas tout.
      list = list.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, SUGGESTIONS)
    }
    return list
  }, [pool, store.decksBySubject, subjectId, sourceDeckId, tag, search])

  const shown = results.slice(0, MAX_ROWS)
  const browsing = search.length >= 2 || subjectId !== null || sourceDeckId !== null || tag !== null

  const toggle = (card: Card) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(card.id)) next.delete(card.id)
      else next.add(card.id)
      return next
    })

  const subjectDecks = subjectId ? (store.decksBySubject.get(subjectId) ?? []) : []

  return (
    <Sheet
      open={open}
      title="Reprendre une carte"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={picked.size === 0}
          onClick={() => onPick([...picked])}
        >
          <Icon name="plus" size={18} />
          {picked.size === 0
            ? 'Reprendre'
            : `Reprendre ${picked.size} ${plural(picked.size, 'carte')}`}
        </button>
      }
    >
      <div className="stack stack-4">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Les cartes choisies sont <strong>copiées</strong> dans ce thème, avec une progression
          neuve. L’originale reste où elle est.
        </p>

        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-4)',
              display: 'flex',
            }}
          >
            <Icon name="search" size={17} />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            placeholder="Rechercher parmi mes cartes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            inputMode="search"
          />
        </div>

        {store.subjects.length > 1 && (
          <div className="seg seg--scroll">
            <button
              type="button"
              className="seg__item"
              aria-pressed={subjectId === null}
              onClick={() => {
                setSubjectId(null)
                setSourceDeckId(null)
              }}
            >
              Toutes
            </button>
            {store.subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className="seg__item"
                aria-pressed={subjectId === subject.id}
                onClick={() => {
                  setSubjectId(subject.id)
                  setSourceDeckId(null)
                }}
              >
                {subject.name}
              </button>
            ))}
          </div>
        )}

        {subjectDecks.length > 1 && (
          <div className="picker">
            {subjectDecks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                className="chip chip--select"
                aria-pressed={sourceDeckId === deck.id}
                onClick={() => setSourceDeckId(sourceDeckId === deck.id ? null : deck.id)}
              >
                {deck.name}
                {deck.reserve ? ' · réserve' : ''}
              </button>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="picker">
            {tags.map((name) => (
              <button
                key={name}
                type="button"
                className="chip chip--select mono"
                aria-pressed={tag === name}
                onClick={() => setTag(tag === name ? null : name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <span className="eyebrow">
          {browsing
            ? `${results.length} ${plural(results.length, 'carte trouvée', 'cartes trouvées')}`
            : 'Mes dernières cartes'}
        </span>

        {shown.length === 0 ? (
          <EmptyState
            icon="search"
            title="Aucune carte"
            text={
              pool.length === 0
                ? 'Vos autres thèmes ne contiennent aucune carte à reprendre pour l’instant.'
                : 'Essayez un autre mot, ou retirez un filtre. La recherche porte sur le recto, le verso et les étiquettes.'
            }
          />
        ) : (
          <div className="card">
            {shown.map((card) => {
              const deck = store.decks.find((d) => d.id === card.deckId)
              const duplicate = alreadyHere.has(cardKey(card.front))
              return (
                <button
                  key={card.id}
                  type="button"
                  className="listrow"
                  disabled={duplicate}
                  style={duplicate ? { opacity: 0.5 } : undefined}
                  onClick={() => !duplicate && toggle(card)}
                >
                  <span className="tick" data-checked={picked.has(card.id)} aria-hidden="true">
                    <Icon name="check" size={14} strokeWidth={2.4} />
                  </span>
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="listrow__title clamp-2">{card.front}</span>
                    <span className="listrow__sub truncate">
                      {deck?.name ?? 'Thème supprimé'} · {card.back}
                    </span>
                  </span>
                  {duplicate && <span className="chip mono">déjà ici</span>}
                </button>
              )
            })}
          </div>
        )}

        {results.length > MAX_ROWS && (
          <p className="meta" style={{ lineHeight: 1.55 }}>
            {results.length - MAX_ROWS} autres cartes correspondent. Affinez votre recherche ou
            choisissez un thème pour les voir.
          </p>
        )}
      </div>
    </Sheet>
  )
}
