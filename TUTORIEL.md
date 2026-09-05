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

## Côté élève

Un thème reçu n'est pas figé :

- il peut y **ajouter ses propres cartes** ;
- il peut **archiver** celles dont il ne veut pas — elles sortent de la liste
  sans être supprimées, et ne réapparaissent pas aux mises à jour ;
- il distingue d'un coup d'œil les cartes reçues des siennes, grâce à la mention
  « REÇUE » et aux filtres ;
- s'il **modifie** une carte reçue, elle devient la sienne et cesse de suivre
  les corrections de l'auteur. L'application le prévient avant.

## Rappels

Chaque thème peut avoir son rappel : une heure et des jours de la semaine.

Le web n'autorise pas de véritable planification en arrière-plan : le rappel est
évalué à l'ouverture de l'application et tant qu'elle est au premier plan. À
défaut, la pastille de l'onglet « Aujourd'hui » signale les thèmes en attente.

## Sauvegarder et changer d'appareil

*Réglages → Données → **Exporter la sauvegarde*** produit un fichier JSON
contenant les cartes, l'historique et les réglages. Sur le nouvel appareil,
*Restaurer*.

L'export CSV existe aussi, pour un tableur — mais il ne contient pas la
progression.

## Vie privée

Tout est stocké sur l'appareil, hors ligne. Aucun compte, aucun serveur, aucune
mesure d'audience, **aucune requête vers un service tiers** — les polices sont
auto-hébergées pour cette raison. Les cartes d'un élève ne quittent son appareil
que s'il exporte lui-même une sauvegarde.

En conséquence, un enseignant ne peut pas savoir qui a révisé : il n'y a rien à
consulter. C'est une propriété de l'architecture, pas un réglage.
