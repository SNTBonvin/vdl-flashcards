# Flashcards — Val de Lys

Application web progressive (PWA) de flashcards pensée pour le smartphone :
création et classement des cartes, révision par répétition espacée, mode
interrogation, import/export et rappels par thème.

Tout est stocké **localement** sur l'appareil (IndexedDB). Aucun compte, aucun
serveur, fonctionnement hors ligne complet une fois l'application installée.

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
- **Statistiques** — activité sur 14 semaines, taux de réussite, répartition des
  cartes par état, résultats par matière.
- **Thème clair et sombre** — automatique (suit le téléphone), clair ou sombre,
  au choix et par appareil.

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

Trois règles gouvernent la réception (`importShare` dans `src/state/store.tsx`) :

- **Rien n'est ajouté automatiquement.** Le lien affiche un aperçu ; l'élève
  décide.
- **La progression est conservée.** Les cartes sont appariées sur leur recto
  normalisé : une carte déjà travaillée garde son intervalle et son historique
  même si l'auteur en corrige le verso. Le lien porte un identifiant de partage
  stable, si bien qu'une rediffusion met le jeu à jour au lieu de le dupliquer.
- **Un lien ne supprime jamais rien.** Une carte retirée par l'auteur reste chez
  ceux qui l'avaient déjà reçue.

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

Site statique : `npm run build` produit `dist/`. La configuration Netlify
(`netlify.toml`) est incluse — build `npm run build`, dossier publié `dist`.
