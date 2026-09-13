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
          Les cartes de l’exemple portent sur l’application elle-même : les réviser t’apprend à
          t’en servir. Tu pourras tout retirer d’un seul geste, sans toucher à tes propres
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
        text="Une matière contient des thèmes, un thème contient des cartes. Crée d’abord une matière — Histoire-Géographie, Anglais — puis un thème par chapitre."
      />

      <Step
        icon="plus"
        title="2. Remplir"
        text="« Ajouter une carte » pour une carte à la fois. « Importer » pour en coller plusieurs : une par ligne, recto et verso séparés par un point-virgule ou une tabulation. C’est ce qui permet de rédiger dans un tableur et de tout coller d’un coup."
      />

      <Step
        icon="inbox"
        title="Réserve et reprise"
        text="« Ajouter une carte » puis « Reprendre une carte que j’ai déjà » recopie une carte écrite ailleurs, sans ressaisie. Et un thème coché « de réserve » sert de vivier : ses cartes attendent d’être affectées, sans jamais être proposées en révision."
      />

      <Step
        icon="review"
        title="3. Réviser"
        text="Réponds « Raté », « Difficile » ou « Su ». Une carte ratée revient tout de suite ; une carte sue s’espace de plus en plus. L’échéance calculée est affichée sur chaque bouton avant que tu répondes."
      />

      <Step
        icon="shuffle"
        title="Trois modes de séance"
        text="« À revoir » ne propose que les cartes mûres du jour, plus quelques neuves : c’est la séance quotidienne. « Tout revoir » interroge sur tout un thème, échéances ou non, et peut en mélanger plusieurs — utile avant un contrôle. « Mes difficultés » ne reprend que les cartes déjà ratées."
      />

      <Step
        icon="move"
        title="Partager un thème"
        text="Le bouton « Partager ce thème » produit un lien à coller dans l’ENT, et un QR code à projeter quand le jeu est assez court. Le jeu de cartes voyage dans le lien : rien n’est déposé sur un serveur. Si tu corriges une faute plus tard, rediffuse le lien — chez l’élève le thème sera mis à jour, sans doublon, et sa progression conservée. Pour ouvrir un lien ou un code reçu : « Matières › Lien ou code » — sur iPhone, c’est le seul chemin qui mène à l’application installée."
      />

      <Step
        icon="today"
        title="À savoir pour quand ?"
        text="Quand tu ajoutes des cartes reçues, un champ « À savoir pour le » te propose de dire pour quand il faut les savoir — la date de ton contrôle, telle qu’elle est sur ton cahier de textes. Ce n’est pas obligatoire. Si tu la mets, chacune de ces cartes te sera proposée la veille au plus tard, même si son tour n’était pas encore venu. Une fois la date passée, elles reprennent leur rythme normal. Tu peux la changer ou la retirer à tout moment : bandeau du thème, bouton « Modifier »."
      />

      <Step
        icon="layers"
        title="Les séries"
        text="Une série est une sélection de cartes d’un même thème, gardée sous la main. Elle sert à deux choses : se fixer une échéance — « ces quinze cartes, pour vendredi » — et diffuser une partie d’un thème sans tout donner d’un coup. Coche des cartes, puis « Créer une série ». Chez celui qui la reçoit, les séries d’un même thème se rejoignent dans ce thème."
      />

      <Step
        icon="today"
        title="Planifier ses révisions"
        text="Dans un thème, « Planifier mes révisions » propose des rendez-vous suivant la courbe de l’oubli — demain, dans une semaine, dans un mois, dans six mois — et les dépose dans l’agenda du téléphone. C’est le seul rappel qui sonne même application fermée : une page web ne peut pas programmer une notification à l’avance."
      />

      <Step
        icon="upload"
        title="Publier sous un code"
        text="La publication est masquée par défaut : active « Outils d’enseignant » dans les réglages. « Matières › Parcourir le catalogue » liste les jeux publiés, par niveau et par matière. « Publier » prépare un fichier et un code court — « SVT-2DE-BIO1 » — à déposer sur la forge. L’élève tape ce code dans l’application, sans lien ni QR code : c’est le chemin le plus sûr, surtout sur iPhone. Republier sous le même code met le jeu à jour chez ceux qui l’ont déjà reçu."
      />

      <Step
        icon="bell"
        title="Se faire rappeler"
        text="Chaque thème peut avoir son rappel : une heure et des jours de la semaine. Sur iPhone, l’application doit être installée sur l’écran d’accueil pour que les notifications fonctionnent."
      />

      <Step
        icon="download"
        title="Tes données"
        text="Tout est stocké sur cet appareil, hors ligne : aucun compte, aucun serveur, aucune requête vers un service tiers. Pour changer de téléphone, exporte la sauvegarde depuis les réglages. Pour donner ou retravailler un jeu de cartes, exporte plutôt un paquet — depuis un thème, une matière ou une série, en CSV pour le tableur ou en JSON pour le réimporter ici."
      />

      <Step
        icon="today"
        title="Installer sur le téléphone"
        text="Android : menu du navigateur, puis « Installer l’application ». iPhone : Partager, puis « Sur l’écran d’accueil ». Une fois installée, elle fonctionne sans réseau."
      />

      {/* ---- Pourquoi ça marche : la méthode avant l'outil ---- */}
      <section className="stack stack-3">
        <SectionHead title="Pourquoi ça marche" />

        <div className="card card--pad stack stack-4" style={{ lineHeight: 1.65 }}>
          <p style={{ color: 'var(--ink-2)', fontSize: 14.5 }}>
            Relire ses cours donne le sentiment de savoir, sans le savoir : on reconnaît le texte,
            on ne le retrouve pas. C’est ce que les neurosciences appellent l’illusion de
            l’apprentissage. Une flashcard fait l’inverse — elle oblige à <strong>retrouver</strong>{' '}
            la réponse, et c’est cet effort qui fixe.
          </p>

          <hr className="rule" />

          <div className="stack stack-3">
            <span className="eyebrow">Quatre principes, et ce que l’application en fait</span>

            <p className="meta" style={{ lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ink)' }}>Se tester plutôt que relire.</strong> Chaque
              carte pose une question et cache la réponse : impossible de survoler. C’est l’effet
              de test, l’un des plus solidement établis en psychologie cognitive.
            </p>

            <p className="meta" style={{ lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ink)' }}>Espacer plutôt que masser.</strong> On oublie
              massivement dans les premiers jours — c’est la courbe de l’oubli d’Ebbinghaus. Chaque
              rappel l’aplatit. L’application calcule donc quand chaque carte doit revenir :
              demain si elle a résisté, dans un mois si elle est acquise. Une heure étalée sur
              quatre séances vaut mieux que quatre heures d’affilée.
            </p>

            <p className="meta" style={{ lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ink)' }}>Revenir sur l’ancien.</strong> Réviser le
              seul chapitre en cours ne suffit pas : ce sont les retours sur les chapitres
              antérieurs qui installent durablement. L’écran « Aujourd’hui » propose de lui-même de
              rouvrir un thème laissé de côté depuis trois semaines.
            </p>

            <p className="meta" style={{ lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ink)' }}>Une idée par carte.</strong> Une carte qui
              contient deux notions n’en fixe aucune. Recto court, verso précis : l’éditeur le
              rappelle et signale les cartes devenues trop longues.
            </p>
          </div>

          <hr className="rule" />

          <p className="meta" style={{ lineHeight: 1.6 }}>
            Fabriquer soi-même ses cartes est en soi un travail d’apprentissage : reformuler, c’est
            déjà mémoriser. Recevoir un jeu de son professeur et y ajouter les siennes est le
            meilleur des deux mondes — et c’est exactement ce que l’application permet.
          </p>
        </div>

        <div className="card card--pad stack stack-3">
          <span className="eyebrow">Voir sa propre courbe</span>
          <p className="meta" style={{ lineHeight: 1.6 }}>
            L’écran Statistiques trace, à partir de tes révisions, ton taux de réussite selon le
            temps écoulé depuis la dernière reprise. Là où la barre s’effondre, l’intervalle est
            devenu trop long : c’est le signal qu’il faut resserrer le rythme.
          </p>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => navigate({ name: 'stats' })}
          >
            <Icon name="chart" size={18} />
            Voir mes courbes
          </button>
        </div>

        <div className="card card--pad stack stack-3">
          <span className="eyebrow">Sources</span>
          <p className="meta" style={{ lineHeight: 1.6 }}>
            Ces principes sont ceux exposés par la DRANE de Bourgogne-Franche-Comté, «&nbsp;Travailler
            la mémorisation active avec des flashcards&nbsp;», et par l’académie de Lille,
            «&nbsp;Processus de mémorisation et flashcards&nbsp;». Le rythme des reprises proposé par
            l’application — demain, une semaine, un mois, six mois — reprend celui de la courbe de
            l’oubli qu’elles décrivent.
          </p>
        </div>
      </section>

      <section className="stack stack-3">
        <SectionHead title="Aller plus loin" />
        <div className="card card--pad">
          <p className="meta" style={{ lineHeight: 1.6 }}>
            Le détail du calcul des intervalles est dans les réglages, à la rubrique « La
            répétition espacée ».
          </p>
        </div>
      </section>

      <ConfirmSheet
        open={confirming}
        title="Retirer l’exemple ?"
        text={`La matière « Démonstration », son thème et ses ${demoCards} ${plural(demoCards, 'carte')} seront supprimés. Tes propres matières ne sont pas concernées. Attention : si tu as ajouté tes cartes à ce thème, elles partiront aussi.`}
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
