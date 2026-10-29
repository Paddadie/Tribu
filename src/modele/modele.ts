// Opérations de création / modification / suppression. Fonctions pures :
// elles renvoient de nouvelles données sans modifier les anciennes, et lèvent
// une Error (message en français) quand une règle du modèle est violée.
// Le modèle est rangé par sujet (dates, personnes, unions, filiations, groupes d'amis) ; ce module les réexporte
// tous et garde la suppression d'une personne, qui touche à chacun.

import { retirerInconnusOrphelins } from './filiations';
import { sansPersonne } from './groupes';
import { aDesLiens, estSansNomVide, exigerPersonne } from './personnes';
import type { Donnees, Personne } from './types';

export * from './dates';
export * from './personnes';
export * from './unions';
export * from './filiations';
export * from './groupes';

/** Retire la personne ainsi que toutes ses unions, filiations et appartenances à des groupes d'amis. */
export function supprimerPersonne(d: Donnees, id: string): Donnees {
  exigerPersonne(d, id);
  const voisins = new Set([
    ...d.unions.flatMap((u) => (u.personneA === id ? [u.personneB] : u.personneB === id ? [u.personneA] : [])),
    ...d.filiations.flatMap((f) => (f.parent === id ? [f.enfant] : f.enfant === id ? [f.parent] : [])),
  ]);
  const reste = retirerInconnusOrphelins({
    ...d,
    personnes: d.personnes.filter((p) => p.id !== id),
    unions: d.unions.filter((u) => u.personneA !== id && u.personneB !== id),
    filiations: d.filiations.filter((f) => f.parent !== id && f.enfant !== id),
    groupes: sansPersonne(d.groupes, id),
  });
  return retirerSansNomOrphelins(reste, voisins);
}

/**
 * Un parent « ? » enregistré, lié à la personne supprimée, qui n'a plus aucun lien et aucune information saisie
 * n'a plus de raison d'être : il est retiré. Avec une note, une date ou un sexe, il reste (Paul l'a renseigné).
 */
function retirerSansNomOrphelins(d: Donnees, candidats: Set<string>): Donnees {
  const orphelin = (p: Personne) => estSansNomVide(p) && candidats.has(p.id) && !aDesLiens(d, p.id);
  return d.personnes.some(orphelin) ? { ...d, personnes: d.personnes.filter((p) => !orphelin(p)) } : d;
}
