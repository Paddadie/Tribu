// Logique d'affichage de la liste : noms, initiales, tri, regroupement par
// lettre et filtre. Fonctions pures, testables sans navigateur.

import { MOTIF_DATE, MOTIF_SANS_ANNEE } from './modele';
import type { Donnees, Personne, Sexe, Union } from './types';

export interface Groupe {
  lettre: string;
  personnes: Personne[];
}

/** « Prénom Nom », sans espace superflu quand l'un des deux manque. */
export function nomComplet(p: Pick<Personne, 'prenom' | 'nom'>): string {
  return [p.prenom, p.nom].filter(Boolean).join(' ');
}

/** Le prénom, ou le nom à défaut : comme on appelle la personne (« Karim »). */
export function prenomOuNom(p: Pick<Personne, 'prenom' | 'nom'>): string {
  return p.prenom || p.nom;
}

/** Première lettre en capitale : « Cousine », « Mardi 3 mars ». */
export function majuscule(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1);
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

/** Nombre de couleurs de famille (pastels --c0 à --c11 de style.css). */
export const NB_COULEURS = 12;

/** Clé de famille d'une personne : nom actuel, nom de naissance à défaut, sans accents, casse ni ponctuation. */
function cleFamille(p: Pick<Personne, 'nom'> & { nomNaissance?: string }): string {
  return simplifier(p.nom.trim() || (p.nomNaissance ?? '')).replace(/[^a-z0-9]/g, '');
}

/** Couleur tirée du nom seul (0 à 11). */
function couleurDuNom(cle: string): number {
  let somme = 0;
  for (const c of cle) somme = (somme * 31 + c.charCodeAt(0)) >>> 0;
  return somme % NB_COULEURS;
}

/** Paires de pastels trop proches à l'œil, en clair ou en sombre (écart OKLab sous 0,065, V4 point 16). */
const PROCHES = new Set(['0-9', '1-5', '1-6', '2-4', '2-7', '3-5', '3-10', '4-9', '6-11']);
export const couleursProches = (a: number, b: number) => a === b || PROCHES.has(a < b ? `${a}-${b}` : `${b}-${a}`);

const attributions = new WeakMap<Donnees, Map<string, number>>();

/**
 * Couleur de chaque famille des données (V4, point 16). Une famille garde la couleur de son nom si aucune autre
 * n'en a une trop proche ; sinon elle prend la suivante qui convient. Les grandes familles choisissent d'abord.
 * Quand la palette ne suffit plus, seules les familles liées (union, filiation, nom de naissance) restent distinctes.
 * Mémorisé par objet `Donnees` : chaque modification en crée un nouveau.
 */
export function couleursDesFamilles(d: Donnees): Map<string, number> {
  const deja = attributions.get(d);
  if (deja) return deja;
  const personnes = d.personnes.filter((p) => !p.inconnu && cleFamille(p));
  const cleDe = new Map(personnes.map((p) => [p.id, cleFamille(p)]));
  const taille = new Map<string, number>();
  for (const k of cleDe.values()) taille.set(k, (taille.get(k) ?? 0) + 1);
  const liees = new Map<string, Set<string>>();
  const lier = (a?: string, b?: string) => {
    if (!a || !b || a === b || !taille.has(a) || !taille.has(b)) return;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ])
      liees.set(x, (liees.get(x) ?? new Set()).add(y));
  };
  for (const u of d.unions) lier(cleDe.get(u.personneA), cleDe.get(u.personneB));
  for (const f of d.filiations) lier(cleDe.get(f.parent), cleDe.get(f.enfant));
  for (const p of personnes) if (p.nomNaissance) lier(cleDe.get(p.id), cleFamille({ nom: p.nomNaissance }));

  const res = new Map<string, number>();
  const libre = (depart: number, prises: number[]) => {
    for (let i = 0; i < NB_COULEURS; i++) {
      const k = (depart + i) % NB_COULEURS;
      if (!prises.some((x) => couleursProches(k, x))) return k;
    }
    return undefined;
  };
  for (const cle of [...taille.keys()].sort((a, b) => taille.get(b)! - taille.get(a)! || (a < b ? -1 : 1))) {
    const h = couleurDuNom(cle);
    const voisines = [...(liees.get(cle) ?? [])].filter((x) => res.has(x)).map((x) => res.get(x)!);
    res.set(cle, libre(h, [...res.values()]) ?? libre(h, voisines) ?? h);
  }
  attributions.set(d, res);
  return res;
}

/**
 * Couleur de famille (0 à 11), la même partout (liste, fiche, dessins, arbre) : celle que `couleursDesFamilles`
 * donne au nom actuel, au nom de naissance à défaut ; sans données, celle du nom seul. Aucune sans nom.
 */
export function couleurFamille(p: Pick<Personne, 'nom'> & { nomNaissance?: string }, d?: Donnees): number | undefined {
  const cle = cleFamille(p);
  if (!cle) return undefined;
  return (d && couleursDesFamilles(d).get(cle)) ?? couleurDuNom(cle);
}

/** « née Kervadec », « né Roux » : le nom de naissance s'il diffère du nom actuel (nœuds de l'arbre principal). */
export function mentionNaissance(p: Pick<Personne, 'nom' | 'sexe'> & { nomNaissance?: string }): string | undefined {
  const n = p.nomNaissance?.trim();
  return n && !memeNom(n, p.nom) ? `${accorder(p.sexe, 'né', 'née', 'né(e)')} ${n}` : undefined;
}

/** Minuscules, sans accents : « Éloïse » → « eloise ». */
export function simplifier(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
}

/** Même nom de famille, sans tenir compte de la casse, des accents ni des espaces ; faux si l'un des deux est vide. */
export function memeNom(a: string, b: string): boolean {
  const cle = cleHomonyme(a);
  return cle !== '' && cle === cleHomonyme(b);
}

/**
 * Noms de famille déjà saisis (actuels et de naissance), pour l'assistance à la saisie : un par nom
 * (casse, accents et espaces ignorés, graphie la plus fréquente gardée), les plus répandus d'abord.
 */
export function nomsConnus(personnes: Personne[]): string[] {
  return textesConnus(personnes.flatMap((p) => [p.nom, p.nomNaissance]));
}

/** Lieux déjà saisis (naissance, décès, mariage), sur le même principe que `nomsConnus`. */
export function lieuxConnus(personnes: Personne[], unions: Pick<Union, 'lieu'>[]): string[] {
  return textesConnus([...personnes.flatMap((p) => [p.lieuNaissance, p.lieuDeces]), ...unions.map((u) => u.lieu)]);
}

/** Un texte par graphie proche (casse, accents et espaces ignorés), la plus fréquente gardée ; les plus répandus d'abord. */
function textesConnus(valeurs: (string | undefined)[]): string[] {
  const parCle = new Map<string, Map<string, number>>();
  for (const brut of valeurs) {
    const nom = brut?.trim().replace(/\s+/g, ' ');
    const cle = nom ? cleHomonyme(nom) : '';
    if (!nom || !cle) continue;
    const graphies = parCle.get(cle) ?? new Map<string, number>();
    graphies.set(nom, (graphies.get(nom) ?? 0) + 1);
    parCle.set(cle, graphies);
  }
  const lignes = [...parCle.values()].map((graphies) => {
    const tri = [...graphies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'));
    return { nom: tri[0][0], total: tri.reduce((s, [, n]) => s + n, 0) };
  });
  return lignes.sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'fr')).map((l) => l.nom);
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
    cleDeTri(a, tri).localeCompare(cleDeTri(b, tri), 'fr') || a[premier].localeCompare(b[premier], 'fr') || a[second].localeCompare(b[second], 'fr');
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

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

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

/** Étiquette d'un conjoint dont le mariage est annoncé (union à date future), accordée à la personne affichée. */
export function libelleFiance(sexe?: Sexe): string {
  return accorder(sexe, 'Fiancé', 'Fiancée', 'Fiancé(e)');
}

/** Étiquette d'un parent ou enfant adoptif, accordée à la personne affichée. */
export function libelleAdoptif(sexe?: Sexe): string {
  return accorder(sexe, 'Adoptif', 'Adoptive', 'Adoptif(ve)');
}

/** « le 14 » ou « le 1er ». */
function leJour(jour: number): string {
  return `le ${jour === 1 ? '1er' : jour}`;
}

/** « le 14 mai 1961 », « en mai 1961 », « en 1961 » ou, sans année, « le 14 mai » ; chaîne vide sans date exploitable. */
function formulerDate(date: string | undefined): string {
  const sansAnnee = date?.match(MOTIF_SANS_ANNEE);
  if (sansAnnee) {
    const mois = MOIS[Number(sansAnnee[1]) - 1];
    return mois ? `${leJour(Number(sansAnnee[2]))} ${mois}` : '';
  }
  const m = date?.match(MOTIF_DATE);
  if (!m) return '';
  if (m[2] === undefined) return `en ${m[1]}`;
  const mois = MOIS[Number(m[2]) - 1];
  if (!mois) return '';
  if (m[3] === undefined) return `en ${mois} ${m[1]}`;
  return `${leJour(Number(m[3]))} ${mois} ${m[1]}`;
}

/** Date formulée puis « à <lieu> », chacun seulement s'il est connu : « le 3 mai 1975 à Brest », « à Brest », « en 1975 ». */
function quandEtOu(date: string | undefined, lieu: string | undefined): string {
  return [formulerDate(date), lieu?.trim() && `à ${lieu.trim()}`].filter(Boolean).join(' ');
}

/** « le 12 juin 2010 », « en 2010 à Brest »… pour une union ; chaîne vide sans date ni lieu. */
export function libelleUnion(date: string | undefined, lieu?: string): string {
  return quandEtOu(date, lieu);
}

/** « née le 8 février 1950 à Quimper », « né à Brest »… ; chaîne vide sans date ni lieu. */
export function libelleNaissance(naissance: string | undefined, sexe?: Sexe, lieu?: string): string {
  const quand = quandEtOu(naissance, lieu);
  return quand && `${accorder(sexe, 'né', 'née', 'né(e)')} ${quand}`;
}

/**
 * « décédée le 14 janvier 2024 (à Brest) », accordé selon le sexe ; « décédée » seul pour un décès sans date ni lieu
 * (`decede`) ; chaîne vide sinon.
 */
export function libelleDeces(deces: string | undefined, sexe?: Sexe, decede = false, lieu?: string): string {
  const quand = quandEtOu(deces, lieu);
  const mot = accorder(sexe, 'décédé', 'décédée', 'décédé(e)');
  return quand ? `${mot} ${quand}` : decede ? mot : '';
}

export interface ChampsDate {
  jour: string;
  /** « 1 » à « 12 », ou vide. */
  mois: string;
  annee: string;
}

/** Découpe « AAAA », « AAAA-MM », « AAAA-MM-JJ » ou « --MM-JJ » en champs de saisie (jour et mois sans zéro initial). */
export function decouperDate(naissance: string | undefined): ChampsDate {
  const sansAnnee = naissance?.match(MOTIF_SANS_ANNEE);
  if (sansAnnee) return { annee: '', mois: String(Number(sansAnnee[1])), jour: String(Number(sansAnnee[2])) };
  const m = naissance?.match(MOTIF_DATE);
  if (!m) return { jour: '', mois: '', annee: '' };
  return { annee: m[1], mois: m[2] ? String(Number(m[2])) : '', jour: m[3] ? String(Number(m[3])) : '' };
}

/**
 * Assemble les champs de saisie en date partielle (chaîne vide si tout est vide).
 * Lève une Error si l'année manque alors qu'un jour ou un mois est saisi, ou si le jour est sans mois.
 * Avec `sansAnnee`, jour et mois sans année donnent « --MM-JJ ».
 * La validité calendaire (30 février…) est vérifiée ensuite par le modèle.
 * `de` complète les messages d'erreur (« de naissance », « de décès »).
 */
export function assemblerDate({ jour, mois, annee }: ChampsDate, de = 'de naissance', sansAnnee = false): string {
  const [j, m, a] = [jour.trim(), mois.trim(), annee.trim()];
  if (!j && !m && !a) return '';
  if (!a && sansAnnee) {
    if (!m) throw new Error(`Indique le mois ${de}`);
    if (!j) throw new Error(`Indique l'année ou le jour ${de}`);
    if (!/^\d{1,2}$/.test(m)) throw new Error(`Mois ${de} invalide`);
    if (!/^\d{1,2}$/.test(j)) throw new Error(`Jour ${de} invalide`);
    return `--${m.padStart(2, '0')}-${j.padStart(2, '0')}`;
  }
  if (!a) throw new Error(`Indique l'année ${de}`);
  if (!/^\d{1,4}$/.test(a) || Number(a) < 1) throw new Error(`Année ${de} invalide`);
  if (j && !m) throw new Error(`Indique le mois ${de}`);
  const annee4 = a.padStart(4, '0');
  if (!m) return annee4;
  if (!/^\d{1,2}$/.test(m)) throw new Error(`Mois ${de} invalide`);
  const mois2 = m.padStart(2, '0');
  if (!j) return `${annee4}-${mois2}`;
  if (!/^\d{1,2}$/.test(j)) throw new Error(`Jour ${de} invalide`);
  return `${annee4}-${mois2}-${j.padStart(2, '0')}`;
}
