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
  sexe?: Sexe;
  note: string;
}

/** Couple : relie deux personnes distinctes. */
export interface Union {
  id: string;
  personneA: string;
  personneB: string;
  marie: boolean;
}

/** Lien parent → enfant. */
export interface Filiation {
  id: string;
  parent: string;
  enfant: string;
  type: TypeFiliation;
}

export interface Donnees {
  version: 1;
  personnes: Personne[];
  unions: Union[];
  filiations: Filiation[];
}
