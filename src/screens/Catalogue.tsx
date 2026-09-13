import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { Icon } from '../components/Icon'
import { EmptyState, SectionHead, plural } from '../components/ui'
import { CatalogError, fetchCatalogue, type CatalogueEntry } from '../io/catalog'

/** Ordre scolaire, et non alphabétique : « 1re » vient après « 2de ». */
const LEVEL_ORDER = ['6e', '5e', '4e', '3e', '2de', '1re', 'Tle']

/**
 * Catalogue des jeux publiés.
 *
 * Il ne contient que ce qui est réellement en ligne : l'index est reconstruit
 * à chaque publication, et un jeu publié sans être listé n'y figure pas — il
 * reste joignable par son code. Rien n'est ajouté d'un clic : ouvrir une
 * entrée mène à l'aperçu habituel, et c'est l'élève qui décide.
 */
export function CatalogueScreen() {
  const store = useStore()
  const { navigate } = useRoute()

  const [entries, setEntries] = useState<CatalogueEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [subject, setSubject] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCatalogue()
      .then((list) => {
        if (!cancelled) setEntries(list)
      })
      .catch((e) => {
        if (!cancelled) {
          setEntries([])
          setError(e instanceof CatalogError ? e.message : 'Catalogue indisponible.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Codes déjà reçus : on le signale plutôt que de laisser réimporter à l'aveugle. */
  const received = useMemo(
    () => new Set(store.decks.map((d) => d.setCode).filter(Boolean) as string[]),
    [store.decks],
  )

  const levels = useMemo(() => {
    const found = new Set((entries ?? []).map((e) => e.level).filter(Boolean) as string[])
    return LEVEL_ORDER.filter((l) => found.has(l))
  }, [entries])

  const subjects = useMemo(() => {
    const found = new Set(
      (entries ?? []).filter((e) => !level || e.level === level).map((e) => e.subject),
    )
    return [...found].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [entries, level])

  const visible = (entries ?? []).filter(
    (e) => (!level || e.level === level) && (!subject || e.subject === subject),
  )

  if (entries === null) {
    return (
      <main className="screen stack stack-5">
        <div className="page-title">
          <h1>Catalogue</h1>
        </div>
        <div className="card card--pad">
          <span className="eyebrow">Lecture du catalogue…</span>
        </div>
      </main>
    )
  }

  return (
    <main className="screen stack stack-5">
      <div className="page-title stack" style={{ gap: 4 }}>
        <span className="eyebrow">Jeux publiés</span>
        <h1>Catalogue</h1>
      </div>

      {error && (
        <div className="card card--pad row" data-status="warn" style={{ gap: 12 }}>
          <span className="glyph glyph--warm">
            <Icon name="info" size={18} />
          </span>
          <p className="meta" style={{ lineHeight: 1.55 }}>{error}</p>
        </div>
      )}

      {entries.length === 0 && !error ? (
        <EmptyState
          icon="inbox"
          title="Aucun jeu publié"
          text="Le catalogue liste les jeux mis en ligne par tes professeurs. Un jeu peut aussi être diffusé par un code, sans figurer ici."
          action={
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate({ name: 'library' })}
            >
              Retour aux matières
            </button>
          }
        />
      ) : (
        <>
          {levels.length > 1 && (
            <div className="seg seg--scroll">
              <button
                type="button"
                className="seg__item"
                aria-pressed={level === null}
                onClick={() => {
                  setLevel(null)
                  setSubject(null)
                }}
              >
                Tous
              </button>
              {levels.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="seg__item"
                  aria-pressed={level === item}
                  onClick={() => {
                    setLevel(item)
                    setSubject(null)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {subjects.length > 1 && (
            <div className="picker">
              {subjects.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="chip chip--select"
                  aria-pressed={subject === item}
                  onClick={() => setSubject(subject === item ? null : item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <section className="stack stack-3">
            <SectionHead
              title={`${visible.length} ${plural(visible.length, 'jeu disponible', 'jeux disponibles')}`}
            />
            <div className="card">
              {visible.map((entry) => (
                <button
                  key={entry.code}
                  type="button"
                  className="listrow"
                  onClick={() => navigate({ name: 'set', code: entry.code })}
                >
                  <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                    <span className="listrow__title clamp-2">{entry.deck}</span>
                    {/* Le niveau d'abord : c'est ce qui discrimine, et la
                        ligne est tronquée sur un téléphone. */}
                    <span className="listrow__sub truncate">
                      {entry.level ? `${entry.level} · ` : ''}
                      {entry.subject}
                      {entry.by ? ` · ${entry.by}` : ''}
                    </span>
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    {received.has(entry.code) && <span className="chip chip--ok">reçu</span>}
                    <span className="chip mono">{entry.cards}</span>
                  </span>
                  <Icon name="chevron-right" size={18} />
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="card card--pad row" data-status="run" style={{ gap: 12 }}>
        <span className="glyph glyph--warm">
          <Icon name="info" size={18} />
        </span>
        <p className="meta" style={{ lineHeight: 1.55 }}>
          Ouvrir un jeu n’ajoute rien : tu verras d’abord un aperçu. Une fois reçues, les cartes sont
          sur ton appareil et n’ont plus besoin de réseau.
        </p>
      </div>
    </main>
  )
}
