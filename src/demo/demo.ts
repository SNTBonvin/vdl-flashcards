/**
 * Exemple de démonstration.
 *
 * Les identifiants sont **réservés et fixes** : c'est ce qui permet de retirer
 * l'exemple d'un seul geste, en supprimant exactement ce qui a été créé et
 * rien d'autre. Aucune matière de l'utilisateur ne peut porter ces
 * identifiants, qui ne sont jamais produits par le générateur aléatoire.
 *
 * Les cartes portent sur l'application elle-même : les réviser apprend à s'en
 * servir. L'exemple est donc à la fois une démonstration et un tutoriel.
 */

export const DEMO_SUBJECT_ID = 'demo-matiere-exemple'
export const DEMO_DECK_ID = 'demo-theme-exemple'

export const DEMO_SUBJECT_NAME = 'Démonstration'
export const DEMO_SUBJECT_CODE = 'DEM'
export const DEMO_DECK_NAME = 'Prise en main'
export const DEMO_DECK_DESCRIPTION =
  'Sept cartes pour découvrir l’application en la révisant. Supprimez ce thème quand vous n’en aurez plus besoin.'

export const DEMO_CARDS: { front: string; back: string; notes?: string }[] = [
  {
    front: 'Que se passe-t-il quand je rate une carte ?',
    back: 'Elle revient dans la séance en cours, puis plus tôt que les autres.',
    notes:
      'À l’inverse, une carte réussie s’espace de plus en plus : un jour, puis quelques jours, puis quelques semaines.',
  },
  {
    front: 'À quoi sert le mode « Interrogation » ?',
    back: 'À réviser tout un thème, que les cartes soient échues ou non.',
    notes: 'On peut y mélanger plusieurs thèmes, et même plusieurs matières.',
  },
  {
    front: 'Comment ajouter mes propres cartes ?',
    back: 'Ouvrez un thème, puis « Ajouter une carte ».',
    notes:
      'Pour en créer plusieurs d’un coup, « Importer » accepte une liste collée : une carte par ligne, recto et verso séparés par un point-virgule ou une tabulation.',
  },
  {
    front: 'Comment transmettre un thème à mes élèves ?',
    back: 'Avec « Partager ce thème » : un lien à coller, ou un QR code à projeter.',
    notes:
      'Le jeu de cartes voyage dans le lien lui-même : rien n’est déposé sur un serveur.',
  },
  {
    front: 'Mes cartes partent-elles sur un serveur ?',
    back: 'Non. Tout reste sur cet appareil.',
    notes:
      'Pour changer de téléphone, utilisez « Exporter la sauvegarde » dans les réglages, puis « Restaurer » sur le nouvel appareil.',
  },
  {
    front: 'Que veut dire « archiver » une carte ?',
    back: 'Elle sort de la liste et n’est plus proposée en révision, sans être supprimée.',
    notes: 'C’est réversible : le filtre « Archivées » permet de la reprendre.',
  },
  {
    front: 'Comment installer l’application sur mon téléphone ?',
    back: 'Android : menu du navigateur, puis « Installer ». iPhone : Partager, puis « Sur l’écran d’accueil ».',
    notes:
      'Une fois installée, elle fonctionne hors ligne — et sur iPhone, c’est nécessaire pour recevoir les rappels.',
  },
]
