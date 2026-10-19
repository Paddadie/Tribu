// Écran Réglages : affichage (tri de la liste, thème), sauvegarde (export par
// partage ou téléchargement, import JSON avec confirmation avant écrasement),
// effacement des données, version. Import et effacement sont annulables.

import type { Tri } from '../modele/liste';
import { donneesVides } from '../modele/modele';
import { libelleDernierExport, type Theme } from '../modele/reglages';
import { exporterJson, importerJson, nomFichierExport } from '../modele/stockage';
import { changerAvecAnnulation } from './annulation';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierReglages } from './etat';
import { lienRetour } from './navigation';
import { exporterFichier, MESSAGE_EXPORT_IMPOSSIBLE, MESSAGES_EXPORT } from './fichier';

export const pluriel = (n: number) => `${n} ${n > 1 ? 'personnes' : 'personne'}`;

/** « 3 personnes importées. » */
export const messageImport = (n: number) => `${pluriel(n)} importée${n > 1 ? 's' : ''}.`;

/** Groupe de boutons radio « un seul choix », appliqué dès qu'on touche une option. */
function choix<T extends string>(nom: string, legende: string, options: [T, string][], actuel: T, choisir: (v: T) => void): HTMLElement {
  const boutons = options.map(([valeur, libelle]) =>
    h(
      'label',
      { class: 'choix' },
      h('input', { type: 'radio', name: nom, value: valeur, checked: valeur === actuel, onchange: () => choisir(valeur) }),
      h('span', {}, libelle),
    ),
  );
  return h('fieldset', { class: 'champ' }, h('legend', {}, legende), h('div', { class: 'choix-groupe' }, ...boutons));
}

/** Avertissement avant un import qui remplace `n` personnes (n ≥ 1). */
function avertissementRemplacement(fichier: string, importees: number, actuelles: number): string {
  const perte =
    actuelles > 1
      ? `Vos ${actuelles} personnes actuelles seront perdues, sauf si vous les avez exportées.`
      : 'Votre personne actuelle sera perdue, sauf si vous l’avez exportée.';
  return `Le fichier ${fichier} contient ${pluriel(importees)}. ${perte}`;
}

export function ecranReglages(): HTMLElement {
  const retour = '#/';
  const reglages = lireReglages();

  const messageExport = h('p', { class: 'secondaire', role: 'status' });
  const erreurImport = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const erreurEffacement = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const resumeExport = h('p', { class: 'secondaire' });
  const dateExport = h('b', {});
  const boutonEffacer = h('button', { type: 'button', class: 'bouton bouton-danger', onclick: () => void effacer() }, 'Effacer toutes les données');
  const aideEffacer = h('p', { class: 'secondaire', hidden: true }, 'Aucune donnée à effacer sur cet appareil.');

  /** Met à jour ce qui dépend des données et des réglages (après export, import, effacement, annulation). */
  const maj = () => {
    const n = lireDonnees().personnes.length;
    resumeExport.textContent = `Enregistre ${pluriel(n)} et leurs liens dans ${nomFichierExport(new Date())}.`;
    dateExport.textContent = libelleDernierExport(lireReglages().dernierExport, new Date());
    boutonEffacer.disabled = n === 0;
    aideEffacer.hidden = n > 0;
  };
  maj();

  const exporter = async () => {
    try {
      const issue = await exporterFichier(nomFichierExport(new Date()), exporterJson(lireDonnees()));
      messageExport.textContent = MESSAGES_EXPORT[issue];
      messageExport.className = issue === 'annule' ? 'secondaire' : 'succes';
      if (issue !== 'annule') modifierReglages({ dernierExport: new Date().toISOString() });
      maj();
    } catch {
      messageExport.textContent = MESSAGE_EXPORT_IMPOSSIBLE;
      messageExport.className = 'erreur';
    }
  };

  const fichier = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: -1, 'aria-hidden': true });
  fichier.addEventListener('change', async () => {
    const choisi = fichier.files?.[0];
    fichier.value = '';
    erreurImport.hidden = true;
    if (!choisi) return;
    try {
      const importees = importerJson(await choisi.text());
      const actuelles = lireDonnees().personnes.length;
      if (actuelles > 0 && !(await confirmer(avertissementRemplacement(choisi.name, importees.personnes.length, actuelles), 'Remplacer'))) return;
      changerAvecAnnulation(() => importees, messageImport(importees.personnes.length), 'Import annulé.');
      maj();
    } catch (e) {
      erreurImport.textContent = e instanceof Error ? `${e.message}. Vos données n’ont pas été modifiées.` : 'Import impossible. Vos données n’ont pas été modifiées.';
      erreurImport.hidden = false;
    }
  });

  const effacer = async () => {
    const n = lireDonnees().personnes.length;
    if (n === 0) return;
    const message = `Effacer toutes les données ? ${pluriel(n)} et tous leurs liens seront supprimés de cet appareil. Pensez à exporter d’abord.`;
    if (!(await confirmer(message, 'Effacer'))) return;
    erreurEffacement.hidden = true;
    try {
      changerAvecAnnulation(() => donneesVides(), 'Données effacées.', 'Effacement annulé.');
      maj();
    } catch (e) {
      erreurEffacement.textContent = e instanceof Error ? e.message : 'Effacement impossible';
      erreurEffacement.hidden = false;
    }
  };

  const date = new Date(__BUILD_DATE__).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  return h(
    'div',
    { class: 'ecran' },
    h(
      'div',
      { class: 'barre' },
      lienRetour(retour, { class: 'bouton-icone', 'aria-label': 'Retour' }, icone('retour', 26)),
      h('h1', { class: 'titre-formulaire' }, 'Réglages'),
    ),
    h(
      'div',
      { class: 'contenu' },
      h(
        'section',
        { class: 'groupe-reglages' },
        h('h2', { class: 'titre-section' }, 'AFFICHAGE'),
        h(
          'div',
          { class: 'carte bloc-reglages' },
          choix<Tri>('tri', 'Trier la liste par', [['prenom', 'Prénom'], ['nom', 'Nom']], reglages.tri, (tri) => modifierReglages({ tri })),
          choix<Theme>('theme', 'Thème', [['auto', 'Auto'], ['clair', 'Clair'], ['sombre', 'Sombre']], reglages.theme, (theme) => modifierReglages({ theme })),
        ),
      ),
      h(
        'section',
        { class: 'groupe-reglages' },
        h('h2', { class: 'titre-section' }, 'SAUVEGARDE'),
        h(
          'div',
          { class: 'carte bloc-reglages' },
          h(
            'div',
            { class: 'reglage' },
            h('h3', {}, 'Exporter'),
            h('p', { class: 'date-export' }, h('span', { class: 'secondaire' }, 'Dernier export'), dateExport),
            resumeExport,
            h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => void exporter() }, 'Exporter mes données'),
            messageExport,
          ),
          h(
            'div',
            { class: 'reglage' },
            h('h3', {}, 'Importer'),
            h('p', { class: 'secondaire' }, 'Remplace les données de cet appareil par celles d’un fichier exporté.'),
            h('button', { type: 'button', class: 'bouton', onclick: () => fichier.click() }, 'Choisir un fichier…'),
            fichier,
            erreurImport,
          ),
        ),
      ),
      h(
        'section',
        { class: 'groupe-reglages' },
        h('h2', { class: 'titre-section' }, 'DONNÉES'),
        boutonEffacer,
        aideEffacer,
        erreurEffacement,
      ),
      h('p', { class: 'version' }, `Tribu v${__APP_VERSION__} · build du ${date}`),
    ),
  );
}
