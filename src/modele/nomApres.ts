// Nom porté après un mariage : chacun garde le sien, l'un prend le nom de l'autre, ou un nom composé.
// Le choix n'est pas enregistré dans l'union : il se lit sur les noms des deux personnes (`nomApresActuel`).

import type { Donnees, Personne, Union } from './types';

export type NomApres =
  | { mode: 'chacun' }
  /** Les deux portent le nom de `id` ; l'autre garde le sien en nom de naissance. */
  | { mode: 'de'; id: string }
  /** `porteurs` portent `nom` ; chacun garde le sien en nom de naissance. */
  | { mode: 'compose'; nom: string; porteurs: string[] };

function deux(d: Donnees, u: Union): [Personne, Personne] | undefined {
  const a = d.personnes.find((p) => p.id === u.personneA);
  const b = d.personnes.find((p) => p.id === u.personneB);
  return a && b ? [a, b] : undefined;
}

/** A changé de nom : un nom de naissance différent du nom d'usage. */
const aChange = (p: Personne): p is Personne & { nomNaissance: string } => !!p.nomNaissance && p.nomNaissance !== p.nom;

/** Les noms d'un nom composé, sans casse ni espaces. */
const parties = (nom: string): string[] => nom.split('-').map((x) => x.trim().toLowerCase());

/** Ce que les noms actuels du couple disent du choix fait au mariage. */
export function nomApresActuel(d: Donnees, u: Union): NomApres {
  const paire = deux(d, u);
  if (!paire) return { mode: 'chacun' };
  const [a, b] = paire;
  if (a.nom && a.nom === b.nom) {
    if (aChange(a) && aChange(b)) return { mode: 'compose', nom: a.nom, porteurs: [a.id, b.id] };
    if (aChange(b)) return { mode: 'de', id: a.id };
    if (aChange(a)) return { mode: 'de', id: b.id };
    return { mode: 'chacun' };
  }
  const porteur = [a, b].find((p) => {
    const autre = p === a ? b : a;
    return aChange(p) && p.nom.includes('-') && autre.nom !== '' && parties(p.nom).includes(autre.nom.trim().toLowerCase());
  });
  return porteur ? { mode: 'compose', nom: porteur.nom, porteurs: [porteur.id] } : { mode: 'chacun' };
}

/** Choix proposé d'office : le nom de l'homme pour les deux ; aucun changement si le couple n'a pas exactement un homme. */
export function nomApresParDefaut(a: Pick<Personne, 'id' | 'sexe' | 'nom'>, b: Pick<Personne, 'id' | 'sexe' | 'nom'>): NomApres {
  const hommes = [a, b].filter((p) => p.sexe === 'M');
  return hommes.length === 1 && hommes[0].nom.trim() ? { mode: 'de', id: hommes[0].id } : { mode: 'chacun' };
}

/** Les personnes qui ont changé de nom pour cette union (selon `nomApresActuel`). */
export function quiAChangeDeNom(d: Donnees, u: Union): Personne[] {
  const choix = nomApresActuel(d, u);
  const ids = choix.mode === 'de' ? [u.personneA, u.personneB].filter((id) => id !== choix.id) : choix.mode === 'compose' ? choix.porteurs : [];
  return d.personnes.filter((p) => ids.includes(p.id));
}

/** Même choix (le nom composé comparé sans espaces autour). */
export function memeNomApres(x: NomApres, y: NomApres): boolean {
  if (x.mode === 'de' && y.mode === 'de') return x.id === y.id;
  if (x.mode === 'compose' && y.mode === 'compose') {
    return x.nom.trim() === y.nom.trim() && [...x.porteurs].sort().join() === [...y.porteurs].sort().join();
  }
  return x.mode === y.mode;
}

/** Donne `nom` à `p`, en gardant son nom actuel comme nom de naissance s'il n'en a pas encore. */
function porter(p: Personne, nom: string): Personne {
  if (!nom || p.nom === nom) return p;
  const nomNaissance = p.nomNaissance ?? (p.nom || undefined);
  const { nomNaissance: _ancien, ...reste } = p;
  return { ...reste, nom, ...(nomNaissance && nomNaissance !== nom ? { nomNaissance } : {}) };
}

/** Rend son nom de naissance à `p` (nom de naissance vidé). */
function reprendre(p: Personne): Personne {
  if (!p.nomNaissance) return p;
  const { nomNaissance, ...reste } = p;
  return { ...reste, nom: nomNaissance };
}

/**
 * Applique le choix du nom après le mariage : défait d'abord le choix actuel (ceux qui avaient changé de nom pour cette
 * union reprennent leur nom de naissance), puis applique le nouveau. Sans effet si le choix ne change pas.
 */
export function appliquerNomApres(d: Donnees, idUnion: string, choix: NomApres): Donnees {
  const u = d.unions.find((x) => x.id === idUnion);
  if (!u) throw new Error(`Union introuvable : ${idUnion}`);
  if (choix.mode === 'compose' && !choix.nom.trim()) throw new Error('Nom composé vide');
  if (choix.mode === 'compose' && choix.porteurs.some((id) => id !== u.personneA && id !== u.personneB)) throw new Error('Porteur hors de l’union');
  if (choix.mode === 'de' && choix.id !== u.personneA && choix.id !== u.personneB) throw new Error('Nom pris hors de l’union');
  if (memeNomApres(nomApresActuel(d, u), choix)) return d;
  const defaits = new Set(quiAChangeDeNom(d, u).map((p) => p.id));
  let personnes = d.personnes.map((p) => (defaits.has(p.id) ? reprendre(p) : p));
  if (choix.mode === 'de') {
    const nom = personnes.find((p) => p.id === choix.id)!.nom;
    const autre = choix.id === u.personneA ? u.personneB : u.personneA;
    personnes = personnes.map((p) => (p.id === autre ? porter(p, nom) : p));
  } else if (choix.mode === 'compose') {
    const nom = choix.nom.trim();
    personnes = personnes.map((p) => (choix.porteurs.includes(p.id) ? porter(p, nom) : p));
  }
  return { ...d, personnes };
}
