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
  /** Date de décès facultative, de la même forme que la naissance. Absente = vivante. */
  deces?: string;
  sexe?: Sexe;
  note: string;
}

/** `actuelle` : le couple de maintenant (un seul par personne) ; `separee` : un ex, gardé pour l'historique. */
export type StatutUnion = 'actuelle' | 'separee';

/** Couple : relie deux personnes distinctes. */
export interface Union {
  id: string;
  personneA: string;
  personneB: string;
  marie: boolean;
  statut: StatutUnion;
}

/** Lien parent → enfant. */
export interface Filiation {
  id: string;
  parent: string;
  enfant: string;
  type: TypeFiliation;
}

/** Amitié entre deux personnes distinctes quelconques ; elle ne crée aucune parenté. */
export interface Amitie {
  id: string;
  personneA: string;
  personneB: string;
}

export interface Donnees {
  version: 3;
  personnes: Personne[];
  unions: Union[];
  filiations: Filiation[];
  amities: Amitie[];
}
