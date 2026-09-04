# Flashcards — Val de Lys

Application web progressive (PWA) de flashcards pensée pour le smartphone :
création et classement des cartes, révision par répétition espacée, mode
interrogation, import/export et rappels par catégorie.

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

- **Classement** — matières › catégories › cartes, avec recherche plein texte.
- **Répétition espacée** — variante simplifiée de SM-2 : une carte ratée revient
  une minute plus tard, dans la séance en cours ; une carte acquise que l'on
  oublie repart avec un intervalle divisé par deux ; une carte sue s'espace de
  plus en plus (intervalle × facteur de facilité, 2,5 au départ).
- **Trois modes de session**
  - *Programmé* : les cartes échues du jour, plus un quota de cartes neuves ;
  - *Interrogation* : toutes les cartes des catégories cochées, échues ou non,
    mélangées — plusieurs catégories et plusieurs matières peuvent être
    combinées ;
  - *Difficiles* : uniquement les cartes déjà ratées.
- **Réponses** — « Raté », « Difficile », « Su », avec l'échéance calculée
  affichée sur chaque bouton avant de répondre.
- **Rappels** — horaire et jours de la semaine par catégorie.
- **Import** — CSV, TSV ou texte collé (`recto ; verso`), avec aperçu avant
  validation.
- **Export** — sauvegarde JSON intégrale (cartes + historique + réglages) pour
  changer d'appareil, ou CSV pour un tableur.
- **Statistiques** — activité sur 14 semaines, taux de réussite, répartition des
  cartes par état, résultats par matière.

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
  screens/     Aujourd'hui, Matières, Catégorie, Réviser, Statistiques, Réglages
  components/  icônes trait fin et briques d'interface
  styles/      charte graphique « Papier » (tokens) et mise en page
public/fonts/  polices auto-hébergées (woff2) et leurs licences OFL
scripts/       générateur d'icônes PNG et synchronisation des polices
```

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
qu'elle reste au premier plan ; les catégories en attente restent signalées par
la pastille de l'onglet « Aujourd'hui ».

## Déploiement

Site statique : `npm run build` produit `dist/`. La configuration Netlify
(`netlify.toml`) est incluse — build `npm run build`, dossier publié `dist`.
