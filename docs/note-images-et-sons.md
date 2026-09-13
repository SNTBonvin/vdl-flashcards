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

### 1. Le transport — l'image embarquée l'emporte

*Révision du 13 septembre, après une remarque de Christophe Bonvin, qui
signalait l'outil de la forge éducative convertissant les images en base64
(`edu-md.forge.apps.education.fr/inserer-image.html`). La première version de
cette note recommandait l'image **référencée**. C'était une erreur
d'appréciation : l'image **embarquée en base64 dans la carte** est le meilleur
premier pas, et pour une raison de fond plus que de commodité.*

**L'image devient une donnée de la carte, pas une ressource externe.** Six
problèmes disparaissent d'un coup :

| Problème avec l'image référencée | Avec le base64 dans la carte |
|---|---|
| Télécharger et ranger les médias à l'import | **rien à faire** : l'image arrive avec le texte |
| Magasin `media` dans IndexedDB, `URL.createObjectURL` | inutile |
| Règle `runtimeCaching` supplémentaire dans le service worker | inutile |
| Sauvegarde JSON qui perdrait les images | elle les emporte d'elle-même |
| Fichiers orphelins dans `public/media/` à la suppression d'une carte | n'existent pas |
| Téléverser les médias en plus du JSON à la publication | un seul fichier, comme aujourd'hui |

Le hors ligne, que cette note désignait comme « le point dur », cesse d'être un
sujet : il n'y a plus rien à mettre en cache, rien à aller chercher, rien qui
puisse manquer le jour du contrôle.

### 2. Le prix : +33 %, et un facteur 57 entre le bon et le mauvais usage

Le base64 coûte exactement un tiers de plus que le binaire. Tout se joue sur ce
qu'on encode :

| | binaire | base64 | 5 cartes | 30 cartes |
|---|---:|---:|---:|---:|
| Photo de téléphone brute | 4 000 Ko | 5 333 Ko | **27 Mo** | **160 Mo** |
| Redimensionnée 1600 px, JPEG 0,8 | 250 Ko | 333 Ko | 1,7 Mo | 10 Mo |
| **Schéma 800 px, JPEG 0,75** | **70 Ko** | **93 Ko** | **0,5 Mo** | 2,8 Mo |
| Schéma 800 px, WebP 0,75 | 40 Ko | 53 Ko | 0,3 Mo | 1,6 Mo |

Entre la première ligne et la troisième, un facteur 57. **Le redimensionnement
automatique n'est donc pas un confort mais la condition de viabilité** : sans
lui, la première photo ajoutée depuis un téléphone rend le jeu indistribuable.

Cible : 800 px de large, JPEG qualité 0,75, plafond dur par carte (300 Ko de
base64) avec refus explicite au-delà. Et, à la publication, afficher le poids du
fichier produit en avertissant au-delà du mégaoctet.

### 2 bis. Trois pièges à connaître

**L'outil edu-md ne sert pas tel quel.** Il produit du *markdown* :
`![](data:image/png;base64,…)`. L'application affiche du texte brut — aucun
rendu markdown nulle part, le recto est un simple `<p>{question}</p>`
(`src/screens/Review.tsx`). Coller cette sortie afficherait quatre-vingt-dix
kilo-octets de charabia. Il faut donc **un champ `image` dédié sur la carte**,
pas un balisage dans le texte. C'est aussi plus sûr : rendre du markdown
ouvrirait la porte à bien autre chose qu'une image.

**Refuser le SVG.** Un `data:` URI en PNG, JPEG ou WebP est inerte dans une
balise `img`. Un SVG, non : il peut porter du script. Liste blanche stricte des
types acceptés — nécessité, pas précaution, dès lors qu'on accepte une chaîne
collée depuis l'extérieur.

**La vérification silencieuse relit le fichier publié** une fois par heure et
par thème (`src/io/updates.ts`, ajoutée le 12 septembre). Sur un fichier devenu
gros, ce serait coûteux — sauf que `fetchSet` demande `cache: 'no-cache'`, ce
qui revalide et se contente d'un `304 Not Modified` tant que rien n'a bougé : le
corps n'est pas retransmis. **Mais cela dépend des en-têtes de l'hébergeur** :
à vérifier sur la Forge et sur Netlify avant de laisser grossir les fichiers.

### 3. L'asymétrie à accepter d'emblée

**Les cartes illustrées ne pourront voyager que par code publié.** Ni par lien,
ni par QR code : les plafonds ci-dessus l'interdisent. Cela crée deux sortes de
cartes, avec deux façons de les diffuser — c'est le vrai coût de la
fonctionnalité, plus que le code lui-même. Il faudra le dire dans l'interface au
moment du partage, sans quoi un professeur diffusera un lien amputé de ses
images sans s'en apercevoir.

### 4. Le reste

- **Éditeur** : choisir une image depuis un téléphone et la redimensionner sans
  rien demander. Se fait en `canvas` + `toDataURL`, sans bibliothèque.
- **Écran de révision** : mise en page du recto avec image, et lisibilité en
  thème sombre.
- **CSV et texte collé ne peuvent rien porter** — un champ de 93 Ko dans une
  cellule de tableur est inexploitable. Ces imports resteraient texte ; le
  paquet JSON, lui, emporte les images sans rien changer à son format.
- **Sauvegarde** : elle emporte les images d'elle-même, puisque ce sont des
  champs de carte. Le fichier grossit d'autant — la jauge de place des réglages
  prend enfin tout son sens.
- **Droits** : une photo trouvée en ligne et redistribuée à une classe engage
  l'enseignant. Un rappel discret à l'ajout serait de mise.

## Proposition, si la décision est prise

Commencer petit, dans cet ordre :

1. **un champ `image` sur la carte**, contenant un `data:` URI — PNG, JPEG ou
   WebP, jamais SVG — affiché au recto seulement ;
2. **redimensionnement automatique** à l'ajout, avec plafond dur. C'est l'étape
   qui décide de tout : sans elle, rien ne tient ;
3. affichage du poids du jeu dans la feuille de publication ;
4. avertissement au partage par lien quand le jeu contient des images, puisque
   le lien ne peut pas les porter.

Ce que cet ordre évite : le magasin de médias, la règle de cache, le
téléversement séparé, la reprise du format de sauvegarde. Rien de tout cela
n'est nécessaire tant que l'image vit dans la carte.

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
