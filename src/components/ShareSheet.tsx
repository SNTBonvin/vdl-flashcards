import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { Field, Sheet, useToast, plural } from './ui'
import { QrCode, qrModuleCount } from './QrCode'
import {
  buildPayload,
  encodeShare,
  formatSize,
  measure,
  shareUrl,
  type ShareSize,
} from '../io/share'
import type { Deck } from '../db/types'

/**
 * Produit le lien de partage d'un thème, avec un QR quand le jeu est assez
 * court pour rester lisible, et un avis franc sur ce qu'on peut en faire.
 */
export function ShareSheet({
  open,
  deck,
  onClose,
}: {
  open: boolean
  deck: Deck
  onClose: () => void
}) {
  const store = useStore()
  const toast = useToast()
  const [by, setBy] = useState(store.settings.sharedBy)
  const [url, setUrl] = useState<string | null>(null)
  const [size, setSize] = useState<ShareSize | null>(null)
  const [building, setBuilding] = useState(false)

  const subject = store.subjects.find((s) => s.id === deck.subjectId)
  const cards = (store.cardsByDeck.get(deck.id) ?? []).filter((c) => !c.suspended)

  // Le lien est reconstruit à chaque ouverture et à chaque changement de nom :
  // il porte un horodatage, qui fait office de numéro de révision.
  useEffect(() => {
    if (!open || !subject) return
    let cancelled = false
    setBuilding(true)
    ;(async () => {
      const shareId = await store.prepareShare(deck.id)
      const token = await encodeShare(buildPayload({ subject, deck, cards, by, shareId }))
      if (cancelled) return
      const link = shareUrl(token)
      setUrl(link)
      setSize(measure(link, qrModuleCount(link)))
      setBuilding(false)
    })().catch(() => {
      if (!cancelled) {
        setBuilding(false)
        toast('Création du lien impossible.', 'error')
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deck.id, deck.name, by, cards.length])

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast('Lien copié.')
    } catch {
      toast('Copie impossible : sélectionnez le lien à la main.', 'error')
    }
  }

  const advice: Record<ShareSize['fit'], { tone: string; text: string }> = {
    qr: {
      tone: 'chip--ok',
      text: 'Le QR code est lisible au vidéoprojecteur. Le lien se colle aussi dans l’ENT.',
    },
    'qr-dense': {
      tone: 'chip--warn',
      text: 'Le QR code est dense : à scanner de près, sur un écran plutôt qu’au fond de la salle.',
    },
    link: {
      tone: 'chip--warn',
      text: 'Jeu trop volumineux pour un QR code : diffusez le lien. Certains ENT tronquent les liens très longs.',
    },
    'too-long': {
      tone: 'chip--err',
      text: 'Jeu trop volumineux pour un lien. Passez par « Exporter la sauvegarde » dans les réglages.',
    },
  }

  return (
    <Sheet
      open={open}
      title="Partager ce thème"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={copy}
          disabled={!url || size?.fit === 'too-long'}
        >
          <Icon name="upload" size={18} />
          Copier le lien
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Le jeu de cartes est contenu dans le lien lui-même : rien n’est déposé sur un serveur, et
          personne ne peut savoir qui l’ouvre. L’élève voit un aperçu avant d’ajouter quoi que ce
          soit à ses cartes.
        </p>

        <Field label="Partagé par" hint="Facultatif. Affiché à l’élève qui reçoit le lien.">
          <input
            className="input"
            value={by}
            placeholder="M. Bonvin"
            onChange={(e) => setBy(e.target.value)}
            onBlur={() => {
              if (by !== store.settings.sharedBy) void store.saveSettings({ sharedBy: by })
            }}
          />
        </Field>

        {building || !url || !size ? (
          <div className="card card--pad">
            <span className="eyebrow">Préparation du lien…</span>
          </div>
        ) : (
          <>
            <div className="card card--pad stack stack-3">
              <div className="row row--between">
                <span className="eyebrow">Contenu</span>
                <span className="chip mono">
                  {cards.length} {plural(cards.length, 'carte')}
                </span>
              </div>
              <hr className="rule" />
              <div className="row row--between">
                <span className="meta">Longueur du lien</span>
                <span className={`chip ${advice[size.fit].tone}`}>{formatSize(size.length)}</span>
              </div>
              <p className="meta" style={{ lineHeight: 1.55 }}>
                {advice[size.fit].text}
              </p>
            </div>

            {(size.fit === 'qr' || size.fit === 'qr-dense') && (
              <div className="card card--pad stack stack-3" style={{ alignItems: 'center' }}>
                {/* Fond blanc et modules sombres quel que soit le thème : un QR
                    inversé est mal lu par beaucoup de téléphones. */}
                <div style={{ padding: 10, background: '#ffffff', borderRadius: 'var(--r-md)' }}>
                  <QrCode value={url} size={200} />
                </div>
                <span className="meta mono" style={{ fontSize: 11 }}>
                  {size.modules} × {size.modules} modules
                </span>
              </div>
            )}

            <Field label="Lien">
              <textarea
                className="textarea mono"
                style={{ minHeight: 78, fontSize: 11.5 }}
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
            </Field>

            <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
              <span className="glyph glyph--warm">
                <Icon name="info" size={18} />
              </span>
              <p className="meta" style={{ lineHeight: 1.55 }}>
                Si vous corrigez ce thème plus tard, rediffusez le lien : chez l’élève, le jeu sera
                mis à jour au lieu d’être dupliqué, et sa progression sera conservée.
              </p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
