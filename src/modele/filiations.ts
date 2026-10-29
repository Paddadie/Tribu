// Filiations : liens parent-enfant, parents inconnus et « ? », fratrie présumée, report d’un parent. Fonctions pures (voir modele.ts).

import type { Donnees, Filiation, Personne, TypeFiliation, Union } from './types';
import { conjointEnTrop, estSansNomVide, exigerPersonne, nouvelId } from './personnes';

export const MAX_PARENTS_PAR_TYPE = 2;

/** Un parent inconnu n'a de sens que s'il relie au moins deux enfants : sinon, il est retiré avec ses liens. */
export function retirerInconnusOrphelins(d: Donnees): Donnees {
  const orphelins = new Set(d.personnes.filter((p) => p.inconnu && d.filiations.filter((f) => f.parent === p.id).length < 2).map((p) => p.id));
  if (orphelins.size === 0) return d;
  return {
    ...d,
    personnes: d.personnes.filter((p) => !orphelins.has(p.id)),
    filiations: d.filiations.filter((f) => !orphelins.has(f.parent)),
  };
}

export function ajouterFiliation(d: Donnees, parent: string, enfant: string, type: TypeFiliation): { donnees: Donnees; filiation: Filiation } {
  exigerPersonne(d, parent);
  exigerPersonne(d, enfant);
  if (parent === enfant) throw new Error('Une personne ne peut pas être son propre parent');
  if (d.filiations.some((f) => f.parent === parent && f.enfant === enfant)) {
    throw new Error('Ce lien parent-enfant existe déjà');
  }
  const base = reprendreSansNomVide(reprendreParentsInconnus(d, parent, enfant), parent, enfant, type);
  // Le « ? » vide remplacé était le parent de cet enfant : le lien vient d'être fait.
  const repris = base.filiations.find((f) => f.parent === parent && f.enfant === enfant);
  if (repris) return { donnees: base, filiation: repris };
  exigerPlaceParent(base, enfant, type);
  if (estDescendant(base, parent, enfant)) {
    throw new Error('Ce lien créerait une boucle : le parent descend déjà de cet enfant');
  }
  const filiation: Filiation = { id: nouvelId(), parent, enfant, type };
  return { donnees: { ...base, filiations: [...base.filiations, filiation] }, filiation };
}

/** Parents inconnus de `enfant`, et les autres enfants qu'ils relient (ses frères et sœurs sans parent connu). */
function groupeInconnu(d: Donnees, enfant: string): { inconnus: Set<string>; freres: Filiation[] } {
  const inconnus = new Set(d.filiations.filter((f) => f.enfant === enfant && d.personnes.some((p) => p.id === f.parent && p.inconnu)).map((f) => f.parent));
  return { inconnus, freres: d.filiations.filter((f) => inconnus.has(f.parent) && f.enfant !== enfant) };
}

/**
 * Un vrai parent ajouté à un enfant qui n'a que des parents inconnus les remplace pour toute la fratrie :
 * les frères et sœurs deviennent enfants de ce parent, le parent inconnu disparaît (sinon ils deviendraient des demis).
 */
function reprendreParentsInconnus(d: Donnees, parent: string, enfant: string): Donnees {
  if (d.personnes.some((p) => p.id === parent && p.inconnu)) return d;
  const { inconnus, freres } = groupeInconnu(d, enfant);
  if (inconnus.size === 0) return d;
  for (const f of freres) {
    if (f.enfant === parent || estDescendant(d, parent, f.enfant)) {
      throw new Error('Ce lien créerait une boucle : le parent descend déjà d’un frère ou d’une sœur de cet enfant');
    }
  }
  const reprises = freres.filter((f) => !d.filiations.some((g) => g.parent === parent && g.enfant === f.enfant)).map((f) => ({ ...f, parent }));
  return {
    ...d,
    personnes: d.personnes.filter((p) => !inconnus.has(p.id)),
    filiations: [...d.filiations.filter((f) => !inconnus.has(f.parent)), ...reprises],
  };
}

/**
 * Un vrai parent ajouté à un enfant dont l'autre parent du même type est un « ? » sans information remplace ce « ? »
 * pour tous ses enfants : le « ? » ne bloque plus la place, et la fratrie qu'il reliait reste entière.
 */
function reprendreSansNomVide(d: Donnees, parent: string, enfant: string, type: TypeFiliation): Donnees {
  if (!estReel(d, parent)) return d;
  const vide = d.filiations.find((f) => f.enfant === enfant && f.type === type && estSansNomRemplacable(d, f.parent));
  return vide ? reporterParent(d, vide.parent, parent, false) : d;
}

/** « ? » vide qui n'a lui-même ni parent ni groupe d'amis (ses unions, elles, se reportent) : il ne compte pas comme parent. */
function estSansNomRemplacable(d: Donnees, id: string): boolean {
  const p = d.personnes.find((x) => x.id === id);
  return !!p && estSansNomVide(p) && !d.filiations.some((f) => f.enfant === id) && !d.groupes.some((g) => g.membres.includes(id));
}

/** Ni parent inconnu caché, ni « ? ». */
function estReel(d: Donnees, id: string): boolean {
  const p = d.personnes.find((x) => x.id === id);
  return !!p && !p.inconnu && !p.sansNom;
}

/**
 * Reporte tout ce qui touche le parent inconnu ou « ? » `ancien` sur la personne réelle `nouveau`, puis supprime `ancien` :
 * ses filiations (type gardé), les parents qu'on lui avait donnés, ses unions, ses groupes d'amis et sa note.
 * `strict` : refuse si `nouveau` est déjà parent de l'un des enfants (sinon ce lien-là est simplement gardé).
 * Refuse aussi une boucle, un troisième parent et un second conjoint actuel vivant.
 */
export function reporterParent(d: Donnees, ancien: string, nouveau: string, strict = true): Donnees {
  exigerPersonne(d, ancien);
  exigerPersonne(d, nouveau);
  const vieux = d.personnes.find((p) => p.id === ancien)!;
  if (!vieux.inconnu && !vieux.sansNom) throw new Error('Seul un parent inconnu ou « ? » se remplace');
  if (!estReel(d, nouveau)) throw new Error('Choisis une personne connue pour remplacer ce parent');
  const enfants = d.filiations.filter((f) => f.parent === ancien).map((f) => f.enfant);
  const dejaParent = (e: string) => d.filiations.some((f) => f.parent === nouveau && f.enfant === e);
  if (strict && enfants.some(dejaParent)) throw new Error('Cette personne est déjà un parent de l’un de ses enfants');
  if (enfants.some((e) => e === nouveau || estDescendant(d, nouveau, e))) {
    throw new Error('Ce lien créerait une boucle : cette personne descend déjà de l’un de ses enfants');
  }
  const filiations = d.filiations.flatMap((f): Filiation[] => {
    if (f.parent === ancien) return dejaParent(f.enfant) ? [] : [{ ...f, parent: nouveau }];
    if (f.enfant !== ancien) return [f];
    // Les parents qu'on avait donnés au « ? » deviennent ceux de la personne, sauf s'ils le sont déjà.
    if (f.parent === nouveau || d.filiations.some((g) => g.parent === f.parent && g.enfant === nouveau)) return [];
    if (estDescendant(d, f.parent, nouveau)) throw new Error('Ce lien créerait une boucle : un parent de ce « ? » descend de cette personne');
    return [{ ...f, enfant: nouveau }];
  });
  const memePaire = (u: Union, a: string, b: string) => (u.personneA === a && u.personneB === b) || (u.personneA === b && u.personneB === a);
  const unions = d.unions.flatMap((u): Union[] => {
    if (u.personneA !== ancien && u.personneB !== ancien) return [u];
    const autre = u.personneA === ancien ? u.personneB : u.personneA;
    // Une union avec la personne elle-même, ou en double d'une union qu'elle a déjà, n'a plus lieu d'être.
    if (autre === nouveau || d.unions.some((v) => memePaire(v, nouveau, autre))) return [];
    return [u.personneA === ancien ? { ...u, personneA: nouveau } : { ...u, personneB: nouveau }];
  });
  const note = vieux.note.trim();
  const personnes = d.personnes
    .filter((p) => p.id !== ancien)
    .map((p) => (p.id === nouveau && note ? { ...p, note: [p.note.trim(), note].filter((n) => n).join('\n\n') } : p));
  const groupes = d.groupes.map((g) => (g.membres.includes(ancien) ? { ...g, membres: [...new Set(g.membres.map((m) => (m === ancien ? nouveau : m)))] } : g));
  const apres: Donnees = { ...d, personnes, unions, filiations, groupes: groupes.filter((g) => g.membres.length >= 2) };
  for (const e of [nouveau, ...enfants]) {
    for (const t of ['biologique', 'adoptif'] as const) {
      if (apres.filiations.filter((f) => f.enfant === e && f.type === t).length > MAX_PARENTS_PAR_TYPE) throw new Error(messagePlace(t));
    }
  }
  if (conjointEnTrop(apres.personnes, apres.unions)) throw new Error('Une personne ne peut avoir qu’un seul conjoint à la fois');
  // Un parent inconnu qui reliait le « ? » à la personne n'a plus qu'un enfant.
  return retirerInconnusOrphelins(apres);
}

/** Parents de `enfant` pour un type, sans les parents inconnus cachés ni les « ? » vides (qui ne comptent pas). */
function parentsConnus(d: Donnees, enfant: string, type: TypeFiliation): string[] {
  return d.filiations
    .filter((f) => f.enfant === enfant && f.type === type)
    .map((f) => f.parent)
    .filter((id) => !d.personnes.find((x) => x.id === id)?.inconnu && !estSansNomRemplacable(d, id));
}

/**
 * Présomption de fratrie : les enfants qui partagent l'unique parent connu de `enfant` (même type de lien), sans autre
 * parent connu de ce type, sont présumés ses frères et sœurs complets. Un parent ajouté à `enfant` leur est proposé
 * (cases cochées d'office). Les demis (autre parent connu et différent) et les liens d'un autre type n'y sont jamais.
 */
export function fratriePresumee(d: Donnees, enfant: string, type: TypeFiliation): Personne[] {
  const miens = parentsConnus(d, enfant, type);
  if (miens.length !== 1) return [];
  const [seul] = miens;
  const ids = new Set(
    d.filiations
      .filter((f) => f.parent === seul && f.type === type && f.enfant !== enfant)
      .map((f) => f.enfant)
      .filter((e) => {
        const siens = parentsConnus(d, e, type);
        return siens.length === 1 && siens[0] === seul;
      }),
  );
  return d.personnes.filter((p) => ids.has(p.id));
}

/**
 * Relie `enfant` à plusieurs parents d'un coup (enfant d'un couple, frère ou sœur), avec le même type.
 * Un parent déjà relié à l'enfant est passé ; au moins un parent est demandé.
 * Si l'enfant avait des frères et sœurs sans parent connu, les parents sont aussi les leurs. `freres` : les frères et
 * sœurs présumés qui reçoivent aussi ces parents (les cases cochées de l'écran) ; par défaut, toute la `fratriePresumee`.
 */
export function ajouterFiliations(d: Donnees, parents: string[], enfant: string, type: TypeFiliation, freres?: string[]): Donnees {
  if (parents.length === 0) throw new Error('Coche au moins un parent');
  const presumes = freres ?? fratriePresumee(d, enfant, type).map((p) => p.id);
  const fratrie = [enfant, ...new Set([...groupeInconnu(d, enfant).freres.map((f) => f.enfant), ...presumes])];
  const relier = (x: Donnees, parent: string, e: string) =>
    x.filiations.some((f) => f.parent === parent && f.enfant === e) ? x : ajouterFiliation(x, parent, e, type).donnees;
  return parents.reduce((x, parent) => fratrie.reduce((y, e) => relier(y, parent, e), x), d);
}

/**
 * Frère ou sœur sans parent connu : `a` (la fiche) n'a aucun parent connu. Si `b` en a, `a` devient leur enfant ;
 * sinon, les deux sont reliés à un parent inconnu créé en coulisse (réutilisé s'ils en ont déjà un, fusionné s'ils en ont deux).
 */
export function ajouterFrereSansParent(d: Donnees, a: string, b: string): Donnees {
  exigerPersonne(d, a);
  exigerPersonne(d, b);
  if (a === b) throw new Error('Une personne ne peut pas être son propre frère ou sa propre sœur');
  const estInconnuId = (id: string) => d.personnes.some((p) => p.id === id && p.inconnu);
  const reels = (id: string) => d.filiations.filter((f) => f.enfant === id && !estInconnuId(f.parent));
  const inconnuDe = (id: string) => d.filiations.find((f) => f.enfant === id && estInconnuId(f.parent))?.parent;
  if (reels(a).length > 0) throw new Error('Cette personne a des parents connus : coche-les pour lui ajouter un frère ou une sœur');
  const parentsDeB = reels(b);
  if (parentsDeB.length > 0) {
    return ajouterFiliations(
      d,
      parentsDeB.map((f) => f.parent),
      a,
      'biologique',
    );
  }
  const [pa, pb] = [inconnuDe(a), inconnuDe(b)];
  if (pa && pa === pb) throw new Error('Ces deux personnes sont déjà frères ou sœurs');
  const inconnu: Personne = { id: pa ?? pb ?? nouvelId(), prenom: '', nom: '', note: '', inconnu: true };
  // Un groupe existant l'emporte ; deux groupes distincts fusionnent dans celui de `a`.
  const fusion = pa && pb ? pb : undefined;
  const personnes = pa || pb ? d.personnes : [...d.personnes, inconnu];
  const filiations = d.filiations.map((f) => (f.parent === fusion ? { ...f, parent: inconnu.id } : f));
  for (const enfant of [a, b]) {
    if (!filiations.some((f) => f.parent === inconnu.id && f.enfant === enfant)) {
      filiations.push({ id: nouvelId(), parent: inconnu.id, enfant, type: 'biologique' });
    }
  }
  return { ...d, personnes: personnes.filter((p) => p.id !== fusion), filiations };
}

/** Change le type (biologique/adoptif) d'un lien existant, sous la même limite de deux parents par type. */
export function modifierFiliation(d: Donnees, id: string, type: TypeFiliation): Donnees {
  const lien = d.filiations.find((f) => f.id === id);
  if (!lien) throw new Error(`Filiation introuvable : ${id}`);
  if (lien.type === type) return d;
  exigerPlaceParent(d, lien.enfant, type);
  return { ...d, filiations: d.filiations.map((f) => (f.id === id ? { ...f, type } : f)) };
}

function exigerPlaceParent(d: Donnees, enfant: string, type: TypeFiliation): void {
  const memeType = d.filiations.filter((f) => f.enfant === enfant && f.type === type);
  if (memeType.length >= MAX_PARENTS_PAR_TYPE) throw new Error(messagePlace(type));
}

function messagePlace(type: TypeFiliation): string {
  return `Un enfant a au plus ${MAX_PARENTS_PAR_TYPE} parents ${type === 'biologique' ? 'biologiques' : 'adoptifs'}`;
}

/** Vrai si `id` descend (à n'importe quel degré) de `ancetre`. */
function estDescendant(d: Donnees, id: string, ancetre: string): boolean {
  const vus = new Set<string>();
  const pile = [id];
  while (pile.length > 0) {
    const courant = pile.pop() as string;
    for (const f of d.filiations) {
      if (f.enfant !== courant || vus.has(f.parent)) continue;
      if (f.parent === ancetre) return true;
      vus.add(f.parent);
      pile.push(f.parent);
    }
  }
  return false;
}

export function supprimerFiliation(d: Donnees, id: string): Donnees {
  if (!d.filiations.some((f) => f.id === id)) throw new Error(`Filiation introuvable : ${id}`);
  return retirerInconnusOrphelins({ ...d, filiations: d.filiations.filter((f) => f.id !== id) });
}
