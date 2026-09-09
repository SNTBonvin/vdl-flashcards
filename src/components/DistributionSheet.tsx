import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { ConfirmSheet, Field, Sheet, plural, useToast } from './ui'
import { formatSize, measure, shareUrl, encodeShare, buildPayload } from '../io/share'
import { qrModuleCount } from './QrCode'
import type { Distribution } from '../db/types'

/**
 * Fiche d'un lot : renommer, mesurer, diffuser, modifier sa sélection.
 *
 * La longueur du lien est recalculée à chaque ouverture, à partir du contenu
 * courant du lot — c'est ce qui permet de le faire évoluer sans jamais avoir à
 * « régénérer » quoi que ce soit.
 */
export function DistributionSheet({
  open,
  lot,
  onClose,
  onShare,
  onEditSelection,
}: {
  open: boolean
  lot: Distribution | null
  onClose: () => void
  onShare: () => void
  onEditSelection: () => void
}) {
  const store = useStore()
  const toast = useToast()
  const [name, setName] = useState('')
  const [size, setSize] = useState<string | null>(null)
  const [fit, setFit] = useState<string>('chip')
  const [confirming, setConfirming] = useState(false)

  const deck = lot ? store.decks.find((d) => d.id === lot.deckId) : null
  const subject = deck ? store.subjects.find((s) => s.id === deck.subjectId) : null
  const cards = lot
    ? (store.cardsByDeck.get(lot.deckId) ?? []).filter(
        (c) => lot.cardIds.includes(c.id) && !c.suspended,
      )
    : []

  useEffect(() => {
    if (!open || !lot) return
    setName(lot.name)
  }, [open, lot])

  // Mesure du lien, à titre indicatif : elle dit si le QR sera projetable.
  useEffect(() => {
    if (!open || !lot || !deck || !subject) return
    let cancelled = false
    ;(async () => {
      const token = await encodeShare(
        buildPayload({ subject, deck, cards, by: store.settings.sharedBy, shareId: 'x' }),
      )
      if (cancelled) return
      const url = shareUrl(token)
      const measured = measure(url, qrModuleCount(url))
      setSize(formatSize(measured.length))
      setFit(
        measured.fit === 'qr'
          ? 'chip--ok'
          : measured.fit === 'qr-dense'
            ? 'chip--warn'
            : 'chip--err',
      )
    })().catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lot?.id, cards.length])

  if (!lot) return null

  return (
    <>
      <Sheet
        open={open}
        title="Lot de distribution"
        onClose={onClose}
        footer={
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={cards.length === 0}
            onClick={onShare}
          >
            <Icon name="move" size={18} />
            Diffuser ce lot
          </button>
        }
      >
        <div className="stack stack-5">
          <Field label="Intitulé" hint="Pour vous y retrouver. L’élève ne le voit pas.">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim() && name.trim() !== lot.name) {
                  void store.updateDistribution(lot.id, { name: name.trim() })
                }
              }}
            />
          </Field>

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
              <span className={`chip ${fit}`}>{size ?? '…'}</span>
            </div>
            {lot.lastSharedAt && (
              <>
                <hr className="rule" />
                <div className="row row--between">
                  <span className="meta">Dernière diffusion</span>
                  <span className="chip mono">
                    {new Date(lot.lastSharedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </>
            )}
          </div>

          <button type="button" className="btn btn--ghost btn--block" onClick={onEditSelection}>
            <Icon name="edit" size={18} />
            Modifier les cartes du lot
          </button>

          <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
            <span className="glyph glyph--warm">
              <Icon name="info" size={18} />
            </span>
            <p className="meta" style={{ lineHeight: 1.55 }}>
              Les lots d’un même thème se rejoignent chez l’élève : il reçoit des cartes dans
              « {deck?.name} », sans voir le découpage. Un lot diffusé plus tard complète
              les précédents sans rien effacer.
            </p>
          </div>

          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => setConfirming(true)}
          >
            <Icon name="trash" size={17} />
            Supprimer le lot
          </button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirming}
        title={`Supprimer « ${lot.name} » ?`}
        text="Seul le lot est supprimé : les cartes restent dans le thème, et ce que vos élèves ont déjà reçu n’est pas concerné."
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await store.deleteDistribution(lot.id)
          toast('Lot supprimé.')
          onClose()
        }}
      />
    </>
  )
}
