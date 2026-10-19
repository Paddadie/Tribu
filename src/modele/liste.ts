// Logique d'affichage de la liste : noms, initiales, tri, regroupement par
// lettre et filtre. Fonctions pures, testables sans navigateur.

import type { Personne, Sexe } from './types';

export interface Groupe {
  lettre: string;
  personnes: Personne[];
}

/** « Prénom Nom », sans espace superflu quand l'un des deux manque. */
export function nomComplet(p: Pick<Personne, 'prenom' | 'nom'>): string {
  return [p.prenom, p.nom].filter(Boolean).join(' ');
}

/** Première lettre du prénom et du nom, en majuscules. */
export function initiales(p: Pick<Personne, 'prenom' | 'nom'>): string {
  const lettres = [p.prenom, p.nom].map((s) => [...s.trim()][0] ?? '').join('');
  return lettres.toLocaleUpperCase('fr') || '?';
}

/** Minuscules, sans accents : « Éloïse » → « eloise ». */
function simplifier(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
}

/** Nom de famille, ou à défaut le prénom pour une personne sans nom. */
function cleDeTri(p: Personne): string {
  return p.nom || p.prenom;
}

/** Tri par nom de famille puis prénom (ordre alphabétique français). */
export function comparerParNom(a: Personne, b: Personne): number {
  return (
    cleDeTri(a).localeCompare(cleDeTri(b), 'fr') ||
    a.prenom.localeCompare(b.prenom, 'fr') ||
    a.nom.localeCompare(b.nom, 'fr')
  );
}

/** Personnes dont le prénom ou le nom (ou « prénom nom ») contient la saisie, sans tenir compte de la casse ni des accents. */
export function filtrerParNom(personnes: Personne[], saisie: string): Personne[] {
  const mots = simplifier(saisie).split(/\s+/).filter(Boolean);
  if (mots.length === 0) return personnes;
  return personnes.filter((p) => {
    const cible = simplifier(`${p.prenom} ${p.nom}`);
    return mots.every((m) => cible.includes(m));
  });
}

/** Lettre de regroupement : initiale sans accent, « # » si ce n'est pas une lettre. */
function lettreDe(p: Personne): string {
  const l = simplifier(cleDeTri(p)).charAt(0).toLocaleUpperCase('fr');
  return /^[A-Z]$/.test(l) ? l : '#';
}

/** Personnes triées par nom de famille, regroupées par lettre (« # » en dernier). */
export function grouperParLettre(personnes: Personne[]): Groupe[] {
  const groupes = new Map<string, Personne[]>();
  for (const p of [...personnes].sort(comparerParNom)) {
    const lettre = lettreDe(p);
    groupes.set(lettre, [...(groupes.get(lettre) ?? []), p]);
  }
  return [...groupes]
    .map(([lettre, liste]) => ({ lettre, personnes: liste }))
    .sort((a, b) => (a.lettre === '#' ? 1 : b.lettre === '#' ? -1 : a.lettre.localeCompare(b.lettre)));
}

export const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/**
 * « 1961-05-14 » → « née le 14 mai 1961 », « 1961-05 » → « née en mai 1961 »,
 * « 1961 » → « née en 1961 ». Accord selon le sexe (« né(e) » si non précisé) ;
 * chaîne vide sans date exploitable.
 */
export function libelleNaissance(naissance: string | undefined, sexe?: Sexe): string {
  const m = naissance?.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) return '';
  const ne = sexe === 'F' ? 'née' : sexe === 'M' ? 'né' : 'né(e)';
  if (m[2] === undefined) return `${ne} en ${m[1]}`;
  const mois = MOIS[Number(m[2]) - 1];
  if (!mois) return '';
  if (m[3] === undefined) return `${ne} en ${mois} ${m[1]}`;
  const jour = Number(m[3]);
  return `${ne} le ${jour === 1 ? '1er' : jour} ${mois} ${m[1]}`;
}

export interface ChampsDate {
  jour: string;
  /** « 1 » à « 12 », ou vide. */
  mois: string;
  annee: string;
}

/** Découpe « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » en champs de saisie (jour et mois sans zéro initial). */
export function decouperDate(naissance: string | undefined): ChampsDate {
  const m = naissance?.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) return { jour: '', mois: '', annee: '' };
  return { annee: m[1], mois: m[2] ? String(Number(m[2])) : '', jour: m[3] ? String(Number(m[3])) : '' };
}

/**
 * Assemble les champs de saisie en date partielle (chaîne vide si tout est vide).
 * Lève une Error si l'année manque alors qu'un jour ou un mois est saisi, ou si le jour est sans mois.
 * La validité calendaire (30 février…) est vérifiée ensuite par le modèle.
 */
export function assemblerDate({ jour, mois, annee }: ChampsDate): string {
  const [j, m, a] = [jour.trim(), mois.trim(), annee.trim()];
  if (!j && !m && !a) return '';
  if (!a) throw new Error("Indiquez l'année de naissance");
  if (!/^\d{1,4}$/.test(a) || Number(a) < 1) throw new Error('Année de naissance invalide');
  if (j && !m) throw new Error('Indiquez le mois de naissance');
  const annee4 = a.padStart(4, '0');
  if (!m) return annee4;
  if (!/^\d{1,2}$/.test(m)) throw new Error('Mois de naissance invalide');
  const mois2 = m.padStart(2, '0');
  if (!j) return `${annee4}-${mois2}`;
  if (!/^\d{1,2}$/.test(j)) throw new Error('Jour de naissance invalide');
  return `${annee4}-${mois2}-${j.padStart(2, '0')}`;
}
