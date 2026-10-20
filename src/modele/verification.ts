// Vérification des données (Réglages → Vérifier mes données) : repère ce qui mérite un coup d'œil sans rien modifier.
// Doublons probables, personnes isolées, dates incohérentes, fiches « Test ». Fonctions pures.

import { nomComplet, simplifier } from './liste';
import { MOTIF_DATE, personnesVisibles } from './modele';
import type { Donnees, Personne } from './types';

export interface Doublon {
  a: Personne;
  b: Personne;
  raison: string;
}

export interface DateIncoherente {
  personne: Personne;
  raison: string;
}

export interface Verification {
  doublons: Doublon[];
  isolees: Personne[];
  dates: DateIncoherente[];
  tests: Personne[];
}

/** Écart minimal, en années, entre un parent et son enfant : en dessous, la date est jugée incohérente. */
export const ECART_PARENT_MIN = 12;

function distance(a: string, b: string): number {
  let ligne = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const precedente = ligne;
    ligne = [i];
    for (let j = 1; j <= b.length; j++) {
      ligne[j] = Math.min(precedente[j] + 1, ligne[j - 1] + 1, precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return ligne[b.length];
}

const proches = (a: string, b: string): boolean => distance(a, b) <= 1 || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

/** Bornes d'une date partielle « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » : le premier et le dernier jour qu'elle peut désigner. */
function bornes(date: string | undefined): { min: string; max: string; annee: number } | undefined {
  const m = date?.match(MOTIF_DATE);
  if (!m) return undefined;
  const [, annee, mois, jour] = m;
  return {
    annee: Number(annee),
    min: `${annee}-${mois ?? '01'}-${jour ?? '01'}`,
    max: `${annee}-${mois ?? '12'}-${jour ?? '31'}`,
  };
}

export function doublonsProbables(d: Donnees): Doublon[] {
  const personnes = personnesVisibles(d).filter((p) => !p.sansNom);
  const apparentes = (a: Personne, b: Personne) =>
    d.filiations.some((f) => (f.parent === a.id && f.enfant === b.id) || (f.parent === b.id && f.enfant === a.id));
  const resultat: Doublon[] = [];
  for (let i = 0; i < personnes.length; i++) {
    for (let j = i + 1; j < personnes.length; j++) {
      const [a, b] = [personnes[i], personnes[j]];
      const [na, nb] = [bornes(a.naissance), bornes(b.naissance)];
      if (na && nb && na.annee !== nb.annee) continue;
      if (apparentes(a, b)) continue;
      const [pa, pb, fa, fb] = [simplifier(a.prenom), simplifier(b.prenom), simplifier(a.nom), simplifier(b.nom)];
      let raison: string | undefined;
      if (pa && pa === pb && fa && fb && proches(fa, fb)) raison = fa === fb ? 'Même prénom et même nom' : 'Même prénom, noms très proches';
      else if (fa && fa === fb && pa && pb && proches(pa, pb)) raison = pa === pb ? 'Même prénom et même nom' : 'Même nom, prénoms proches';
      if (!raison) continue;
      resultat.push({ a, b, raison: na && nb ? `${raison}, né(e) en ${na.annee}` : raison });
    }
  }
  return resultat;
}

export function personnesIsolees(d: Donnees): Personne[] {
  const reliees = new Set<string>();
  for (const f of d.filiations) reliees.add(f.parent).add(f.enfant);
  for (const u of d.unions) reliees.add(u.personneA).add(u.personneB);
  for (const g of d.groupes) g.membres.forEach((m) => reliees.add(m));
  return personnesVisibles(d).filter((p) => !reliees.has(p.id));
}

export function datesIncoherentes(d: Donnees): DateIncoherente[] {
  const visibles = personnesVisibles(d);
  const parId = new Map(visibles.map((p) => [p.id, p]));
  const resultat: DateIncoherente[] = [];

  for (const p of visibles) {
    const [naissance, deces] = [bornes(p.naissance), bornes(p.deces)];
    if (naissance && deces && deces.max < naissance.min) {
      resultat.push({ personne: p, raison: `Décès (${deces.annee}) avant la naissance (${naissance.annee})` });
    }
  }

  for (const f of d.filiations) {
    const [parent, enfant] = [parId.get(f.parent), parId.get(f.enfant)];
    const [np, ne] = [bornes(parent?.naissance), bornes(enfant?.naissance)];
    if (!parent || !enfant || !np || !ne) continue;
    if (np.min > ne.max) {
      resultat.push({ personne: parent, raison: `Née ou né (${np.annee}) après son enfant ${enfant.prenom || enfant.nom} (${ne.annee})` });
    } else if (ne.annee - np.annee < ECART_PARENT_MIN) {
      resultat.push({
        personne: parent,
        raison: `Moins de ${ECART_PARENT_MIN} ans avant son enfant ${enfant.prenom || enfant.nom} (${np.annee} et ${ne.annee})`,
      });
    }
  }

  for (const u of d.unions) {
    const date = bornes(u.date);
    if (!date) continue;
    for (const id of [u.personneA, u.personneB]) {
      const p = parId.get(id);
      const naissance = bornes(p?.naissance);
      if (p && naissance && date.max < naissance.min) {
        resultat.push({ personne: p, raison: `Union (${date.annee}) avant la naissance (${naissance.annee})` });
      }
    }
  }
  return resultat;
}

/** Fiches dont le prénom ou le nom est le mot « test » (restes d'essais). */
export function fichesTest(d: Donnees): Personne[] {
  return personnesVisibles(d).filter((p) => /(^|[^\p{L}])test($|[^\p{L}])/u.test(simplifier(nomComplet(p))));
}

export function verifier(d: Donnees): Verification {
  return { doublons: doublonsProbables(d), isolees: personnesIsolees(d), dates: datesIncoherentes(d), tests: fichesTest(d) };
}
