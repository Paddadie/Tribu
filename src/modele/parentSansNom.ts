// Parent sans nom : l'autre parent d'un enfant qui n'en a qu'un seul. L'arbre global le dessine en « ? » ;
// il n'est enregistré que lorsque Paul le touche pour y ajouter des informations (note, décès, union...).

import { nouvelId } from './modele';
import type { Donnees, Filiation, Personne } from './types';

/** Prénom affiché d'un parent sans nom : une personne ordinaire, que Paul renomme quand il connaît son nom. */
export const PARENT_INCONNU = 'Parent inconnu';

/** Préfixe de l'id d'un parent sans nom pas encore enregistré (calculé pour le dessin seulement). */
export const PREFIXE_VIRTUEL = 'virtuel:';

/** Le champ `sansNom` décide, plus le prénom (format v5) ; le « ? » virtuel du dessin le porte aussi. */
export function estParentSansNom(p: Pick<Personne, 'sansNom'>): boolean {
  return !!p.sansNom;
}

export function estVirtuel(id: string): boolean {
  return id.startsWith(PREFIXE_VIRTUEL);
}

/** Les filiations des enfants de `parent` qui n'ont aucun autre parent (hors parents inconnus cachés et parents sans nom). */
function filiationsSeules(d: Donnees, parent: string): Filiation[] {
  const p = d.personnes.find((x) => x.id === parent);
  if (!p || p.inconnu || estParentSansNom(p)) return [];
  return d.filiations.filter((f) => f.parent === parent && d.filiations.filter((g) => g.enfant === f.enfant).length === 1);
}

/** Données pour le dessin : un parent « ? » (virtuel) par parent dont des enfants n'ont que lui. */
export function avecParentsSansNom(d: Donnees): Donnees {
  const personnes: Personne[] = [];
  const filiations: Filiation[] = [];
  for (const p of d.personnes) {
    const seules = filiationsSeules(d, p.id);
    if (seules.length === 0) continue;
    const id = PREFIXE_VIRTUEL + p.id;
    personnes.push({ id, prenom: PARENT_INCONNU, nom: '', note: '', sansNom: true });
    for (const f of seules) filiations.push({ id: `${id}>${f.enfant}`, parent: id, enfant: f.enfant, type: f.type });
  }
  return personnes.length === 0 ? d : { ...d, personnes: [...d.personnes, ...personnes], filiations: [...d.filiations, ...filiations] };
}

/** Enregistre le parent « ? » virtuel `idVirtuel` : il devient parent de tous les enfants qui n'ont que `parent`. */
export function enregistrerParentSansNom(d: Donnees, idVirtuel: string): { donnees: Donnees; personne: Personne } | undefined {
  const parent = idVirtuel.slice(PREFIXE_VIRTUEL.length);
  const seules = filiationsSeules(d, parent);
  if (seules.length === 0) return undefined;
  const personne: Personne = { id: nouvelId(), prenom: PARENT_INCONNU, nom: '', note: '', sansNom: true };
  const liens = seules.map((f): Filiation => ({ id: nouvelId(), parent: personne.id, enfant: f.enfant, type: f.type }));
  return { donnees: { ...d, personnes: [...d.personnes, personne], filiations: [...d.filiations, ...liens] }, personne };
}
