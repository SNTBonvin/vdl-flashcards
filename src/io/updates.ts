/**
 * Vérification silencieuse des jeux reçus par code.
 *
 * Un thème reçu sous un code garde ce code. L'application peut donc regarder
 * d'elle-même si le professeur a redéposé le fichier depuis, et le signaler
 * d'une pastille. Ce qu'elle ne fait **pas** : importer toute seule. La mise à
 * jour reste un geste de l'élève, avec l'aperçu habituel — c'est son appareil,
 * ce sont ses cartes, et une carte qui change sous ses yeux sans qu'il l'ait
 * demandé serait déroutante.
 *
 * Ce que cette vérification coûte en vie privée : une requête vers le site qui
 * sert déjà l'application, sur une adresse publique, sans rien envoyer de
 * l'élève — ni identité, ni progression, ni réponse. Aucun tiers n'est
 * contacté. C'est la même requête que le bouton « Vérifier les mises à jour »,
 * faite d'avance.
 *
 * Trois précautions pour qu'elle reste discrète :
 *  - **au plus une fois par heure** et par jeu : la vérification n'a lieu qu'au
 *    lancement de l'application, et ce délai évite seulement d'y revenir quand
 *    on la rouvre dix fois de suite ;
 *  - **rien quand le navigateur se sait hors ligne**, et aucun message
 *    d'erreur quand la requête échoue : l'élève n'avait rien demandé ;
 *  - **on s'arrête dès qu'une mise à jour est trouvée** : inutile d'y revenir
 *    tant qu'il ne l'a pas prise.
 */

import type { Deck, ID } from '../db/types'
import { fetchSet } from './catalog'

/**
 * Délai minimal entre deux regards sur un même jeu. Assez court pour qu'un
 * dépôt fait le matin soit vu dans la journée, assez long pour qu'ouvrir et
 * refermer l'application ne déclenche pas une rafale de requêtes.
 */
export const CHECK_EVERY_MS = 60 * 60 * 1000

/** Une révision plus récente que celle reçue attend ce thème. */
export function hasUpdate(deck: Deck): boolean {
  return deck.setCode != null && (deck.setUpdateRev ?? 0) > (deck.shareRev ?? 0)
}

/** Thèmes en attente de mise à jour, pour la pastille d'accueil. */
export function pendingUpdates(decks: Deck[]): Deck[] {
  return decks.filter(hasUpdate)
}

/**
 * Passe en revue les thèmes reçus par code et note ce qui est disponible.
 *
 * Ne lève jamais : une panne de réseau, un code retiré du site ou un fichier
 * abîmé se traduisent par un simple « on a regardé », sans rien afficher.
 */
export async function checkSets(
  decks: Deck[],
  patch: (id: ID, patch: Partial<Omit<Deck, 'id'>>) => Promise<void>,
  now = Date.now(),
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  for (const deck of decks) {
    if (!deck.setCode) continue
    if (hasUpdate(deck)) continue
    if (now - (deck.setCheckedAt ?? 0) < CHECK_EVERY_MS) continue

    try {
      const set = await fetchSet(deck.setCode)
      await patch(deck.id, { setCheckedAt: Date.now(), setUpdateRev: set.rev })
    } catch {
      // On note quand même l'essai : sans cela, un site injoignable ferait
      // repartir la vérification à chaque ouverture de l'application.
      await patch(deck.id, { setCheckedAt: Date.now() })
    }
  }
}
