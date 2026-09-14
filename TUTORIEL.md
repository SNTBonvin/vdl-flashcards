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

Il refuse par ailleurs **deux cartes de même recto dans un thème**, et demande
d'en modifier un. Ce n'est pas une coquetterie : c'est le recto qui identifie
une carte quand un jeu est mis à jour. Deux rectos identiques, et l'on ne sait
plus laquelle corriger — ni, chez un élève, laquelle est la sienne. La casse et
les espaces ne comptent pas dans la comparaison.

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

Si vous étiez en train de composer une série, les cartes reprises y entrent
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

### Le quota de cartes neuves

L'application n'introduit qu'un nombre limité de **cartes neuves par jour et par
thème** — vingt par défaut, réglable dans *Réglages → Révision*. Les cartes
portant une échéance proche passent devant les autres quand le quota mord. C'est délibéré :
avaler quatre-vingts cartes le premier soir, c'est les avoir toutes à revoir le
même jour trois semaines plus tard.

Quand le quota est atteint, l'accueil le dit — « C'est fait pour aujourd'hui,
N cartes neuves t'attendent demain » — et ne propose plus de séance. Les cartes
ne sont pas perdues : elles sont visibles dans le thème, simplement pas
programmées avant demain. Les modes **Tout revoir** et **Mes difficultés**
restent accessibles, eux : ils ne dépendent pas du quota.

Un bouton **« Aller plus loin — 10 cartes de plus »** permet de dépasser la
limite du jour quand on le veut vraiment. L'application conseille un rythme,
elle ne l'impose pas. Pour construire ses propres jeux, mieux vaut cependant
monter le réglage une fois pour toutes que d'appuyer chaque jour.

### Se tester sans dérégler le programme

Réviser tout un chapitre la veille d'un contrôle et répondre « Su » partout
**allonge tous les intervalles en même temps** : l'élève ne reverra plus rien
pendant des semaines, et il aura oublié. C'est le piège du bachotage, et une
réponse compte toujours, quel que soit le mode.

D'où l'option **« Ne pas modifier le programme »**, dans les options de séance
de l'écran Réviser. Cochée, on s'interroge normalement mais **rien n'est
enregistré** : ni échéance décalée, ni ligne d'historique, ni compteur du jour.
La séance porte la mention « à blanc » dans son en-tête et dans son bilan.

Elle n'est jamais mémorisée d'une séance à l'autre : laissée allumée par
mégarde, elle ferait réviser sans jamais progresser.

Trois modes de séance, nommés par ce qu'ils font :

- **À revoir** — les cartes échues du jour, plus un quota de cartes neuves.
  C'est la séance quotidienne : la plus courte, et la plus efficace ;
- **Tout revoir** — tout un thème, échéances ou non, et l'on peut mélanger
  plusieurs thèmes et plusieurs matières. À faire avant un contrôle : cela ne
  dérègle pas le programme ;
- **Mes difficultés** — uniquement les cartes déjà ratées, les plus fautives
  d'abord.

Un encart rappelle la différence au-dessus du sélecteur. La croix le ferme pour
de bon ; **Réglages → Réviser → Expliquer les modes de séance** le fait
revenir.

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

## Les séries

Une **série** est une sélection de cartes d'un même thème, gardée sous la main.
Elle sert à deux choses, et la seconde n'est pas réservée à l'enseignant :

- **diffuser une partie d'un thème** : trente cartes tiennent dans un lien, mais
  leur QR code devient trop dense pour être projeté ; on importe tout d'un coup
  dans le même thème, puis on donne par paquets ;
- **se fixer une échéance** : « ces quinze cartes, pour vendredi ».

Dans un thème → **Sélectionner** dans la liste des cartes → cochez → **Créer une
série** → donnez-lui un intitulé. Ce bouton est proposé à tout le monde. La
section **Séries** du thème, elle, n'apparaît qu'à partir de la première série
créée — ou d'emblée si les outils d'enseignant sont allumés. Un élève qui n'en
veut pas ne voit donc rien de plus qu'avant.

La fiche d'une série affiche le nombre de cartes, la longueur du lien qu'elle
produira, la date de sa dernière diffusion et le champ **« À savoir pour le »**.
Trois boutons : **Diffuser cette série** (lien + QR code), **Modifier les cartes
de la série**, **Supprimer la série**.

Pendant la sélection, les cartes **déjà prises dans une autre série** portent une
pastille : « 1 série », « 2 séries ». De quoi composer la suivante sans redonner
deux fois les mêmes cartes — ou le faire exprès, en connaissance de cause. Elle
compte les séries telles qu'elles sont : celles constituées de longue date y
figurent sans qu'il y ait rien à reprendre. Quand vous **modifiez** une série, la
pastille ignore celle-là : elle ne montre que les cartes engagées ailleurs.

Au-delà d'une vingtaine de cartes, un champ de recherche apparaît au-dessus de
la liste. Il se combine avec la sélection : cherchez « littoral », appuyez sur
**Tout**, puis sur **Créer une série** — la série est faite en trois gestes à
partir de cartes disséminées dans le thème.

Ce qu'il faut savoir :

- **Dupliquer cette série** en fait une variante, l'original intact — pratique
  pour la remanier sans perdre sa composition d'origine ;
- une série déjà diffusée que vous modifiez ensuite porte la mention **« modifié
  depuis la diffusion »** : ce que vos élèves ont reçu n'est plus à jour ;
- une série est **évolutive** : ajoutez ou retirez des cartes quand vous voulez,
  le lien est recalculé à la diffusion suivante ;
- une série **resservira** telle quelle à une autre classe : rien n'y est
  attaché, ni élève, ni date, ni classe ;
- une carte peut appartenir à **plusieurs séries** ;
- supprimer une série ne supprime aucune carte, et ne retire rien de ce que vos
  élèves ont déjà reçu ;
- l'intitulé est **pour vous** : celui qui reçoit les cartes ne le voit pas. Chez
  lui, les séries d'un même thème se rejoignent dans ce thème, sans le découpage.

L'intitulé n'apparaît nulle part chez l'élève, et aucune information sur qui a
reçu quoi n'est enregistrée : l'application ne suit personne.

### Se fixer une échéance

Un champ **« À savoir pour le »**, à quatre endroits : dans **Planifier mes
révisions**, par le bouton **Poser une échéance** (c'est là qu'on la cherche) ;
dans la fiche d'une série ; dans **Modifier le thème**, sous le crayon, pour un
thème pris en entier ; et — c'est le plus utile — **sur l'écran de réception**,
au moment où l'élève ajoute les cartes. Le thème qui en porte une l'affiche en
bandeau, avec un bouton **Modifier** pour la déplacer ou la retirer.

Ce troisième endroit change la répartition des rôles. Vous n'avez pas toujours
la date du contrôle quand vous préparez le jeu ; l'élève, lui, l'a sous les yeux
dans son cahier de textes. Il peut donc poser la sienne, et vous n'avez rien à
dater. Si vous datez tout de même votre envoi, votre date devient **celle qui
est proposée par défaut** : il lui suffit de l'accepter.

La date est écrite **sur les cartes elles-mêmes** ; la série ou le thème ne font
que désigner lesquelles. C'est ce qui rend le mécanisme symétrique : celui qui
pose la date en voit l'effet sur ses propres révisions. Un élève peut donc
composer sa série — « ces quinze cartes, pour jeudi » —, s'en fixer l'échéance,
et la partager à un camarade avec la date. C'est le même outil des deux côtés,
et le professeur n'en a pas un autre.

Il fait une seule chose au calcul, mais elle compte. Une carte sue le 10 ne
revient naturellement que le 16 : une échéance au 14 tomberait dans un trou, et
la carte ne serait pas repassée avant le contrôle. La règle est donc :

> **Aucune carte à savoir pour le 14 ne garde une échéance après le 14.** Celles
> qui dépassent sont proposées la veille.

Ce n'est pas un dérèglement : on avance une révision, on n'en supprime aucune,
et répondre ce jour-là fait repartir le calcul normalement. Un seul passage est
garanti, pas un par jour. Une fois la date passée, l'échéance devient inerte et
les cartes rejoignent le cycle ordinaire.

L'accueil affiche un compte à rebours — « dimanche 20 · 3 cartes · J − 7 » — et
le thème un bandeau avec un bouton **Modifier**, qui permet de déplacer la date
ou de la retirer : l'appareil appartient à l'élève, une date annoncée ne s'y
impose pas.

Une précaution enfin, pour que la date de l'élève lui appartienne vraiment : à
la réception d'une **mise à jour**, le champ arrive pré-rempli avec la date que
portent déjà les cartes de cet envoi. Vos corrections n'effacent donc pas
l'échéance qu'il s'était fixée — seul lui peut l'effacer, en vidant le champ. La
comparaison se fait carte à carte : une deuxième série arrivant dans un thème
qui en contient déjà une ne se voit pas proposer la date de la première.

**Plusieurs échéances peuvent coexister dans un même thème**, et c'est le cas
courant : série 1 pour mardi, série 2 pour dimanche. Chaque carte porte la
sienne, le thème affiche un bandeau par date et l'accueil un compte à rebours
par date. Une carte présente dans les deux séries prend la date du dernier envoi
reçu — c'est bien la dernière consigne qui vaut.

**L'accumulation, elle, n'a besoin de rien.** Série 1 donnée le 7 pour le 14,
série 2 le 14 pour le 21 : les deux restent dans la rotation et se mélangent
d'office. Une interrogation du 21 portant sur les deux ne demande aucun
réglage — c'est le fonctionnement normal de la répétition espacée.

## Les outils d'enseignant

**C'est le jeton qui décide.** L'appareil où un jeton GitHub est enregistré est
celui de quelqu'un qui publie : les outils de diffusion y apparaissent d'office —
le bouton **Publier**, la section **Séries** dès l'ouverture d'un thème, le
tableau par matière sur l'accueil, et l'écran **Ce que j'ai diffusé**. Partout
ailleurs, l'application est celle d'un élève : réviser, créer, modifier, partager
ses cartes, s'y fixer une échéance — rien de plus à lire, rien à décider.

Le chemin : *Réglages → Diffusion → **Configurer la publication***, où l'on
renseigne l'adresse du dépôt puis le jeton. Le jeton est vérifié à
l'enregistrement ; il n'est accepté que s'il ouvre vraiment ce dépôt en écriture.

**Si vous publiez à la main**, sans jeton — en déposant vos fichiers vous-même
sur le dépôt — un réglage **« Je publie à la main »**, au même endroit, fait
apparaître les mêmes outils. C'est aussi le filet quand un jeton est révoqué.

Ce n'est pas une serrure : n'importe qui peut allumer ce réglage, et il n'agit
que sur l'appareil de qui l'utilise. C'est un rangement — un élève n'a pas à
voir des outils dont il n'a que faire. Publier suppose d'avoir les droits sur le
dépôt, et aucun réglage ne les donne.

### Ce que j'ai diffusé

*Réglages → Diffusion → **Ce que j'ai diffusé***. Un inventaire de ce qui est
sorti de l'appareil, en deux listes.

**Séries** — toutes matières confondues : l'intitulé, la matière et le thème, le
nombre de cartes, et des pastilles qui disent l'essentiel sans rien ouvrir —
l'échéance à venir, le code si elle est publiée, **« à republier »** quand des
cartes ont changé depuis le dépôt, « hors catalogue », la date de dernière
diffusion ou « jamais diffusé ».

**Jeux publiés** — les thèmes publiés en entier, avec leur code, leur nom
d'affichage quand il diffère du vôtre, et les mêmes pastilles.

Un appui ouvre le thème, la fiche de la série dépliée : de quoi republier,
rediffuser ou corriger sans avoir à retrouver où elle se cachait.
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

### Publier d'un seul bouton

Le dépôt à la main — télécharger, ouvrir GitHub, coller, valider — peut être
supprimé. **Réglages → Diffusion → Publier en un geste** : vous y collez un
jeton GitHub, et « Publier » dépose le fichier tout seul.

Le jeton à créer, sur GitHub : *Settings → Developer settings → Personal access
tokens → Fine-grained tokens*. **Un seul dépôt** — celui du projet — et **une
seule autorisation** : *Contents*, en lecture et écriture. Il s'annule d'un clic
depuis la même page si vous perdez votre téléphone.

Ce que l'application en fait :

- il reste **sur cet appareil**, dans une case à part : il ne part **jamais**
  dans la sauvegarde JSON, même quand vous changez de téléphone ;
- il n'est envoyé **qu'à GitHub**, au moment où vous publiez ;
- « Tout effacer » l'oublie aussi ;
- s'il est absent, expiré ou révoqué, la feuille de publication redevient
  exactement ce qu'elle était : le dépôt à la main reste toujours proposé, juste
  en dessous.

Rien ne change pour les élèves : ils lisent toujours un fichier servi par le
site de l'application, sans passer par GitHub.

### Publier une série sous son propre code

Une série se publie comme un thème, mais en gardant l'essentiel : **toutes les
séries d'un thème portent le même identifiant de thème**. Chez l'élève, les codes
successifs se rejoignent donc dans **un seul thème qui grossit**, au lieu de
s'empiler en chapitres séparés.

Fiche de la série → **Publier cette série sous un code**. Le code proposé la
distingue (`SVT-BIODIVER-SERIE1`), et le nom affiché reprend « thème — série ». Le reste
est identique : copier, déposer, deux minutes.

Conséquence pratique : une seule liste de cartes, trois sélections par-dessus,
trois codes — et une carte peut servir dans deux séries sans être révisée en
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
  code sans qu'il apparaisse dans aucune liste. Le choix est mémorisé :
  republier pour corriger une faute ne le remet pas au catalogue ;
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
> **Lien ou code reçu** — c'est sur l'écran d'accueil, en bas —, et collez.

Plus simple encore : donnez-leur le **code**, qu'ils tapent au même endroit.
Rien à copier, rien à ouvrir dans le mauvais navigateur.

C'est vrai aussi après avoir scanné un QR code. L'application prévient d'elle-même
quand elle détecte ce cas, et propose un bouton « Copier le lien ».

Sur Android, rien de tout cela : le lien ouvre directement l'application installée.

## Côté élève

L'écran **Aujourd'hui** ne montre que la séance du jour. Quand il n'y a rien
d'échu, il ne laisse pas l'élève devant une page vide : il propose un défi sur
un thème, et la reprise de ses cartes difficiles. Le détail matière par matière
n'apparaît qu'avec les outils d'enseignant activés — un élève n'a pas besoin de
ce tableau de bord.

L'écran **Matières** sépare deux gestes : au-dessus, *Mes matières*, ce qu'on
consulte ; au-dessous, *Ajouter des cartes*, avec les trois seules entrées
possibles — un lien ou un code reçu, le catalogue, une matière à soi.

Pour ouvrir un lien ou un code reçu : **Matières → Un lien ou un code reçu**,
puis collez le lien, ou tapez le code donné par le professeur. Un aperçu s'affiche avant
tout ajout. Un thème reçu par code garde son code : le bouton « Vérifier les
mises à jour » suffit ensuite, sans rien retaper.

### Les mises à jour se signalent toutes seules

L'élève n'a plus à y penser. Quand vous redéposez un fichier sous le même code,
l'application s'en aperçoit d'elle-même — au lancement, ou au retour au premier
plan — et affiche **« Mise à jour disponible »** sur l'accueil et sur le thème.

Elle ne l'importe pas pour autant : un appui, l'aperçu habituel, et c'est
l'élève qui valide. Ce qu'elle demande au site tient en une question — « ce
fichier a-t-il changé ? » — et n'envoie rien de lui. Hors ligne, elle se tait.

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

Dans un thème → **Planifier mes révisions**. Choisissez une heure, l'application
affiche les rendez-vous, puis **Ajouter à mon agenda** les dépose dans le
calendrier du téléphone.

**Il n'y a pas de rythme à choisir** : il se déduit de l'échéance.

- **Thème sans échéance** — demain, dans une semaine, dans un mois, dans six
  mois : la courbe de l'oubli. L'oubli est massif dans les premiers jours, et
  chaque rappel aplatit la courbe.
- **Thème avec une échéance** — les rendez-vous se répartissent jusqu'à elle, le
  dernier la veille. Pour une date à sept jours : demain, dans trois jours, la
  veille. Pour une date à trois jours : demain et la veille.

Cette seconde règle a remplacé un rythme « resserré, pour un contrôle proche »
qui n'était que l'approximation d'une date inconnue. Maintenant qu'on peut poser
la date, il n'y a plus à deviner.

Changer l'échéance ensuite ne déplace pas les rendez-vous déjà déposés — un plan
est la photographie de ce qui est parti dans l'agenda. Rouvrez la feuille et
réexportez : les rendez-vous sont mis à jour, et ceux que le nouveau plan ne
contient plus sont retirés du calendrier.

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
progression, séries et réglages. C'est le fichier pour **changer d'appareil**, et
sa restauration **remplace** ce qui est sur le téléphone.

**Un paquet de cartes** ne contient que des cartes — ni progression, ni
réglages. C'est ce qu'on exporte pour donner, archiver ou retravailler dans un
tableur, et il **s'ajoute** à un thème sans rien écraser.

On exporte un paquet depuis trois endroits :

- **un thème** → l'icône de téléchargement, à côté d'« Importer » ;
- **une matière** → l'icône de téléchargement, en haut ; la feuille propose la
  matière entière ou n'importe lequel de ses thèmes ;
- **une série** → « Exporter cette série » dans sa fiche ;
- et **Réglages → Cartes** pour tout, ou une matière au choix.

Chaque fois, deux formats : **CSV** pour le tableur, **JSON** pour réimporter
dans l'application sans perdre les notes ni les étiquettes.

Pour réimporter : dans le thème de destination, **Importer**, puis choisissez le
fichier — CSV, TSV ou JSON, l'application reconnaît les trois. Les cartes
s'ajoutent, rien n'est remplacé.

## Pourquoi ça marche

Rubrique **Prise en main → Pourquoi ça marche**, dans l'application. À donner à
lire aux élèves : elle explique ce qu'ils font, et non comment cliquer.

Relire donne le sentiment de savoir sans le savoir — on reconnaît le texte, on
ne le retrouve pas. Une flashcard fait l'inverse : elle oblige à *retrouver*, et
c'est cet effort qui fixe. Quatre principes, et ce que l'application en fait :

| Principe | Dans l'application |
|---|---|
| **Se tester plutôt que relire** | Chaque carte pose une question et cache la réponse |
| **Espacer plutôt que masser** | Les intervalles sont calculés carte par carte : demain si elle a résisté, dans un mois si elle est acquise |
| **Revenir sur l'ancien** | « Aujourd'hui » propose de rouvrir un thème laissé de côté depuis trois semaines |
| **Une idée par carte** | L'éditeur signale les cartes devenues trop longues |

Fabriquer ses cartes est en soi un travail d'apprentissage : reformuler, c'est
déjà mémoriser. Recevoir un jeu du professeur **et y ajouter les siennes** est
le meilleur des deux mondes.

Sources : DRANE de Bourgogne-Franche-Comté, « Travailler la mémorisation active
avec des flashcards » ; académie de Lille, « Processus de mémorisation et
flashcards ». Le rythme de reprises proposé — demain, une semaine, un mois, six
mois — reprend celui de la courbe de l'oubli qu'elles décrivent.

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

## Le tutoiement

L'application tutoie partout, y compris dans les outils d'enseignant. C'est un
outil d'élève avant tout, et le vouvoiement y sonnait comme un bulletin. Un
contrôle automatisé vérifie qu'il n'en reste rien.

## Vérifier qu'un appareil est à jour

**Réglages → À propos**. Le numéro de version s'y affiche, et juste en dessous
un bouton **« Vérifier maintenant »**.

L'application se met à jour d'elle-même — au retour au premier plan, au retour
du réseau, toutes les demi-heures — et propose le rechargement par un bandeau,
jamais de force. Le bouton sert à autre chose : pouvoir répondre devant une
classe. Trois réponses possibles :

| Réponse | Ce que cela veut dire |
|---|---|
| **à jour** | C'est bien la dernière version publiée |
| **nouvelle version** | Une version est prête ; le bouton l'installe et recharge |
| **hors ligne** | Le site n'a pas répondu : on ne peut rien affirmer |

Installer une nouvelle version **ne touche pas aux données** : cartes,
historique, séries et réglages restent en place. Seule l'application est
remplacée.

## Vie privée

Tout est stocké sur l'appareil, hors ligne. Aucun compte, aucun serveur, aucune
mesure d'audience, **aucune requête vers un service tiers** — les polices sont
auto-hébergées pour cette raison. Les cartes d'un élève ne quittent son appareil
que s'il exporte lui-même une sauvegarde.

En conséquence, un enseignant ne peut pas savoir qui a révisé : il n'y a rien à
consulter. C'est une propriété de l'architecture, pas un réglage.
