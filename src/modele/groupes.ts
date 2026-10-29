// Groupes d’amis : création, membres, nom, groupes de la famille. Fonctions pures (voir modele.ts).

import type { Donnees, GroupeAmis } from './types';
import { exigerPersonne, nouvelId } from './personnes';

/** Groupes dont la personne est membre. */
export function groupesDe(d: Donnees, id: string): GroupeAmis[] {
  return d.groupes.filter((g) => g.membres.includes(id));
}

/**
 * Groupes dont `id` ou un membre de sa famille fait partie (liens de filiation et d'union, de proche en proche).
 * `moi` est dans tous les groupes : ses groupes ne comptent pas, sinon toute sa famille serait « famille d'un membre » partout.
 */
export function groupesDeLaFamille(d: Donnees, id: string, moi?: string): GroupeAmis[] {
  const voisins = new Map<string, string[]>();
  const lier = (a: string, b: string) => {
    voisins.set(a, [...(voisins.get(a) ?? []), b]);
    voisins.set(b, [...(voisins.get(b) ?? []), a]);
  };
  for (const f of d.filiations) lier(f.parent, f.enfant);
  for (const u of d.unions) lier(u.personneA, u.personneB);
  const vus = new Set([id]);
  const file = [id];
  const trouves = new Set<GroupeAmis>();
  for (let i = 0; i < file.length; i++) {
    if (file[i] !== moi) groupesDe(d, file[i]).forEach((g) => trouves.add(g));
    for (const v of voisins.get(file[i]) ?? []) {
      if (vus.has(v)) continue;
      vus.add(v);
      file.push(v);
    }
  }
  return [...trouves];
}

function exigerGroupe(d: Donnees, id: string): GroupeAmis {
  const g = d.groupes.find((x) => x.id === id);
  if (!g) throw new Error(`Groupe d'amis introuvable : ${id}`);
  return g;
}

/** Remplace un groupe ; un groupe qui n'a plus deux membres disparaît. */
function avecGroupe(d: Donnees, g: GroupeAmis): Donnees {
  return { ...d, groupes: d.groupes.flatMap((x) => (x.id !== g.id ? [x] : g.membres.length >= 2 ? [g] : [])) };
}

/** Groupe d'amis de deux personnes au moins, qui deviennent toutes amies entre elles. `moi`, s'il est donné, en est membre d'office. */
export function creerGroupe(d: Donnees, membres: string[], nom = '', moi?: string): { donnees: Donnees; groupe: GroupeAmis } {
  const distincts = [...new Set(moi ? [...membres, moi] : membres)];
  distincts.forEach((id) => exigerPersonne(d, id));
  if (distincts.length < 2) throw new Error('Un groupe d’amis compte au moins deux personnes');
  const groupe: GroupeAmis = { id: nouvelId(), nom: nom.trim(), membres: distincts };
  return { donnees: { ...d, groupes: [...d.groupes, groupe] }, groupe };
}

export function ajouterAuGroupe(d: Donnees, groupe: string, personne: string): Donnees {
  const g = exigerGroupe(d, groupe);
  exigerPersonne(d, personne);
  if (g.membres.includes(personne)) throw new Error('Cette personne est déjà dans ce groupe');
  return avecGroupe(d, { ...g, membres: [...g.membres, personne] });
}

/** Retire un membre ; le groupe est supprimé s'il lui reste moins de deux membres. */
export function retirerDuGroupe(d: Donnees, groupe: string, personne: string): Donnees {
  const g = exigerGroupe(d, groupe);
  if (!g.membres.includes(personne)) throw new Error('Cette personne n’est pas dans ce groupe');
  return avecGroupe(d, { ...g, membres: g.membres.filter((m) => m !== personne) });
}

export function renommerGroupe(d: Donnees, groupe: string, nom: string): Donnees {
  return avecGroupe(d, { ...exigerGroupe(d, groupe), nom: nom.trim() });
}

export function supprimerGroupe(d: Donnees, id: string): Donnees {
  exigerGroupe(d, id);
  return { ...d, groupes: d.groupes.filter((g) => g.id !== id) };
}

/** Retire une personne de tous les groupes ; ceux qui n'ont plus deux membres disparaissent. */
export function sansPersonne(groupes: GroupeAmis[], id: string): GroupeAmis[] {
  return groupes.map((g) => ({ ...g, membres: g.membres.filter((m) => m !== id) })).filter((g) => g.membres.length >= 2);
}
