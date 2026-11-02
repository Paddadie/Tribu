// Familles des amis filtrées par groupe d'amis : puces de « Mes amis » (accueil) et de la feuille « Amis » (arbre).

import { nomGroupe } from './deductions';
import type { Donnees, GroupeAmis } from './types';

/** Une famille et le nombre de ses porteurs que le filtre retient. */
export interface FamilleComptee<F> {
  famille: F;
  n: number;
}

/** Un filtre en puce : « Tout » (sans groupe) ou un groupe d'amis, avec les familles qu'il laisse voir. */
export interface FiltreFamilles<F> {
  nom: string;
  groupe?: GroupeAmis;
  familles: FamilleComptee<F>[];
}

/**
 * « Tout » (chaque famille sur tous ses porteurs), puis un filtre par groupe, par ordre alphabétique : une famille y
 * compte seulement ses porteurs membres du groupe, et n'y figure pas sans aucun. Un groupe sans famille n'a pas de filtre.
 */
export function filtresFamillesAmis<F extends { ids: string[] }>(d: Donnees, familles: F[]): FiltreFamilles<F>[] {
  const groupes = d.groupes
    .map((groupe) => ({ groupe, nom: nomGroupe(d, groupe) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .flatMap(({ groupe, nom }) => {
      const membres = new Set(groupe.membres);
      const retenues = familles.flatMap((famille) => {
        const n = famille.ids.filter((id) => membres.has(id)).length;
        return n === 0 ? [] : [{ famille, n }];
      });
      return retenues.length === 0 ? [] : [{ nom, groupe, familles: retenues }];
    });
  return [{ nom: 'Tout', familles: familles.map((famille) => ({ famille, n: famille.ids.length })) }, ...groupes];
}
