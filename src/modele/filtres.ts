// Filtres de la liste « Toutes les fiches » : famille, amis, groupe, informations manquantes.
// Fonctions pures, testables sans navigateur.

import { MOTIF_SANS_ANNEE } from './modele';
import type { Donnees, Personne } from './types';

export type Filtre = 'tous' | 'famille' | 'amis' | 'groupe' | 'acompleter';

/** Information manquante : nom ou prénom, naissance absente, naissance sans année ou sans jour, décès sans date. */
export type Manque = 'nom' | 'naissance' | 'incomplete' | 'deces';

export const MANQUES: { manque: Manque; libelle: string; detail: string }[] = [
  { manque: 'nom', libelle: 'Nom', detail: 'Prénom ou nom manquant' },
  { manque: 'naissance', libelle: 'Naissance', detail: 'Naissance inconnue' },
  { manque: 'incomplete', libelle: 'Date incomplète', detail: 'Naissance incomplète' },
  { manque: 'deces', libelle: 'Décès', detail: 'Date de décès inconnue' },
];

export interface Critere {
  filtre: Filtre;
  /** Groupe d'amis visé quand `filtre` vaut `groupe`. */
  groupe?: string;
  /** Manques recherchés quand `filtre` vaut `acompleter` ; aucun = n'importe lequel. */
  manques?: ReadonlySet<Manque>;
}

/** Ce qui manque à la fiche (dans l'ordre de `MANQUES`). */
export function manquesDe(p: Personne): Manque[] {
  const m: Manque[] = [];
  if (!p.prenom.trim() || !p.nom.trim()) m.push('nom');
  if (!p.naissance) m.push('naissance');
  else if (MOTIF_SANS_ANNEE.test(p.naissance) || p.naissance.length < 10) m.push('incomplete');
  if (p.decede && !p.deces) m.push('deces');
  return m;
}

/**
 * Proches directs des porteurs d'un nom de famille qui n'ont pas ce nom, pour le zoom sur une famille :
 * leurs enfants, leur conjoint actuel, et l'autre parent de leurs enfants (union enregistrée ou non, séparés ou non).
 */
export function prochesDeFamille(d: Donnees, porteurs: ReadonlySet<string>): Set<string> {
  const proches = new Set<string>();
  const enfantsDesPorteurs = new Set<string>();
  for (const f of d.filiations) {
    if (!porteurs.has(f.parent)) continue;
    enfantsDesPorteurs.add(f.enfant);
    if (!porteurs.has(f.enfant)) proches.add(f.enfant);
  }
  for (const f of d.filiations) if (enfantsDesPorteurs.has(f.enfant) && !porteurs.has(f.parent)) proches.add(f.parent);
  for (const u of d.unions) {
    if (u.statut !== 'actuelle') continue;
    if (porteurs.has(u.personneA) && !porteurs.has(u.personneB)) proches.add(u.personneB);
    else if (porteurs.has(u.personneB) && !porteurs.has(u.personneA)) proches.add(u.personneA);
  }
  return proches;
}

/** Personnes reliées à `moi` par des liens de filiation ou d'union, de proche en proche (lui compris). */
export function familleDe(d: Donnees, moi: string): Set<string> {
  const voisins = new Map<string, string[]>();
  const lier = (a: string, b: string) => {
    voisins.set(a, [...(voisins.get(a) ?? []), b]);
    voisins.set(b, [...(voisins.get(b) ?? []), a]);
  };
  for (const f of d.filiations) lier(f.parent, f.enfant);
  for (const u of d.unions) lier(u.personneA, u.personneB);
  const vus = new Set([moi]);
  const file = [moi];
  for (let i = 0; i < file.length; i++) {
    for (const v of voisins.get(file[i]) ?? []) {
      if (vus.has(v)) continue;
      vus.add(v);
      file.push(v);
    }
  }
  return vus;
}

/** Garde les personnes qui répondent au critère. `moi` : la famille se compte depuis lui, et il n'est pas un « ami proche ». */
export function filtrerListe(d: Donnees, personnes: Personne[], critere: Critere, moi?: string): Personne[] {
  switch (critere.filtre) {
    case 'famille': {
      if (!moi) return personnes;
      const famille = familleDe(d, moi);
      return personnes.filter((p) => famille.has(p.id));
    }
    case 'amis': {
      const amis = new Set(d.groupes.flatMap((g) => g.membres));
      if (moi) amis.delete(moi);
      return personnes.filter((p) => amis.has(p.id));
    }
    case 'groupe': {
      const membres = d.groupes.find((g) => g.id === critere.groupe)?.membres ?? [];
      return personnes.filter((p) => membres.includes(p.id) && p.id !== moi);
    }
    case 'acompleter': {
      const voulus = critere.manques;
      // « Ne plus me la signaler » : la fiche garde ses manques, seul ce filtre l'écarte.
      return personnes.filter((p) => {
        if (p.ignorerIncomplet) return false;
        const m = manquesDe(p);
        return voulus && voulus.size > 0 ? m.some((x) => voulus.has(x)) : m.length > 0;
      });
    }
    default:
      return personnes;
  }
}
