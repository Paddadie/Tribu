// Écran « Données illisibles » : affiché à la place de tout le reste quand le
// contenu stocké ne peut pas être lu. Rien n'est écrasé sans action de Paul :
// il peut exporter le brut, ou repartir à vide après confirmation.

import { nomFichierSecours } from '../modele/stockage';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { repartirAVide } from './etat';
import { exporterFichier, MESSAGE_EXPORT_IMPOSSIBLE, MESSAGES_EXPORT } from './fichier';

export function ecranIllisible(brut: string, apresRepartir: () => void): HTMLElement {
  const nom = nomFichierSecours(new Date());
  const message = h('p', { class: 'secondaire', role: 'status' });
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const exporter = async () => {
    try {
      message.textContent = MESSAGES_EXPORT[await exporterFichier(nom, brut, 'text/plain')];
    } catch {
      message.textContent = MESSAGE_EXPORT_IMPOSSIBLE;
    }
  };

  const repartir = async () => {
    const texte =
      'Repartir avec une liste vide ? Le contenu illisible reste gardé en secours sur ce téléphone. Tu pourras ensuite restaurer une sauvegarde depuis l’accueil.';
    if (!(await confirmer(texte, 'Repartir à vide'))) return;
    try {
      repartirAVide();
      apresRepartir();
    } catch (e) {
      erreur.textContent = e instanceof Error ? e.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
  };

  return h(
    'div',
    { class: 'ecran illisible' },
    h('div', { class: 'pictogramme' }, icone('alerte', 32)),
    h('h1', {}, 'Données illisibles'),
    h('p', {}, 'Tribu n’arrive pas à lire les données enregistrées sur ce téléphone. Rien n’a été effacé : le contenu est mis de côté tel quel.'),
    h(
      'div',
      { class: 'illisible-actions' },
      h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => void exporter() }, 'Exporter le contenu brut'),
      h('p', { class: 'secondaire' }, `Enregistre ${nom}, à garder ou à envoyer pour réparation.`),
      message,
      h('button', { type: 'button', class: 'bouton bouton-danger', onclick: repartir }, 'Repartir à vide…'),
      erreur,
    ),
    h('p', { class: 'version' }, `Tribu v${__APP_VERSION__}`),
  );
}
