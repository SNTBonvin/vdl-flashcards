# Prise en main

Application en ligne : **<https://bonvinchristophe.forge.apps.education.fr/vdl-flashcards>**

Ce guide couvre l'usage courant. Le même contenu est disponible **dans
l'application**, à la rubrique « Prise en main » des réglages — plus pratique
depuis un téléphone.

## Le plus rapide : partir d'un exemple

Dans l'application : **Réglages → Prise en main → Ajouter l'exemple**.

Une matière « Démonstration » et sept cartes apparaissent. Les cartes portent
sur l'application elle-même : **les réviser vous apprend à vous en servir**.

Pour tout retirer : **Prise en main → Retirer l'exemple**. Un seul clic. Les
identifiants de l'exemple étant réservés, la suppression ne peut pas toucher vos
propres matières. Seule réserve : si vous avez ajouté vos cartes à ce thème,
elles partiront avec — l'avertissement le rappelle au moment de confirmer.

## Installer sur le téléphone

- **Android** — menu du navigateur, puis « Installer l'application ».
- **iPhone** — bouton Partager, puis « Sur l'écran d'accueil ».

Une fois installée, l'application fonctionne **sans réseau**. Sur iPhone,
l'installation est de surcroît nécessaire pour recevoir les rappels.

## Ranger ses cartes

Trois niveaux : une **matière** contient des **thèmes**, un thème contient des
**cartes**.

1. *Matières* → **Nouvelle matière** (par exemple « Histoire-Géographie », avec
   l'abréviation « HG » affichée en pastille).
2. Dans la matière → **Nouveau thème** (un par chapitre).
3. Dans le thème → **Ajouter une carte**.

### Une idée par carte

Une flashcard porte **une seule notion**, formulée court. C'est ce qui la rend
efficace : la carte qui contient deux idées n'en fixe aucune. L'éditeur le
rappelle, et signale les cartes devenues trop longues — deux cartes valent
souvent mieux qu'une.

### Reprendre une carte déjà écrite

Dans un thème → **Ajouter une carte** → **Reprendre une carte que j'ai déjà**.
La feuille s'ouvre sur vos quinze dernières cartes. Pour aller plus loin :
**Tout parcourir**, ou bien une recherche (deux lettres suffisent), ou encore un
filtre par matière, par thème ou par étiquette. La liste se déroule par
cinquantaines — « Afficher 50 cartes de plus » — et **Tout** coche d'un coup ce
qui est affiché. Cochez en plusieurs passes, validez une seule fois à la fin.

Les cartes choisies sont **copiées** dans le thème, avec une progression neuve ;
l'originale reste où elle est. Une carte dont le recto existe déjà dans le thème
est signalée « déjà ici » et ne peut pas être reprise deux fois.

Si vous étiez en train de composer un lot, les cartes reprises y entrent
directement : inutile de revenir en arrière.

### Un thème de réserve

Certaines cartes sont écrites avant de savoir dans quel chapitre elles iront.
Pour cela, cochez **Thème de réserve** à la création d'un thème (une réserve par
matière est un bon usage, par exemple « SVT › Sans thème »).

Un thème de réserve est un vivier : ses cartes **ne sont jamais proposées en
révision**, ne comptent ni dans « à réviser » ni dans les statistiques, et n'ont
ni rappel ni plan de reprises. Mais elles restent entièrement disponibles : la
recherche les trouve, et « Reprendre une carte » y puise comme ailleurs.

Pour y mettre une carte de côté : **Sélectionner → Déplacer → votre réserve**.

## Créer beaucoup de cartes d'un coup

**Importer** accepte une liste collée : une carte par ligne, recto et verso
séparés par un point-virgule ou une tabulation.

```
En quelle année débute la Ve République ?;1958
Qui en est le premier président ?;Charles de Gaulle
```

C'est aussi ce qui permet de **rédiger dans un tableur** — Grist, LibreOffice,
Excel — puis de copier les deux colonnes et de les coller ici. Les tabulations
issues du copier-coller sont reconnues.

Un fichier CSV ou TSV peut également être choisi directement.

## Réviser

Trois réponses possibles, et l'échéance calculée est affichée sur chaque bouton
**avant** que vous répondiez :

| Réponse | Effet |
|---|---|
| **Raté** | La carte revient dans la séance en cours, puis plus tôt que les autres |
| **Difficile** | L'intervalle avance peu |
| **Su** | L'intervalle est multiplié par le facteur de facilité |

Trois modes de séance :

- **Programmé** — les cartes échues du jour, plus un quota de cartes neuves ;
- **Interrogation** — tout un thème, échéances ou non, et l'on peut mélanger
  plusieurs thèmes et plusieurs matières ;
- **Difficiles** — uniquement les cartes déjà ratées.

## Partager un thème à ses élèves

Dans un thème → **Partager ce thème**. L'application produit un lien à coller
dans l'ENT, et un QR code à projeter quand le jeu est assez court.

Le jeu de cartes voyage **dans le lien lui-même** : rien n'est déposé sur un
serveur, et personne ne peut savoir qui l'ouvre.

Si vous corrigez une faute plus tard, **rediffusez le lien** : chez l'élève, le
thème sera mis à jour au lieu d'être dupliqué, et **sa progression sera
conservée**. Une carte qu'il a archivée ne réapparaît pas, et une carte qu'il a
créée lui-même n'est jamais écrasée.

Ordre de grandeur : environ 70 caractères par carte. Vingt cartes donnent un
lien d'environ 1,4 Ko, et un QR code encore lisible de près.

## Les outils d'enseignant

Les lots de distribution et la publication sous un code ne servent qu'à celui
qui diffuse. Ils sont donc **éteints par défaut** : *Réglages → Diffusion →
**Outils d'enseignant***. Sans eux, l'application reste entière pour réviser,
créer, modifier et partager ses propres cartes.

Ce n'est pas une serrure — n'importe qui peut les allumer, et ils n'agissent
que sur l'appareil de qui les utilise. C'est un rangement : un élève n'a pas à
voir des outils dont il n'a que faire. Publier suppose d'avoir les droits sur
le dépôt, et aucun réglage ne les donne.

## Diffuser en plusieurs lots

Un thème de trente cartes tient dans un lien, mais son QR code devient trop
dense pour être projeté. Les **lots de distribution** répondent à ce cas :
on importe toutes les cartes d'un coup dans le même thème, puis on les diffuse
par paquets.

Dans un thème → **Nouveau lot** (ou **Sélectionner** dans la liste des cartes) →
cochez les cartes → **Créer un lot** → donnez-lui un intitulé.

La fiche d'un lot affiche le nombre de cartes, la longueur du lien qu'il
produira et la date de sa dernière diffusion. Trois boutons : **Diffuser ce
lot** (lien + QR code), **Modifier les cartes du lot**, **Supprimer le lot**.

Au-delà d'une vingtaine de cartes, un champ de recherche apparaît au-dessus de
la liste. Il se combine avec la sélection : cherchez « littoral », appuyez sur
**Tout**, puis sur **Créer un lot** — le lot est fait en trois gestes à partir
de cartes disséminées dans le thème.

Ce qu'il faut savoir :

- **Dupliquer ce lot** en fait une variante, l'original intact — pratique pour
  remanier un lot sans perdre sa composition d'origine ;
- un lot déjà diffusé que vous modifiez ensuite porte la mention **« modifié
  depuis la diffusion »** : ce que vos élèves ont reçu n'est plus à jour ;
- un lot est **évolutif** : ajoutez ou retirez des cartes quand vous voulez, le
  lien est recalculé à la diffusion suivante ;
- un lot **resservira** tel quel à une autre classe : rien n'y est attaché, ni
  élève, ni date, ni classe ;
- une carte peut appartenir à **plusieurs lots** ;
- supprimer un lot ne supprime aucune carte, et ne retire rien de ce que vos
  élèves ont déjà reçu ;
- l'intitulé du lot est **pour vous** : l'élève ne le voit pas. Chez lui, les
  lots d'un même thème se rejoignent dans ce thème, sans le découpage.

L'intitulé n'apparaît nulle part chez l'élève, et aucune information sur qui a
reçu quoi n'est enregistrée : l'application ne suit personne.

## Publier sous un code court

Un lien est long, et sur iPhone il n'atteint pas l'application installée. Un
**code court** — « SVT-2DE-BIO1 » — se dicte en classe, s'écrit au tableau, et
se tape dans l'application déjà ouverte. Plus de lien, plus de QR code.

Dans un thème → **Publier**. Choisissez le code, le **nom affiché** — ce que
verront vos élèves, votre thème gardant son nom de travail —, éventuellement le
niveau, et décidez s'il apparaîtra dans le catalogue. L'application prépare alors le
fichier exact à déposer :

1. **Copier le contenu du fichier** ;
2. **Ouvrir la page de dépôt** — votre dépôt s'ouvre sur le dossier `public/c/` ;
3. nommez le fichier `LECODE.json`, collez, validez.

La publication prend environ deux minutes, le temps du pipeline.

**Déposez toujours sur le dépôt où vit le code** (ici, GitHub), jamais sur un
miroir : un fichier ajouté directement sur le miroir fait diverger les deux
dépôts et bloque la recopie jusqu'à ce qu'on la force. Ensuite, le
code est vivant : `…/vdl-flashcards/c/LECODE.json`.

### Publier un lot sous son propre code

Un lot se publie comme un thème, mais en gardant l'essentiel : **tous les lots
d'un thème portent le même identifiant de thème**. Chez l'élève, les codes
successifs se rejoignent donc dans **un seul thème qui grossit**, au lieu de
s'empiler en chapitres séparés.

Fiche du lot → **Publier ce lot sous un code**. Le code proposé distingue le
lot (`SVT-BIODIVER-LOT1`), et le nom affiché reprend « thème — lot ». Le reste
est identique : copier, déposer, deux minutes.

Conséquence pratique : une seule liste de cartes, trois sélections par-dessus,
trois codes — et une carte peut servir dans deux lots sans être révisée en
double chez l'élève.

### Mettre à jour un jeu publié

Le fichier déposé est une **photographie** : modifier vos cartes dans
l'application ne change rien en ligne. Quand un thème publié a changé, son
bouton devient **Republier** — c'est votre rappel, vous n'avez rien à retenir.

Republier, c'est trois gestes : **Republier** → **Copier le contenu du
fichier** → **Ouvrir le fichier à remplacer**, qui vous dépose directement dans
l'éditeur du fichier existant. Tout sélectionner, coller, valider.

Deux minutes plus tard, le jeu est à jour : le catalogue se régénère seul, et
chez l'élève qui rouvre le code, les cartes se mettent à jour **sans doublon et
sans toucher à sa progression**.

**Gardez le même code.** En changer créerait un second jeu, et vos élèves
verraient deux entrées pour le même chapitre.

À savoir :

- **republier sous le même code met le jeu à jour** chez ceux qui l'ont déjà
  reçu, sans doublon et sans toucher à leur progression ;
- un code **n'est pas un secret** : qui l'a, a les cartes. Pour des flashcards
  de cours, c'est sans conséquence ;
- **décoché, « Afficher dans le catalogue »** garde le jeu joignable par son
  code sans qu'il apparaisse dans aucune liste ;
- la publication demande du **réseau à la première ouverture** chez l'élève.
  Ensuite les cartes sont sur son appareil et tout redevient autonome. Le
  partage par lien, lui, fonctionne sans réseau : les deux coexistent.

### Le catalogue

Les jeux publiés avec « Afficher dans le catalogue » apparaissent dans une
liste, consultable dans l'application : **Matières → Parcourir le catalogue**.
On y filtre par niveau puis par matière, et l'on ouvre un jeu comme on ouvrirait
un code — avec le même aperçu avant d'ajouter. Les jeux déjà reçus y portent la
mention « reçu ».

Le catalogue est **reconstruit à chaque publication**, à partir des fichiers
réellement en ligne : il ne peut donc pas annoncer un jeu qui n'existe plus, ni
oublier un jeu déposé. Un jeu publié sans être listé n'y figure pas, mais son
code fonctionne.

Il est **public** : toute personne ouvrant l'application le voit. C'est
l'intérêt pour mutualiser entre collègues ; c'est à savoir avant de cocher la
case.

### Sur iPhone : une consigne à donner

Sur iPhone, une application installée sur l'écran d'accueil possède **son propre
stockage**, distinct de celui de Safari — et le système ne sait pas confier un
lien à une application web. Un élève qui ouvre le lien depuis un message ou
l'ENT reçoit donc les cartes **dans Safari**, où l'application installée ne les
verra jamais.

La consigne à donner à la classe tient en une phrase :

> Copiez le lien, ouvrez l'application depuis l'écran d'accueil, puis
> **Matières → Lien ou code**, et collez.

Plus simple encore : donnez-leur le **code**, qu'ils tapent au même endroit.
Rien à copier, rien à ouvrir dans le mauvais navigateur.

C'est vrai aussi après avoir scanné un QR code. L'application prévient d'elle-même
quand elle détecte ce cas, et propose un bouton « Copier le lien ».

Sur Android, rien de tout cela : le lien ouvre directement l'application installée.

## Côté élève

Pour ouvrir un lien ou un code reçu : **Matières → Lien ou code**, puis collez
le lien, ou tapez le code donné par le professeur. Un aperçu s'affiche avant
tout ajout. Un thème reçu par code garde son code : le bouton « Vérifier les
mises à jour » suffit ensuite, sans rien retaper.

Un thème reçu n'est pas figé :

- il peut y **ajouter ses propres cartes** ;
- il peut **archiver** celles dont il ne veut pas — elles sortent de la liste
  sans être supprimées, et ne réapparaissent pas aux mises à jour ;
- il distingue d'un coup d'œil les cartes reçues des siennes, grâce à la mention
  « REÇUE » et aux filtres ;
- s'il **modifie** une carte reçue, elle devient la sienne et cesse de suivre
  les corrections de l'auteur. L'application le prévient avant.

## Se faire rappeler de réviser

### Planifier ses reprises, et les mettre dans son agenda

Dans un thème → **Planifier mes révisions**. Choisissez un rythme et une heure,
l'application affiche les rendez-vous, puis **Ajouter à mon agenda** les dépose
dans le calendrier du téléphone.

Deux rythmes :

- **Courbe de l'oubli** — demain, dans une semaine, dans un mois, dans six mois.
  C'est le rythme conseillé : l'oubli est massif dans les premiers jours, et
  chaque rappel aplatit la courbe.
- **Resserré** — cinq reprises en un mois, pour un contrôle proche.

Pourquoi passer par l'agenda : une application web ne peut pas programmer une
notification à l'avance. La notification de l'application ne part qu'à son
ouverture — c'est-à-dire jamais pour celui qui oublie justement de l'ouvrir.
L'agenda du téléphone, lui, sonne seul, application fermée. Rien ne sort de
l'appareil : le fichier est fabriqué sur place.

Sur iPhone, ouvrez le fichier téléchargé puis « Tout ajouter ». Sur Android, il
s'ouvre directement dans l'agenda. Réimporter un plan modifié met à jour les
rendez-vous au lieu de les dupliquer.

### Rappel hebdomadaire

Chaque thème peut aussi avoir son rappel : une heure et des jours de la semaine,
avec le même bouton pour le recopier dans l'agenda. À défaut, la pastille de
l'onglet « Aujourd'hui » signale les thèmes en attente.

### Reprise spiralaire

Quand un thème déjà travaillé n'a pas été rouvert depuis trois semaines,
l'écran « Aujourd'hui » propose de le reprendre. Réviser le chapitre en cours
ne suffit pas : ce sont les retours sur les chapitres antérieurs qui installent
les connaissances pour de bon.

## Exporter et réimporter des cartes

Deux fichiers différents, deux usages qu'il ne faut pas confondre.

**La sauvegarde** (*Réglages → Exporter la sauvegarde*) contient tout : cartes,
progression, lots et réglages. C'est le fichier pour **changer d'appareil**, et
sa restauration **remplace** ce qui est sur le téléphone.

**Un paquet de cartes** ne contient que des cartes — ni progression, ni
réglages. C'est ce qu'on exporte pour donner, archiver ou retravailler dans un
tableur, et il **s'ajoute** à un thème sans rien écraser.

On exporte un paquet depuis trois endroits :

- **un thème** → l'icône de téléchargement, à côté d'« Importer » ;
- **une matière** → l'icône de téléchargement, en haut ; la feuille propose la
  matière entière ou n'importe lequel de ses thèmes ;
- **un lot** → « Exporter ce lot » dans sa fiche ;
- et **Réglages → Cartes** pour tout, ou une matière au choix.

Chaque fois, deux formats : **CSV** pour le tableur, **JSON** pour réimporter
dans l'application sans perdre les notes ni les étiquettes.

Pour réimporter : dans le thème de destination, **Importer**, puis choisissez le
fichier — CSV, TSV ou JSON, l'application reconnaît les trois. Les cartes
s'ajoutent, rien n'est remplacé.

## Les courbes d'apprentissage

Dans **Statistiques**, deux graphiques par thème — ou sur l'ensemble.

**Votre courbe de l'oubli** montre le taux de réussite selon le temps écoulé
depuis la révision précédente : un jour, trois jours, une semaine, un mois. Ce
n'est pas la courbe d'un manuel, c'est la vôtre, mesurée sur vos cartes. Là où
la barre s'effondre, l'intervalle est devenu trop long — c'est le signal qu'il
faut resserrer le rythme des reprises.

**La montée de l'acquis** compte, semaine après semaine, les cartes devenues
solides — revues avec au moins trois semaines d'écart — face à celles que vous
avez seulement découvertes. L'écart entre les deux courbes, c'est le travail
qui reste.

En dessous de **trente réponses**, rien n'est tracé : une courbe sur si peu de
données ne montrerait que du hasard, et l'application le dit plutôt que de
faire semblant.

## Sauvegarder et changer d'appareil

*Réglages → Données → **Exporter la sauvegarde*** produit un fichier JSON
contenant les cartes, l'historique et les réglages. Sur le nouvel appareil,
*Restaurer*.

L'export CSV existe aussi, pour un tableur — mais il ne contient pas la
progression.

### Protéger les données sur l'appareil

Par défaut, un navigateur s'autorise à effacer ce qu'un site a stocké quand il
manque de place — et sur iPhone, le stockage d'un site resté sept jours sans
visite peut disparaître (des vacances suffisent).

*Réglages → Données → **Protection sur cet appareil*** dit où l'on en est. Si
la pastille indique « à demander », le bouton **Protéger mes données** demande
au navigateur de ne plus y toucher. Sur les téléphones Android, la protection
est souvent accordée d'elle-même dès que l'application est installée sur
l'écran d'accueil ; sur Firefox, une fenêtre demande confirmation.

Cela ne protège pas d'un effacement volontaire (vider les données du
navigateur, désinstaller l'application) : la sauvegarde exportée reste le seul
filet vraiment sûr.

## Vie privée

Tout est stocké sur l'appareil, hors ligne. Aucun compte, aucun serveur, aucune
mesure d'audience, **aucune requête vers un service tiers** — les polices sont
auto-hébergées pour cette raison. Les cartes d'un élève ne quittent son appareil
que s'il exporte lui-même une sauvegarde.

En conséquence, un enseignant ne peut pas savoir qui a révisé : il n'y a rien à
consulter. C'est une propriété de l'architecture, pas un réglage.
