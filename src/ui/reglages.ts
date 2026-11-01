// Écran Réglages : affichage (tri de la liste, thème), exports (agenda .ics, arbre en PNG), sauvegarde (export par
// partage ou téléchargement, import JSON fusionné avec les données, questions en cas de conflit),
// « Qui suivre » (cercles des rappels et de « À compléter »), effacement des données, version. Import et effacement
// sont annulables.

import { bilanAgenda, construireIcs, evenementsAgenda, NOM_FICHIER_AGENDA } from '../modele/agenda';
import type { Tri } from '../modele/liste';
import { filtrerListe } from '../modele/filtres';
import { AFFICHAGES, garderPour, type Affichage } from '../modele/ligneDirecte';
import { donneesVides, personnesListees, personnesVisibles } from '../modele/modele';
import { estVirtuel } from '../modele/parentSansNom';
import { ficheMoi, libelleDernierExport, type Theme } from '../modele/reglages';
import { FusionAnnulee, fusionner } from '../modele/fusion';
import { exporterJson, importerJson, nomFichierExport } from '../modele/stockage';
import { CERCLES, cercleDe, memeSuivi, SUIVI_FAMILLE_PROCHE, SUIVI_TOUT, suivis, type Cercle, type Suivi } from '../modele/suivi';
import { arbreSouple } from './arbreSouple';
import { changerAvecAnnulation } from './annulation';
import { choisir } from './choisir';
import { ouvrirChoixMoi } from './choixMoi';
import { confirmer } from './confirmer';
import { h, icone, type Enfant } from './dom';
import { barreEcran } from './ecran';
import { lireDonnees, lireReglages, modifierReglages, suiviCourant } from './etat';
import { messageFusion, messageImport, pluriel } from './import';
import { contenuLigne } from './lignePersonne';
import { remplacer } from './navigation';
import { affichageArbre } from './arbreGlobal';
import { arbrePng, dimensionsArbre, NOM_FICHIER_ARBRE } from './arbreImage';
import { exporterFichier, MESSAGE_EXPORT_IMPOSSIBLE, MESSAGES_EXPORT } from './fichier';

/** Groupe de boutons radio « un seul choix », appliqué dès qu'on touche une option. */
function choix<T extends string>(nom: string, legende: string, options: [T, string][], actuel: T, choisir: (v: T) => void, grille = false): HTMLElement {
  const boutons = options.map(([valeur, libelle]) =>
    h(
      'label',
      { class: 'choix' },
      h('input', { type: 'radio', name: nom, value: valeur, checked: valeur === actuel, onchange: () => choisir(valeur) }),
      h('span', {}, libelle),
    ),
  );
  return h('fieldset', { class: 'champ' }, h('legend', {}, legende), h('div', { class: grille ? 'choix-groupe grille' : 'choix-groupe' }, ...boutons));
}

/** Interrupteur : titre et aide à gauche, case à cocher à droite. */
function bascule(id: string, titre: string, aide: string, coche: boolean, changer: (coche: boolean) => void): HTMLElement {
  const boite = h('input', { id, type: 'checkbox', class: 'bascule', checked: coche, onchange: () => changer(boite.checked) });
  return h(
    'label',
    { class: 'interrupteur', for: id },
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, titre), h('span', { class: 'secondaire' }, aide)),
    boite,
  );
}

export const ONGLETS_REGLAGES = [
  { id: 'general', libelle: 'Général', icone: 'reglages' },
  { id: 'exports', libelle: 'Exports', icone: 'haut' },
  { id: 'sauvegarde', libelle: 'Sauvegarde', icone: 'echange' },
  { id: 'donnees', libelle: 'Données', icone: 'coche' },
] as const;
export type OngletReglages = (typeof ONGLETS_REGLAGES)[number]['id'];

/** Contenu d'un panneau, et mise à jour de ce qui y dépend des données et des réglages. */
interface Onglet {
  contenu: Enfant[];
  maj: () => void;
}

/** Général : ma fiche, groupes d'amis, affichage. */
function ongletGeneral(): Onglet {
  const reglages = lireReglages();

  // Ma fiche : une ligne qui ouvre la feuille de choix ; redessinée après un choix.
  const carteMoi = h('div', { class: 'carte' });
  const aideMoi = h('p', { class: 'secondaire aide-section' });
  const dessinerMoi = () => {
    const moi = ficheMoi(lireReglages(), lireDonnees());
    carteMoi.replaceChildren(
      h(
        'button',
        { type: 'button', class: 'ligne ligne-choix', onclick: () => ouvrirChoixMoi(dessinerMoi) },
        ...(moi
          ? [...contenuLigne(moi, undefined, 'Ma fiche'), h('span', { class: 'action-ligne' }, 'Changer')]
          : [
              h('span', { class: 'avatar avatar-vide' }, icone('plus', 20)),
              h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom action-ligne' }, 'Choisir ma fiche')),
            ]),
      ),
    );
    aideMoi.textContent = moi
      ? 'Chaque fiche affiche son lien avec toi : « ta cousine », « ton oncle par alliance ».'
      : 'Chaque fiche affichera son lien avec toi.';
  };

  const contenu = [
    h('section', { class: 'groupe-reglages' }, h('h2', { class: 'titre-section' }, 'Moi'), carteMoi, aideMoi),
    h(
      'section',
      { class: 'groupe-reglages' },
      h('h2', { class: 'titre-section' }, 'Amis'),
      h(
        'div',
        { class: 'carte' },
        h(
          'a',
          { class: 'ligne ligne-lien', href: '#/groupes' },
          icone('ami', 24),
          h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, 'Groupes d’amis'), h('span', { class: 'secondaire' }, 'Noms et membres')),
          icone('chevron', 20),
        ),
      ),
    ),
    h(
      'section',
      { class: 'groupe-reglages' },
      h('h2', { class: 'titre-section' }, 'Affichage'),
      h(
        'div',
        { class: 'carte bloc-reglages' },
        choix<Tri>(
          'tri',
          'Trier la liste par',
          [
            ['prenom', 'Prénom'],
            ['nom', 'Nom'],
          ],
          reglages.tri,
          (tri) => modifierReglages({ tri }),
        ),
        choix<Theme>(
          'theme',
          'Thème',
          [
            ['auto', 'Auto'],
            ['clair', 'Clair'],
            ['sombre', 'Sombre'],
          ],
          reglages.theme,
          (theme) => modifierReglages({ theme }),
        ),
        bascule('fetes', 'Fêtes du prénom', 'Sur l’accueil et dans l’agenda', reglages.fetes, (fetes) => modifierReglages({ fetes })),
      ),
    ),
  ];
  return { contenu, maj: dessinerMoi };
}

/** Exports : dates vers un agenda (.ics), arbre en image (PNG). `majTout` : après un changement de réglage. */
function ongletExports(majTout: () => void): Onglet {
  const reglages = lireReglages();
  const resumeAgenda = h('p', { class: 'secondaire' });
  const messageAgenda = h('p', { class: 'secondaire', role: 'status' });
  const boutonAgenda = h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => void exporterAgenda() }, 'Exporter vers l’agenda');
  const resumeImage = h('p', { class: 'secondaire' });
  const messageImage = h('p', { class: 'secondaire', role: 'status' });
  const boutonImage = h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => void exporterImage() }, 'Exporter l’arbre en PNG');
  // Personnes à dessiner : le filtre de l'arbre en cours, changeable ici sans toucher à l'écran Arbre.
  let affichage: Affichage = affichageArbre();
  // Générations souples : les décalages connus de l'écran Arbre (sinon le dessin d'avant, le temps de les chercher).
  const dessin = (moi: string) => arbreSouple(lireDonnees(), moi, garderPour(lireDonnees(), moi, affichage));

  const maj = () => {
    const n = personnesVisibles(lireDonnees()).length;
    const bilan = bilanAgenda(evenementsAgenda(lireDonnees(), { fetes: lireReglages().fetesDansIcs, ...suiviCourant() }));
    const total = bilan.naissances + bilan.deces + bilan.unions + bilan.fetes;
    resumeAgenda.textContent =
      total === 0
        ? 'Aucune date complète pour l’instant : ajoute le jour et le mois d’une naissance, d’un décès ou d’une union.'
        : `${bilan.naissances} ${bilan.naissances > 1 ? 'naissances' : 'naissance'} · ${bilan.deces} ${bilan.deces > 1 ? 'décès' : 'décès'} · ${bilan.unions} ${bilan.unions > 1 ? 'unions' : 'union'}${bilan.fetes > 0 ? ` · ${bilan.fetes} ${bilan.fetes > 1 ? 'fêtes' : 'fête'}` : ''}. Les fiches sans jour ni mois sont ignorées.`;
    boutonAgenda.disabled = total === 0;
    const moi = ficheMoi(lireReglages(), lireDonnees());
    if (moi) {
      const disp = dessin(moi.id);
      const dim = dimensionsArbre(disp);
      const dessinees = affichage === 'tout' ? n : disp.places.filter((p) => !estVirtuel(p.personne.id) && !p.personne.inconnu).length;
      resumeImage.textContent = `${pluriel(dessinees)} · image d’environ ${dim.pixelsL} × ${dim.pixelsH} px`;
    } else resumeImage.textContent = 'Choisis ta fiche dans Réglages → Moi.';
    boutonImage.disabled = !moi;
  };

  const exporterAgenda = async () => {
    const evenements = evenementsAgenda(lireDonnees(), { fetes: lireReglages().fetesDansIcs, ...suiviCourant() });
    if (evenements.length === 0) return;
    try {
      const issue = await exporterFichier(NOM_FICHIER_AGENDA, construireIcs(evenements, new Date()), 'text/calendar');
      messageAgenda.textContent = MESSAGES_EXPORT[issue];
      messageAgenda.className = issue === 'annule' ? 'secondaire' : 'succes';
    } catch {
      messageAgenda.textContent = MESSAGE_EXPORT_IMPOSSIBLE;
      messageAgenda.className = 'erreur';
    }
  };

  const exporterImage = async () => {
    const moi = ficheMoi(lireReglages(), lireDonnees());
    if (!moi) return;
    try {
      const maintenant = new Date();
      const png = await arbrePng(dessin(moi.id), lireDonnees(), moi, maintenant);
      const issue = await exporterFichier(NOM_FICHIER_ARBRE(maintenant), png, 'image/png');
      messageImage.textContent = MESSAGES_EXPORT[issue];
      messageImage.className = issue === 'annule' ? 'secondaire' : 'succes';
    } catch {
      messageImage.textContent = MESSAGE_EXPORT_IMPOSSIBLE;
      messageImage.className = 'erreur';
    }
  };

  const contenu = [
    h(
      'section',
      { class: 'groupe-reglages' },
      h('h2', { class: 'titre-section' }, 'Exports'),
      h(
        'div',
        { class: 'carte bloc-reglages' },
        h(
          'div',
          { class: 'reglage' },
          h('h3', {}, 'Exporter les dates vers un agenda'),
          h(
            'p',
            { class: 'secondaire' },
            'Crée un fichier avec les anniversaires de naissance, les souvenirs de décès et les anniversaires d’union de tes proches. Chaque date revient chaque année.',
          ),
          bascule('fetes-ics', 'Inclure les fêtes', 'Une date par prénom au calendrier', reglages.fetesDansIcs, (fetesDansIcs) => {
            modifierReglages({ fetesDansIcs });
            majTout();
          }),
          resumeAgenda,
          boutonAgenda,
          messageAgenda,
          h(
            'details',
            {},
            h('summary', {}, 'Comment l’utiliser'),
            h(
              'ol',
              { class: 'secondaire' },
              h('li', {}, 'Crée un agenda dédié, nommé « Tribu », dans ton application d’agenda.'),
              h('li', {}, 'Importe le fichier dans cet agenda, pas dans ton agenda principal.'),
              h('li', {}, 'Règle les notifications de cet agenda : la veille et le jour même.'),
              h('li', {}, 'Après des ajouts dans Tribu, exporte de nouveau et réimporte : les événements existants sont mis à jour, sans doublon.'),
            ),
          ),
        ),
      ),
      h(
        'div',
        { class: 'carte bloc-reglages' },
        h(
          'div',
          { class: 'reglage' },
          h('h3', {}, 'Exporter l’arbre en image'),
          h(
            'p',
            { class: 'secondaire' },
            'Dessine l’arbre global dans une image PNG, avec les noms : tout l’arbre (famille et amis) ou seulement ta ligne directe. Elle ne dépend ni de ton zoom ni de ta position actuels.',
          ),
          choix(
            'affichage-png',
            'Personnes à dessiner',
            AFFICHAGES.map((a): [Affichage, string] => [a.valeur, a.libelle]),
            affichage,
            (v) => {
              affichage = v;
              maj();
            },
            true,
          ),
          resumeImage,
          boutonImage,
          messageImage,
        ),
      ),
    ),
  ];
  return { contenu, maj };
}

/** Sauvegarde : export JSON, import fusionné (annulable). `majTout` : après un export ou un import. */
function ongletSauvegarde(majTout: () => void): Onglet {
  const messageExport = h('p', { class: 'secondaire', role: 'status' });
  const erreurImport = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const resumeExport = h('p', { class: 'secondaire' });
  const dateExport = h('b', {});

  const maj = () => {
    const n = personnesVisibles(lireDonnees()).length;
    resumeExport.textContent = `Enregistre ${pluriel(n)} et leurs liens dans ${nomFichierExport(new Date())}.`;
    dateExport.textContent = libelleDernierExport(lireReglages().dernierExport, new Date());
  };

  const exporter = async () => {
    try {
      const issue = await exporterFichier(nomFichierExport(new Date()), exporterJson(lireDonnees()));
      messageExport.textContent = MESSAGES_EXPORT[issue];
      messageExport.className = issue === 'annule' ? 'secondaire' : 'succes';
      if (issue !== 'annule') modifierReglages({ dernierExport: new Date().toISOString() });
      majTout();
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
      if (lireDonnees().personnes.length === 0) {
        changerAvecAnnulation(() => importees, messageImport(personnesVisibles(importees).length), 'Import annulé.');
      } else {
        const bilan = await fusionner(lireDonnees(), importees, (q) => choisir(q.texte, q.options));
        changerAvecAnnulation(() => bilan.donnees, messageFusion(bilan), 'Import annulé.');
      }
      majTout();
    } catch (e) {
      if (e instanceof FusionAnnulee) return;
      erreurImport.textContent =
        e instanceof Error ? `${e.message}. Tes données n’ont pas été modifiées.` : 'Import impossible. Tes données n’ont pas été modifiées.';
      erreurImport.hidden = false;
    }
  });

  const contenu = [
    h(
      'section',
      { class: 'groupe-reglages' },
      h('h2', { class: 'titre-section' }, 'Sauvegarde'),
      h(
        'div',
        { class: 'carte bloc-reglages' },
        h(
          'div',
          { class: 'reglage' },
          h('h3', {}, 'Exporter'),
          h('p', { class: 'date-export' }, h('span', { class: 'secondaire' }, 'Dernier export'), dateExport),
          resumeExport,
          h('p', { class: 'secondaire' }, 'L’export contient tes notes en clair : garde le fichier pour toi.'),
          h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => void exporter() }, 'Exporter mes données'),
          messageExport,
        ),
        h(
          'div',
          { class: 'reglage' },
          h('h3', {}, 'Importer'),
          h(
            'p',
            { class: 'secondaire' },
            'Fusionne un fichier exporté avec les données de cet appareil. Rien n’est effacé ; en cas de conflit ou de doute, je te demande.',
          ),
          h('button', { type: 'button', class: 'bouton', onclick: () => fichier.click() }, 'Choisir un fichier…'),
          fichier,
          erreurImport,
        ),
      ),
    ),
  ];
  return { contenu, maj };
}

/** Données : vérification, effacement (annulable), version. `majTout` : après un effacement. */
/**
 * « Qui suivre » : une ligne par cercle (lien avec « Moi »), une case pour les rappels et une pour « À compléter » ;
 * préréglages au-dessus, bilan dessous. Sans « Moi », pas de cercle : tout le monde est suivi.
 */
function quiSuivre(majTout: () => void): Onglet {
  const prereglages: [string, Suivi | undefined][] = [
    ['Tout le monde', SUIVI_TOUT],
    ['Famille proche', SUIVI_FAMILLE_PROCHE],
    ['Sur mesure', undefined],
  ];
  const cases: { quoi: keyof Suivi; cercle: Cercle; boite: HTMLInputElement }[] = [];
  const nombres = new Map<Cercle, HTMLElement>();
  const changer = (suivi: Suivi) => {
    modifierReglages({ suivi });
    etat();
  };
  const caseSuivi = (quoi: keyof Suivi, cercle: Cercle, libelle: string) => {
    const boite = h('input', {
      type: 'checkbox',
      class: 'case-suivi',
      'aria-label': `${quoi === 'rappels' ? 'Rappels' : 'À compléter'} : ${libelle}`,
      onchange: () => {
        const suivi = lireReglages().suivi;
        changer({ ...suivi, [quoi]: { ...suivi[quoi], [cercle]: boite.checked } });
      },
    });
    cases.push({ quoi, cercle, boite });
    return boite;
  };
  // « Sur mesure » n'est qu'un état (aucun préréglage ne correspond) : le toucher mène aux cases.
  const puces = prereglages.map(([libelle, suivi]) =>
    h('button', { type: 'button', class: 'puce', onclick: () => (suivi ? changer(suivi) : cases[0]?.boite.focus()) }, libelle),
  );
  const colonne = (nom: 'cloche' | 'crayon', libelle: string) => h('span', { class: 'colonne-suivi' }, icone(nom, 18), libelle);
  const grille = h(
    'div',
    { class: 'carte grille-suivi' },
    h(
      'div',
      { class: 'ligne-suivi entete-suivi' },
      h('span', { class: 'secondaire' }, 'Lien avec toi'),
      colonne('cloche', 'Rappels'),
      colonne('crayon', 'À compléter'),
    ),
    ...CERCLES.map(({ cercle, libelle, detail }) => {
      const nombre = h('span', { class: 'secondaire' });
      nombres.set(cercle, nombre);
      return h(
        'div',
        { class: 'ligne-suivi' },
        h(
          'span',
          { class: 'ligne-texte' },
          h('span', {}, h('span', { class: 'ligne-nom' }, libelle), ' ', nombre),
          detail && h('span', { class: 'secondaire' }, detail),
        ),
        caseSuivi('rappels', cercle, libelle),
        caseSuivi('completer', cercle, libelle),
      );
    }),
  );
  const bilan = h('p', { class: 'bilan-suivi', 'aria-live': 'polite' });
  const avecMoi = h(
    'div',
    { class: 'qui-suivre' },
    h('div', { class: 'puces-suivi', role: 'group', 'aria-label': 'Préréglages' }, ...puces),
    grille,
    h(
      'p',
      { class: 'secondaire aide-section' },
      'Toi et ton conjoint : toujours suivis. ',
      h('b', {}, 'Rappels'),
      ' : anniversaires, fêtes et unions sur l’accueil, l’agenda et l’export .ics. ',
      h('b', {}, 'À compléter'),
      ' : fiche signalée s’il manque un nom ou une date ; décochée, elle compte comme complète. Chaque fiche peut faire exception (Modifier).',
    ),
    bilan,
  );
  const sansMoi = h(
    'div',
    { class: 'qui-suivre' },
    h('p', { class: 'secondaire aide-section' }, 'Les cercles se comptent depuis ta fiche. En attendant, tout le monde est suivi.'),
    h('button', { type: 'button', class: 'bouton bouton-plein', onclick: () => ouvrirChoixMoi(majTout) }, 'Choisir ma fiche'),
  );

  /** Cases, préréglage actif et bilan, d'après les réglages et les données du moment. */
  const etat = () => {
    const d = lireDonnees();
    const { moi, suivi } = suiviCourant(d);
    for (const c of cases) c.boite.checked = suivi[c.quoi][c.cercle];
    const actif = prereglages.findIndex(([, s]) => !s || memeSuivi(s, suivi));
    puces.forEach((p, i) => p.setAttribute('aria-pressed', String(i === actif)));
    const autres = personnesListees(d).filter((p) => p.id !== moi);
    const s = suivis(d, moi, suivi);
    const signalees = filtrerListe(d, autres, { filtre: 'acompleter' }, moi, suivi).length;
    bilan.textContent = `Suivis : ${autres.filter(s.rappel).length} sur ${autres.length} · à compléter : ${signalees} fiche${signalees > 1 ? 's' : ''}`;
  };
  const maj = () => {
    const d = lireDonnees();
    const moi = suiviCourant(d).moi;
    avecMoi.hidden = !moi;
    sansMoi.hidden = !!moi;
    if (!moi) return;
    const parCercle = new Map<Cercle, number>();
    for (const p of personnesListees(d)) {
      const c = cercleDe(d, moi, p.id);
      if (c) parCercle.set(c, (parCercle.get(c) ?? 0) + 1);
    }
    for (const [cercle, el] of nombres) el.textContent = `· ${parCercle.get(cercle) ?? 0}`;
    etat();
  };
  const contenu = [h('section', { class: 'groupe-reglages' }, h('h2', { class: 'titre-section' }, 'Qui suivre'), avecMoi, sansMoi)];
  return { contenu, maj };
}

function ongletDonnees(majTout: () => void): Onglet {
  const suivi = quiSuivre(majTout);
  const erreurEffacement = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const boutonEffacer = h('button', { type: 'button', class: 'bouton bouton-danger', onclick: () => void effacer() }, 'Effacer toutes les données');
  const aideEffacer = h('p', { class: 'secondaire', hidden: true }, 'Aucune donnée à effacer sur cet appareil.');

  const maj = () => {
    const n = personnesVisibles(lireDonnees()).length;
    boutonEffacer.disabled = n === 0;
    aideEffacer.hidden = n > 0;
    suivi.maj();
  };

  const effacer = async () => {
    const n = personnesVisibles(lireDonnees()).length;
    if (n === 0) return;
    const message = `Effacer toutes les données ? ${pluriel(n)} et tous leurs liens seront supprimés de cet appareil. Pense à exporter d’abord.`;
    if (!(await confirmer(message, 'Effacer'))) return;
    erreurEffacement.hidden = true;
    try {
      changerAvecAnnulation(() => donneesVides(), 'Données effacées.', 'Effacement annulé.');
      majTout();
    } catch (e) {
      erreurEffacement.textContent = e instanceof Error ? e.message : 'Effacement impossible';
      erreurEffacement.hidden = false;
    }
  };

  const date = new Date(__BUILD_DATE__).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  const contenu = [
    ...suivi.contenu,
    h(
      'section',
      { class: 'groupe-reglages' },
      h('h2', { class: 'titre-section' }, 'Données'),
      h(
        'div',
        { class: 'carte' },
        h(
          'a',
          { class: 'ligne ligne-lien', href: '#/verification' },
          h(
            'span',
            { class: 'ligne-texte' },
            h('span', { class: 'ligne-nom' }, 'Vérifier mes données'),
            h('span', { class: 'secondaire' }, 'Doublons, fiches isolées, dates incohérentes'),
          ),
          icone('chevron', 20),
        ),
      ),
      boutonEffacer,
      aideEffacer,
      erreurEffacement,
    ),
    h('p', { class: 'version' }, `Tribu v${__APP_VERSION__} · build du ${date}`),
  ];
  return { contenu, maj };
}

/** `onglet` : fin de l'adresse `#/reglages/<onglet>` ; un nom inconnu ouvre l'onglet Général. */
export function ecranReglages(onglet?: string): HTMLElement {
  const actif: OngletReglages = ONGLETS_REGLAGES.find((o) => o.id === onglet)?.id ?? 'general';

  /** Met à jour ce qui dépend des données et des réglages (après export, import, effacement, annulation). */
  const maj = () => {
    for (const o of Object.values(contenus)) o.maj();
  };
  const contenus: Record<OngletReglages, Onglet> = {
    general: ongletGeneral(),
    exports: ongletExports(maj),
    sauvegarde: ongletSauvegarde(maj),
    donnees: ongletDonnees(maj),
  };
  maj();

  // Onglets : tous les panneaux restent dans la page (état et messages conservés), un seul est visible.
  const panneaux = ONGLETS_REGLAGES.map((o) =>
    h('div', { class: 'panneau', id: `panneau-${o.id}`, role: 'tabpanel', hidden: o.id !== actif }, ...contenus[o.id].contenu),
  );
  const boutons = ONGLETS_REGLAGES.map((o) =>
    h(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: 'onglet',
        id: `onglet-${o.id}`,
        'aria-controls': `panneau-${o.id}`,
        'aria-selected': String(o.id === actif),
        onclick: () => ouvrirOnglet(o.id),
      },
      icone(o.icone, 22),
      h('span', {}, o.libelle),
    ),
  );
  const onglets = h('div', { class: 'onglets', role: 'tablist' }, ...boutons);
  const ouvrirOnglet = (id: OngletReglages) => {
    // « Moi » a pu changer dans Général : « Qui suivre » en dépend.
    contenus[id].maj();
    for (const o of ONGLETS_REGLAGES) {
      document.getElementById(`panneau-${o.id}`)!.hidden = o.id !== id;
      document.getElementById(`onglet-${o.id}`)!.setAttribute('aria-selected', String(o.id === id));
    }
    remplacer(`#/reglages/${id}`, false);
  };

  return h('div', { class: 'ecran' }, barreEcran('#/', 'Réglages'), h('div', { class: 'contenu' }, onglets, ...panneaux));
}
