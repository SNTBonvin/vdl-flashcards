import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { Field, Sheet } from './ui'

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
  onToken,
}: {
  open: boolean
  onClose: () => void
  onToken: (token: string) => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValue('')
    setError(null)
  }, [open])

  const submit = () => {
    const token = extractToken(value)
    if (!token) {
      setError('Ce lien ne contient pas de jeu de cartes. Vérifiez qu’il a été copié en entier.')
      return
    }
    onToken(token)
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
      title="Ouvrir un lien reçu"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!value.trim()}
          onClick={submit}
        >
          <Icon name="inbox" size={18} />
          Ouvrir le lien
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Collez ici le lien reçu de votre professeur. Vous verrez un aperçu des cartes avant
          d’ajouter quoi que ce soit.
        </p>

        <button type="button" className="btn btn--ghost btn--block" onClick={paste}>
          <Icon name="upload" size={17} />
          Coller depuis le presse-papiers
        </button>

        <Field label="Lien" hint="Le lien entier, ou seulement le code qui suit « #/p/ ».">
          <textarea
            className="textarea mono"
            style={{ minHeight: 90, fontSize: 11.5 }}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            placeholder="https://…/vdl-flashcards/#/p/…"
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

/** Retrouve le jeton, que l'on ait collé le lien entier ou le seul code. */
export function extractToken(input: string): string | null {
  const text = input.trim()
  if (!text) return null

  const inUrl = text.match(/#\/?p\/([A-Za-z0-9_-]+)/)
  if (inUrl) return inUrl[1]

  // Jeton seul : base64url, et assez long pour ne pas confondre avec un mot.
  if (/^[A-Za-z0-9_-]{16,}$/.test(text)) return text

  return null
}
