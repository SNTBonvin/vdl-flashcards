import { Icon } from './Icon'
import type { AppUpdate } from '../pwa/update'

/**
 * Bandeau proposant d'appliquer une nouvelle version.
 *
 * Il précise explicitement que rien n'est perdu : c'est la première question
 * que se pose un élève qui a déjà saisi cinquante cartes.
 */
export function UpdateBanner({ update }: { update: AppUpdate }) {
  if (!update.available) return null

  return (
    <div className="updatebar" role="status">
      <div className="updatebar__inner">
        <div className="row">
          <span className="glyph">
            <Icon name="download" size={18} />
          </span>
          <div className="grow stack" style={{ gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Nouvelle version disponible
            </span>
            <span className="meta">Vos cartes et votre progression sont conservées.</span>
          </div>
          <button
            type="button"
            className="icon-btn icon-btn--bare"
            onClick={update.dismiss}
            aria-label="Plus tard"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <button type="button" className="btn btn--primary btn--block" onClick={update.apply}>
          Mettre à jour
        </button>
      </div>
    </div>
  )
}
