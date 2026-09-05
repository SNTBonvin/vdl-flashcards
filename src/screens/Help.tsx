import { useState, type ReactNode } from 'react'
import { useStore } from '../state/store'
import { useRoute } from '../lib/router'
import { Icon, type IconName } from '../components/Icon'
import { ConfirmSheet, SectionHead, useToast, plural } from '../components/ui'
import { DEMO_DECK_ID, DEMO_DECK_NAME } from '../demo/demo'

/**
 * Prise en main, dans l'application.
 *
 * Le même contenu existe en Markdown dans TUTORIEL.md, à destination de
 * quelqu'un qui découvre le dépôt. Les deux se recoupent volontairement : on ne
 * lit pas un fichier du dépôt depuis son téléphone, et on ne découvre pas un
 * projet depuis un écran d'application.
 */
export function HelpScreen() {
  const store = useStore()
  const toast = useToast()
  const { navigate } = useRoute()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const demoCards = store.cardsByDeck.get(DEMO_DECK_ID)?.length ?? 0

  return (
    <main className="screen stack stack-6">
      {/* La barre supérieure affiche déjà « Prise en main » : pas d'eyebrow ici. */}
      <div className="page-title">
        <h1>Comment ça marche</h1>
      </div>

      {/* ---- Exemple, en tête : on apprend mieux en manipulant ---- */}
      <section className="card card--pad stack stack-4" data-status={store.hasDemo ? 'run' : 'ok'}>
        <div className="row">
          <span className="glyph glyph--lg">
            <Icon name="sparkle" size={21} />
          </span>
          <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
            <h2>Découvrir avec un exemple</h2>
            <span className="meta">
              {store.hasDemo
                ? `« ${DEMO_DECK_NAME} » est installé — ${demoCards} ${plural(demoCards, 'carte')}.`
                : 'Une matière et sept cartes, créées en un clic.'}
            </span>
          </div>
        </div>

        <p className="meta" style={{ lineHeight: 1.6 }}>
          Les cartes de l’exemple portent sur l’application elle-même : les réviser vous apprend à
          vous en servir. Vous pourrez tout retirer d’un seul geste, sans toucher à vos propres
          matières.
        </p>

        {store.hasDemo ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => navigate({ name: 'deck', id: DEMO_DECK_ID })}
            >
              Ouvrir l’exemple
            </button>
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => setConfirming(true)}
            >
              <Icon name="trash" size={17} />
              Retirer l’exemple
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                const deckId = await store.installDemo()
                toast('Exemple ajouté.')
                navigate({ name: 'deck', id: deckId })
              } catch {
                toast('Création de l’exemple impossible.', 'error')
              } finally {
                setBusy(false)
              }
            }}
          >
            <Icon name="plus" size={18} />
            Ajouter l’exemple
          </button>
        )}
      </section>

      <Step
        icon="library"
        title="1. Ranger"
        text="Une matière contient des thèmes, un thème contient des cartes. Créez d’abord une matière — Histoire-Géographie, Anglais — puis un thème par chapitre."
      />

      <Step
        icon="plus"
        title="2. Remplir"
        text="« Ajouter une carte » pour une carte à la fois. « Importer » pour en coller plusieurs : une par ligne, recto et verso séparés par un point-virgule ou une tabulation. C’est ce qui permet de rédiger dans un tableur et de tout coller d’un coup."
      />

      <Step
        icon="review"
        title="3. Réviser"
        text="Répondez « Raté », « Difficile » ou « Su ». Une carte ratée revient tout de suite ; une carte sue s’espace de plus en plus. L’échéance calculée est affichée sur chaque bouton avant que vous répondiez."
      />

      <Step
        icon="shuffle"
        title="Trois modes de séance"
        text="« Programmé » ne propose que les cartes échues du jour. « Interrogation » interroge sur tout un thème, échéances ou non, et peut mélanger plusieurs thèmes. « Difficiles » ne reprend que les cartes déjà ratées."
      />

      <Step
        icon="move"
        title="Partager un thème"
        text="Le bouton « Partager ce thème » produit un lien à coller dans l’ENT, et un QR code à projeter quand le jeu est assez court. Le jeu de cartes voyage dans le lien : rien n’est déposé sur un serveur. Si vous corrigez une faute plus tard, rediffusez le lien — chez l’élève le thème sera mis à jour, sans doublon, et sa progression conservée."
      />

      <Step
        icon="bell"
        title="Se faire rappeler"
        text="Chaque thème peut avoir son rappel : une heure et des jours de la semaine. Sur iPhone, l’application doit être installée sur l’écran d’accueil pour que les notifications fonctionnent."
      />

      <Step
        icon="download"
        title="Vos données"
        text="Tout est stocké sur cet appareil, hors ligne : aucun compte, aucun serveur, aucune requête vers un service tiers. Pour changer de téléphone, exportez la sauvegarde depuis les réglages, puis restaurez-la sur le nouvel appareil."
      />

      <Step
        icon="today"
        title="Installer sur le téléphone"
        text="Android : menu du navigateur, puis « Installer l’application ». iPhone : Partager, puis « Sur l’écran d’accueil ». Une fois installée, elle fonctionne sans réseau."
      />

      <section className="stack stack-3">
        <SectionHead title="Aller plus loin" />
        <div className="card card--pad">
          <p className="meta" style={{ lineHeight: 1.6 }}>
            Le fonctionnement de la répétition espacée est détaillé dans les réglages, à la rubrique
            « La répétition espacée ».
          </p>
        </div>
      </section>

      <ConfirmSheet
        open={confirming}
        title="Retirer l’exemple ?"
        text={`La matière « Démonstration », son thème et ses ${demoCards} ${plural(demoCards, 'carte')} seront supprimés. Vos propres matières ne sont pas concernées. Attention : si vous avez ajouté vos cartes à ce thème, elles partiront aussi.`}
        confirmLabel="Retirer"
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          await store.removeDemo()
          toast('Exemple retiré.')
        }}
      />
    </main>
  )
}

function Step({ icon, title, text }: { icon: IconName; title: string; text: ReactNode }) {
  return (
    <section className="card card--pad stack stack-3">
      <div className="row">
        <span className="glyph">
          <Icon name={icon} size={18} />
        </span>
        <h3 className="grow">{title}</h3>
      </div>
      <p style={{ color: 'var(--ink-2)', fontSize: 14.5, lineHeight: 1.65 }}>{text}</p>
    </section>
  )
}
