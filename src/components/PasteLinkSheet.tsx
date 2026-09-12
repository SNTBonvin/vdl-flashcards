import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Field, Sheet } from './ui'
import { normalizeCode } from '../io/catalog'

/**
 * Ouvrir un lien de partage reçu, en le collant.
 *
 * Pourquoi ce détour : sur iPhone, une application installée sur l'écran
 * d'accueil possède son propre stockage, distinct de celui de Safari, et le
 * système ne sait pas confier un lien à une application web. Un lien ouvert
 * depuis un message atterrit donc dans Safari, et les cartes n'arrivent jamais
 * dans l'application installée. Coller le lien *depuis* l'application est le
 * seul chemin fiable — et il fonctionne partout ailleurs.
 */
export function PasteLinkSheet({
  open,
  onClose,
  onResolved,
}: {
  open: boolean
  onClose: () => void
  /** Un lien porte son jeu ; un code désigne un jeu publié. */
  onResolved: (result: { token: string } | { code: string }) => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValue('')
    setError(null)
  }, [open])

  const submit = () => {
    const found = resolveInput(value)
    if (!found) {
      setError(
        'Ni lien ni code reconnu. Collez le lien entier, ou tapez le code donné par votre professeur.',
      )
      return
    }
    onResolved(found)
  }

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setValue(text)
      setError(null)
    } catch {
      setError('Le navigateur refuse l’accès au presse-papiers : collez le lien à la main.')
    }
  }

  return (
    <Sheet
      open={open}
      title="Ouvrir un lien ou un code"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!value.trim()}
          onClick={submit}
        >
          <Icon name="inbox" size={18} />
          Ouvrir
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Collez le lien reçu de votre professeur, ou tapez le code qu’il vous a donné. Vous
          verrez un aperçu des cartes avant d’ajouter quoi que ce soit.
        </p>

        <button type="button" className="btn btn--ghost btn--block" onClick={paste}>
          <Icon name="upload" size={17} />
          Coller depuis le presse-papiers
        </button>

        <Field label="Lien ou code" hint="Le lien entier, ou un code du genre « SVT-2DE-BIO1 ».">
          <textarea
            className="textarea mono"
            style={{ minHeight: 90, fontSize: 11.5 }}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            placeholder="https://…/#/p/…    ou    SVT-2DE-BIO1"
          />
        </Field>

        {error && (
          <div className="card card--pad" data-status="err">
            <span className="meta" style={{ color: 'var(--err)' }}>
              {error}
            </span>
          </div>
        )}

        <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
          <span className="glyph glyph--warm">
            <Icon name="info" size={18} />
          </span>
          <p className="meta" style={{ lineHeight: 1.55 }}>
            Sur iPhone, un lien ouvert depuis un message va dans Safari, qui ne partage pas ses
            données avec l’application installée. Passer par ici est le seul moyen sûr d’y recevoir
            les cartes.
          </p>
        </div>
      </div>
    </Sheet>
  )
}

/**
 * Reconnaît ce qui a été collé : un lien de partage, un jeton seul, un lien
 * vers un jeu publié, ou un code. L'utilisateur n'a pas à savoir laquelle des
 * deux mécaniques s'applique — un seul champ, une seule touche.
 */
export function resolveInput(input: string): { token: string } | { code: string } | null {
  const text = input.trim()
  if (!text) return null

  const link = text.match(/#\/?p\/([A-Za-z0-9_-]+)/)
  if (link) return { token: link[1] }

  const published = text.match(/#\/?c\/([A-Za-z0-9-]+)/)
  if (published) {
    const code = normalizeCode(published[1])
    return code ? { code } : null
  }

  // Jeton seul : base64url, assez long pour ne pas être confondu avec un code.
  if (/^[A-Za-z0-9_-]{40,}$/.test(text)) return { token: text }

  const code = normalizeCode(text)
  return code ? { code } : null
}
