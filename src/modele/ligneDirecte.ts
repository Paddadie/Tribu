// Filtre « Ligne directe » de l'arbre global et de son export PNG : qui garder autour de « Moi ».
// Trois niveaux, chacun ajoutant au précédent : ancêtres, Moi, son conjoint et ses descendants ; puis tous les
// enfants des ancêtres (frères et sœurs de chaque génération, demis compris) ; puis les conjoints et ex de chacun.
// Un enfant gardé garde tous ses parents : sans cela, l'arbre dessinerait un faux « ? » (parentSansNom.ts) à côté
// d'un demi-oncle ou d'un petit-enfant.

import type { Donnees } from './types';

export type Affichage = 'tout' | 'directe' | 'fratries' | 'conjoints';
export type NiveauLignee = Exclude<Affichage, 'tout'>;

/** Dans l'ordre de la feuille « Afficher » de l'arbre et du choix de l'export PNG. */
export const AFFICHAGES: { valeur: Affichage; libelle: string; detail: string; pastille?: string }[] = [
  { valeur: 'tout', libelle: 'Tout l’arbre', detail: 'Toute ta famille et tes amis' },
  { valeur: 'directe', libelle: 'Ligne directe', detail: 'Tes ancêtres, toi et tes descendants', pastille: 'Ligne directe' },
  {
    valeur: 'fratries',
    libelle: 'Ligne directe + frères et sœurs',
    detail: 'Oncles, tantes, grands-oncles… et tes frères et sœurs',
    pastille: 'Ligne directe + frères et sœurs',
  },
  // Pastille plus courte que le libellé : sur téléphone, le rappel tient sur une ligne.
  {
    valeur: 'conjoints',
    libelle: 'Ligne directe + frères et sœurs + leurs conjoints',
    detail: 'Avec aussi les conjoints et les ex de chacun',
    pastille: 'Ligne directe + conjoints',
  },
];

/** Parcours depuis `depart` (exclu) en suivant `suivants`, sans repasser par une même personne. */
function atteints(depart: string, suivants: (id: string) => string[]): Set<string> {
  const vus = new Set<string>();
  const file = [depart];
  for (let i = 0; i < file.length; i++) {
    for (const v of suivants(file[i])) {
      if (v === depart || vus.has(v)) continue;
      vus.add(v);
      file.push(v);
    }
  }
  return vus;
}

/** Les personnes à garder pour `niveau` (Moi compris) ; vide si Moi n'existe pas. Filiations biologiques et adoptives. */
export function ligneDirecte(d: Donnees, moi: string, niveau: NiveauLignee): Set<string> {
  const existe = new Set(d.personnes.map((p) => p.id));
  if (!existe.has(moi)) return new Set();
  const parents = new Map<string, string[]>();
  const enfants = new Map<string, string[]>();
  for (const f of d.filiations) {
    if (!existe.has(f.parent) || !existe.has(f.enfant)) continue;
    parents.set(f.enfant, [...(parents.get(f.enfant) ?? []), f.parent]);
    enfants.set(f.parent, [...(enfants.get(f.parent) ?? []), f.enfant]);
  }
  const unions = d.unions.filter((u) => existe.has(u.personneA) && existe.has(u.personneB));
  const conjointsDe = (id: string, actuels: boolean) =>
    unions
      .filter((u) => (u.personneA === id || u.personneB === id) && (!actuels || u.statut === 'actuelle'))
      .map((u) => (u.personneA === id ? u.personneB : u.personneA));

  const ancetres = atteints(moi, (id) => parents.get(id) ?? []);
  const descendants = atteints(moi, (id) => enfants.get(id) ?? []);
  // Enfants « par le sang » de la sélection : ce sont eux qui gardent tous leurs parents.
  const parSang = new Set(descendants);
  if (niveau !== 'directe') for (const a of ancetres) for (const e of enfants.get(a) ?? []) if (e !== moi && !ancetres.has(e)) parSang.add(e);

  const garder = new Set([moi, ...ancetres, ...parSang, ...conjointsDe(moi, true)]);
  for (const e of parSang) for (const p of parents.get(e) ?? []) garder.add(p);
  if (niveau === 'conjoints') for (const id of [...garder]) for (const c of conjointsDe(id, false)) garder.add(c);
  // Un parent inconnu ne sert qu'à relier des frères et sœurs : seul avec un enfant, il n'a plus de raison d'être.
  for (const p of d.personnes) if (p.inconnu && garder.has(p.id) && (enfants.get(p.id) ?? []).filter((e) => garder.has(e)).length < 2) garder.delete(p.id);
  return garder;
}

/** Personnes à garder pour l'affichage choisi ; undefined pour « Tout l'arbre ». */
export function garderPour(d: Donnees, moi: string, affichage: Affichage): Set<string> | undefined {
  return affichage === 'tout' ? undefined : ligneDirecte(d, moi, affichage);
}

/**
 * Les données réduites aux personnes de `garder`, avec les seuls liens entre elles. Sans groupes d'amis, sauf ceux
 * dont `garder` contient l'id (export PNG d'un groupe, cibleImage.ts), réduits à leurs membres gardés.
 */
export function restreindre(d: Donnees, garder: Set<string>): Donnees {
  return {
    ...d,
    personnes: d.personnes.filter((p) => garder.has(p.id)),
    unions: d.unions.filter((u) => garder.has(u.personneA) && garder.has(u.personneB)),
    filiations: d.filiations.filter((f) => garder.has(f.parent) && garder.has(f.enfant)),
    groupes: d.groupes.filter((g) => garder.has(g.id)).map((g) => ({ ...g, membres: g.membres.filter((m) => garder.has(m)) })),
  };
}
