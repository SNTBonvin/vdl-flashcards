# Note de conception — images et sons sur les cartes

*Écrite le 13 septembre 2026, à la demande de Christophe Bonvin, pour être
reprise plus tard. **Rien n'est implémenté.** La plus-value pédagogique n'est
pas tranchée : c'est la question à régler avant d'écrire une ligne.*

*La note a été révisée deux fois le même jour, au fil des questions posées. Les
sections sont laissées dans leur ordre d'écriture pour que le raisonnement reste
lisible, mais **c'est « Les trois options, comparées » qui fait foi** : les
sections antérieures concluent sur une comparaison à deux termes qu'elle
remplace.*

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

### 1. Le transport — ce que l'image embarquée fait disparaître

> **Attention en relisant :** cette section a été écrite avant la comparaison
> des trois options, plus bas, qui en révise la conclusion. Elle reste juste sur
> ce que le base64 supprime ; elle surévalue en revanche le coût du hors ligne
> pour une image référencée. Lire « Les trois options, comparées » avant de
> décider.

*Écrit après une remarque de Christophe Bonvin signalant l'outil de la forge
éducative qui convertit les images en base64
(`edu-md.forge.apps.education.fr/inserer-image.html`).*

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

## Les trois options, comparées

*Ajouté le 13 septembre, sur une question de Christophe Bonvin : « et si on
n'acceptait que des URL d'images hébergées ? » Cette question fait apparaître
une troisième voie, et oblige à corriger deux estimations de cette note.*

Il faut d'abord séparer deux choses que « URL hébergée » recouvre, et qui n'ont
rien à voir :

- **B. URL sur le domaine de l'application** — l'image vit dans `public/media/`
  du dépôt, déployée avec le site ;
- **C. URL sur un hébergeur tiers** — le WordPress du lycée, un nuage, un site
  quelconque.

| | **A. Base64 dans la carte** | **B. URL même domaine** | **C. URL tierce** |
|---|---|---|---|
| Requête vers un tiers | aucune | aucune | **une par affichage** |
| Hors ligne | acquis d'office | préchargement à l'import | **perdu** |
| Lien de partage et QR code | **impossibles** | l'adresse tient (~80 car.) | l'adresse tient |
| Historique git par republication | +3 Mo à chaque fois | l'image n'est stockée qu'une fois | rien |
| Retéléchargement élève à chaque correction | **tout le jeu** | le texte seul | le texte seul |
| Lien mort possible | non | non (versionné avec le site) | **oui, un jour** |
| Sauvegarde autonome | oui, pixels compris | non (elle porte l'adresse) | non |
| Effort d'écriture | ~1 journée | ~1 journée | ~2 heures |

### Pourquoi l'option C est à écarter

Elle est de loin la moins chère à écrire, et c'est son seul avantage.

**Elle défait la promesse centrale de l'application.** Aujourd'hui aucune
requête ne part vers un service tiers, et un contrôle automatisé
(`privacy-check`) le vérifie à chaque passage. Une image hébergée ailleurs veut
dire que **le téléphone de chaque élève contacte ce serveur chaque fois que la
carte se présente en révision**. Le serveur y voit une adresse IP, une date, une
heure, et *quelle carte était révisée*. Sur le WordPress de l'établissement, ce
sont les journaux du lycée qui enregistreraient l'activité de révision des
élèves. C'est précisément le suivi que ce projet refuse par construction depuis
le premier jour.

Le reste suit : **le hors ligne disparaît** (une image non chargée laisse un
trou), et **les liens meurent** — une image déplacée, un site réorganisé, un
compte fermé, et la carte est cassée des années plus tard, sans que l'auteur
s'en aperçoive puisque son propre cache la lui montre encore.

### L'option B mérite d'être reprise au sérieux

En comparant les trois, **deux estimations de cette note se révèlent fausses**,
et toutes deux en défaveur du base64 :

**1. J'avais surévalué le coût du hors ligne pour une image référencée.** La
première version parlait d'un magasin `media` dans IndexedDB, de `Blob` et de
`URL.createObjectURL`. C'est inutile pour une image du même domaine : l'API
`Cache` est faite pour cela. Un `caches.open('media').then(c => c.addAll(urls))`
au moment de l'import — une quinzaine de lignes — et le service worker sert les
images hors ligne sans que la page ait à le savoir. Le `<img src="/media/x.jpg">`
fonctionne tel quel. C'est bien plus léger que ce que j'ai écrit.

**2. Le base64 a deux factures différées, que l'option B ne paie pas :**

- **l'historique git**. Republier un jeu illustré de 3 Mo vingt fois dans
  l'année, c'est 60 Mo d'historique par an — le base64 d'un JPEG ne se
  compresse pas. Sur cinq ans, 300 Mo : on reste dans les clous de GitHub, mais
  les clonages et les constructions ralentissent. Avec une image référencée, le
  fichier n'est stocké qu'une fois, quel que soit le nombre de republications ;
- **le retéléchargement chez l'élève**. Corriger une virgule renvoie aujourd'hui
  2 Ko. Avec les images embarquées, la même correction renvoie **le jeu entier**.
  Trente élèves qui mettent à jour un jeu de 3 Mo en début d'heure, sur le wifi
  de l'établissement, cela fait 90 Mo d'un coup. Avec une image référencée, le
  texte seul circule : les images déjà en cache ne bougent pas.

**Et surtout : l'option B rend leur parité aux trois chemins de diffusion.** Une
adresse tient en quatre-vingts caractères, donc elle passe dans un lien *et*
dans un QR code. L'asymétrie décrite plus haut — « les cartes illustrées ne
pourront voyager que par code publié » — **n'existe qu'avec le base64**.

Ce que l'option B coûte en retour : le dépôt des images sur le site (que le
jeton de publication sait déjà faire, `putFile` encode le binaire), des fichiers
orphelins quand une carte est supprimée (sans conséquence, c'est un dépôt et non
un quota), et surtout **une sauvegarde qui n'est plus autonome** : elle porte
les adresses, pas les pixels. Changer de téléphone suppose que le site réponde
encore. C'est la seule vraie régression face au base64.

### Le critère qui départage A et B

Poser la question dans cet ordre :

1. **Voulez-vous que les cartes illustrées se partagent par lien et par QR
   code ?** Si oui → **B**, sans hésiter : le base64 l'interdit.
2. Sinon, **les jeux illustrés seront-ils fréquemment corrigés et republiés ?**
   Si oui → **B** : les deux factures différées se paient à chaque
   republication.
3. Sinon, **tenez-vous à ce qu'une sauvegarde suffise à tout restaurer, site
   éteint ?** Si oui → **A**.

En l'état de l'usage — publication par code, republication fréquente pendant
qu'un chapitre se construit — **l'option B semble la plus juste**. Mais ce
classement tient à des hypothèses d'usage, pas à une vérité technique : c'est à
revérifier le jour où la décision se prend.

## Proposition, si la décision est prise

**Sur l'option B**, dans cet ordre :

1. **un champ `image` sur la carte**, contenant une adresse relative du même
   domaine (`/media/schema-adn.jpg`), affichée au recto seulement ;
2. **redimensionnement automatique à l'ajout** — `canvas` + `toBlob`, sans
   bibliothèque. C'est l'étape qui décide de tout : entre une photo de téléphone
   brute et un schéma à 800 px il y a un facteur 57, et rien ne tient sans elle.
   Attention aux photos d'iPhone, dont l'orientation est en EXIF et que le
   canvas ignore : `createImageBitmap(file, { imageOrientation: 'from-image' })` ;
3. **dépôt de l'image par le jeton**, au moment de publier : `putFile` encode
   déjà le binaire, il n'y a qu'à l'appeler pour chaque image nouvelle ;
4. **préchargement à l'import** : `caches.open('media').then(c => c.addAll(…))`,
   une quinzaine de lignes, et le hors ligne est acquis sans magasin de médias ;
5. liste blanche stricte des types — PNG, JPEG, WebP, **jamais SVG** ;
6. rien à changer au partage par lien ni au QR code : une adresse tient dedans.

**Si c'est l'option A** (base64) qui est retenue, remplacer les points 1, 3 et 4
par : un `data:` URI dans le champ, aucun dépôt séparé, aucun préchargement — et
ajouter un plafond dur par carte (300 Ko encodés), l'affichage du poids du jeu
dans la feuille de publication, et un avertissement au partage par lien, qui ne
pourra pas porter les images.

**L'option C (hébergeur tiers) n'est pas à retenir** : voir plus haut.

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
