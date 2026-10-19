// Sortie d'un fichier vers le téléphone (export des données, contenu de secours) :
// feuille de partage quand elle accepte les fichiers (iPhone, Android), sinon
// téléchargement. Le message dit exactement ce qui s'est passé, sans promettre
// un enregistrement qu'on ne peut pas vérifier.

import { h } from './dom';

/** Issue d'un export : partagé, annulé par l'utilisateur, ou téléchargement lancé. */
export type IssueExport = 'partage' | 'annule' | 'telecharge';

export const MESSAGES_EXPORT: Record<IssueExport, string> = {
  partage: 'Fichier partagé.',
  annule: 'Partage annulé : rien n’a été exporté.',
  telecharge: 'Téléchargement lancé : vérifiez le dossier Téléchargements.',
};

export const MESSAGE_EXPORT_IMPOSSIBLE = 'Export impossible sur cet appareil.';

/** Déclenche le téléchargement d'un fichier. */
export function telecharger(nom: string, contenu: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const lien = h('a', { href: url, download: nom });
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Partage = Pick<Navigator, 'share' | 'canShare'>;

/**
 * Propose le fichier à la feuille de partage, ou le télécharge si le partage de
 * fichiers n'existe pas ou est refusé. Lève une erreur si rien n'a pu être fait.
 * À appeler directement dans le gestionnaire du clic (le partage l'exige).
 */
export async function exporterFichier(
  nom: string,
  contenu: string,
  type = 'application/json',
  partage: Partial<Partage> = navigator,
  repli: typeof telecharger = telecharger,
): Promise<IssueExport> {
  const fichier = new File([contenu], nom, { type });
  if (partage.share && partage.canShare?.({ files: [fichier] })) {
    try {
      await partage.share({ files: [fichier], title: nom });
      return 'partage';
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return 'annule';
      // Partage refusé (permission, type de fichier…) : on se rabat sur le téléchargement.
    }
  }
  repli(nom, contenu, type);
  return 'telecharge';
}
