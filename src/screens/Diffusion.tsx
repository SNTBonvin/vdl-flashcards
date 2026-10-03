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
  /** Matière mise en avant. `null` : tout, dans l'ordre habituel. */
  const [matiere, setMatiere] = useState<string | null>(null)

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

  /**
   * Les matières présentes, séries et jeux confondus : une matière sans rien
   * de diffusé n'a pas à encombrer le filtre.
   */
  const matieres = useMemo(() => {
    const noms = new Set<string>()
    for (const row of series) if (row.subject?.name) noms.add(row.subject.name)
    for (const row of published) if (row.subject?.name) noms.add(row.subject.name)
    return [...noms].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [series, published])

  // Une matière disparue — thème supprimé, dernier jeu retiré — ne doit pas
  // laisser l'écran vide sans qu'on comprenne pourquoi.
  const choisie = matiere && matieres.includes(matiere) ? matiere : null
  const vues = choisie ? series.filter((r) => r.subject?.name === choisie) : series
  const vusPubliés = choisie ? published.filter((r) => r.subject?.name === choisie) : published

  const rien = series.length === 0 && published.length === 0

  /** Un code se note à la main ou se dicte : autant pouvoir le coller. */
  const copier = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast(`Code « ${code} » copié.`)
    } catch {
      toast('Copie impossible : sélectionne le code à la main.', 'error')
    }
  }

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

      {/* Un seul enseignant tient vite trois matières : le filtre évite de
          faire défiler les séries d'histoire pour vérifier un code de SVT.
          Il ne sert à rien tant qu'il n'y a qu'une matière. */}
      {matieres.length > 1 && (
        <div className="picker">
          <button
            type="button"
            className="chip chip--select"
            aria-pressed={choisie === null}
            onClick={() => setMatiere(null)}
          >
            Toutes
          </button>
          {matieres.map((nom) => (
            <button
              key={nom}
              type="button"
              className="chip chip--select"
              aria-pressed={choisie === nom}
              onClick={() => setMatiere(nom)}
            >
              {nom}
            </button>
          ))}
        </div>
      )}

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

      {vues.length > 0 && (
        <section className="stack stack-3">
          <SectionHead title="Séries" aside={<span className="meta mono">{vues.length}</span>} />
          <div className="card">
            {vues.map(({ lot, deck, subject, count, stale }) => (
              <div key={lot.id} className="difrow">
                <button
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
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
                <div className="difrow__chips">
                  {lot.dueBy && !isPast(lot.dueBy) && (
                    <span className="chip chip--warn">pour {formatDeadline(lot.dueBy)}</span>
                  )}
                  {lot.publishedAs && <CodeChip code={lot.publishedAs} onCopy={copier} />}
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
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {vusPubliés.length > 0 && (
        <section className="stack stack-3">
          <SectionHead
            title="Jeux publiés"
            aside={<span className="meta mono">{vusPubliés.length}</span>}
          />
          <div className="card">
            {vusPubliés.map(({ deck, subject, count, stale }) => (
              <div key={deck.id} className="difrow">
                <button
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
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
                <div className="difrow__chips">
                  {deck.publishedAs && <CodeChip code={deck.publishedAs} onCopy={copier} />}
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
                </div>
              </div>
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

/**
 * Le code d'un jeu, qui se copie d'un appui.
 *
 * On le lit pour le dicter à une classe ou le coller dans l'ENT : le
 * retaper de mémoire est la seule façon de se tromper. L'étiquette dit
 * « copié » un instant, parce qu'un toast seul se rate quand on regarde
 * son doigt.
 */
function CodeChip({ code, onCopy }: { code: string; onCopy: (code: string) => Promise<void> }) {
  const [copie, setCopie] = useState(false)

  return (
    <button
      type="button"
      className="chip mono chip--copy"
      aria-label={`Copier le code ${code}`}
      onClick={async () => {
        await onCopy(code)
        setCopie(true)
        setTimeout(() => setCopie(false), 1400)
      }}
    >
      <Icon name={copie ? 'check' : 'copy'} size={13} />
      {copie ? 'copié' : code}
    </button>
  )
}
