// Libellés français des liens de parenté calculés par `relation` (deductions.ts),
// accordés selon le sexe de la personne désignée. Un lien sans nom usuel testé
// (cousin issu de germain, conjoint d'un beau-frère…) n'a pas de libellé.

import { chemin, relation, type Etape, type Relation, type Sang } from './deductions';
import { accorder, avecDe } from './liste';
import type { Donnees, Sexe } from './types';

/** Formes d'un nom : masculin, féminin, et forme neutre quand le français en a une. */
interface Formes {
  m: string;
  f: string;
  neutre?: string;
  /** Ajouté après le nom, une seule fois même avec deux formes : « oncle ou tante par alliance ». */
  suffixe?: string;
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
  if (montee === 3 && descente === 1) return { m: 'grand-oncle', f: 'grand-tante' };
  if (montee === 1 && descente === 2) return { m: 'neveu', f: 'nièce' };
  if (montee === 1 && descente === 3) return { m: 'petit-neveu', f: 'petite-nièce' };
  if (montee === 2 && descente === 2) return { m: 'cousin', f: 'cousine' };
  return undefined;
}

function formes(r: Relation): Formes | undefined {
  if (r.type === 'soi') return undefined;
  if (r.type === 'conjoint') return r.marie ? { m: 'époux', f: 'épouse', neutre: 'conjoint' } : { m: 'compagnon', f: 'compagne', neutre: 'conjoint' };
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
export function libelleRelation(r: Relation, sexe: Sexe | undefined): string | undefined {
  const f = formes(r);
  if (!f) return undefined;
  return (choisir(f, sexe) ?? `${f.m} ou ${f.f}`) + (f.suffixe ?? '');
}

/** « ta » devient « ton » devant une voyelle : « ton arrière-grand-mère ». */
const determinant = (nom: string, feminin: boolean) => (feminin && !/^[aeéèêiîoôu]/i.test(nom) ? 'ta' : 'ton');

/** Lien de la personne avec moi : « ta cousine », « ton oncle ou ta tante », « c’est toi » ; undefined sans lien nommé. */
export function lienAvecMoi(d: Donnees, moi: string, vers: string): string | undefined {
  const r = relation(d, moi, vers);
  if (!r) return undefined;
  if (r.type === 'soi') return 'c’est toi';
  const f = formes(r);
  if (!f) return undefined;
  const sexe = d.personnes.find((p) => p.id === vers)?.sexe;
  const avec = (nom: string, feminin: boolean) => `${determinant(nom, feminin)} ${nom}`;
  const choisi = choisir(f, sexe);
  const nom = choisi !== undefined ? avec(choisi, sexe === 'F') : `${avec(f.m, false)} ou ${avec(f.f, true)}`;
  return nom + (f.suffixe ?? '');
}

// --- Étiquettes courtes et chemin depuis « Moi » (FEAT-09) --------------------

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const appel = (e: Etape) => e.personne.prenom || e.personne.nom;

/** Ce qu'est la personne de l'étape pour la précédente : « mère », « époux », « amie », « enfant » sans sexe connu. */
function nomPas(e: Etape): string {
  const s = e.personne.sexe;
  if (e.par === 'parent') return accorder(s, 'père', 'mère', 'parent');
  if (e.par === 'enfant') return accorder(s, 'fils', 'fille', 'enfant');
  if (e.par === 'ami') return accorder(s, 'ami', 'amie', 'ami(e)');
  if (e.par === 'frere') return accorder(s, 'frère', 'sœur', 'frère ou sœur');
  return e.marie ? accorder(s, 'époux', 'épouse', 'conjoint') : accorder(s, 'compagnon', 'compagne', 'conjoint');
}

/**
 * Lien de famille le plus court entre l'ami le plus proche (étape `k`) et la personne au bout du chemin, s'il a un nom :
 * « sœur », « neveu ». Undefined si la personne est l'ami lui-même ou si le lien n'a pas de nom usuel.
 */
function lienDepuisAmi(d: Donnees, etapes: Etape[], k: number): { libelle: string; feminin: boolean } | undefined {
  if (k >= etapes.length - 1) return undefined;
  const cible = etapes[etapes.length - 1].personne;
  const r = relation(d, etapes[k].personne.id, cible.id);
  const libelle = r && libelleRelation(r, cible.sexe);
  return libelle ? { libelle, feminin: cible.sexe === 'F' } : undefined;
}

/**
 * Étiquette courte, sans possessif, de `vers` vue depuis « Moi » : « Toi », « Cousine », « Épouse » ; pour qui n'est pas
 * de la famille, nommée depuis l'ami le plus proche : « Ami », « Amie d’Inès », « Compagne de Karim », « Proche de Karim ».
 * La famille l'emporte sur l'amitié. Undefined sans lien, ou pour un lien de famille sans nom usuel.
 */
export function etiquette(d: Donnees, moi: string, vers: string): string | undefined {
  if (moi === vers) return 'Toi';
  const r = relation(d, moi, vers);
  if (r) {
    const libelle = libelleRelation(r, d.personnes.find((p) => p.id === vers)?.sexe);
    return libelle && majuscule(libelle);
  }
  const etapes = chemin(d, moi, vers);
  if (!etapes || !etapes.some((e) => e.par === 'ami')) return undefined;
  const k = etapes.map((e) => e.par).lastIndexOf('ami');
  const ami = etapes[k];
  if (k === etapes.length - 1) {
    const avant = etapes[k - 1];
    return majuscule(nomPas(ami)) + (k === 1 ? '' : ` ${avecDe(appel(avant))}`);
  }
  const reste = etapes.slice(k + 1);
  const lien = lienDepuisAmi(d, etapes, k);
  if (lien) return `${majuscule(lien.libelle)} ${avecDe(appel(ami))}`;
  return reste.length === 1 ? `${majuscule(nomPas(reste[0]))} ${avecDe(appel(ami))}` : `Proche ${avecDe(appel(ami))}`;
}

/** Mots du chemin après « Toi » : « ton épouse », « son père » (« ta » et « sa » deviennent « ton » et « son » devant une voyelle). */
export function motsChemin(etapes: Etape[], d?: Donnees): string[] {
  // Après le dernier ami, le lien de famille le plus court remplace le détour : « son neveu », pas « sa mère → son fils → son fils ».
  const k = etapes.map((e) => e.par).lastIndexOf('ami');
  const lien = d && k > 0 ? lienDepuisAmi(d, etapes, k) : undefined;
  if (lien) {
    const ta = determinant(lien.libelle, lien.feminin);
    return [...motsChemin(etapes.slice(0, k + 1)), `${ta === 'ta' ? 'sa' : 'son'} ${lien.libelle}`];
  }
  return etapes.slice(1).map((e, i) => {
    const nom = nomPas(e);
    const ta = determinant(nom, e.personne.sexe === 'F');
    return `${i === 0 ? ta : ta === 'ta' ? 'sa' : 'son'} ${nom}`;
  });
}
