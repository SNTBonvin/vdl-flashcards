import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { Icon } from './Icon'
import { Field, SectionHead, Sheet, plural, useToast } from './ui'
import { ImportError, parseCardsText, readFile, type ParsedRow } from '../io/transfer'
import { cardKey } from '../io/share'
import type { Card, Deck, Distribution } from '../db/types'

/**
 * Composer un jeu et le publier, en un écran.
 *
 * Le chemin ordinaire — créer la matière, puis le thème, puis ouvrir la fiche,
 * puis importer, puis cocher, puis composer une série, puis publier — demande
 * une dizaine de gestes sur six écrans. Il est juste pour qui range sa propre
 * mémoire ; il est absurde pour qui prépare un lot et le donne le soir même.
 *
 * Ici, on dit où ça va et l'on colle les cartes. Le rangement est déduit : la
 * matière et le thème sont créés s'ils manquent, repris s'ils existent. On
 * enchaîne directement sur la feuille de publication, code déjà proposé.
 *
 * Deux cas, et la différence se voit dans le code produit :
 *
 *  - thème neuf  : il ne contient que ces cartes, on publie **le thème**, sans
 *    série — un code simple, « SVT-BIODIV ».
 *  - thème connu : ces cartes s'y ajoutent et forment **une série**, qui se
 *    publie sous son propre code — c'est le « lot 2 » d'un chapitre entamé.
 */
export type CibleJeu = { deck: Deck; lot?: Distribution; cards: Card[] }

/** Comparaison des noms telle qu'un humain l'entend : la casse et les espaces ne font pas deux matières. */
function memeNom(a: string, b: string): boolean {
  const net = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  return net(a) === net(b) && net(a) !== ''
}

export function NouveauJeuSheet({
  open,
  onClose,
  onReady,
}: {
  open: boolean
  onClose: () => void
  /** Le jeu est prêt : à l'appelant d'ouvrir la publication. */
  onReady: (cible: CibleJeu) => void
}) {
  const store = useStore()
  const toast = useToast()
  const [matiere, setMatiere] = useState('')
  const [theme, setTheme] = useState('')
  const [text, setText] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setMatiere('')
    setTheme('')
    setText('')
    setErreur(null)
    setBusy(false)
  }, [open])

  const parsed = useMemo(() => {
    if (!text.trim()) return { rows: [] as ParsedRow[], error: null as string | null }
    try {
      return { rows: parseCardsText(text), error: null }
    } catch (e) {
      return { rows: [], error: e instanceof ImportError ? e.message : 'Fichier illisible.' }
    }
  }, [text])

  /** Matière et thème reconnus, s'ils existent déjà : tout le reste en découle. */
  const matiereConnue = store.subjects.find((s) => memeNom(s.name, matiere)) ?? null
  const themesDeLaMatiere = matiereConnue
    ? (store.decksBySubject.get(matiereConnue.id) ?? [])
    : []
  const themeConnu = themesDeLaMatiere.find((d) => memeNom(d.name, theme)) ?? null

  /**
   * Cartes à créer. Deux écrémages : les rectos répétés dans le collage lui-même,
   * et ceux qui existent déjà dans le thème — rediffuser un lot corrigé ne doit
   * pas empiler des jumelles.
   */
  const tri = useMemo(() => {
    const dejaLa = new Set(
      themeConnu
        ? (store.cardsByDeck.get(themeConnu.id) ?? []).map((c) => cardKey(c.front))
        : [],
    )
    const vues = new Set<string>()
    const neuves: ParsedRow[] = []
    let repetees = 0
    let presentes = 0
    for (const row of parsed.rows) {
      const clef = cardKey(row.front)
      if (!clef) continue
      if (vues.has(clef)) {
        repetees += 1
        continue
      }
      vues.add(clef)
      if (dejaLa.has(clef)) {
        presentes += 1
        continue
      }
      neuves.push(row)
    }
    return { neuves, repetees, presentes }
  }, [parsed.rows, themeConnu, store.cardsByDeck])

  const pret = matiere.trim() !== '' && theme.trim() !== '' && tri.neuves.length > 0 && !busy

  const creer = async () => {
    if (!pret) return
    setBusy(true)
    try {
      const subject = matiereConnue ?? (await store.createSubject(matiere.trim()))
      const neuf = themeConnu === null
      const deck = themeConnu ?? (await store.createDeck(subject.id, theme.trim()))
      const creees = await store.createCards(deck.id, tri.neuves)

      if (neuf) {
        // Le thème n'existe que de ces cartes : c'est lui qu'on publie.
        onReady({ deck, cards: creees })
      } else {
        const rang = (store.distributionsByDeck.get(deck.id) ?? []).length + 1
        const lot = await store.createDistribution(
          deck.id,
          `Série ${rang}`,
          creees.map((c) => c.id),
        )
        onReady({ deck, lot, cards: creees })
      }
      toast(`${creees.length} ${plural(creees.length, 'carte créée', 'cartes créées')}.`)
    } catch {
      setErreur('Création impossible.')
      setBusy(false)
    }
  }

  const choisirFichier = async (file: File | undefined) => {
    if (!file) return
    try {
      setText(await readFile(file))
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof ImportError ? e.message : 'Lecture du fichier impossible.')
    }
  }

  return (
    <Sheet
      open={open}
      title="Nouveau jeu"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!pret}
          onClick={creer}
        >
          {busy ? 'Création…' : 'Créer et publier'}
        </button>
      }
    >
      <div className="stack stack-5">
        <p className="meta" style={{ lineHeight: 1.6 }}>
          Dis où vont ces cartes et colle-les. La matière et le thème sont créés s’ils n’existent
          pas, repris sinon. La feuille de publication s’ouvre ensuite, le code déjà proposé.
        </p>

        <Field label="Matière" hint="Une des tiennes, ou un nom neuf.">
          <input
            className="input"
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
            placeholder="Sciences numériques et technologie"
            autoFocus
          />
        </Field>
        {store.subjects.length > 0 && (
          <div className="picker" style={{ marginTop: -8 }}>
            {store.subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip chip--select"
                aria-pressed={matiereConnue?.id === s.id}
                onClick={() => setMatiere(s.name)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <Field label="Thème" hint="Un chapitre. Neuf, ou un que tu complètes.">
          <input
            className="input"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Le web"
          />
        </Field>
        {themesDeLaMatiere.length > 0 && (
          <div className="picker" style={{ marginTop: -8 }}>
            {themesDeLaMatiere.map((d) => (
              <button
                key={d.id}
                type="button"
                className="chip chip--select"
                aria-pressed={themeConnu?.id === d.id}
                onClick={() => setTheme(d.name)}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="upload" size={18} />
          Choisir un fichier
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.tsv,.txt,.json,text/plain,text/csv,application/json"
          hidden
          onChange={(e) => void choisirFichier(e.target.files?.[0])}
        />

        <Field label="Ou colle tes cartes" hint="Une par ligne : le recto, puis le verso, séparés par un point-virgule.">
          <textarea
            className="textarea mono"
            style={{ minHeight: 150, fontSize: 13 }}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setErreur(null)
            }}
            placeholder={'À quoi sert HTML ?;À structurer une page\nÀ quoi sert CSS ?;À la mettre en forme'}
          />
        </Field>

        {(erreur || parsed.error) && (
          <div className="card card--pad" data-status="err">
            <span className="meta" style={{ color: 'var(--err)' }}>
              {erreur ?? parsed.error}
            </span>
          </div>
        )}

        {/* Ce qui va se passer, dit avant qu'on appuie : créer une matière par
            inadvertance, parce qu'une majuscule diffère, se répare mal. */}
        {(matiere.trim() || theme.trim()) && (
          <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
            <span className="glyph glyph--warm">
              <Icon name="info" size={18} />
            </span>
            <p className="meta" style={{ lineHeight: 1.55 }}>
              {themeConnu
                ? `« ${themeConnu.name} » existe déjà : ces cartes s’y ajouteront et formeront une série, publiable sous son propre code.`
                : matiereConnue
                  ? `La matière « ${matiereConnue.name} » existe ; le thème « ${theme.trim() || '…'} » sera créé.`
                  : `La matière « ${matiere.trim() || '…'} » et le thème « ${theme.trim() || '…'} » seront créés.`}
            </p>
          </div>
        )}

        {tri.neuves.length > 0 && (
          <div className="stack stack-3">
            <SectionHead
              title={`Aperçu · ${tri.neuves.length} ${plural(tri.neuves.length, 'carte')}`}
              aside={
                tri.repetees + tri.presentes > 0 ? (
                  <span className="chip chip--warn">
                    {tri.repetees + tri.presentes} écartée
                    {tri.repetees + tri.presentes > 1 ? 's' : ''}
                  </span>
                ) : null
              }
            />
            <div className="card">
              {tri.neuves.slice(0, 5).map((row, index) => (
                <div key={index} className="listrow" style={{ cursor: 'default' }}>
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="listrow__title truncate">{row.front}</span>
                    <span className="listrow__sub truncate">{row.back}</span>
                  </span>
                </div>
              ))}
              {tri.neuves.length > 5 && (
                <div className="listrow" style={{ cursor: 'default' }}>
                  <span className="meta mono">+ {tri.neuves.length - 5} autres</span>
                </div>
              )}
            </div>
            {tri.repetees + tri.presentes > 0 && (
              <p className="meta" style={{ lineHeight: 1.55 }}>
                {tri.repetees > 0 &&
                  `${tri.repetees} ${plural(tri.repetees, 'ligne répétée', 'lignes répétées')} dans le collage. `}
                {tri.presentes > 0 &&
                  `${tri.presentes} ${plural(tri.presentes, 'carte déjà', 'cartes déjà')} dans ce thème. `}
                Ces rectos ne seront pas créés en double.
              </p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}
