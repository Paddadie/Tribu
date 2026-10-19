// Logique d'affichage de la liste : noms, initiales, tri, regroupement par
// lettre et filtre. Fonctions pures, testables sans navigateur.

import { MOTIF_DATE } from './modele';
import type { Personne, Sexe } from './types';

export interface Groupe {
  lettre: string;
  personnes: Personne[];
}

/** « Prénom Nom », sans espace superflu quand l'un des deux manque. */
export function nomComplet(p: Pick<Personne, 'prenom' | 'nom'>): string {
  return [p.prenom, p.nom].filter(Boolean).join(' ');
}

/** « Marc », « Marc et Claire », « Marc, Claire et Jean ». */
export function enumerer(noms: string[]): string {
  return noms.length < 2 ? (noms[0] ?? '') : `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`;
}

/** « de Marc », « d’Anne », « d’Yves » : élision devant une voyelle (pas devant un h, souvent aspiré). */
export function avecDe(nom: string): string {
  return /^[aeiouy]/.test(simplifier(nom.trim())) ? `d’${nom}` : `de ${nom}`;
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

/** Critère de tri de la liste : par prénom ou par nom de famille. */
export type Tri = 'prenom' | 'nom';

/** Clé de tri selon le critère ; à défaut, l'autre champ pour une personne sans prénom (ou sans nom). */
function cleDeTri(p: Personne, tri: Tri): string {
  return tri === 'prenom' ? p.prenom || p.nom : p.nom || p.prenom;
}

/** Comparateur selon le critère (ordre alphabétique français) ; le second champ départage les ex æquo. */
export function comparateur(tri: Tri): (a: Personne, b: Personne) => number {
  const [premier, second] = tri === 'prenom' ? (['prenom', 'nom'] as const) : (['nom', 'prenom'] as const);
  return (a, b) =>
    cleDeTri(a, tri).localeCompare(cleDeTri(b, tri), 'fr') ||
    a[premier].localeCompare(b[premier], 'fr') ||
    a[second].localeCompare(b[second], 'fr');
}

/** Nom tel qu'écrit dans la liste : « Prénom Nom » en tri par prénom, « Nom Prénom » en tri par nom. */
export function nomListe(p: Pick<Personne, 'prenom' | 'nom'>, tri: Tri): string {
  return tri === 'nom' ? [p.nom, p.prenom].filter(Boolean).join(' ') : nomComplet(p);
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

/** Texte comparable pour les homonymes : simplifié, espaces superflus retirés. */
function cleHomonyme(texte: string): string {
  return simplifier(texte).trim().split(/\s+/).join(' ');
}

/** Fiches de même prénom et même nom (casse, accents et espaces ignorés), sauf `exclue`. */
export function homonymes(personnes: Personne[], champs: Pick<Personne, 'prenom' | 'nom'>, exclue?: string): Personne[] {
  const prenom = cleHomonyme(champs.prenom);
  const nom = cleHomonyme(champs.nom);
  return personnes.filter((p) => p.id !== exclue && cleHomonyme(p.prenom) === prenom && cleHomonyme(p.nom) === nom);
}

/** Lettres de l'index latéral : A à Z, puis « # » si un groupe le porte. */
export function lettresIndex(groupes: Groupe[]): string[] {
  const lettres = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  return groupes.some((g) => g.lettre === '#') ? [...lettres, '#'] : lettres;
}

/** Groupe atteint en touchant `lettre` dans l'index : le sien, sinon le suivant, sinon le dernier. */
export function groupeVise(groupes: Groupe[], lettre: string): string | undefined {
  const index = lettresIndex(groupes);
  const presentes = new Set(groupes.map((g) => g.lettre));
  const suivante = index.slice(index.indexOf(lettre)).find((l) => presentes.has(l));
  return suivante ?? groupes.at(-1)?.lettre;
}

/** Lettre de regroupement : initiale sans accent, « # » si ce n'est pas une lettre. */
function lettreDe(p: Personne, tri: Tri): string {
  const l = simplifier(cleDeTri(p, tri)).charAt(0).toLocaleUpperCase('fr');
  return /^[A-Z]$/.test(l) ? l : '#';
}

/** Personnes triées selon le critère (par nom de famille par défaut), regroupées par lettre (« # » en dernier). */
export function grouperParLettre(personnes: Personne[], tri: Tri = 'nom'): Groupe[] {
  const groupes = new Map<string, Personne[]>();
  for (const p of [...personnes].sort(comparateur(tri))) {
    const lettre = lettreDe(p, tri);
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
/** Forme masculine, féminine, ou mixte quand le sexe n'est pas précisé. */
export function accorder(sexe: Sexe | undefined, masculin: string, feminin: string, mixte: string): string {
  return sexe === 'F' ? feminin : sexe === 'M' ? masculin : mixte;
}

/** Étiquette d'un conjoint marié, accordée à la personne affichée. */
export function libelleMarie(sexe?: Sexe): string {
  return accorder(sexe, 'Marié', 'Mariée', 'Marié(e)');
}

/** Étiquette d'un parent ou enfant adoptif, accordée à la personne affichée. */
export function libelleAdoptif(sexe?: Sexe): string {
  return accorder(sexe, 'Adoptif', 'Adoptive', 'Adoptif(ve)');
}

/** « le 14 mai 1961 », « en mai 1961 » ou « en 1961 » ; chaîne vide sans date exploitable. */
function formulerDate(date: string | undefined): string {
  const m = date?.match(MOTIF_DATE);
  if (!m) return '';
  if (m[2] === undefined) return `en ${m[1]}`;
  const mois = MOIS[Number(m[2]) - 1];
  if (!mois) return '';
  if (m[3] === undefined) return `en ${mois} ${m[1]}`;
  const jour = Number(m[3]);
  return `le ${jour === 1 ? '1er' : jour} ${mois} ${m[1]}`;
}

export function libelleNaissance(naissance: string | undefined, sexe?: Sexe): string {
  const date = formulerDate(naissance);
  return date && `${accorder(sexe, 'né', 'née', 'né(e)')} ${date}`;
}

/** « décédée le 14 janvier 2024 », accordé selon le sexe ; chaîne vide sans date de décès exploitable. */
export function libelleDeces(deces: string | undefined, sexe?: Sexe): string {
  const date = formulerDate(deces);
  return date && `${accorder(sexe, 'décédé', 'décédée', 'décédé(e)')} ${date}`;
}

export interface ChampsDate {
  jour: string;
  /** « 1 » à « 12 », ou vide. */
  mois: string;
  annee: string;
}

/** Découpe « AAAA », « AAAA-MM » ou « AAAA-MM-JJ » en champs de saisie (jour et mois sans zéro initial). */
export function decouperDate(naissance: string | undefined): ChampsDate {
  const m = naissance?.match(MOTIF_DATE);
  if (!m) return { jour: '', mois: '', annee: '' };
  return { annee: m[1], mois: m[2] ? String(Number(m[2])) : '', jour: m[3] ? String(Number(m[3])) : '' };
}

/**
 * Assemble les champs de saisie en date partielle (chaîne vide si tout est vide).
 * Lève une Error si l'année manque alors qu'un jour ou un mois est saisi, ou si le jour est sans mois.
 * La validité calendaire (30 février…) est vérifiée ensuite par le modèle.
 * `de` complète les messages d'erreur (« de naissance », « de décès »).
 */
export function assemblerDate({ jour, mois, annee }: ChampsDate, de = 'de naissance'): string {
  const [j, m, a] = [jour.trim(), mois.trim(), annee.trim()];
  if (!j && !m && !a) return '';
  if (!a) throw new Error(`Indiquez l'année ${de}`);
  if (!/^\d{1,4}$/.test(a) || Number(a) < 1) throw new Error(`Année ${de} invalide`);
  if (j && !m) throw new Error(`Indiquez le mois ${de}`);
  const annee4 = a.padStart(4, '0');
  if (!m) return annee4;
  if (!/^\d{1,2}$/.test(m)) throw new Error(`Mois ${de} invalide`);
  const mois2 = m.padStart(2, '0');
  if (!j) return `${annee4}-${mois2}`;
  if (!/^\d{1,2}$/.test(j)) throw new Error(`Jour ${de} invalide`);
  return `${annee4}-${mois2}-${j.padStart(2, '0')}`;
}
