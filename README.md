# Flashcards — Val de Lys

**<https://bonvinchristophe.forge.apps.education.fr/vdl-flashcards>**

Application web progressive (PWA) de flashcards pensée pour le smartphone :
création et classement des cartes, révision par répétition espacée, mode
interrogation, import/export et rappels par thème.

Tout est stocké **localement** sur l'appareil (IndexedDB). Aucun compte, aucun
serveur, fonctionnement hors ligne complet une fois l'application installée.

## Prise en main

Le mode d'emploi est dans [TUTORIEL.md](TUTORIEL.md), et le même contenu est
accessible **dans l'application** — *Réglages → Prise en main* — ce qui est plus
commode depuis un téléphone.

Pour découvrir l'application sans rien saisir, cette page propose d'**ajouter un
exemple en un clic** : une matière, un thème et sept cartes qui portent sur
l'application elle-même, si bien que les réviser apprend à s'en servir. Un
second clic les retire.

Les identifiants de l'exemple sont réservés (`demo-matiere-exemple`,
`demo-theme-exemple`) et ne sont jamais produits par le générateur aléatoire :
la suppression retire donc exactement ce qui a été créé, sans pouvoir toucher
aux matières de l'utilisateur.

## Vie privée

L'application est destinée à des élèves : elle n'émet **aucune requête vers un
service tiers**, y compris au chargement de la page.

- Les polices sont **auto-hébergées** (`public/fonts/`), et non servies par
  Google Fonts — un chargement depuis `fonts.gstatic.com` transmettrait
  l'adresse IP de chaque élève à Google à chaque visite.
- Aucune mesure d'audience, aucun traceur, aucun cookie tiers.
- Aucun compte, aucune donnée envoyée à un serveur : les cartes et l'historique
  de révision ne quittent l'appareil que si l'utilisateur exporte lui-même une
  sauvegarde.
- Les notifications de rappel sont générées localement par le navigateur.

Vérification : `document` ne charge que des ressources de son propre domaine —
un contrôle automatisé compte les requêtes sortantes au démarrage et doit
trouver zéro requête externe.

## Fonctionnalités

- **Classement** — matières › thèmes › cartes, avec recherche plein texte.
- **Mises à jour** — un bandeau propose d'installer la nouvelle version sans
  jamais interrompre une révision en cours ; les cartes et la progression sont
  conservées (voir « Mises à jour » plus bas).
- **Répétition espacée** — variante simplifiée de SM-2 : une carte ratée revient
  une minute plus tard, dans la séance en cours ; une carte acquise que l'on
  oublie repart avec un intervalle divisé par deux ; une carte sue s'espace de
  plus en plus (intervalle × facteur de facilité, 2,5 au départ).
- **Trois modes de session**
  - *Programmé* : les cartes échues du jour, plus un quota de cartes neuves ;
  - *Interrogation* : toutes les cartes des thèmes cochés, échues ou non,
    mélangées — plusieurs thèmes et plusieurs matières peuvent être
    combinées ;
  - *Difficiles* : uniquement les cartes déjà ratées.
- **Réponses** — « Raté », « Difficile », « Su », avec l'échéance calculée
  affichée sur chaque bouton avant de répondre.
- **Rappels** — horaire et jours de la semaine par thème.
- **Import** — CSV, TSV ou texte collé (`recto ; verso`), avec aperçu avant
  validation.
- **Export** — sauvegarde JSON intégrale (cartes + historique + réglages) pour
  changer d'appareil, ou CSV pour un tableur.
- **Partage par lien** — un thème se diffuse par un lien (ou un QR code projeté
  en classe) que les élèves ouvrent pour récupérer le jeu (voir « Partage »).
- **Thème reçu, thème vivant** — celui qui reçoit un thème peut y ajouter ses
  propres cartes, archiver celles dont il ne veut pas, et distinguer d'un coup
  d'œil les cartes reçues des siennes.
- **Statistiques** — thèmes à retravailler, activité sur 14 semaines, taux de
  réussite, répartition des cartes par état, résultats par matière ; et un bilan
  de fin de session ventilé par thème.
- **Thème clair et sombre** — automatique (suit le téléphone), clair ou sombre,
  au choix et par appareil.

## Statistiques par thème

Chaque réponse enregistre le thème de **sa carte**, pas celui de la session : une
interrogation mêlant plusieurs thèmes est donc correctement ventilée, et l'était
déjà rétroactivement avant l'ajout de ces écrans.

Deux endroits l'exploitent :

- le **bilan de fin de session**, quand la session a mêlé plusieurs thèmes :
  réussite et nombre de ratées par thème, chaque ligne relançant aussitôt les
  cartes difficiles du thème concerné ;
- la section **« À retravailler »** des statistiques : les thèmes classés par
  taux d'échec sur 30 jours.

Un thème n'y est comparé qu'à partir de **6 réponses** sur la période. En
dessous, un seul échec suffirait à le propulser en tête : le chiffre serait du
bruit, pas un signal.

Aucune de ces lignes n'est un simple affichage — toutes lancent une session sur
le thème concerné. Une statistique qui ne mène pas à une action est un bulletin
de notes de plus.

## Partage d'un thème

Un thème se partage par un lien qui **contient** le jeu de cartes, après le `#` :
aucun serveur à héberger, et la partie située après le `#` n'étant jamais
transmise à l'hébergeur, personne ne peut savoir quel jeu a été ouvert ni par
qui. Le contenu est compressé (`deflate-raw`) puis encodé en base64url, ce qui
donne de l'ordre de 50 à 70 caractères par carte.

L'interface classe le lien selon ce qu'on peut réellement en faire, à partir du
nombre de modules du QR code et non du nombre de cartes :

| Lien | Usage |
|---|---|
| ≤ 85 modules | QR code lisible au vidéoprojecteur |
| ≤ 125 modules | QR code dense, à scanner de près |
| ≤ 5 000 caractères | lien seulement — certains ENT tronquent les liens longs |
| au-delà | l'application renvoie vers l'export JSON |

Cinq règles gouvernent la réception (`importShare` dans `src/state/store.tsx`),
et toutes protègent le travail de celui qui reçoit :

- **Rien n'est ajouté automatiquement.** Le lien affiche un aperçu ; l'élève
  décide.
- **La progression est conservée.** Les cartes reçues sont appariées sur leur
  recto normalisé : une carte déjà travaillée garde son intervalle et son
  historique même si l'auteur en corrige le verso. Le lien porte un identifiant
  de partage stable, si bien qu'une rediffusion met le jeu à jour au lieu de le
  dupliquer.
- **L'import ne touche jamais une carte personnelle.** L'appariement ne porte
  que sur les cartes venues du même partage. Si une carte personnelle occupe le
  même recto, elle est laissée intacte et la carte reçue n'est pas créée : ni
  écrasement silencieux, ni doublon.
- **Un lien ne supprime jamais rien.** Une carte retirée par l'auteur reste chez
  ceux qui l'avaient déjà reçue.
- **Une carte archivée ne réapparaît pas.** Son contenu est mis à jour, mais
  elle reste hors de la liste.

### Archivage, origine et appropriation

L'archivage remplace la suppression pour les cartes reçues, et ce n'est pas
qu'une douceur d'interface : **l'enregistrement conservé fait office de pierre
tombale**. Une carte archivée est « déjà connue » à la rediffusion suivante,
donc elle ne ressuscite pas — sans qu'il faille tenir une liste de refus à
côté. Une carte personnelle, elle, reste supprimable définitivement.

Chaque carte porte son origine (`sharedFrom`). L'interface la signale par une
mention discrète et deux filtres, « Reçues » et « Mes cartes ».

**Modifier une carte reçue, c'est se l'approprier** : elle bascule du côté de
l'utilisateur et cesse de suivre les mises à jour de l'auteur. C'est annoncé
avant la modification, pas découvert après. Ce choix vaut mieux qu'un verrou en
lecture seule, qui ne protégerait rien (les données sont sur l'appareil, donc
modifiables par export/import) tout en empêchant un élève de corriger une
coquille ou de reformuler une réponse avec ses mots.

`CompressionStream` manque sur les navigateurs les plus anciens (iOS antérieur à
16.4) : le lien est alors produit sans compression, donc plus long, sans autre
conséquence.

Le QR code est toujours dessiné en sombre sur blanc, y compris en thème sombre :
beaucoup de téléphones lisent mal un QR inversé.

## Mises à jour

Une PWA installée n'est presque jamais rechargée : tant qu'un onglet reste
ouvert, le service worker déjà en place continue de servir l'ancienne version
depuis son cache — « rafraîchir la page » ne suffit donc pas. Trois mécanismes
règlent le problème (`src/pwa/update.ts`) :

1. le nouveau service worker prend la main dès son installation (`skipWaiting`
   et `clientsClaim`), sans attendre la fermeture de tous les onglets ;
2. l'application vérifie la présence d'une nouvelle version à chaque retour au
   premier plan, au retour du réseau, puis toutes les trente minutes ;
3. le rechargement n'est jamais imposé : un bandeau le propose, pour ne pas
   couper une session de révision.

Les données ne sont jamais concernées : elles vivent dans IndexedDB, que la
mise à jour du service worker ne touche pas. Le numéro de version affiché dans
les réglages permet de vérifier qu'un appareil est bien à jour.

### Vocabulaire et compatibilité des données

Le second niveau de classement s'appelle **thème** dans l'interface. Le modèle
de données garde le nom d'origine (`Deck`, `deckId`, magasin `decks`) : ce sont
les clés réellement écrites dans IndexedDB et dans les sauvegardes JSON déjà
exportées. Les renommer imposerait de migrer les données existantes — donc de
risquer de les perdre — pour un simple changement de mot.

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm run build      # vérification des types puis build de production
npm run preview    # sert le build de production
npm run icons      # régénère les icônes PNG de la PWA
npm run fonts      # resynchronise les polices auto-hébergées depuis @fontsource
```

## Structure

```
src/
  db/          types de données et couche IndexedDB
  srs/         moteur de répétition espacée et construction des files
  state/       magasin applicatif (contexte React) et passage de consigne
  io/          import/export JSON, CSV et texte
  reminders/   notifications de rappel
  screens/     Aujourd'hui, Matières, Thème, Réviser, Statistiques, Réglages
  components/  icônes trait fin et briques d'interface
  styles/      charte graphique « Papier » (tokens) et mise en page
public/fonts/  polices auto-hébergées (woff2) et leurs licences OFL
scripts/       générateur d'icônes PNG et synchronisation des polices
```

## Thème clair et sombre

La palette sombre reprend les principes de la charte : neutres chauds (brun très
sombre, jamais de noir pur ni de gris bleuté), un seul accent vert, hiérarchie
par l'espacement.

Deux points méritent d'être connus avant de toucher aux couleurs :

- Le vert des **aplats** (`--primary-fill`) est un jeton distinct du vert du
  **texte** (`--primary`). En thème sombre, un aplat lisible et un texte lisible
  ne peuvent pas être la même couleur : le texte s'éclaircit (`#7fb89b`) alors
  que le bouton reste soutenu (`#35785d`), faute de quoi il ferait « bonbon ».
- Le thème effectif est toujours écrit sur `<html data-theme>`, y compris en
  mode automatique, par un court script en ligne dans `index.html` exécuté avant
  le premier rendu — sans lui, l'application apparaîtrait en clair une fraction
  de seconde avant de basculer. La feuille de style n'a donc qu'**un seul** bloc
  sombre à maintenir, et non une palette dupliquée entre un sélecteur et une
  media query.

La balise `theme-color` suit le thème, pour que la barre d'état du téléphone
s'accorde au fond de l'application.

## Licence

Code sous licence **MIT** (voir `LICENSE`) : réutilisation, modification et
redistribution libres, y compris par d'autres établissements, à condition de
conserver la mention de copyright.

Les polices embarquées dans `public/fonts/` relèvent de leur propre licence,
la SIL Open Font License 1.1, dont le texte est joint à côté des fichiers.

## Tablette et écran

L'application reste pensée pour le téléphone, mais s'adapte au-delà :

| Largeur | Mise en page |
|---|---|
| < 700 px | Colonne unique, navigation en bas — atteignable au pouce |
| 700 – 1023 px | Colonne élargie à 680 px, carte de révision agrandie, navigation toujours en bas : une tablette se tient en main |
| ≥ 1024 px | Rail de navigation à gauche, surface occupant toute la fenêtre, colonne de lecture bornée à 1040 px et centrée, feuilles modales converties en boîtes de dialogue centrées |

C'est la **ligne de texte** qui est bornée, pas la surface : l'application
occupe tout l'écran, mais une question et sa réponse séparées par 1 700 px
seraient illisibles.

Tout se joue dans `src/styles/app.css` : le balisage ne change pas, les
éléments sont replacés par la grille CSS. La barre du bas et le rail latéral
sont **le même composant**, seul son placement diffère.

Un piège rencontré et corrigé, à connaître avant de toucher à ces règles : dans
un conteneur flex, `margin-inline: auto` sur un enfant le réduit à la largeur
de son contenu au lieu de le centrer à sa largeur maximale. D'où les
`width: 100%` qui accompagnent chaque `max-width` dans ces media queries.

## Charte graphique

Palette « Papier », accent unique vert sapin (`#275f4a`) sur fonds crème chauds,
typographies Hanken Grotesk (interface) et IBM Plex Mono (données et libellés),
toutes deux auto-hébergées sous licence SIL Open Font License 1.1.
Toutes les valeurs sont des variables CSS définies dans
`src/styles/theme.css` : c'est le seul fichier à modifier pour ajuster le thème.

## Installation sur téléphone

Ouvrir le site dans le navigateur, puis :

- **Android / Chrome** : menu ⋮ → « Installer l'application ».
- **iPhone / Safari** : Partager → « Sur l'écran d'accueil ».

Sur iOS, l'installation sur l'écran d'accueil est **nécessaire** pour recevoir
les notifications de rappel. Le web ne permettant pas de véritable planification
en arrière-plan, les rappels sont évalués à l'ouverture de l'application et tant
qu'elle reste au premier plan ; les thèmes en attente restent signalées par
la pastille de l'onglet « Aujourd'hui ».

## Déploiement

Site statique : `npm run build` produit `dist/`.

### Chemin de publication

Le site peut être servi **à la racine d'un domaine** ou **dans un sous-dossier**,
sans modification du code. Le chemin est donné par la variable `VITE_BASE` :

```bash
npm run build                            # racine d'un domaine  →  /
VITE_BASE=/vdl-flashcards/ npm run build # sous-dossier          →  /vdl-flashcards/
```

Vite réécrit seul les chemins de `index.html` et les URL de polices du CSS. Deux
endroits demandaient un traitement explicite et l'ont reçu : le manifeste
(`start_url` et `scope`, dans `vite.config.ts`) et les icônes des notifications
(`import.meta.env.BASE_URL`, dans `src/reminders/reminders.ts`).

Le routage passant par le fragment (`#/...`), **aucune règle de réécriture
n'est nécessaire** : la seule URL réelle est celle de la page d'accueil. Les
liens de partage sont construits à partir du chemin courant et suivent donc le
sous-dossier automatiquement.

### GitLab Pages

`.gitlab-ci.yml` publie sur GitLab Pages. Le chemin est déduit de `CI_PAGES_URL`
et transmis à Vite : rien n'est écrit en dur. Le job remplace le dossier
`public/` du dépôt (polices et icônes sources, déjà consommées par la
construction) par le résultat, GitLab Pages exigeant ce nom.

Si l'instance ne dispose pas de runners partagés, il reste possible de
construire en local et de publier l'artefact à la main.

À vérifier avant la première publication : que les pages de l'instance sont
**accessibles sans authentification**, faute de quoi ni l'application ni les
liens de partage ne fonctionneraient pour les élèves.

### Synchronisation GitHub → Forge

Le développement a lieu sur GitHub, la publication sur la Forge. Comme GitLab,
dans son édition libre, ne sait pas *tirer* depuis un dépôt distant (le miroir
en extraction est réservé aux éditions payantes), c'est GitHub qui pousse :
`.github/workflows/miroir-forge.yml` recopie `main` vers la Forge à chaque
envoi, ce qui y déclenche le pipeline de publication.

Prérequis, une seule fois : un jeton de projet de la Forge (portée
`write_repository`) stocké dans les secrets GitHub sous le nom `FORGE_TOKEN`.

**Une seule source de vérité** : GitHub. Ne modifier le code directement sur la
Forge ferait diverger les deux dépôts, et la recopie échouerait — délibérément,
plutôt que d'écraser en silence.

### Netlify

`netlify.toml` est conservé — build `npm run build`, dossier publié `dist`,
publication à la racine.
