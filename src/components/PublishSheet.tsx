import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { Field, Sheet, Toggle, plural, useToast } from './ui'
import { download } from '../io/transfer'
import {
  CODE_PATTERN,
  normalizeCode,
  setPath,
  setUrl,
  suggestCode,
  type PublishedSet,
} from '../io/catalog'
import type { Card, Deck, Distribution } from '../db/types'

/**
 * Page de dépôt d'un fichier, selon l'hébergeur du dépôt **source**.
 *
 * Le fichier se dépose là où vit le code, pas sur un éventuel miroir : un
 * dépôt fait sur le miroir fait diverger les deux et bloque la recopie.
 */
function uploadUrl(repo: string): string {
  const base = repo.trim().replace(/\/+$/, '')
  return /github\.com/.test(base)
    ? `${base}/upload/main/public/c`
    : `${base}/-/new/main/public/c`
}

/**
 * Page de modification du fichier déjà déposé : on atterrit dans l'éditeur, il
 * ne reste qu'à tout sélectionner, coller et valider. Redéposer sous le même
 * code met le jeu à jour chez ceux qui l'ont reçu ; en changer en créerait un
 * second.
 */
function editUrl(repo: string, code: string): string {
  const base = repo.trim().replace(/\/+$/, '')
  const path = `main/public/c/${code}.json`
  return /github\.com/.test(base) ? `${base}/edit/${path}` : `${base}/-/edit/${path}`
}

/** Niveaux proposés, du collège au lycée. « Tous niveaux » reste possible. */
const LEVELS = ['6e', '5e', '4e', '3e', '2de', '1re', 'Tle']

/**
 * Publication d'un jeu sous un code court.
 *
 * L'application ne peut pas écrire dans le dépôt — elle est servie par lui,
 * sans droits sur lui. Elle prépare donc le fichier exact à déposer, son nom,
 * son contenu, et ouvre la page de dépôt de la forge au bon endroit. Il reste
 * à coller et valider : deux gestes, aucune clé à faire vivre nulle part, et
 * surtout aucun jeton d'écriture dans le code envoyé aux élèves.
 */
export function PublishSheet({
  open,
  deck,
  lot,
  cards,
  onClose,
  onPublished,
}: {
  open: boolean
  deck: Deck
  /**
   * Lot publié, le cas échéant. Tous les lots d'un thème portent le même
   * identifiant de thème : chez l'élève, ils se rejoignent donc dans un seul
   * thème au lieu de s'empiler en chapitres séparés.
   */
  lot?: Distribution | null
  /** Cartes à publier : tout le thème, ou les seules cartes d'un lot. */
  cards: Card[]
  onClose: () => void
  onPublished: (code: string) => void
}) {
  const store = useStore()
  const toast = useToast()
  const subject = store.subjects.find((s) => s.id === deck.subjectId)
  /** L'état de publication appartient à ce qu'on publie : le lot, ou le thème. */
  const target = lot ?? deck

  const [code, setCode] = useState('')
  const [level, setLevel] = useState('')
  /** Nom vu par l'élève. Par défaut celui du thème, mais on peut le rhabiller. */
  const [label, setLabel] = useState('')
  const [listed, setListed] = useState(true)
  const [repo, setRepo] = useState(store.settings.publishRepo)
  /**
   * Identifiant de partage du thème, attribué à l'ouverture. C'est lui qui
   * évite les doublons chez l'élève : sans lui, deux jeux publiés se
   * confondraient. Rien n'est proposé tant qu'il n'est pas prêt.
   */
  const [shareId, setShareId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setCode(target.publishedAs ?? suggestCode(subject?.name ?? '', deck.name, lot?.name))
    setLabel(target.publishedName ?? (lot ? `${deck.name} — ${lot.name}` : deck.name))
    setListed(true)
    setRepo(store.settings.publishRepo)
    setShareId(null)
    let cancelled = false
    void store.prepareShare(deck.id).then((id) => {
      if (!cancelled) setShareId(id)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deck.id, lot?.id])

  const live = cards.filter((c) => !c.suspended)
  const ready = shareId !== null
  /** Déjà publié sous ce code, et modifié depuis : il faut redéposer. */
  const published = target.publishedAs === normalizeCode(code) && target.publishedAt != null
  const stale =
    published &&
    (live.length !== target.publishedCount ||
      live.some((c) => c.updatedAt > (target.publishedAt ?? 0)))
  const valid = CODE_PATTERN.test(code.trim().toUpperCase()) && ready

  const file = useMemo<PublishedSet | null>(() => {
    const normalized = normalizeCode(code)
    if (!normalized || !subject || !shareId) return null
    return {
      format: 'vdl-flashcards-set',
      version: 1,
      code: normalized,
      publishedAt: new Date().toISOString(),
      listed,
      ...(level ? { level } : {}),
      ...(store.settings.sharedBy ? { by: store.settings.sharedBy } : {}),
      subject: subject.name,
      deck: label.trim() || deck.name,
      ...(lot ? { lot: lot.name } : {}),
      ...(deck.description ? { description: deck.description } : {}),
      // Le même identifiant que le partage par lien : chez l'élève, un jeu reçu
      // par code et un lot reçu par lien se rejoignent dans le même thème.
      shareId,
      rev: Date.now(),
      cards: live.map((c) => [c.front, c.back, c.notes || undefined] as [string, string, string?]),
    }
  }, [code, label, level, listed, subject, deck, lot, live, shareId, store.settings.sharedBy])

  const content = file ? JSON.stringify(file, null, 2) : ''
  const normalized = normalizeCode(code)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast('Contenu copié.')
    } catch {
      toast('Copie impossible : téléchargez le fichier.', 'error')
    }
  }

  const openRepo = async () => {
    if (!repo.trim() || !normalized) return
    if (repo !== store.settings.publishRepo) await store.saveSettings({ publishRepo: repo.trim() })
    const marks = {
      publishedAs: normalized,
      publishedName: label.trim() || deck.name,
      publishedAt: Date.now(),
      publishedCount: live.length,
    }
    if (lot) await store.updateDistribution(lot.id, marks)
    else await store.updateDeck(deck.id, marks)
    onPublished(normalized)
    window.open(published ? editUrl(repo, normalized) : uploadUrl(repo), '_blank', 'noopener')
  }

  return (
    <Sheet
      open={open}
      title={published ? 'Republier ce jeu' : 'Publier sous un code'}
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!valid || live.length === 0}
          onClick={copy}
        >
          <Icon name="upload" size={18} />
          Copier le contenu du fichier
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Un code court se dicte en classe et se tape dans l’application, sans passer par un lien —
          c’est le seul chemin qui atteigne à coup sûr une application installée sur iPhone.
          {lot
            ? ' Les lots d’un même thème se rejoignent chez l’élève : il reçoit des cartes dans un seul thème, sans voir le découpage.'
            : ''}
        </p>

        <Field
          label="Code"
          hint="Lettres, chiffres et tirets. Il sera lu à voix haute : faites-le parlant."
        >
          <input
            className="input mono"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SVT-2DE-BIO1"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Nom affiché"
          hint="Ce que l’élève verra. Votre thème garde son nom de travail."
        >
          <input
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={deck.name}
          />
        </Field>

        <div className="field">
          <span className="label">Niveau</span>
          <div className="picker">
            {LEVELS.map((item) => (
              <button
                key={item}
                type="button"
                className="chip chip--select mono"
                aria-pressed={level === item}
                onClick={() => setLevel(level === item ? '' : item)}
              >
                {item}
              </button>
            ))}
          </div>
          <span className="meta" style={{ fontSize: 12.5 }}>
            Facultatif, pour le classement du catalogue.
          </span>
        </div>

        <Toggle
          checked={listed}
          onChange={setListed}
          label="Afficher dans le catalogue"
          hint="Décoché, le jeu reste joignable par son code, mais n’apparaît dans aucune liste."
        />

        <div className="card card--pad stack stack-3">
          <div className="row row--between">
            <span className="eyebrow">Fichier à déposer</span>
            <span className="chip mono">
              {live.length} {plural(live.length, 'carte')}
            </span>
          </div>
          <hr className="rule" />
          <div className="row row--between">
            <span className="meta">Chemin</span>
            <span className="mono" style={{ fontSize: 12 }}>
              {normalized ? setPath(normalized) : '—'}
            </span>
          </div>
          <div className="row row--between">
            <span className="meta">Adresse publiée</span>
            <span className="mono truncate" style={{ fontSize: 11 }}>
              {normalized ? setUrl(normalized) : '—'}
            </span>
          </div>
          {published && (
            <>
              <hr className="rule" />
              <div className="row row--between">
                <span className="meta">Dernier dépôt</span>
                <span className={`chip ${stale ? 'chip--warn' : 'chip--ok'} mono`}>
                  {stale
                    ? 'modifié depuis'
                    : new Date(target.publishedAt ?? 0).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={!normalized || !ready || live.length === 0}
          onClick={() => normalized && download(`${normalized}.json`, content, 'application/json')}
        >
          <Icon name="download" size={17} />
          Télécharger le fichier
        </button>

        <Field
          label="Dépôt du projet"
          hint="Là où vit le code — et non un miroir, sous peine de bloquer la recopie."
        >
          <input
            className="input mono"
            style={{ fontSize: 12 }}
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="https://github.com/compte/projet"
            spellCheck={false}
          />
        </Field>

        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={!repo.trim() || !normalized || !ready}
          onClick={openRepo}
        >
          <Icon name="move" size={17} />
          {published ? 'Ouvrir le fichier à remplacer' : 'Ouvrir la page de dépôt'}
        </button>

        <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
          <span className="glyph glyph--warm">
            <Icon name="info" size={18} />
          </span>
          <p className="meta" style={{ lineHeight: 1.55 }}>
            {published
              ? 'Sur la page qui s’ouvre : tout sélectionner, coller, valider. Deux minutes plus tard, le jeu est à jour chez ceux qui l’ont reçu — sans doublon et sans toucher à leur progression.'
              : 'Sur la page qui s’ouvre : nommez le fichier, collez le contenu, validez. La publication prend environ deux minutes.'}{' '}
            Gardez le même code : en changer créerait un second jeu.
          </p>
        </div>
      </div>
    </Sheet>
  )
}
