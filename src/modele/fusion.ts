// Fusion d'un import dans les données actuelles. Rien n'est perdu : tout ce qui est sûr est
// fusionné sans question (même id, champ vide d'un côté, date plus précise d'un côté) ; au moindre
// conflit (deux valeurs différentes) ou doute (homonyme probable), `demander` tranche.
// Les ids sont des UUID : une même id des deux côtés = la même personne ou le même lien.

import { estDecede, MAX_PARENTS_PAR_TYPE, nouvelId } from './modele';
import { estDonneesValides } from './stockage';
import type { Donnees, Filiation, GroupeAmis, Personne, Union } from './types';

export interface Question {
  texte: string;
  options: string[];
}

/** Renvoie l'index de l'option choisie, ou null pour abandonner toute la fusion. */
export type Arbitre = (question: Question) => Promise<number | null>;

export interface BilanFusion {
  donnees: Donnees;
  /** Personnes du fichier absentes de l'appareil. */
  ajoutees: number;
  /** Personnes du fichier reconnues comme déjà présentes. */
  fusionnees: number;
  /** Liens ignorés (incohérents ou écartés sur ta réponse). */
  ignores: number;
}

/** La fusion a été abandonnée par l'utilisateur : rien n'est modifié. */
export class FusionAnnulee extends Error {
  constructor() {
    super('Fusion annulée');
  }
}

const vide = (v: string | undefined) => v === undefined || v === '';
const nomComplet = (p: Personne) => `${p.prenom} ${p.nom}`.trim() || 'Sans nom';
const sansAccents = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
const cleNom = (p: Personne) => sansAccents(`${p.prenom} ${p.nom}`);
const court = (t: string) => (t.length > 60 ? `${t.slice(0, 57)}…` : t);
/** Deux dates compatibles : égales, ou l'une est la version plus précise de l'autre (« 1980 » / « 1980-03-02 »). */
const compatibles = (a: string, b: string) => a.startsWith(b) || b.startsWith(a);

const naissanceTexte = (p: Personne) => (p.naissance ? `naissance ${p.naissance}` : 'naissance non renseignée');

export async function fusionner(actuelles: Donnees, importees: Donnees, demander: Arbitre): Promise<BilanFusion> {
  const choisir = async (texte: string, options: string[]): Promise<number> => {
    const r = await demander({ texte, options });
    if (r === null || !Number.isInteger(r) || r < 0 || r >= options.length) throw new FusionAnnulee();
    return r;
  };

  /** Fusionne une valeur texte ; `sujet` ouvre la question (« Camille Martin — naissance »). */
  const fusionTexte = async (sujet: string, a: string | undefined, b: string | undefined, date = false, gardeLesDeux = false): Promise<string | undefined> => {
    if (a === b) return a;
    if (vide(a)) return b;
    if (vide(b)) return a;
    if (date && compatibles(a!, b!)) return a!.length >= b!.length ? a : b;
    const options = [`Garder « ${court(a!)} »`, `Prendre « ${court(b!)} » (du fichier)`];
    if (gardeLesDeux) options.push('Garder les deux');
    const r = await choisir(`${sujet} : tu as « ${court(a!)} » et le fichier dit « ${court(b!)} ».`, options);
    return r === 0 ? a : r === 1 ? b : `${a}\n\n${b}`;
  };

  // --- Personnes -------------------------------------------------------------------------------
  const personnes: Personne[] = actuelles.personnes.map((p) => ({ ...p }));
  const parId = new Map(personnes.map((p) => [p.id, p]));
  const originales = [...personnes];
  /** id du fichier → id conservé dans le résultat. */
  const remap = new Map<string, string>();
  const prises = new Set<string>();

  for (const p of importees.personnes) {
    if (parId.has(p.id)) {
      remap.set(p.id, p.id);
      prises.add(p.id);
    }
  }

  // Homonymes probables (même nom, dates de naissance compatibles) : on demande.
  for (const p of importees.personnes) {
    if (remap.has(p.id) || p.inconnu || p.sansNom || !cleNom(p)) continue;
    for (const c of originales) {
      if (prises.has(c.id) || c.inconnu || c.sansNom || cleNom(c) !== cleNom(p)) continue;
      if (p.naissance && c.naissance && !compatibles(p.naissance, c.naissance)) continue;
      const r = await choisir(
        `Le fichier contient ${nomComplet(p)} (${naissanceTexte(p)}) et tu as déjà ${nomComplet(c)} (${naissanceTexte(c)}). Est-ce la même personne ?`,
        ['Oui, c’est la même personne', 'Non, ce sont deux personnes'],
      );
      if (r === 0) {
        remap.set(p.id, c.id);
        prises.add(c.id);
        break;
      }
    }
  }

  let ajoutees = 0;
  let fusionnees = 0;
  let ignores = 0;

  for (const p of importees.personnes) {
    const cibleId = remap.get(p.id);
    if (cibleId === undefined) {
      personnes.push({ ...p });
      remap.set(p.id, p.id);
      parId.set(p.id, p);
      ajoutees++;
      continue;
    }
    fusionnees++;
    const c = parId.get(cibleId)!;
    const sujet = (champ: string) => `${nomComplet(c)}, ${champ}`;
    const prenom = (await fusionTexte(sujet('prénom'), c.prenom, p.prenom)) ?? '';
    const nom = (await fusionTexte(sujet('nom'), c.nom, p.nom)) ?? '';
    const naissance = await fusionTexte(sujet('naissance'), c.naissance, p.naissance, true);
    const deces = await fusionTexte(sujet('décès'), c.deces, p.deces, true);
    const sexe = (await fusionTexte(sujet('sexe'), c.sexe, p.sexe)) as Personne['sexe'];
    const nomNaissance = await fusionTexte(sujet('nom de naissance'), c.nomNaissance, p.nomNaissance);
    const lieuNaissance = await fusionTexte(sujet('lieu de naissance'), c.lieuNaissance, p.lieuNaissance);
    const lieuDeces = await fusionTexte(sujet('lieu de décès'), c.lieuDeces, p.lieuDeces);
    const note = (await fusionTexte(sujet('note'), c.note, p.note, false, true)) ?? '';
    const fusion: Personne = { id: c.id, prenom, nom, note };
    if (naissance !== undefined) fusion.naissance = naissance;
    if (deces !== undefined) fusion.deces = deces;
    if (c.decede || p.decede) fusion.decede = true;
    if (sexe !== undefined) fusion.sexe = sexe;
    if (nomNaissance !== undefined) fusion.nomNaissance = nomNaissance;
    if (lieuNaissance !== undefined) fusion.lieuNaissance = lieuNaissance;
    if (lieuDeces !== undefined) fusion.lieuDeces = lieuDeces;
    // Ne plus signaler, ne plus rappeler : un choix fait d'un côté vaut pour les deux.
    if (c.ignorerIncomplet || p.ignorerIncomplet) fusion.ignorerIncomplet = true;
    if (c.sansRappel || p.sansRappel) fusion.sansRappel = true;
    // Un « inconnu » ou un « ? » qui reçoit un nom de l'autre côté n'en est plus un.
    if (c.inconnu && p.inconnu) fusion.inconnu = true;
    if (c.sansNom && p.sansNom) fusion.sansNom = true;
    personnes[personnes.findIndex((x) => x.id === c.id)] = fusion;
    parId.set(c.id, fusion);
  }
  const nom = (id: string) => nomComplet(parId.get(id)!);
  const imp = (id: string) => remap.get(id)!;

  // --- Unions ----------------------------------------------------------------------------------
  const unions: Union[] = actuelles.unions.map((u) => ({ ...u }));
  const idsLiens = new Set<string>([...unions.map((u) => u.id), ...actuelles.filiations.map((f) => f.id), ...actuelles.groupes.map((g) => g.id)]);
  const idLibre = (id: string) => {
    const libre = idsLiens.has(id) ? nouvelId() : id;
    idsLiens.add(libre);
    return libre;
  };
  const memePaire = (u: Union, a: string, b: string) => (u.personneA === a && u.personneB === b) || (u.personneA === b && u.personneB === a);

  const vivant = (id: string) => {
    const p = personnes.find((x) => x.id === id);
    return !!p && !estDecede(p);
  };
  /**
   * Une personne n'a qu'un conjoint actuel vivant : si `u` en devient un en doublon, on demande qui reste.
   * Une union actuelle avec un défunt (veuvage) ne compte pas.
   */
  const verifierActuelle = async (u: Union) => {
    if (u.statut !== 'actuelle') return;
    for (const autre of unions) {
      if (autre === u || autre.statut !== 'actuelle') continue;
      const commun = [u.personneA, u.personneB].find((x) => x === autre.personneA || x === autre.personneB);
      if (!commun) continue;
      const partenaire = (v: Union) => (v.personneA === commun ? v.personneB : v.personneA);
      if (!vivant(partenaire(u)) || !vivant(partenaire(autre))) continue;
      const r = await choisir(
        `${nom(u.personneA)} et ${nom(u.personneB)} sont en couple dans le fichier, mais ${nom(autre.personneA)} et ${nom(autre.personneB)} le sont déjà chez toi. Une personne n’a qu’un conjoint actuel.`,
        ['Garder le couple actuel (l’autre devient un ex)', 'Prendre l’autre couple (l’actuel devient un ex)'],
      );
      if (r === 0) u.statut = 'separee';
      else autre.statut = 'separee';
    }
  };

  for (const u of importees.unions) {
    const a = imp(u.personneA);
    const b = imp(u.personneB);
    if (a === b) {
      ignores++;
      continue;
    }
    const existante = unions.find((x) => x.id === u.id) ?? unions.find((x) => memePaire(x, a, b));
    const couple = `${nom(a)} et ${nom(b)}`;
    if (!existante) {
      const neuve: Union = { ...u, id: idLibre(u.id), personneA: a, personneB: b };
      unions.push(neuve);
      await verifierActuelle(neuve);
      continue;
    }
    if (existante.marie !== u.marie) {
      const r = await choisir(
        `${couple} : tu les as ${existante.marie ? 'mariés' : 'en couple non marié'}, le fichier les dit ${u.marie ? 'mariés' : 'en couple non marié'}.`,
        [`Garder : ${existante.marie ? 'mariés' : 'non mariés'}`, `Prendre : ${u.marie ? 'mariés' : 'non mariés'} (du fichier)`],
      );
      if (r === 1) existante.marie = u.marie;
    }
    if (existante.statut !== u.statut) {
      const texte = (s: Union['statut']) => (s === 'actuelle' ? 'ensemble' : 'séparés');
      const r = await choisir(`${couple} : tu les as ${texte(existante.statut)}, le fichier les dit ${texte(u.statut)}.`, [
        `Garder : ${texte(existante.statut)}`,
        `Prendre : ${texte(u.statut)} (du fichier)`,
      ]);
      if (r === 1) {
        existante.statut = u.statut;
        await verifierActuelle(existante);
      }
    }
    const date = await fusionTexte(`${couple}, date de l’union`, existante.date, u.date, true);
    if (date === undefined) delete existante.date;
    else existante.date = date;
    const lieu = existante.marie ? await fusionTexte(`${couple}, lieu du mariage`, existante.lieu, u.lieu) : undefined;
    if (lieu === undefined) delete existante.lieu;
    else existante.lieu = lieu;
  }

  // --- Filiations ------------------------------------------------------------------------------
  const filiations: Filiation[] = actuelles.filiations.map((f) => ({ ...f }));
  /** Vrai si `cible` est un descendant de `depart` (ajouter cible → depart bouclerait). */
  const descend = (depart: string, cible: string): boolean => {
    const vus = new Set<string>();
    const pile = [depart];
    while (pile.length) {
      const id = pile.pop()!;
      if (id === cible) return true;
      if (vus.has(id)) continue;
      vus.add(id);
      for (const f of filiations) if (f.parent === id) pile.push(f.enfant);
    }
    return false;
  };

  for (const f of importees.filiations) {
    const parent = imp(f.parent);
    const enfant = imp(f.enfant);
    const lien = `${nom(parent)} → ${nom(enfant)}`;
    const existante = filiations.find((x) => x.parent === parent && x.enfant === enfant);
    if (existante) {
      if (existante.type !== f.type) {
        const texte = (t: Filiation['type']) => (t === 'biologique' ? 'biologique' : 'adoptif');
        const r = await choisir(`${lien} : tu as un lien ${texte(existante.type)}, le fichier dit ${texte(f.type)}.`, [
          `Garder : ${texte(existante.type)}`,
          `Prendre : ${texte(f.type)} (du fichier)`,
        ]);
        if (r === 1) existante.type = f.type;
      }
      continue;
    }
    // L'enfant est déjà un ancêtre du parent : le lien ferait une boucle, il n'a pas de sens.
    if (parent === enfant || descend(enfant, parent)) {
      ignores++;
      continue;
    }
    const memeType = filiations.filter((x) => x.enfant === enfant && x.type === f.type);
    const neuve: Filiation = { ...f, id: idLibre(f.id), parent, enfant };
    if (memeType.length >= MAX_PARENTS_PAR_TYPE) {
      const type = f.type === 'biologique' ? 'biologiques' : 'adoptifs';
      const r = await choisir(
        `${nom(enfant)} a déjà ${MAX_PARENTS_PAR_TYPE} parents ${type} chez toi (${memeType.map((x) => nom(x.parent)).join(' et ')}) ; le fichier ajoute ${nom(parent)}. Lequel est le bon ?`,
        ['Garder les parents actuels (ignorer le lien du fichier)', ...memeType.map((x) => `Remplacer ${nom(x.parent)} par ${nom(parent)}`)],
      );
      if (r === 0) {
        ignores++;
        continue;
      }
      filiations.splice(filiations.indexOf(memeType[r - 1]), 1);
    }
    filiations.push(neuve);
  }

  // --- Groupes d'amis --------------------------------------------------------------------------
  const groupes: GroupeAmis[] = actuelles.groupes.map((g) => ({ ...g, membres: [...g.membres] }));
  const cleMembres = (m: string[]) => [...m].sort().join('|');

  for (const g of importees.groupes) {
    const membres = [...new Set(g.membres.map(imp))];
    if (membres.length < 2) {
      ignores++;
      continue;
    }
    const existant = groupes.find((x) => x.id === g.id) ?? groupes.find((x) => cleMembres(x.membres) === cleMembres(membres));
    if (!existant) {
      groupes.push({ ...g, id: idLibre(g.id), membres });
      continue;
    }
    // Les membres s'additionnent : l'absence d'un ami d'un côté ne prouve pas qu'il soit parti.
    existant.membres = [...new Set([...existant.membres, ...membres])];
    existant.nom = (await fusionTexte(`Groupe d’amis « ${existant.nom || 'sans nom'} », nom`, existant.nom, g.nom)) ?? '';
  }

  const donnees: Donnees = { version: 6, personnes, unions, filiations, groupes };
  if (!estDonneesValides(donnees)) throw new Error('La fusion produirait des données incohérentes. Tes données n’ont pas été modifiées');
  return { donnees, ajoutees, fusionnees, ignores };
}
