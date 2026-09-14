import { useMemo } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, plural } from '../components/ui'
import { formatDeadline, isPast } from '../srs/deadline'

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
export function DiffusionScreen() {
  const store = useStore()
  const { navigate } = useRoute()

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
