// Libellés français des liens de parenté calculés par `relation` (deductions.ts),
// accordés selon le sexe de la personne désignée. Un lien sans nom usuel testé
// (cousin issu de germain, conjoint d'un beau-frère…) n'a pas de libellé.

import { relation, type Relation, type Sang } from './deductions';
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
  if (r.type === 'conjoint') return r.marie ? { m: 'mari', f: 'femme', neutre: 'conjoint' } : { m: 'compagnon', f: 'compagne', neutre: 'conjoint' };
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
