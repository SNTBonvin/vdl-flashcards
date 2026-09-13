# Note de conception — images et sons sur les cartes

*Écrite le 13 septembre 2026, à la demande de Christophe Bonvin, pour être
reprise plus tard. **Rien n'est implémenté.** La plus-value pédagogique n'est
pas tranchée : c'est la question à régler avant d'écrire une ligne.*

## L'état actuel

Une carte est **trois chaînes de texte** — `front`, `back`, `notes` — et rien
d'autre (`src/db/types.ts`). Aucun champ ne peut porter un fichier.

Trois chemins de diffusion coexistent, et ils ne réagiraient pas de la même
façon à l'arrivée d'un média :

| Chemin | Ce qui voyage | Plafond pratique |
|---|---|---|
| Lien de partage | le jeu compressé **dans l'adresse** | quelques dizaines de Ko |
| QR code projeté | le même lien, encodé | ~2 à 3 Ko |
| Code publié | un fichier JSON servi par le site | aucun, en pratique |

## Ce que ça change, couche par couche

### 1. Le transport

Deux façons de mettre une image dans un jeu publié :

| | Image **dans** le JSON (data URI) | Image **à côté**, référencée |
|---|---|---|
| Poids du fichier | 20 cartes illustrées ≈ 1,8 Mo | reste à ~2 Ko |
| Ce que l'élève télécharge | tout, avant même l'aperçu | le texte, puis les images |
| Mise à jour d'une seule image | réécrit tout le jeu | remplace un fichier |
| Complexité | faible | moyenne |

**Retenir la seconde.** Les médias vont dans `public/media/`, le JSON ne porte
que leurs noms. Le jeton de publication sait déjà déposer du binaire par l'API
Contents (`src/io/github.ts`, `putFile` encode déjà en base64) : « Publier »
pourrait téléverser les images au passage.

### 2. Le hors ligne — le point dur

Le service worker précache l'application, pas des médias arbitraires. La règle
`runtimeCaching` actuelle (`vite.config.ts`) ne couvre que `/c/*.json` et
`catalogue.json`.

Pour tenir la promesse « une fois reçues, les cartes n'ont plus besoin de
réseau », il faut **télécharger les médias au moment de l'import et les ranger
dans IndexedDB**, qui accepte les `Blob`. Un magasin `media` de plus, servi par
`URL.createObjectURL` à l'affichage. C'est la seule solution honnête : compter
sur le cache du navigateur laisserait des cartes muettes en contrôle.

Conséquences : une jauge de place occupée dans les réglages devient nécessaire
(elle existe déjà, elle prendra du sens), et la protection du stockage
(`navigator.storage.persist`) cesse d'être un confort.

### 3. L'asymétrie à accepter d'emblée

**Les cartes illustrées ne pourront voyager que par code publié.** Ni par lien,
ni par QR code : les plafonds ci-dessus l'interdisent. Cela crée deux sortes de
cartes, avec deux façons de les diffuser — c'est le vrai coût de la
fonctionnalité, plus que le code lui-même. Il faudra le dire dans l'interface au
moment du partage, sans quoi un professeur diffusera un lien amputé de ses
images sans s'en apercevoir.

### 4. Le reste

- **Éditeur** : choisir une image depuis un téléphone et la **redimensionner
  automatiquement** (sinon 4 Mo par carte). Cible raisonnable : 800 px de large,
  JPEG qualité 0,75, soit 60 à 80 Ko.
- **Écran de révision** : mise en page du recto avec image, et lisibilité en
  thème sombre.
- **CSV et texte collé ne peuvent rien porter.** Les imports actuels resteraient
  texte ; le paquet JSON pourrait, lui, embarquer les médias.
- **Sauvegarde** : l'export JSON intégral devrait inclure les médias, sous peine
  de perdre les images en changeant de téléphone. Le fichier grossit d'autant.
- **Droits** : une photo trouvée en ligne et redistribuée à une classe engage
  l'enseignant. Un rappel discret à l'ajout serait de mise.

## Proposition, si la décision est prise

Commencer petit, dans cet ordre :

1. **Image seule, au recto seulement**, référencée et non embarquée ;
2. mise en cache dans IndexedDB à l'import ;
3. redimensionnement automatique à l'ajout ;
4. avertissement au partage par lien quand le jeu contient des images.

Le son viendrait ensuite, par le même chemin, s'il se justifie — il concerne
surtout les langues vivantes, moins la SVT et la SNT.

## Ce qui reste à trancher, et qui ne se code pas

La question n'est pas « est-ce faisable » — ça l'est — mais **ce que l'image
apporte à la mémorisation**. Un schéma de SVT à légender, une photo d'espèce à
reconnaître : oui, la question ne peut pas se poser autrement. Une illustration
décorative : non, elle détourne l'attention de l'effort de rappel, qui est tout
le principe de la flashcard.

Le critère de décision devrait être celui-là, carte par carte : **l'image
est-elle la question, ou un ornement ?** Si la réponse est « un ornement » dans
la plupart des cas envisagés, la fonctionnalité coûte plus qu'elle ne rapporte.
