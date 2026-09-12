import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Sheet, plural, useToast } from './ui'
import { buildCardsFile, buildCsv, download, stamp } from '../io/transfer'
import type { Card, Deck, Subject } from '../db/types'

export interface ExportRow {
  subject: string
  deck: string
  card: Card
}

export interface ExportScope {
  id: string
  label: string
  rows: ExportRow[]
}

/** Associe à chaque carte le nom de son thème et de sa matière. */
export function exportRows(cards: Card[], decks: Deck[], subjects: Subject[]): ExportRow[] {
  return cards.map((card) => {
    const deck = decks.find((d) => d.id === card.deckId)
    const subject = deck ? subjects.find((s) => s.id === deck.subjectId) : undefined
    return { subject: subject?.name ?? '', deck: deck?.name ?? '', card }
  })
}

/** Nom de fichier sûr, sans accents ni ponctuation. */
function slug(label: string): string {
  return (
    label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'cartes'
  )
}

/**
 * Export d'un jeu de cartes — tout, une matière, un thème ou un lot.
 *
 * Deux formats, deux usages : le CSV part vers un tableur et se relit
 * partout ; le JSON se réimporte dans l'application sans rien perdre des
 * notes ni des étiquettes. Ni l'un ni l'autre n'emporte la progression, qui
 * appartient à celui qui a révisé.
 */
export function ExportSheet({
  open,
  scopes,
  onClose,
}: {
  open: boolean
  /** Un seul périmètre, ou plusieurs à choisir. */
  scopes: ExportScope[]
  onClose: () => void
}) {
  const toast = useToast()
  const [scopeId, setScopeId] = useState(scopes[0]?.id ?? '')

  useEffect(() => {
    if (open) setScopeId(scopes[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const scope = scopes.find((s) => s.id === scopeId) ?? scopes[0]
  const rows = scope?.rows ?? []

  const exportCsv = () => {
    download(`${slug(scope.label)}-${stamp()}.csv`, buildCsv(rows), 'text/csv')
    toast(`${rows.length} ${plural(rows.length, 'carte exportée', 'cartes exportées')}.`)
    onClose()
  }

  const exportJson = () => {
    const file = buildCardsFile(scope.label, rows)
    download(`${slug(scope.label)}-${stamp()}.json`, JSON.stringify(file, null, 2), 'application/json')
    toast(`${rows.length} ${plural(rows.length, 'carte exportée', 'cartes exportées')}.`)
    onClose()
  }

  return (
    <Sheet
      open={open}
      title="Exporter des cartes"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={rows.length === 0}
          onClick={exportCsv}
        >
          <Icon name="download" size={18} />
          Tableur (CSV)
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Le CSV s’ouvre dans un tableur et se relit partout. Le JSON se réimporte dans
          l’application sans perdre les notes ni les étiquettes. Aucun des deux n’emporte la
          progression : elle reste sur cet appareil.
        </p>

        {scopes.length > 1 && (
          <div className="field">
            <span className="label">À exporter</span>
            <div className="picker">
              {scopes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip chip--select"
                  aria-pressed={scope?.id === item.id}
                  onClick={() => setScopeId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card card--pad row row--between">
          <span className="grow stack" style={{ gap: 1, minWidth: 0 }}>
            <span className="listrow__title truncate">{scope?.label ?? '—'}</span>
            <span className="meta">Cartes archivées comprises.</span>
          </span>
          <span className="chip mono">
            {rows.length} {plural(rows.length, 'carte')}
          </span>
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={rows.length === 0}
          onClick={exportJson}
        >
          <Icon name="download" size={17} />
          Fichier JSON
        </button>
      </div>
    </Sheet>
  )
}
