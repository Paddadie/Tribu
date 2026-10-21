// Types du modèle de données. Tout est identifié par un id (UUID) ; les liens
// (unions, filiations) référencent les personnes par id.

export type TypeFiliation = 'biologique' | 'adoptif';

/** Sexe, sert uniquement aux accords (né/née). Absent = non précisé. */
export type Sexe = 'F' | 'M';

export interface Personne {
  id: string;
  prenom: string;
  nom: string;
  /** Date ISO facultative, éventuellement partielle : « AAAA », « AAAA-MM » ou « AAAA-MM-JJ ». */
  naissance?: string;
  /** Date de décès facultative, de la même forme que la naissance (sans année possible). */
  deces?: string;
  /** Décédée sans date de décès connue (la date seule suffit sinon, voir `estDecede`). Absents tous deux = vivante. */
  decede?: true;
  sexe?: Sexe;
  /** Nom de jeune fille d'une femme mariée (`nom` est alors son nom d'épouse). */
  nomNaissance?: string;
  note: string;
  /**
   * Parent inconnu : personne sans nom créée en coulisse pour relier des frères et sœurs dont on ignore les parents.
   * Elle compte dans les déductions mais n'apparaît jamais (listes, fiches, arbres) ; voir `estInconnu`.
   */
  inconnu?: true;
  /** Parent sans nom enregistré (le « ? » de l'arbre) : une personne visible, dont on ne connaît pas encore le nom ; voir `estParentSansNom`. */
  sansNom?: true;
}

/**
 * `actuelle` : le couple de maintenant (un seul avec un vivant par personne : un veuf ou une veuve garde son union avec le
 * défunt et peut en avoir une nouvelle) ; `separee` : un ex, gardé pour l'historique.
 */
export type StatutUnion = 'actuelle' | 'separee';

/** Couple : relie deux personnes distinctes. */
export interface Union {
  id: string;
  personneA: string;
  personneB: string;
  marie: boolean;
  statut: StatutUnion;
  /** Date de l'union (mariage ou début du couple) facultative : « AAAA », « AAAA-MM », « AAAA-MM-JJ » ou « --MM-JJ » (sans année). */
  date?: string;
}

/** Lien parent → enfant. */
export interface Filiation {
  id: string;
  parent: string;
  enfant: string;
  type: TypeFiliation;
}

/**
 * Groupe d'amis : toutes les personnes qui en font partie sont amies entre elles, de la famille ou non ;
 * une amitié ne crée aucune parenté. Au moins deux membres. `Moi` est un membre comme un autre : un groupe
 * qui le contient est « tes amis ». Le nom est facultatif (voir `nomGroupe`).
 */
export interface GroupeAmis {
  id: string;
  nom: string;
  membres: string[];
}

export interface Donnees {
  version: 5;
  personnes: Personne[];
  unions: Union[];
  filiations: Filiation[];
  groupes: GroupeAmis[];
}
