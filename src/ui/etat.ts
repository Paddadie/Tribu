// État de l'appli : les données en mémoire, écrites dans localStorage à chaque
// modification. Si l'écriture échoue (quota, navigation privée…), l'erreur
// remonte à l'appelant et les données en mémoire restent celles d'avant.
// Si le contenu stocké est illisible, aucune écriture n'a lieu tant que
// l'utilisateur n'a pas choisi de repartir à vide.

import { donneesVides } from '../modele/modele';
import { chargerReglages, sauvegarderReglages, type Reglages } from '../modele/reglages';
import { charger, sauvegarder } from '../modele/stockage';
import type { Donnees } from '../modele/types';

const chargement = charger(localStorage);
let donnees: Donnees = chargement.lisible ? chargement.donnees : donneesVides();
let brutIllisible: string | null = chargement.lisible ? null : chargement.brut;
let reglages: Reglages = chargerReglages(localStorage);

export function lireDonnees(): Donnees {
  return donnees;
}

/** Contenu stocké illisible trouvé au lancement, ou null si tout va bien. */
export function lireBrutIllisible(): string | null {
  return brutIllisible;
}

/** Applique une transformation (fonction du modèle), la sauvegarde, puis la garde en mémoire. */
export function modifierDonnees(transformation: (d: Donnees) => Donnees): void {
  if (brutIllisible !== null) throw new Error('Données illisibles : rien n’a été enregistré');
  const suivantes = transformation(donnees);
  ecrire(suivantes);
  donnees = suivantes;
}

/** Écrit dans localStorage ; un stockage plein ou bloqué devient une erreur en français. */
function ecrire(d: Donnees): void {
  try {
    sauvegarder(localStorage, d);
  } catch (e) {
    const plein = e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    throw new Error(
      plein
        ? 'Stockage du téléphone plein : la modification n’a pas été enregistrée'
        : 'Enregistrement impossible sur ce téléphone : la modification n’a pas été enregistrée',
    );
  }
}

/**
 * Comme modifierDonnees, en gardant une copie de l'état d'avant (import,
 * effacement). Renvoie la fonction qui y revient, pour un bandeau « Annuler ».
 */
export function modifierDonneesAnnulable(transformation: (d: Donnees) => Donnees): () => void {
  const avant = donnees;
  modifierDonnees(transformation);
  return () => modifierDonnees(() => avant);
}

/** Remplace un contenu illisible par une liste vide (après confirmation). La copie de secours reste. */
export function repartirAVide(): void {
  const vides = donneesVides();
  ecrire(vides);
  donnees = vides;
  brutIllisible = null;
}

export function lireReglages(): Reglages {
  return reglages;
}

// Thème du téléphone, suivi en direct pour le réglage « auto » (absent hors navigateur).
const telephoneSombre = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
telephoneSombre?.addEventListener('change', () => appliquerTheme());

/** Pose le thème effectif (« clair » ou « sombre ») sur <html> ; « auto » prend celui du téléphone. */
export function appliquerTheme(theme: Reglages['theme'] = reglages.theme): void {
  const sombre = theme === 'sombre' || (theme === 'auto' && telephoneSombre?.matches === true);
  document.documentElement.dataset.theme = sombre ? 'sombre' : 'clair';
}

/** Change un ou plusieurs réglages, les mémorise et applique le thème. Garde le changement en mémoire même si l'écriture échoue. */
export function modifierReglages(changement: Partial<Reglages>): void {
  reglages = { ...reglages, ...changement };
  appliquerTheme();
  try {
    sauvegarderReglages(localStorage, reglages);
  } catch {
    // Mémorisation impossible (stockage plein ou bloqué) : le réglage vaut pour cette session.
  }
}
