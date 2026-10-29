// Libellés français des liens de parenté calculés par `relation` (deductions.ts),
// accordés selon le sexe de la personne désignée. Un lien sans nom usuel testé
// (fille d'un cousin, conjoint d'un beau-frère…) n'a pas de libellé : le chemin le décompose (`composer`).

import { agePersonne } from './age';
import { amis, chemin, conjoint, exConjoints, liensParents, relation, sontFiances, type Etape, type Relation, type Sang } from './deductions';
import { accorder, avecDe } from './liste';
import type { Donnees, Personne, Sexe } from './types';

/** Âge à partir duquel un partenaire non marié est « compagne » ou « compagnon » plutôt que « copine » ou « copain ». */
export const AGE_COMPAGNE = 40;

/** Précisions qui changent le mot choisi : l'âge du partenaire, et le proche dont il est le partenaire non marié. */
export interface OptionsLien {
  jeune?: boolean;
  partenaire?: string;
}

/** Moins de `AGE_COMPAGNE` ans ; une naissance inconnue n'est pas « jeune » (« compagne » convient à tout âge). */
const estJeune = (p: Pick<Personne, 'naissance' | 'deces' | 'decede'>, aujourdhui: Date) => (agePersonne(p, aujourdhui)?.annees ?? AGE_COMPAGNE) < AGE_COMPAGNE;

const partenaireNonMarie = (m: string, f: string, jeune: boolean | undefined, fiance?: boolean) =>
  fiance ? { m: 'fiancé', f: 'fiancée', neutre: 'fiancé(e)' } : jeune ? { m: 'copain', f: 'copine', neutre: 'conjoint' } : { m, f, neutre: 'conjoint' };

/** Formes d'un nom : masculin, féminin, et forme neutre quand le français en a une. */
interface Formes {
  m: string;
  f: string;
  neutre?: string;
  /** Ajouté après le nom, une seule fois même avec deux formes : « oncle ou tante par alliance ». */
  suffixe?: string;
  /** Ne se rapporte pas à moi : « la copine de Karim », pas « ta copine de Karim ». */
  sansPossessif?: boolean;
}

const arriere = (n: number) => 'arrière-'.repeat(n);

function formesSang(s: Sang): Formes | undefined {
  const { montee, descente } = s;
  if (descente === 0 && montee === 1) {
    return s.adoptif ? { m: 'père adoptif', f: 'mère adoptive', neutre: 'parent adoptif' } : { m: 'père', f: 'mère', neutre: 'parent' };
  }
  if (descente === 0 && montee >= 2) {
    const a = arriere(montee - 2);
    return { m: `${a}grand-père`, f: `${a}grand-mère`, neutre: `${a}grand-parent` };
  }
  if (montee === 0 && descente === 1) {
    return s.adoptif ? { m: 'fils adoptif', f: 'fille adoptive', neutre: 'enfant adoptif' } : { m: 'fils', f: 'fille', neutre: 'enfant' };
  }
  if (montee === 0 && descente >= 2) {
    const a = arriere(descente - 2);
    return { m: `${a}petit-fils`, f: `${a}petite-fille`, neutre: `${a}petit-enfant` };
  }
  if (montee === 1 && descente === 1) return s.demi ? { m: 'demi-frère', f: 'demi-sœur' } : { m: 'frère', f: 'sœur' };
  if (montee === 2 && descente === 1) return { m: 'oncle', f: 'tante' };
  if (montee >= 3 && descente === 1) {
    const a = arriere(montee - 3);
    return { m: `${a}grand-oncle`, f: `${a}grand-tante` };
  }
  if (montee === 1 && descente === 2) return { m: 'neveu', f: 'nièce' };
  if (montee === 1 && descente >= 3) {
    const a = arriere(descente - 3);
    return { m: `${a}petit-neveu`, f: `${a}petite-nièce` };
  }
  if (montee === 2 && descente === 2) return { m: 'cousin', f: 'cousine' };
  if (montee === 3 && descente === 3) return { m: 'cousin issu de germain', f: 'cousine issue de germain' };
  return undefined;
}

/** Frère, sœur, oncle, cousin… : ni un parent ni un enfant, dont le partenaire non marié reste « beau-parent » ou « belle-fille ». */
const collateral = (s: Sang) => s.montee >= 1 && s.descente >= 1;

function formes(r: Relation, o: OptionsLien = {}): Formes | undefined {
  if (r.type === 'soi') return undefined;
  if (r.type === 'conjoint') return r.fiance ? partenaireNonMarie('', '', undefined, true) : r.marie ? { m: 'époux', f: 'épouse', neutre: 'conjoint' } : partenaireNonMarie('compagnon', 'compagne', o.jeune);
  if (r.type === 'alliance' && r.cote === 'sien' && r.marie === false && collateral(r.base) && o.partenaire) {
    return { ...partenaireNonMarie('compagnon', 'compagne', o.jeune, r.fiance), neutre: undefined, suffixe: ` ${avecDe(o.partenaire)}`, sansPossessif: true };
  }
  if (r.type === 'sang') return formesSang(r);
  const { montee, descente } = r.base;
  // Noms propres à la belle-famille ; sinon « … par alliance ».
  if (montee === 1 && descente === 0) return { m: 'beau-père', f: 'belle-mère', neutre: 'beau-parent' };
  if (montee === 0 && descente === 1) {
    return r.cote === 'conjoint' ? { m: 'beau-fils', f: 'belle-fille' } : { m: 'gendre', f: 'belle-fille' };
  }
  if (montee === 1 && descente === 1) return { m: 'beau-frère', f: 'belle-sœur' };
  const base = formesSang({ ...r.base, adoptif: false, demi: false });
  return base && { ...base, suffixe: ' par alliance' };
}

function choisir(f: Formes, sexe: Sexe | undefined): string | undefined {
  if (sexe === 'M') return f.m;
  if (sexe === 'F') return f.f;
  return f.neutre;
}

/** « tante par alliance », « cousin ou cousine » ; undefined pour soi-même ou un lien sans nom. */
export function libelleRelation(r: Relation, sexe: Sexe | undefined, o?: OptionsLien): string | undefined {
  const f = formes(r, o);
  if (!f) return undefined;
  return (choisir(f, sexe) ?? `${f.m} ou ${f.f}`) + (f.suffixe ?? '');
}

/**
 * Options de `libelleRelation` pour `personne`, désignée par `r` : son âge, et — si elle est la copine ou le copain non marié
 * d'un proche — le nom de ce proche.
 */
export function optionsLien(d: Donnees, r: Relation, personne: Personne, aujourdhui = new Date()): OptionsLien {
  const partenaire = r.type === 'alliance' && r.cote === 'sien' && r.marie === false && collateral(r.base) ? conjoint(d, personne.id)?.personne : undefined;
  return { jeune: estJeune(personne, aujourdhui), partenaire: partenaire && nomUsuel(partenaire) };
}
const nomUsuel = (p: Personne) => p.prenom || p.nom;

/** « ta » devient « ton » devant une voyelle : « ton arrière-grand-mère ». */
const determinant = (nom: string, feminin: boolean) => (feminin && !/^[aeéèêiîoôu]/i.test(nom) ? 'ta' : 'ton');

/** « ta » ou « sa » (`premier` : le lien part de moi) selon le nom : « ton arrière-grand-mère », « son oncle ou sa tante ». */
function avecPossessif(f: Formes, sexe: Sexe | undefined, premier = true): string {
  const avec = (nom: string, feminin: boolean) => {
    const ta = determinant(nom, feminin);
    return `${premier ? ta : ta === 'ta' ? 'sa' : 'son'} ${nom}`;
  };
  const choisi = choisir(f, sexe);
  if (f.sansPossessif) return (choisi !== undefined ? `${sexe === 'F' ? 'la' : 'le'} ${choisi}` : `le ${f.m} ou la ${f.f}`) + f.suffixe;
  const nom = choisi !== undefined ? avec(choisi, sexe === 'F') : `${avec(f.m, false)} ou ${avec(f.f, true)}`;
  return nom + (f.suffixe ?? '');
}

/** Lien de la personne avec moi : « ta cousine », « ton oncle ou ta tante », « l’ex de ton père », « c’est toi » ; undefined sans lien nommé. */
export function lienAvecMoi(d: Donnees, moi: string, vers: string, aujourdhui = new Date()): string | undefined {
  const r = relation(d, moi, vers);
  if (!r) return lienEx(d, moi, vers)?.avec;
  if (r.type === 'soi') return 'c’est toi';
  const personne = d.personnes.find((p) => p.id === vers);
  const f = formes(r, personne && optionsLien(d, r, personne, aujourdhui));
  return f && avecPossessif(f, personne?.sexe);
}

// --- Ex : hors de la parenté (`relation`), nommés seulement depuis « Moi » ------------

const EX: Formes = { m: 'ex', f: 'ex', neutre: 'ex' };
const EX_BEAU_PARENT: Formes = { m: 'ex-beau-père', f: 'ex-belle-mère', neutre: 'ex-beau-parent' };

/**
 * Lien de `vers`, sans parenté avec moi, par un ex : mon ex (« ton ex », « Ex »), un parent de mon ex (« ton ex-belle-mère »),
 * ou l'ex d'un proche nommé, le plus proche d'abord (« l’ex de ton père », « Ex de Gaspard »). `avec` : avec possessif ;
 * `court` : l'étiquette. Undefined sinon.
 */
function lienEx(d: Donnees, moi: string, vers: string): { avec: string; court: string } | undefined {
  const personne = d.personnes.find((p) => p.id === vers);
  if (!personne) return undefined;
  const mesEx = exConjoints(d, moi);
  if (mesEx.some((x) => x.personne.id === vers)) return { avec: avecPossessif(EX, personne.sexe), court: 'Ex' };
  if (mesEx.some((x) => liensParents(d, x.personne.id).some((l) => l.personne.id === vers)))
    return { avec: avecPossessif(EX_BEAU_PARENT, personne.sexe), court: majuscule(choisir(EX_BEAU_PARENT, personne.sexe)!) };
  const proches = exConjoints(d, vers).flatMap(({ personne: proche }) => {
    const r = relation(d, moi, proche.id);
    const f = r && formes(r);
    return f && !f.sansPossessif && r.type !== 'soi' ? [{ proche, f, distance: r.type === 'sang' ? r.montee + r.descente : r.type === 'conjoint' ? 0 : 1 + r.base.montee + r.base.descente }] : [];
  });
  const plusProche = proches.sort((a, b) => a.distance - b.distance)[0];
  return plusProche && { avec: `l’ex de ${avecPossessif(plusProche.f, plusProche.proche.sexe)}`, court: `Ex ${avecDe(nomUsuel(plusProche.proche))}` };
}

// --- Étiquettes courtes et chemin depuis « Moi » (FEAT-09) --------------------

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const appel = (e: Etape) => nomUsuel(e.personne);

/** Ce qu'est la personne de l'étape pour la précédente : « mère », « époux », « amie », « enfant » sans sexe connu. */
function nomPas(e: Etape, aujourdhui: Date): string {
  const s = e.personne.sexe;
  if (e.par === 'parent') return accorder(s, 'père', 'mère', 'parent');
  if (e.par === 'enfant') return accorder(s, 'fils', 'fille', 'enfant');
  if (e.par === 'ami') return accorder(s, 'ami', 'amie', 'ami(e)');
  if (e.par === 'frere') return accorder(s, 'frère', 'sœur', 'frère ou sœur');
  if (e.fiance) return accorder(s, 'fiancé', 'fiancée', 'fiancé(e)');
  if (e.marie) return accorder(s, 'époux', 'épouse', 'conjoint');
  return estJeune(e.personne, aujourdhui) ? accorder(s, 'copain', 'copine', 'conjoint') : accorder(s, 'compagnon', 'compagne', 'conjoint');
}

/**
 * Lien de famille le plus court entre l'ami le plus proche (étape `k`) et la personne au bout du chemin, s'il a un nom :
 * « sœur », « neveu ». Undefined si la personne est l'ami lui-même ou si le lien n'a pas de nom usuel.
 */
function lienDepuisAmi(d: Donnees, etapes: Etape[], k: number, aujourdhui: Date): { libelle: string; feminin: boolean } | undefined {
  if (k >= etapes.length - 1) return undefined;
  const cible = etapes[etapes.length - 1].personne;
  const r = relation(d, etapes[k].personne.id, cible.id);
  // Le partenaire non marié d'un proche se dit par le détour (« son frère → sa copine »), pas « sa belle-sœur ».
  if (r?.type === 'alliance' && r.cote === 'sien' && r.marie === false && collateral(r.base)) return undefined;
  const libelle = r && libelleRelation(r, cible.sexe, { jeune: estJeune(cible, aujourdhui) });
  return libelle ? { libelle, feminin: cible.sexe === 'F' } : undefined;
}

/**
 * Ami direct de « Moi » (même groupe) qui est aussi le conjoint ou un proche d'un autre de mes amis : « Copine de Karim »
 * plutôt que « Amie ». Undefined si aucun autre ami ne le relie.
 */
function detourParUnAmi(d: Donnees, moi: string, cible: Personne, aujourdhui: Date): string | undefined {
  const autres = amis(d, moi).filter((a) => a.id !== cible.id);
  const parConjoint = autres.find((a) => conjoint(d, a.id)?.personne.id === cible.id);
  if (parConjoint) {
    const union = conjoint(d, parConjoint.id)!.union;
    return `${majuscule(nomPas({ personne: cible, par: 'conjoint', marie: union.marie, fiance: sontFiances(union, aujourdhui) }, aujourdhui))} ${avecDe(nomUsuel(parConjoint))}`;
  }
  for (const a of autres) {
    const r = relation(d, a.id, cible.id);
    if (!r || (r.type === 'alliance' && r.cote === 'sien' && r.marie === false && collateral(r.base))) continue;
    const libelle = libelleRelation(r, cible.sexe, { jeune: estJeune(cible, aujourdhui) });
    if (libelle) return `${majuscule(libelle)} ${avecDe(nomUsuel(a))}`;
  }
  return undefined;
}

/**
 * Étiquette courte, sans possessif, de `vers` vue depuis « Moi » : « Toi », « Cousine », « Épouse » ; pour qui n'est pas
 * de la famille, nommée depuis l'ami le plus proche : « Ami », « Amie d’Inès », « Compagne de Karim », « Proche de Karim ».
 * La famille l'emporte sur l'amitié. Undefined sans lien, ou pour un lien de famille sans nom usuel.
 */
export function etiquette(d: Donnees, moi: string, vers: string, aujourdhui = new Date()): string | undefined {
  if (moi === vers) return 'Toi';
  const r = relation(d, moi, vers);
  if (r) {
    const personne = d.personnes.find((p) => p.id === vers);
    const libelle = libelleRelation(r, personne?.sexe, personne && optionsLien(d, r, personne, aujourdhui));
    return libelle && majuscule(libelle);
  }
  const ex = lienEx(d, moi, vers);
  if (ex) return ex.court;
  const etapes = chemin(d, moi, vers);
  if (!etapes || !etapes.some((e) => e.par === 'ami')) return undefined;
  const k = etapes.map((e) => e.par).lastIndexOf('ami');
  const ami = etapes[k];
  if (etapes.length === 2) {
    const detour = detourParUnAmi(d, moi, ami.personne, aujourdhui);
    if (detour) return detour;
  }
  if (k === etapes.length - 1) {
    const avant = etapes[k - 1];
    return majuscule(nomPas(ami, aujourdhui)) + (k === 1 ? '' : ` ${avecDe(appel(avant))}`);
  }
  const reste = etapes.slice(k + 1);
  const lien = lienDepuisAmi(d, etapes, k, aujourdhui);
  if (lien) return `${majuscule(lien.libelle)} ${avecDe(appel(ami))}`;
  return reste.length === 1 ? `${majuscule(nomPas(reste[0], aujourdhui))} ${avecDe(appel(ami))}` : `Proche ${avecDe(appel(ami))}`;
}

/** Mot d'une seule étape : « ton épouse », « son père » (« ta » et « sa » deviennent « ton » et « son » devant une voyelle). */
function motPas(e: Etape, premier: boolean, aujourdhui: Date): string {
  const nom = nomPas(e, aujourdhui);
  const ta = determinant(nom, e.personne.sexe === 'F');
  return `${premier ? ta : ta === 'ta' ? 'sa' : 'son'} ${nom}`;
}

/**
 * Nom d'un seul tenant du lien de l'étape `i` à l'étape `j` (deux étapes au moins, aucun ami entre elles) : « cousine »,
 * « beau-fils ». Undefined sans nom, et pour le partenaire non marié d'un proche, qui se dit par ce proche (« son cousin → sa
 * compagne », pas « son grand-oncle → sa belle-fille »).
 */
function formesSegment(d: Donnees, etapes: Etape[], i: number, j: number, aujourdhui: Date): Formes | undefined {
  if (etapes.slice(i + 1, j + 1).some((e) => e.par === 'ami')) return undefined;
  const cible = etapes[j].personne;
  const r = relation(d, etapes[i].personne.id, cible.id);
  if (!r || (r.type === 'alliance' && r.cote === 'sien' && r.marie === false)) return undefined;
  const f = formes(r, { jeune: estJeune(cible, aujourdhui) });
  return f && !f.sansPossessif ? f : undefined;
}

/**
 * Chemin en relations composées (point 11) : le moins de segments nommés possible, les amis restant des coupures ; à égalité,
 * le premier pivot le plus proche de moi. « Toi → ta mère → sa cousine » plutôt que « ta mère → sa mère → son frère → sa fille ».
 */
export function composer(d: Donnees, etapes: Etape[], aujourdhui = new Date()): string[] {
  const n = etapes.length;
  const noms = new Map<string, Formes | undefined>();
  const segment = (i: number, j: number) => {
    const cle = `${i}-${j}`;
    if (!noms.has(cle)) noms.set(cle, formesSegment(d, etapes, i, j, aujourdhui));
    return noms.get(cle);
  };
  const nommable = (i: number, j: number) => j === i + 1 || segment(i, j) !== undefined;
  // moins[i] : nombre minimal de segments de l'étape i à la dernière.
  const moins = new Array<number>(n).fill(Infinity);
  moins[n - 1] = 0;
  for (let i = n - 2; i >= 0; i--) for (let j = i + 1; j < n; j++) if (nommable(i, j)) moins[i] = Math.min(moins[i], 1 + moins[j]);
  const mots: string[] = [];
  for (let i = 0; i < n - 1; ) {
    let j = i + 1;
    while (!nommable(i, j) || 1 + moins[j] !== moins[i]) j++;
    // Une étape seule prend aussi son nom de famille quand il en a un : « ton demi-frère », « sa fille adoptive ».
    const f = segment(i, j);
    mots.push(f ? avecPossessif(f, etapes[j].personne.sexe, i === 0) : motPas(etapes[j], i === 0, aujourdhui));
    i = j;
  }
  return mots;
}

/** Mots du chemin après « Toi » : étape par étape, ou composés (`composer`) si les données sont fournies. */
export function motsChemin(etapes: Etape[], d?: Donnees, aujourdhui = new Date()): string[] {
  if (d) return composer(d, etapes, aujourdhui);
  return etapes.slice(1).map((e, i) => motPas(e, i === 0, aujourdhui));
}
