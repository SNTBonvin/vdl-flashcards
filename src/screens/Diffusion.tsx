import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, Sheet, plural, useToast } from '../components/ui'
import { PublishSheet } from '../components/PublishSheet'
import { formatDeadline, isPast } from '../srs/deadline'
import type { Card, Deck, Distribution } from '../db/types'

/**
 * Inventaire de ce qu'on a diffusé : séries et jeux publiés.
 *
 * Une série n'existait que dans son thème, un code que dans la feuille de
 * publication : rien ne disait, d'un seul regard, ce qui avait été donné ni ce
 * qui traînait en ligne. Or c'est la question que l'on se pose en préparant le
 * cours suivant — « comment s'appelait le lot du contrôle ? », « ce code-là,
 * je l'ai republié ? ».
 *
 * L'écran ne fait donc rien d'autre que rassembler et signaler. Aucune action
 * destructrice, aucune opération réseau : on y lit, et l'on va au bon endroit.
 * C'est aussi pourquoi il ne montre que l'état local — republier, retirer du
 * catalogue ou corriger se font dans la fiche, où le contexte est complet.
 */
/** Ce qu'on s'apprête à publier : un thème entier, ou une série. */
type Cible = { deck: Deck; lot?: Distribution; cards: Card[] }

export function DiffusionScreen() {
  const store = useStore()
  const toast = useToast()
  const { navigate } = useRoute()
  /** Choix de ce qu'on publie, puis feuille de publication. */
  const [choix, setChoix] = useState(false)
  const [cible, setCible] = useState<Cible | null>(null)

  const ouvrir = (c: Cible) => {
    setChoix(false)
    setCible(c)
  }

  const series = useMemo(() => {
    return store.distributions
      .map((lot) => {
        const deck = store.decks.find((d) => d.id === lot.deckId)
        const subject = deck ? store.subjects.find((s) => s.id === deck.subjectId) : null
        const cards = (store.cardsByDeck.get(lot.deckId) ?? []).filter(
          (c) => lot.cardIds.includes(c.id) && !c.suspended,
        )
        // « À republier » se juge sur le contenu, pas sur une date : une carte
        // retouchée après le dépôt suffit, comme dans la fiche de la série.
        const stale =
          Boolean(lot.publishedAs) &&
          (lot.publishedCount !== cards.length ||
            cards.some((c) => c.updatedAt > (lot.publishedAt ?? 0)))
        return { lot, deck, subject, count: cards.length, stale }
      })
      .filter((row) => row.deck)
      .sort(
        (a, b) =>
          (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '', 'fr') ||
          (a.deck?.name ?? '').localeCompare(b.deck?.name ?? '', 'fr') ||
          a.lot.createdAt - b.lot.createdAt,
      )
  }, [store.distributions, store.decks, store.subjects, store.cardsByDeck])

  const published = useMemo(() => {
    return store.decks
      .filter((deck) => deck.publishedAs)
      .map((deck) => {
        const subject = store.subjects.find((s) => s.id === deck.subjectId)
        const cards = (store.cardsByDeck.get(deck.id) ?? []).filter((c) => !c.suspended)
        const stale =
          cards.length !== deck.publishedCount ||
          cards.some((c) => c.updatedAt > (deck.publishedAt ?? 0))
        return { deck, subject, count: cards.length, stale }
      })
      .sort(
        (a, b) =>
          (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '', 'fr') ||
          a.deck.name.localeCompare(b.deck.name, 'fr'),
      )
  }, [store.decks, store.subjects, store.cardsByDeck])

  const rien = series.length === 0 && published.length === 0

  return (
    <main className="screen stack stack-6">
      <div className="page-title stack" style={{ gap: 4 }}>
        <span className="eyebrow">Diffusion</span>
        <h1>Ce que j’ai diffusé</h1>
      </div>

      {/* La publication a quitté la fiche de thème pour se tenir ici : l'endroit
          où l'on voit déjà ce qui est en ligne est le bon endroit pour y
          ajouter, ou pour redéposer ce qui a changé. */}
      <button
        type="button"
        className="btn btn--primary btn--lg btn--block"
        onClick={() => setChoix(true)}
      >
        <Icon name="upload" size={18} />
        Publier ou republier
      </button>

      {rien ? (
        <EmptyState
          icon="layers"
          title="Rien de diffusé pour l’instant"
          text="Les séries que tu composes dans un thème et les jeux que tu publies sous un code apparaîtront ici, avec leur code et ce qui reste à republier."
          action={
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate({ name: 'library' })}
            >
              Aller à mes matières
            </button>
          }
        />
      ) : null}

      {series.length > 0 && (
        <section className="stack stack-3">
          <SectionHead
            title="Séries"
            aside={<span className="meta mono">{series.length}</span>}
          />
          <div className="card">
            {series.map(({ lot, deck, subject, count, stale }) => (
              <button
                key={lot.id}
                type="button"
                className="listrow"
                onClick={() => navigate({ name: 'deck', id: lot.deckId, lot: lot.id })}
              >
                <span className="grow stack" style={{ gap: 3, minWidth: 0 }}>
                  <span className="listrow__title truncate">{lot.name}</span>
                  <span className="listrow__sub truncate">
                    {subject?.name ? `${subject.name} · ` : ''}
                    {deck?.name} · {count} {plural(count, 'carte')}
                  </span>
                  <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {lot.dueBy && !isPast(lot.dueBy) && (
                      <span className="chip chip--warn">pour {formatDeadline(lot.dueBy)}</span>
                    )}
                    {lot.publishedAs && <span className="chip mono">{lot.publishedAs}</span>}
                    {stale && <span className="chip chip--warn">à republier</span>}
                    {lot.publishedAs && lot.publishedListed === false && (
                      <span className="chip">hors catalogue</span>
                    )}
                    {lot.lastSharedAt ? (
                      <span className="chip mono">
                        diffusé le {new Date(lot.lastSharedAt).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      !lot.publishedAs && <span className="chip">jamais diffusé</span>
                    )}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      {published.length > 0 && (
        <section className="stack stack-3">
          <SectionHead
            title="Jeux publiés"
            aside={<span className="meta mono">{published.length}</span>}
          />
          <div className="card">
            {published.map(({ deck, subject, count, stale }) => (
              <button
                key={deck.id}
                type="button"
                className="listrow"
                onClick={() => navigate({ name: 'deck', id: deck.id })}
              >
                <span className="grow stack" style={{ gap: 3, minWidth: 0 }}>
                  <span className="listrow__title truncate">
                    {deck.publishedName || deck.name}
                  </span>
                  <span className="listrow__sub truncate">
                    {subject?.name ? `${subject.name} · ` : ''}
                    {count} {plural(count, 'carte')}
                    {deck.publishedName && deck.publishedName !== deck.name
                      ? ` · chez toi : ${deck.name}`
                      : ''}
                  </span>
                  <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <span className="chip mono">{deck.publishedAs}</span>
                    {stale && <span className="chip chip--warn">à republier</span>}
                    {deck.publishedListed === false ? (
                      <span className="chip">hors catalogue</span>
                    ) : (
                      <span className="chip chip--ok">au catalogue</span>
                    )}
                    {deck.publishedAt && (
                      <span className="chip mono">
                        déposé le {new Date(deck.publishedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      <Sheet open={choix} title="Publier" onClose={() => setChoix(false)}>
        <div className="stack stack-4">
          <p className="meta" style={{ lineHeight: 1.6 }}>
            Choisis ce que tu veux mettre en ligne. Un jeu déjà publié se
            republie sous le même code : chez tes élèves, il se met à jour.
          </p>

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
                    const cards = (store.cardsByDeck.get(deck.id) ?? []).filter((c) => !c.suspended)
                    const lots = store.distributionsByDeck.get(deck.id) ?? []
                    const stale =
                      Boolean(deck.publishedAs) &&
                      (cards.length !== deck.publishedCount ||
                        cards.some((c) => c.updatedAt > (deck.publishedAt ?? 0)))
                    return (
                      <div key={deck.id}>
                        <button
                          type="button"
                          className="listrow"
                          disabled={cards.length === 0}
                          onClick={() => ouvrir({ deck, cards })}
                        >
                          <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                            <span className="listrow__title truncate">{deck.name}</span>
                            <span className="listrow__sub truncate">
                              Le thème entier · {cards.length} {plural(cards.length, 'carte')}
                            </span>
                          </span>
                          {deck.publishedAs && (
                            <span className={`chip mono ${stale ? 'chip--warn' : ''}`}>
                              {stale ? 'à republier' : deck.publishedAs}
                            </span>
                          )}
                          <Icon name="chevron-right" size={18} />
                        </button>
                        {lots.map((lot) => {
                          const dans = cards.filter((c) => lot.cardIds.includes(c.id))
                          const vieux =
                            Boolean(lot.publishedAs) &&
                            (lot.publishedCount !== dans.length ||
                              dans.some((c) => c.updatedAt > (lot.publishedAt ?? 0)))
                          return (
                            <button
                              key={lot.id}
                              type="button"
                              className="listrow"
                              disabled={dans.length === 0}
                              onClick={() => ouvrir({ deck, lot, cards: dans })}
                            >
                              <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                                <span className="listrow__title truncate">
                                  &nbsp;&nbsp;{lot.name}
                                </span>
                                <span className="listrow__sub truncate">
                                  Série · {dans.length} {plural(dans.length, 'carte')}
                                </span>
                              </span>
                              {lot.publishedAs && (
                                <span className={`chip mono ${vieux ? 'chip--warn' : ''}`}>
                                  {vieux ? 'à republier' : lot.publishedAs}
                                </span>
                              )}
                              <Icon name="chevron-right" size={18} />
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Sheet>

      {cible && (
        <PublishSheet
          open
          deck={cible.deck}
          lot={cible.lot}
          cards={cible.cards}
          onClose={() => setCible(null)}
          onPublished={(code) =>
            toast(`Code « ${code} » retenu. Dépose le fichier pour le rendre vivant.`)
          }
        />
      )}

      {!rien && (
        <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
          <span className="glyph glyph--warm">
            <Icon name="info" size={18} />
          </span>
          <p className="meta" style={{ lineHeight: 1.55 }}>
            « À republier » veut dire que des cartes ont changé depuis le dépôt : ce que tes élèves
            ont reçu n’est plus à jour. Un appui ouvre la fiche, d’où l’on republie.
          </p>
        </div>
      )}
    </main>
  )
}
