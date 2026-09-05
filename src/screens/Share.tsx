import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, plural, useToast } from '../components/ui'
import { decodeShare, ShareError, type SharePayload } from '../io/share'

/**
 * Réception d'un thème partagé.
 *
 * Rien n'est jamais ajouté automatiquement : le lien ne fait qu'afficher un
 * aperçu. C'est l'élève qui décide, en connaissance de cause, d'ajouter le jeu
 * à ses propres cartes.
 */
export function ShareScreen({ token }: { token: string }) {
  const store = useStore()
  const toast = useToast()
  const { navigate } = useRoute()

  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPayload(null)
    setError(null)
    decodeShare(token)
      .then((result) => {
        if (!cancelled) setPayload(result)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ShareError ? e.message : 'Ce lien de partage est illisible.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (error) {
    return (
      <main className="screen stack stack-5">
        <div className="page-title">
          <h1>Thème partagé</h1>
        </div>
        <EmptyState
          icon="info"
          title="Lien illisible"
          text={error}
          action={
            <button type="button" className="btn btn--ghost" onClick={() => navigate({ name: 'today' })}>
              Retour à l’accueil
            </button>
          }
        />
      </main>
    )
  }

  if (!payload) {
    return (
      <main className="screen stack stack-5">
        <div className="page-title">
          <h1>Thème partagé</h1>
        </div>
        <div className="card card--pad">
          <span className="eyebrow">Lecture du lien…</span>
        </div>
      </main>
    )
  }

  // Le thème est-il déjà présent ? On l'annonce, pour que l'élève sache qu'il
  // met à jour plutôt qu'il ne duplique.
  const existing = store.decks.find((d) => d.shareId === payload.id)
  const cardCount = payload.c.length

  const add = async () => {
    setImporting(true)
    try {
      const result = await store.importShare(payload)
      const parts = [
        result.added > 0 ? `${result.added} ${plural(result.added, 'carte ajoutée', 'cartes ajoutées')}` : null,
        result.updated > 0 ? `${result.updated} mise${result.updated > 1 ? 's' : ''} à jour` : null,
        result.unchanged > 0 ? `${result.unchanged} inchangée${result.unchanged > 1 ? 's' : ''}` : null,
      ].filter(Boolean)
      toast(parts.length > 0 ? parts.join(' · ') : 'Rien à ajouter : le jeu était déjà à jour.')
      navigate({ name: 'deck', id: result.deckId })
    } catch {
      toast('Ajout impossible.', 'error')
      setImporting(false)
    }
  }

  return (
    <main className="screen stack stack-5">
      <div className="page-title stack" style={{ gap: 4 }}>
        <span className="eyebrow">{payload.by ? `Partagé par ${payload.by}` : 'Thème partagé'}</span>
        <h1>{payload.t}</h1>
      </div>

      <section className="card card--pad stack stack-4" data-status={existing ? 'run' : 'ok'}>
        <div className="row">
          <span className="glyph glyph--lg">
            <Icon name="layers" size={21} />
          </span>
          <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="listrow__title truncate">{payload.s}</span>
            <span className="meta">
              {cardCount} {plural(cardCount, 'carte')}
              {existing ? ' · déjà dans vos cartes' : ''}
            </span>
          </div>
        </div>

        {payload.d && (
          <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.6 }}>{payload.d}</p>
        )}

        <button
          type="button"
          className="btn btn--primary btn--lg btn--block"
          onClick={add}
          disabled={importing}
        >
          {importing ? 'Ajout en cours…' : existing ? 'Mettre à jour mes cartes' : 'Ajouter à mes cartes'}
        </button>

        <p className="meta" style={{ lineHeight: 1.55 }}>
          {existing
            ? 'Vous avez déjà ce thème : les cartes seront mises à jour et votre progression sera conservée. Aucune de vos cartes ne sera supprimée.'
            : `Les cartes seront ajoutées à la matière « ${payload.s} », créée si vous ne l’avez pas encore.`}
        </p>
      </section>

      <section className="stack stack-3">
        <SectionHead title="Aperçu" aside={<span className="meta mono">{Math.min(5, cardCount)} sur {cardCount}</span>} />
        <div className="card">
          {payload.c.slice(0, 5).map(([front, back], index) => (
            <div key={index} className="listrow" style={{ cursor: 'default' }}>
              <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                <span className="listrow__title clamp-2">{front}</span>
                <span className="listrow__sub truncate">{back}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
