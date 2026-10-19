// Écran Réglages : affichage (tri de la liste, thème), sauvegarde (export et import
// JSON avec confirmation avant écrasement), effacement des données, version.

import type { Tri } from '../modele/liste';
import { donneesVides } from '../modele/modele';
import type { Theme } from '../modele/reglages';
import { exporterJson, importerJson, nomFichierExport } from '../modele/stockage';
import { confirmer } from './confirmer';
import { h, icone } from './dom';
import { lireDonnees, lireReglages, modifierDonnees, modifierReglages } from './etat';

const pluriel = (n: number) => `${n} ${n > 1 ? 'personnes' : 'personne'}`;

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

/** Déclenche le téléchargement d'un fichier JSON. */
function telecharger(nom: string, contenu: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const lien = h('a', { href: url, download: nom });
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ecranReglages(): HTMLElement {
  const retour = '#/';
  const reglages = lireReglages();

  const messageExport = h('p', { class: 'secondaire', role: 'status' });
  const erreurImport = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const succesImport = h('p', { class: 'succes', role: 'status', hidden: true });
  const erreurEffacement = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const resumeExport = h('p', { class: 'secondaire' });

  const majResume = () => {
    resumeExport.textContent = `Enregistre ${pluriel(lireDonnees().personnes.length)} et leurs liens dans ${nomFichierExport(new Date())}.`;
  };
  majResume();

  const exporter = () => {
    try {
      telecharger(nomFichierExport(new Date()), exporterJson(lireDonnees()));
      messageExport.textContent = 'Fichier enregistré dans vos téléchargements.';
    } catch {
      messageExport.textContent = 'Export impossible sur cet appareil.';
    }
  };

  const fichier = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: -1, 'aria-hidden': true });
  fichier.addEventListener('change', async () => {
    const choisi = fichier.files?.[0];
    fichier.value = '';
    erreurImport.hidden = true;
    succesImport.hidden = true;
    if (!choisi) return;
    try {
      const importees = importerJson(await choisi.text());
      const actuelles = lireDonnees().personnes.length;
      if (actuelles > 0) {
        const message = `Le fichier ${choisi.name} contient ${pluriel(importees.personnes.length)}. Vos ${pluriel(actuelles)} actuelles seront perdues, sauf si vous les avez exportées.`;
        if (!(await confirmer(message, 'Remplacer'))) return;
      }
      modifierDonnees(() => importees);
      majResume();
      succesImport.textContent = `${pluriel(importees.personnes.length)} importée${importees.personnes.length > 1 ? 's' : ''}.`;
      succesImport.hidden = false;
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
    try {
      modifierDonnees(() => donneesVides());
      majResume();
      succesImport.hidden = true;
      erreurEffacement.hidden = true;
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
      h('a', { class: 'bouton-icone', href: retour, 'aria-label': 'Retour à la liste' }, icone('retour', 26)),
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
            resumeExport,
            h('button', { type: 'button', class: 'bouton bouton-plein', onclick: exporter }, 'Exporter mes données'),
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
            succesImport,
          ),
        ),
      ),
      h(
        'section',
        { class: 'groupe-reglages' },
        h('h2', { class: 'titre-section' }, 'DONNÉES'),
        h('button', { type: 'button', class: 'bouton bouton-danger', onclick: effacer }, 'Effacer toutes les données'),
        erreurEffacement,
      ),
      h('p', { class: 'version' }, `Tribu v${__APP_VERSION__} · build du ${date}`),
    ),
  );
}
