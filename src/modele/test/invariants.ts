// Invariants des données (V4, lot 0), vérifiés après chaque étape des scénarios et des séquences aléatoires.
// Volontairement réécrits sans les fonctions du modèle (sinon le modèle se vérifierait lui-même) ; seule la symétrie
// de la fratrie passe par `fratrie`, puisque c'est elle qu'on contrôle. Renvoie la liste des fautes, vide si tout va bien.

import { fratrie } from '../deductions';
import type { Donnees, Personne } from '../types';

const PARENTS_PAR_TYPE = 2;

const decede = (p: Personne | undefined) => !!p && (!!p.deces || !!p.decede);

export function verifierInvariants(d: Donnees): string[] {
  const fautes: string[] = [];
  const parId = new Map(d.personnes.map((p) => [p.id, p]));
  const existe = (id: string) => parId.has(id);

  // Liens vers des personnes présentes.
  for (const u of d.unions) {
    if (!existe(u.personneA) || !existe(u.personneB)) fautes.push(`union ${u.id} vers une personne absente`);
    if (u.personneA === u.personneB) fautes.push(`union ${u.id} d'une personne avec elle-même`);
  }
  for (const f of d.filiations) {
    if (!existe(f.parent) || !existe(f.enfant)) fautes.push(`filiation ${f.id} vers une personne absente`);
  }
  for (const g of d.groupes) {
    if (g.membres.some((m) => !existe(m))) fautes.push(`groupe ${g.id} avec un membre absent`);
  }

  // Doublons de filiation (même parent, même enfant) et d'union (même paire, dans un sens ou l'autre).
  const vues = new Set<string>();
  for (const f of d.filiations) {
    const cle = `${f.parent}>${f.enfant}`;
    if (vues.has(cle)) fautes.push(`filiation en double ${cle}`);
    vues.add(cle);
  }
  for (const u of d.unions) {
    const cle = [u.personneA, u.personneB].sort().join('=');
    if (vues.has(cle)) fautes.push(`union en double ${cle}`);
    vues.add(cle);
  }

  // Au plus 2 parents par type.
  const parType = new Map<string, number>();
  for (const f of d.filiations) parType.set(`${f.enfant}/${f.type}`, (parType.get(`${f.enfant}/${f.type}`) ?? 0) + 1);
  for (const [cle, n] of parType) if (n > PARENTS_PAR_TYPE) fautes.push(`${n} parents pour ${cle}`);

  // Pas de boucle d'ascendance (parcours en profondeur, trois couleurs).
  const enfantsDe = new Map<string, string[]>();
  for (const f of d.filiations) enfantsDe.set(f.parent, [...(enfantsDe.get(f.parent) ?? []), f.enfant]);
  const etat = new Map<string, 1 | 2>();
  const boucle = (id: string): boolean => {
    if (etat.get(id) === 2) return false;
    if (etat.get(id) === 1) return true;
    etat.set(id, 1);
    const trouvee = (enfantsDe.get(id) ?? []).some(boucle);
    etat.set(id, 2);
    return trouvee;
  };
  if ([...enfantsDe.keys()].some(boucle)) fautes.push('boucle d’ascendance');

  // Au plus un conjoint actuel vivant (un veuvage ne compte pas).
  const actuels = new Map<string, number>();
  for (const u of d.unions) {
    if (u.statut !== 'actuelle') continue;
    for (const [moi, autre] of [
      [u.personneA, u.personneB],
      [u.personneB, u.personneA],
    ]) {
      if (existe(autre) && !decede(parId.get(autre))) actuels.set(moi, (actuels.get(moi) ?? 0) + 1);
    }
  }
  for (const [id, n] of actuels) if (n > 1) fautes.push(`${id} a ${n} conjoints actuels vivants`);

  // Un parent inconnu relie au moins deux enfants ; un « ? » enregistré garde un lien ou une information.
  for (const p of d.personnes) {
    if (p.inconnu && d.filiations.filter((f) => f.parent === p.id).length < 2) fautes.push(`inconnu ${p.id} avec moins de 2 enfants`);
    const lie = d.unions.some((u) => u.personneA === p.id || u.personneB === p.id) || d.filiations.some((f) => f.parent === p.id || f.enfant === p.id);
    const renseigne = !!(p.note.trim() || p.naissance || p.deces || p.decede || p.sexe || p.nomNaissance);
    if (p.sansNom && !lie && !renseigne && !d.groupes.some((g) => g.membres.includes(p.id))) fautes.push(`« ? » ${p.id} sans lien`);
    if (p.nomNaissance !== undefined && p.nomNaissance === p.nom) fautes.push(`${p.id} : nom de naissance égal au nom`);
  }

  // Fratries : symétriques, et des frères et sœurs complets ont les mêmes parents : tous, ou un même couple pris de chaque
  // côté parmi « tous ses parents » ou « ses parents d'un même type » (l'enfant adopté par mes parents est mon frère).
  const parents = (id: string, type?: string) =>
    d.filiations
      .filter((f) => f.enfant === id && (!type || f.type === type))
      .map((f) => f.parent)
      .sort()
      .join('|');
  const couples = (id: string) => [parents(id), parents(id, 'biologique'), parents(id, 'adoptif')].filter((c) => c.includes('|'));
  const memesParents = (a: string, b: string) => (parents(a) !== '' && parents(a) === parents(b)) || couples(a).some((c) => couples(b).includes(c));
  const liensParents = (id: string) =>
    d.filiations
      .filter((f) => f.enfant === id)
      .map((f) => `${parId.get(f.parent)?.inconnu ? 'inconnu ' : ''}${f.parent.slice(0, 4)}:${f.type === 'adoptif' ? 'A' : 'B'}`)
      .sort()
      .join(' ');
  const freresDe = new Map<string, Set<string>>();
  const demisDe = new Map<string, Set<string>>();
  for (const p of d.personnes) {
    const f = fratrie(d, p.id);
    freresDe.set(p.id, new Set(f.freresSoeurs.map((x) => x.id)));
    demisDe.set(p.id, new Set(f.demis.map((x) => x.id)));
  }
  for (const [a, freres] of freresDe) {
    for (const b of freres) {
      if (!freresDe.get(b)?.has(a)) fautes.push(`fratrie non symétrique : ${b} frère de ${a}, pas l’inverse`);
      if (!memesParents(a, b)) fautes.push(`${a} et ${b} frères sans les mêmes parents (${liensParents(a)} / ${liensParents(b)})`);
    }
    for (const b of demisDe.get(a) ?? []) if (!demisDe.get(b)?.has(a)) fautes.push(`demi-fratrie non symétrique : ${a} / ${b}`);
  }
  return fautes;
}
