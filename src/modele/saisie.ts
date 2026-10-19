// Aides à la saisie des écrans d'ajout : nom prérempli d'un nouvel enfant et
// personnes suggérées en tête des listes de choix. Fonctions pures.

import { conjoint } from './deductions';
import { avecDe, comparateur } from './liste';
import { enCouple } from './modele';
import type { Donnees, Personne } from './types';

export interface NomPropose {
  nom: string;
  /** Parent qui porte ce nom. */
  de: Personne;
}

/**
 * Noms proposés pour un nouvel enfant de `parents` (la fiche ouverte d'abord) ; le premier est prérempli.
 * Couple homme-femme : le père, puis la mère. Sinon (un seul parent, sexe non précisé, même sexe) : l'ordre reçu.
 * Les noms vides et les doublons sont retirés.
 */
export function nomsEnfant(parents: Personne[]): NomPropose[] {
  const [a, b] = parents;
  const ordre = a && b && a.sexe && b.sexe && a.sexe !== b.sexe ? (a.sexe === 'M' ? [a, b] : [b, a]) : parents;
  const vus = new Set<string>();
  return ordre.flatMap((de) => {
    const nom = de.nom.trim();
    if (!nom || vus.has(nom)) return [];
    vus.add(nom);
    return [{ nom, de }];
  });
}

export type RoleSuggere = 'conjoint' | 'parent' | 'enfant';

export interface Suggestion {
  personne: Personne;
  /** Pourquoi elle est proposée (« Conjoint de Léa »). */
  detail: string;
}

const appel = (p: Personne) => p.prenom || p.nom;

/**
 * Personnes probables pour le lien à créer depuis la fiche `id` :
 * parent → le conjoint d'un parent déjà saisi ; enfant → les enfants du conjoint qui ne sont pas encore les siens ;
 * conjoint → l'autre parent de ses enfants, s'il n'est pas en couple. Ordre alphabétique, sans doublon.
 */
export function suggestions(d: Donnees, id: string, role: RoleSuggere): Suggestion[] {
  const personne = (x: string) => d.personnes.find((p) => p.id === x);
  const parentsDe = (x: string) => d.filiations.filter((f) => f.enfant === x).map((f) => f.parent);
  const enfantsDe = (x: string) => d.filiations.filter((f) => f.parent === x).map((f) => f.enfant);
  const trouvees = new Map<string, string>();
  const proposer = (x: string, detail: string) => {
    if (x !== id && !trouvees.has(x)) trouvees.set(x, detail);
  };

  if (role === 'parent') {
    const miens = parentsDe(id);
    for (const pa of miens) {
      const c = conjoint(d, pa);
      if (c && !miens.includes(c.personne.id)) proposer(c.personne.id, `Conjoint ${avecDe(appel(personne(pa) as Personne))}`);
    }
  } else if (role === 'enfant') {
    const c = conjoint(d, id);
    const miens = enfantsDe(id);
    if (c) for (const e of enfantsDe(c.personne.id)) if (!miens.includes(e)) proposer(e, `Enfant ${avecDe(appel(c.personne))}`);
  } else if (!enCouple(d, id)) {
    for (const e of enfantsDe(id)) {
      for (const pa of parentsDe(e)) if (pa !== id && !enCouple(d, pa)) proposer(pa, `Parent ${avecDe(appel(personne(e) as Personne))}`);
    }
  }

  const parNom = comparateur('prenom');
  return [...trouvees].flatMap(([x, detail]) => {
    const p = personne(x);
    return p ? [{ personne: p, detail }] : [];
  }).sort((a, b) => parNom(a.personne, b.personne));
}
