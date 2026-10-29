// Générateur de familles fictives (V4, lot 0) : un petit langage de construction qui produit des données
// valides et déterministes (même graine, mêmes données, ids lisibles). Toutes les personnes sont inventées ;
// seules les structures reproduisent des cas observés. Sert à Vitest et à scripts/familles.mjs.
// Les données sont écrites directement (sans `creerPersonne`, dont les ids sont tirés au hasard) ; les règles
// du modèle utiles ici sont reproduites : prise du nom au mariage, parent inconnu, « ? » enregistré.

import { PARENT_INCONNU } from '../parentSansNom';
import { estDonneesValides } from '../stockage';
import type { Donnees, Filiation, GroupeAmis, Personne, Sexe, StatutUnion, TypeFiliation, Union } from '../types';

/** Tirage pseudo-aléatoire à graine (mulberry32) : même graine, même suite de nombres dans [0, 1). */
export function aleatoire(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entier tiré dans [min, max]. */
export function entre(hasard: () => number, min: number, max: number): number {
  return min + Math.floor(hasard() * (max - min + 1));
}

// Listes inventées : le sexe d'un prénom de la liste est déduit, un prénom absent reste sans sexe.
export const PRENOMS_F = [
  'Adèle',
  'Agathe',
  'Alba',
  'Albane',
  'Anaïs',
  'Apolline',
  'Aurélie',
  'Bérénice',
  'Berthe',
  'Blanche',
  'Capucine',
  'Céleste',
  'Clara',
  'Claire',
  'Colette',
  'Coralie',
  'Delphine',
  'Elena',
  'Éloïse',
  'Fanny',
  'Flavie',
  'Germaine',
  'Hélène',
  'Hortense',
  'Huguette',
  'Inès',
  'Jade',
  'Jeanne',
  'Joséphine',
  'Léontine',
  'Lison',
  'Lucia',
  'Maëlle',
  'Margaux',
  'Margot',
  'Mathilde',
  'Monique',
  'Nathalie',
  'Nina',
  'Nuria',
  'Odette',
  'Odile',
  'Ophélie',
  'Pilar',
  'Romane',
  'Rosa',
  'Solène',
  'Sophie',
  'Yvonne',
  'Zoé',
];
export const PRENOMS_M = [
  'Achille',
  'Andrés',
  'Anselme',
  'Armand',
  'Arthur',
  'Auguste',
  'Baptiste',
  'Basile',
  'Bastien',
  'Bruno',
  'Clément',
  'Corentin',
  'Cyril',
  'Damien',
  'Désiré',
  'Diego',
  'Édouard',
  'Anatole',
  'Eudes',
  'Fernand',
  'Firmin',
  'Gaspard',
  'Gérard',
  'Grégoire',
  'Gustave',
  'Henri',
  'Honoré',
  'Hubert',
  'Hugo',
  'Ignace',
  'Iker',
  'Jérôme',
  'Joaquín',
  'Jules',
  'Lazare',
  'Léon',
  'Louis',
  'Tristan',
  'Gaël',
  'Malo',
  'Marc',
  'Marcel',
  'Mateo',
  'Noah',
  'Noé',
  'Ramón',
  'Raymond',
  'Romain',
  'Théo',
  'Timothée',
  'Tomás',
  'Victor',
  'Yanis',
];
export const NOMS = [
  'Brémontier',
  'Castagnol',
  'Delorgue',
  'Fabrègue',
  'Guillerot',
  'Hautbourg',
  'Jolivard',
  'Kervadec',
  'Larrigue',
  'Mazerac',
  'Noiraud',
  'Pellegrue',
];

/** Dernière année de naissance tirée, et année avant laquelle une personne née est décédée d'office. */
const ANNEE_MAX = 2024;
const NE_AVANT_DECEDE = 1932;
const ECART_GENERATIONS = 27;

export interface OptionsFamille {
  graine: number;
  /** Année de naissance moyenne de la génération 0. */
  debut: number;
  /** Préfixe des ids et nom du fichier (défaut : le nom simplifié). */
  fichier?: string;
  /** Dates partielles : une sur cinq en année seule, une sur six en mois et année. */
  partielles?: boolean;
}

export interface OptionsPersonne {
  /** Défaut : la clé. Vide pour un ancêtre sans prénom. */
  prenom?: string;
  nom?: string;
  sexe?: Sexe;
  generation?: number;
  /** `null` : sans date de naissance. */
  naissance?: string | null;
  note?: string;
}

export interface OptionsUnion {
  marie?: boolean;
  date?: string;
  /** Au mariage, l'épouse prend le nom de son mari (défaut), comme la case « Prend le nom ». */
  prendLeNom?: boolean;
  nomA?: string;
  nomB?: string;
}

export interface OptionsEnfants {
  /** Parents (clés) ; défaut : le dernier couple. */
  de?: string[];
  type?: TypeFiliation;
  /** Défaut : le nom du premier parent. */
  nom?: string;
}

export interface FamilleFictive {
  nom: string;
  /** Nom du fichier JSON, sans extension. */
  fichier: string;
  moi: string;
  donnees: Donnees;
}

export function simplifierCle(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class Famille {
  private readonly hasard: () => number;
  private readonly prefixe: string;
  private readonly personnes = new Map<string, Personne>();
  private readonly generations = new Map<string, number>();
  private readonly unions: Union[] = [];
  private readonly filiations: Filiation[] = [];
  private readonly groupes: GroupeAmis[] = [];
  private courant: string[] = [];
  private cleMoi?: string;
  private inconnus = 0;

  constructor(
    readonly nom: string,
    private readonly o: OptionsFamille,
  ) {
    this.hasard = aleatoire(o.graine);
    this.prefixe = o.fichier ?? simplifierCle(nom);
  }

  /** Id d'une personne de la famille, d'après sa clé. */
  id(cle: string): string {
    return `${this.prefixe}-${simplifierCle(cle)}`;
  }

  private existe(cle: string): boolean {
    return this.personnes.has(this.id(cle));
  }

  private lire(cle: string): Personne {
    const p = this.personnes.get(this.id(cle));
    if (!p) throw new Error(`${this.nom} : personne inconnue « ${cle} »`);
    return p;
  }

  private ecrire(p: Personne): void {
    this.personnes.set(p.id, p);
  }

  private date(annee: number): string {
    const mois = entre(this.hasard, 1, 12);
    const jour = entre(this.hasard, 1, 28);
    const forme = this.o.partielles ? this.hasard() : 1;
    const deux = (n: number) => String(n).padStart(2, '0');
    if (forme < 0.2) return String(annee);
    if (forme < 0.35) return `${annee}-${deux(mois)}`;
    return `${annee}-${deux(mois)}-${deux(jour)}`;
  }

  private autreNom(): string {
    const noms = NOMS.filter((n) => n !== this.nom);
    return noms[entre(this.hasard, 0, noms.length - 1)];
  }

  /** Crée une personne ; née avant `NE_AVANT_DECEDE`, elle est décédée (date tirée). */
  personne(cle: string, o: OptionsPersonne = {}): this {
    if (this.existe(cle)) throw new Error(`${this.nom} : « ${cle} » existe déjà`);
    const generation = o.generation ?? 0;
    const prenom = o.prenom ?? cle;
    const sexe = o.sexe ?? (PRENOMS_F.includes(prenom) ? 'F' : PRENOMS_M.includes(prenom) ? 'M' : undefined);
    const annee = Math.min(ANNEE_MAX, this.o.debut + generation * ECART_GENERATIONS + entre(this.hasard, -4, 4));
    const naissance = o.naissance === null ? undefined : (o.naissance ?? this.date(annee));
    const deces = annee < NE_AVANT_DECEDE ? this.date(Math.min(ANNEE_MAX - 1, annee + entre(this.hasard, 62, 92))) : undefined;
    this.ecrire({
      id: this.id(cle),
      prenom,
      nom: o.nom ?? this.nom,
      ...(naissance ? { naissance } : {}),
      ...(deces ? { deces } : {}),
      ...(sexe ? { sexe } : {}),
      note: o.note ?? '',
    });
    this.generations.set(this.id(cle), generation);
    return this;
  }

  private assurer(cle: string, o: OptionsPersonne): string {
    if (!this.existe(cle)) this.personne(cle, o);
    return this.id(cle);
  }

  private generation(cle: string): number | undefined {
    return this.generations.get(this.id(cle));
  }

  /** Couple actuel ; une personne absente est créée (le nom de la famille pour `a` si les deux sont nouveaux). */
  couple(a: string, b: string, o: OptionsUnion = {}): this {
    return this.unir(a, b, 'actuelle', o);
  }

  /** Union séparée (un ex). */
  ex(a: string, b: string, o: OptionsUnion = {}): this {
    return this.unir(a, b, 'separee', o);
  }

  private unir(a: string, b: string, statut: StatutUnion, o: OptionsUnion): this {
    const generation = this.generation(a) ?? this.generation(b) ?? 0;
    const deuxNouveaux = !this.existe(a) && !this.existe(b);
    const ia = this.assurer(a, { generation, nom: o.nomA ?? (deuxNouveaux ? this.nom : this.autreNom()) });
    const ib = this.assurer(b, { generation, nom: o.nomB ?? this.autreNom() });
    const marie = o.marie ?? false;
    this.unions.push({ id: `${this.prefixe}-u${this.unions.length + 1}`, personneA: ia, personneB: ib, marie, statut, ...(o.date ? { date: o.date } : {}) });
    if (marie && statut === 'actuelle' && o.prendLeNom !== false) this.prendreNom(a, b);
    this.courant = [a, b];
    return this;
  }

  /** Même règle que `prendreNomDuConjoint` : l'épouse d'un homme (ou d'une personne sans sexe) prend son nom. */
  private prendreNom(a: string, b: string): void {
    const epouse = (femme: Personne, mari: Personne): Personne =>
      femme.sexe !== 'F' || mari.sexe === 'F' || !mari.nom || femme.nom === mari.nom
        ? femme
        : { ...femme, nom: mari.nom, ...(femme.nomNaissance || !femme.nom ? {} : { nomNaissance: femme.nom }) };
    const [pa, pb] = [this.lire(a), this.lire(b)];
    this.ecrire(epouse(pa, pb));
    this.ecrire(epouse(pb, pa));
  }

  /** Enfants du dernier couple (ou de `de`), créés s'ils n'existent pas, nés dans l'ordre. */
  enfants(cles: string[], o: OptionsEnfants = {}): this {
    const parents = o.de ?? this.courant;
    if (parents.length === 0) throw new Error(`${this.nom} : enfants sans parent`);
    const generation = Math.max(...parents.map((p) => this.generation(p) ?? 0)) + 1;
    const nom = o.nom ?? this.lire(parents[0]).nom;
    for (const cle of cles) {
      const enfant = this.assurer(cle, { generation, nom });
      for (const parent of parents) this.relier(this.id(parent), enfant, o.type ?? 'biologique');
    }
    return this;
  }

  adopte(cle: string, o: { par: string[] }): this {
    return this.enfants([cle], { de: o.par, type: 'adoptif' });
  }

  /** Un parent de plus pour `enfant` (créé une génération au-dessus s'il n'existe pas). */
  parent(enfant: string, parent: string, o: OptionsPersonne & { type?: TypeFiliation } = {}): this {
    const ip = this.assurer(parent, { generation: (this.generation(enfant) ?? 1) - 1, ...o });
    this.relier(ip, this.id(enfant), o.type ?? 'biologique');
    return this;
  }

  private relier(parent: string, enfant: string, type: TypeFiliation): void {
    this.filiations.push({ id: `${this.prefixe}-f${this.filiations.length + 1}`, parent, enfant, type });
  }

  /** Frères et sœurs sans parent connu : reliés par un parent inconnu caché (comme `ajouterFrereSansParent`). */
  fratrieSansParents(cles: string[]): this {
    const generation = cles.map((c) => this.generation(c)).find((g) => g !== undefined) ?? 0;
    const inconnu = `${this.prefixe}-inconnu-${++this.inconnus}`;
    this.personnes.set(inconnu, { id: inconnu, prenom: '', nom: '', note: '', inconnu: true });
    // Les nouveaux venus portent le nom de naissance de la fratrie (celui d'une sœur mariée, pas son nom d'usage).
    const deja = cles.filter((c) => this.existe(c)).map((c) => this.personnes.get(this.id(c))!);
    const nom = deja.map((p) => p.nomNaissance || p.nom).find(Boolean);
    for (const cle of cles) this.relier(inconnu, this.assurer(cle, { generation, ...(nom ? { nom } : {}) }), 'biologique');
    return this;
  }

  /** Parent « ? » enregistré des enfants donnés (comme `enregistrerParentSansNom`). */
  sansNom(enfants: string[]): this {
    const id = `${this.prefixe}-sansnom-${++this.inconnus}`;
    this.personnes.set(id, { id, prenom: PARENT_INCONNU, nom: '', note: '', sansNom: true });
    for (const e of enfants) this.relier(id, this.id(e), 'biologique');
    return this;
  }

  /** Décès : à la date donnée, tiré (`'tiree'`) ou sans date (`'sans date'`). */
  decede(cle: string, date: string | 'tiree' | 'sans date' = 'tiree'): this {
    const { deces: _d, decede: _x, ...p } = this.lire(cle);
    const annee = Number((p.naissance ?? String(this.o.debut)).slice(0, 4));
    if (date === 'sans date') this.ecrire({ ...p, decede: true });
    else this.ecrire({ ...p, deces: date === 'tiree' ? this.date(Math.min(ANNEE_MAX - 1, annee + entre(this.hasard, 30, 60))) : date });
    return this;
  }

  groupe(nom: string, membres: string[]): this {
    this.groupes.push({ id: `${this.prefixe}-g${this.groupes.length + 1}`, nom, membres: membres.map((m) => this.id(m)) });
    return this;
  }

  moi(cle: string): this {
    this.lire(cle);
    this.cleMoi = cle;
    return this;
  }

  /** Données finales, vérifiées par `estDonneesValides`. */
  construire(): FamilleFictive {
    if (!this.cleMoi) throw new Error(`${this.nom} : « moi » manquant`);
    const donnees: Donnees = {
      version: 6,
      personnes: [...this.personnes.values()],
      unions: [...this.unions],
      filiations: [...this.filiations],
      groupes: [...this.groupes],
    };
    if (!estDonneesValides(donnees)) throw new Error(`${this.nom} : données invalides`);
    return { nom: this.nom, fichier: this.prefixe, moi: this.id(this.cleMoi), donnees };
  }
}

export function famille(nom: string, o: OptionsFamille): Famille {
  return new Famille(nom, o);
}

/** Point 13 : un cousin (Bastien) avec une ex et une compagne ; six générations ; demi-frère de Moi (Léon). */
export function dupontel(): FamilleFictive {
  return famille('Dupontel', { graine: 7, debut: 1868 })
    .couple('Anselme', 'Berthe', { marie: true })
    .enfants(['Honoré'])
    .couple('Honoré', 'Léontine', { marie: true })
    .enfants(['Auguste'])
    .couple('Auguste', 'Germaine', { marie: true })
    .enfants(['Firmin', 'Marcel'])
    .couple('Firmin', 'Odile', { marie: true })
    .enfants(['Apolline', 'Gaspard', 'Clara'])
    .couple('Marcel', 'Yvonne', { marie: true })
    .enfants(['Bastien'])
    .ex('Bastien', 'Coralie')
    .enfants(['Gaël', 'Lison', 'Timothée'])
    .couple('Bastien', 'Romane')
    .enfants(['Jules', 'Anaïs'])
    .ex('Gaspard', 'Solène')
    .enfants(['Noah'])
    .couple('Gaspard', 'Margaux', { marie: true, date: '2001-06-16' })
    .enfants(['Léon', 'Mathilde'])
    .moi('Léon')
    .construire();
}

/** Point 14 : aïeux séparés, branche Martinez profonde et étroite, branche Vasseur large avec des ancêtres sans prénom. */
export function martinezVasseur(): FamilleFictive {
  return famille('Martinez', { graine: 11, debut: 1880, fichier: 'martinez-vasseur' })
    .ex('Ramón', 'Pilar', { marie: true })
    .enfants(['Tomás', 'Lucia'])
    .couple('Tomás', 'Elena', { marie: true })
    .enfants(['Andrés', 'Rosa', 'Mateo'])
    .couple('Andrés', 'Nuria')
    .enfants(['Iker', 'Alba'])
    .couple('Joaquín', 'Rosa', { marie: true })
    .enfants(['Corentin'])
    .personne('bisaïeul Vasseur', { prenom: '', nom: 'Vasseur', sexe: 'M', generation: -1, naissance: null })
    .personne('aïeul Vasseur', { prenom: '', nom: 'Vasseur', sexe: 'M', naissance: null })
    .personne('aïeule Vasseur', { prenom: '', nom: 'Vasseur', sexe: 'F', naissance: null })
    .enfants(['aïeul Vasseur'], { de: ['bisaïeul Vasseur'] })
    .couple('aïeul Vasseur', 'aïeule Vasseur', { marie: true })
    .enfants(['Hubert', 'Armand', 'Colette', 'Fernand', 'Huguette', 'Raymond'])
    .couple('Armand', 'Blanche', { marie: true })
    .enfants(['Désiré', 'Agathe'])
    .couple('Hubert', 'Lucia', { marie: true })
    .enfants(['Diego'])
    .couple('Diego', 'Hélène', { marie: true })
    .enfants(['Inès', 'Hugo'])
    .moi('Inès')
    .construire();
}

/** Point 5 : enfants d'un ex non uni, enfant ajouté après coup avec un « ? » ; conjoint avec 2 adoptés et 1 biologique. */
export function lambert(): FamilleFictive {
  return famille('Lambert', { graine: 23, debut: 1930 })
    .couple('Gérard', 'Monique', { marie: true })
    .enfants(['Marc'])
    .personne('Aurélie', { generation: 1, nom: 'Kervadec' })
    .enfants(['Théo', 'Zoé'], { de: ['Marc', 'Aurélie'] })
    .couple('Marc', 'Nathalie', { marie: true })
    .enfants(['Sophie'])
    .enfants(['Tristan'], { de: ['Marc'] })
    .sansNom(['Tristan'])
    .couple('Romain', 'Sophie', { marie: true })
    .adopte('Nina', { par: ['Romain', 'Sophie'] })
    .adopte('Malo', { par: ['Romain', 'Sophie'] })
    .enfants(['Jade'])
    .moi('Sophie')
    .construire();
}

/** Fratries reliées par des inconnus, parent unique, veuvage puis remariage, décès sans date, dates partielles. */
export function rochefort(): FamilleFictive {
  return famille('Rochefort', { graine: 31, debut: 1935, partielles: true })
    .fratrieSansParents(['Henri', 'Louis', 'Germaine'])
    .couple('Henri', 'Jeanne', { marie: true })
    .enfants(['Anatole', 'Margot'])
    .decede('Jeanne')
    .couple('Henri', 'Odette', { marie: true })
    .couple('Anatole', 'Claire', { marie: true })
    .enfants(['Arthur', 'Lison'])
    .decede('Anatole', 'sans date')
    .fratrieSansParents(['Claire', 'Bérénice'])
    .enfants(['Noé'], { de: ['Margot'] })
    .moi('Arthur')
    .construire();
}

/** Extrêmes : 12 enfants, couple de même sexe, 3 ex successifs puis un conjoint, prénom sans sexe connu. */
export function extremes(): FamilleFictive {
  const douze = ['Albane', 'Baptiste', 'Clément', 'Delphine', 'Eudes', 'Flavie', 'Grégoire', 'Hortense', 'Ignace', 'Joséphine', 'Ophélie', 'Lazare'];
  return famille('Ferrandi', { graine: 47, debut: 1950, fichier: 'extremes' })
    .couple('Gustave', 'Adèle', { marie: true })
    .enfants(douze)
    .couple('Clément', 'Victor', { marie: true })
    .ex('Ophélie', 'Bruno')
    .enfants(['Yanis'])
    .ex('Ophélie', 'Cyril')
    .enfants(['Maëlle'])
    .ex('Ophélie', 'Damien')
    .enfants(['Sacha'])
    .couple('Ophélie', 'Jérôme')
    .moi('Baptiste')
    .construire();
}

/** Les familles de référence (point de départ des tests d'invariants et des captures). */
export function famillesDeReference(): FamilleFictive[] {
  return [dupontel(), martinezVasseur(), lambert(), rochefort(), extremes()];
}
