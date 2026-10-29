// Accueil (#/) : salutation, recherche directe, dates du jour (« Aujourd'hui »), des 30 prochains jours (« Bientôt »),
// souvenir des décès du jour et du lendemain, quatre raccourcis, bouton +.
// Sans personne : « Ajouter la première personne » et « Restaurer une sauvegarde ».

import {
  dateEvenement,
  depuisUnion,
  detailEvenement,
  evenementsAVenir,
  fetesDuJour,
  libelleAnnees,
  nomEvenement,
  pastilleJour,
  titreEvenement,
  type Evenement,
  type FeteDuJour,
} from '../modele/evenements';
import { comparateur, filtrerParNom, libelleDeces, MOIS, nomComplet } from '../modele/liste';
import { estDecede, personnesListees, personnesVisibles } from '../modele/modele';
import { etiquette, lienAvecMoi } from '../modele/parente';
import { ficheMoi } from '../modele/reglages';
import { importerJson } from '../modele/stockage';
import type { Donnees, Personne } from '../modele/types';
import { changerAvecAnnulation, rafraichirEcran } from './annulation';
import { h, icone } from './dom';
import { lireDonnees, lireReglages } from './etat';
import { messageImport } from './import';
import { disposerArbre } from '../modele/arbreGlobal';
import { nomGroupe } from '../modele/deductions';
import { couleur, resumesFamilles } from './arbreGlobal';
import { ouvrirListe, type LigneListe } from './fenetreListe';
import { avatarPersonne, contenuLigne } from './lignePersonne';

// La recherche survit à l'aller-retour accueil → fiche → accueil.
let recherche = '';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
/** Lignes de personnes du bloc « Aujourd'hui » avant « + N autres ». */
const MAX_AUJOURDHUI = 4;
const MAX_FETES_AUJOURDHUI = 4;
const MAX_VIGNETTES = 10;
const HORIZON = 30;
/** Fêtes annoncées dans « Bientôt » : la semaine à venir seulement. */
const HORIZON_FETES = 7;
const MAX_RESULTATS = 30;

const majuscule = (t: string) => t.charAt(0).toLocaleUpperCase('fr') + t.slice(1);
const minuscule = (t: string) => t.charAt(0).toLocaleLowerCase('fr') + t.slice(1);
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Premier lancement ou données effacées : créer une fiche ou restaurer une sauvegarde. */
export function accueilVide(): HTMLElement {
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });
  const fichier = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: -1, 'aria-hidden': true });
  fichier.addEventListener('change', async () => {
    const choisi = fichier.files?.[0];
    fichier.value = '';
    erreur.hidden = true;
    if (!choisi) return;
    try {
      const importees = importerJson(await choisi.text());
      changerAvecAnnulation(() => importees, messageImport(personnesVisibles(importees).length), 'Restauration annulée.');
      rafraichirEcran();
    } catch (e) {
      erreur.textContent = e instanceof Error ? `${e.message}.` : 'Restauration impossible.';
      erreur.hidden = false;
    }
  });
  return h(
    'div',
    { class: 'accueil-vide' },
    h('div', { class: 'avatar avatar-grand' }, icone('famille', 40)),
    h('h2', {}, 'Aucune personne pour l’instant'),
    h('p', { class: 'secondaire' }, 'Commence par une fiche, ou reprends une sauvegarde exportée depuis Tribu.'),
    h(
      'div',
      { class: 'accueil-vide-actions' },
      h('a', { class: 'bouton bouton-plein', href: '#/nouveau' }, 'Ajouter la première personne'),
      h('button', { type: 'button', class: 'bouton', onclick: () => fichier.click() }, 'Restaurer une sauvegarde'),
      fichier,
      erreur,
    ),
  );
}

/** « Bonjour Camille » (« Bonsoir » à partir de 18 h, sans prénom si « Moi » n'est pas choisi) et « Mardi 20 octobre ». */
export function salutation(prenom: string | undefined, maintenant: Date): { titre: string; date: string } {
  const mot = maintenant.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
  const jour = maintenant.getDate();
  return {
    titre: prenom ? `${mot} ${prenom}` : mot,
    date: majuscule(`${JOURS[maintenant.getDay()]} ${jour === 1 ? '1er' : jour} ${MOIS[maintenant.getMonth()]}`),
  };
}

/** Lien avec « Moi » : « ta cousine », « amie d’Inès » ; undefined sans « Moi » ou sans lien. */
function lienDe(d: Donnees, moi: Personne | undefined, p: Personne): string | undefined {
  if (!moi) return undefined;
  const lien = lienAvecMoi(d, moi.id, p.id);
  if (lien) return lien;
  const e = etiquette(d, moi.id, p.id);
  return e && minuscule(e);
}

/** Avatar seul, ou les deux d'un couple qui se chevauchent. */
function avatars(e: Evenement): HTMLElement {
  const un = (p: Personne) => avatarPersonne(p);
  return e.personnes.length === 1 ? un(e.personnes[0]) : h('span', { class: 'duo' }, ...e.personnes.map(un));
}

const lienFiche = (e: Evenement) => `#/personne/${e.personnes[0].id}`;

// --- Recherche ----------------------------------------------------------------------------------------------------

function resultats(d: Donnees, moi: Personne | undefined, texte: string): HTMLElement[] {
  const trouvees = filtrerParNom(personnesListees(d), texte).sort(comparateur(lireReglages().tri));
  const creer = h('a', { href: `#/nouveau/${encodeURIComponent(texte.trim())}` }, `Créer « ${texte.trim()} »`);
  const pied = h('p', { class: 'pied-recherche secondaire' }, `${pluriel(trouvees.length, 'fiche', 'fiches')} · `, creer);
  if (trouvees.length === 0) return [pied];
  const lignes = trouvees
    .slice(0, MAX_RESULTATS)
    .map((p) => h('a', { class: 'ligne', href: `#/personne/${p.id}` }, ...contenuLigne(p, nomComplet(p), lienDe(d, moi, p)), icone('chevron', 18)));
  return [h('div', { class: 'carte' }, ...lignes), pied];
}

// --- Aujourd'hui ----------------------------------------------------------------------------------------------------

function ligneDuJour(d: Donnees, moi: Personne | undefined, e: Evenement): HTMLElement {
  const [p] = e.personnes;
  const union = e.genre === 'union';
  const detail = union ? depuisUnion(e) : lienDe(d, moi, p);
  const pastille = union ? detailEvenement(e) : libelleAnnees(e.annees) || 'anniversaire';
  return h(
    'a',
    { class: 'ligne', href: lienFiche(e) },
    avatars(e),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomEvenement(e)), detail && h('span', { class: 'secondaire' }, detail)),
    h('span', { class: 'etiquette accent' }, pastille),
  );
}

const DETAIL_FETE = { saint: 'Saint du jour', religieuse: 'Fête religieuse', civile: 'Fête civile' } as const;

/** Un saint (ou jour férié) du jour, puis les proches qui le portent en dessous. */
function ligneFete(d: Donnees, moi: Personne | undefined, f: FeteDuJour, proches: Personne[]): HTMLElement[] {
  return [
    h(
      'div',
      { class: 'fete' },
      h('span', { class: 'picto' }, icone('fete', 16)),
      h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, f.nom), h('span', { class: 'detail' }, DETAIL_FETE[f.type])),
    ),
    ...proches.map((p) => {
      const lien = lienDe(d, moi, p);
      return h(
        'a',
        { class: 'fete fete-proche', href: `#/personne/${p.id}` },
        h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(p)), lien && h('span', { class: 'detail' }, lien)),
      );
    }),
  ];
}

/** Carte verte : anniversaires et unions du jour en lignes blanches, saints du jour en dessous avec leurs proches ; au-delà, « + N autres » ouvre l'agenda. */
function blocAujourdhui(d: Donnees, moi: Personne | undefined, evs: Evenement[], fetes: FeteDuJour[]): HTMLElement | false {
  const personnes = evs.filter((e) => e.genre === 'anniversaire' || e.genre === 'union');
  if (personnes.length + fetes.length === 0) return false;
  const montrees = personnes.slice(0, MAX_AUJOURDHUI);
  let places = MAX_FETES_AUJOURDHUI;
  let cachees = 0;
  const lignesFetes = fetes.flatMap((f) => {
    const proches = f.personnes.slice(0, places);
    places -= proches.length;
    cachees += f.personnes.length - proches.length;
    return ligneFete(d, moi, f, proches);
  });
  const autres = personnes.length - montrees.length + cachees;
  return h(
    'section',
    { class: 'aujourdhui', 'aria-label': 'Aujourd’hui' },
    h('h2', { class: 'tete' }, 'Aujourd’hui', fetes.some((f) => f.ferie) && h('span', { class: 'ferie' }, 'Férié')),
    montrees.length > 0 && h('div', { class: 'carte' }, ...montrees.map((e) => ligneDuJour(d, moi, e))),
    ...lignesFetes,
    autres > 0 && h('a', { class: 'autres', href: '#/agenda' }, `+ ${autres} ${autres > 1 ? 'autres' : 'autre'}`),
  );
}

// --- Bientôt --------------------------------------------------------------------------------------------------------

const ICONES = { anniversaire: 'gateau', union: 'coeur', fete: 'fete', deces: 'agenda' } as const;

function vignette(e: Evenement, aujourdhui: Date): HTMLElement {
  const annees = e.genre === 'union' && e.annees === 0 ? 'le grand jour' : e.genre === 'fete' ? '' : libelleAnnees(e.annees);
  const { haut, jour } = pastilleJour(e, aujourdhui);
  return h(
    'a',
    { class: 'vignette', href: lienFiche(e) },
    h('span', { class: 'haut' }, avatars(e), h('span', { class: 'jour' }, h('small', {}, haut), h('span', {}, jour))),
    h('span', { class: 'ligne-nom' }, nomEvenement(e, true)),
    h('span', { class: 'secondaire' }, icone(ICONES[e.genre], 14), annees || titreEvenement(e)),
  );
}

/** Rien dans les 30 jours : la prochaine date de l'année, s'il y en a une. */
function calme(d: Donnees, aujourdhui: Date): HTMLElement {
  const prochaine = evenementsAVenir(d, aujourdhui, 365, { fetes: false }).find((e) => e.dans > HORIZON && e.genre !== 'deces');
  const quoi = prochaine && (prochaine.genre === 'anniversaire' ? libelleAnnees(prochaine.annees) || 'anniversaire' : detailEvenement(prochaine));
  return h(
    'div',
    { class: 'calme' },
    h('span', { class: 'picto' }, icone('agenda', 16)),
    h(
      'span',
      {},
      `Rien dans les ${HORIZON} prochains jours.`,
      prochaine && h('br'),
      prochaine && 'Prochaine date : ',
      prochaine && h('strong', {}, nomEvenement(prochaine)),
      prochaine && `, ${quoi} le ${dateEvenement(prochaine)}.`,
    ),
  );
}

function blocBientot(d: Donnees, evs: Evenement[], aujourdhui: Date): HTMLElement {
  const aVenir = evs.filter((e) => e.dans > 0 && e.genre !== 'deces' && (e.genre !== 'fete' || e.dans <= HORIZON_FETES));
  const montrees = aVenir.slice(0, MAX_VIGNETTES);
  return h(
    'section',
    { class: 'bientot' },
    h('h2', { class: 'titre-section titre-lien' }, 'Bientôt', h('a', { href: '#/agenda?sans-fetes' }, 'Tout voir')),
    montrees.length === 0 ? calme(d, aujourdhui) : h('div', { class: 'defile-bientot' }, ...montrees.map((e) => vignette(e, aujourdhui))),
  );
}

// --- Souvenir -------------------------------------------------------------------------------------------------------

/** Décès d'aujourd'hui ou de demain : sobre, encadré en pointillés, sans phrase. */
function souvenir(e: Evenement): HTMLElement {
  const [p] = e.personnes;
  return h(
    'a',
    { class: 'souvenir', href: lienFiche(e) },
    avatarPersonne(p),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(p)), h('span', {}, libelleDeces(p.deces, p.sexe))),
    h('span', { class: 'quand' }, h('span', {}, e.dans === 0 ? 'aujourd’hui' : 'demain'), h('span', { class: 'etiquette' }, libelleAnnees(e.annees))),
  );
}

// --- Raccourcis -----------------------------------------------------------------------------------------------------

function raccourci(href: string | (() => void), image: Element, titre: string, detail: string): HTMLElement {
  const contenu = [image, h('strong', {}, titre), h('span', { class: 'secondaire' }, detail)];
  return typeof href === 'string'
    ? h('a', { class: 'raccourci', href }, ...contenu)
    : h('button', { type: 'button', class: 'raccourci', onclick: href }, ...contenu);
}

type Familles = ReturnType<typeof resumesFamilles>;

/** Familles de l'arbre autour de Moi, séparées entre la famille et les amis (nom porté seulement dans la bulle des amis). */
function famillesDe(d: Donnees, moi: Personne | undefined): { famille: Familles; amis: Familles } {
  const toutes = moi ? resumesFamilles(disposerArbre(d, moi.id), d) : [];
  return { famille: toutes.filter((f) => !f.amis), amis: toutes.filter((f) => f.amis) };
}

/** Lignes de pop-up : une par famille, comptée sur `ids` si on en donne (filtre par groupe), sinon sur tous les porteurs. */
function lignesFamilles(familles: Familles, ids?: Set<string>): LigneListe[] {
  return familles.flatMap((f) => {
    const n = ids ? f.ids.filter((id) => ids.has(id)).length : f.n;
    if (n === 0) return [];
    const pastille = h('span', { class: 'pastille-feuille' });
    if (f.couleur !== undefined) pastille.style.background = couleur(f.couleur);
    return [{ href: `#/arbre/famille/${encodeURIComponent(f.cle)}`, pastille, nom: f.nom, detail: `${n} pers.` }];
  });
}

/** Pop-up « Ma famille » : chaque famille de l'arbre ouvre l'arbre zoomé dessus. */
function listeFamilles(d: Donnees, moi: Personne | undefined): void {
  ouvrirListe(
    'Ma famille',
    lignesFamilles(famillesDe(d, moi).famille),
    moi ? 'Aucune famille dans l’arbre.' : 'Choisis d’abord ta fiche dans les réglages : les familles se lisent autour de toi.',
  );
}

/** Pop-up « Mes amis » : les familles des amis, filtrables par groupe d'amis. */
function listeAmis(d: Donnees, moi: Personne | undefined): void {
  const amis = famillesDe(d, moi).amis;
  const tout = lignesFamilles(amis);
  const groupes = [...d.groupes].sort((a, b) => nomGroupe(d, a).localeCompare(nomGroupe(d, b), 'fr'));
  const filtres = groupes.flatMap((g) => {
    const lignes = lignesFamilles(amis, new Set(g.membres));
    return lignes.length === 0 ? [] : [{ texte: nomGroupe(d, g), lignes }];
  });
  ouvrirListe(
    'Mes amis',
    tout,
    moi ? 'Aucune famille d’amis pour l’instant.' : 'Choisis d’abord ta fiche dans les réglages : les familles se lisent autour de toi.',
    { href: '#/groupes', texte: 'Gérer les groupes' },
    filtres.length === 0 ? [] : [{ texte: 'Tout', lignes: tout }, ...filtres],
  );
}

/** Pile des quatre plus grandes familles, une pastille à leur couleur et à l'initiale de leur nom ; une icône s'il n'y en a pas. */
function pileFamilles(fs: Familles): HTMLElement {
  const grandes = [...fs].sort((a, b) => b.n - a.n).slice(0, 4);
  if (grandes.length === 0) return h('span', { class: 'visuel' }, icone('famille', 30));
  return h(
    'span',
    { class: 'visuel pile' },
    ...grandes.map((f) =>
      h(
        'span',
        { class: f.couleur === undefined ? 'avatar' : 'avatar teinte', style: f.couleur !== undefined && `--a: var(--c${f.couleur})` },
        initialeFamille(f.nom),
      ),
    ),
  );
}

/** « Famille Roux » → « R ». */
const initialeFamille = (nom: string) =>
  nom
    .replace(/^Famille /, '')
    .charAt(0)
    .toLocaleUpperCase('fr');

function raccourcis(d: Donnees, listees: Personne[], moi: Personne | undefined): HTMLElement {
  const n = listees.length;
  const { famille, amis } = famillesDe(d, moi);
  return h(
    'nav',
    { class: 'raccourcis', 'aria-label': 'Raccourcis' },
    raccourci(
      () => listeFamilles(d, moi),
      pileFamilles(famille),
      'Ma famille',
      famille.length === 0 ? 'Aucune famille' : pluriel(famille.length, 'famille', 'familles'),
    ),
    raccourci(
      () => listeAmis(d, moi),
      pileFamilles(amis),
      'Mes amis',
      amis.length === 0 ? 'Aucune famille d’amis' : pluriel(amis.length, 'famille d’amis', 'familles d’amis'),
    ),
    raccourci('#/arbre', h('span', { class: 'visuel' }, icone('arbre', 30)), 'Arbre global', pluriel(n, 'personne', 'personnes')),
    raccourci('#/personnes', h('span', { class: 'visuel' }, icone('fiches', 30)), 'Toutes les fiches', pluriel(n, 'fiche', 'fiches')),
  );
}

// --- Écran ----------------------------------------------------------------------------------------------------------

function sommaire(d: Donnees, moi: Personne | undefined, listees: Personne[]): HTMLElement[] {
  const aujourdhui = new Date();
  const evs = evenementsAVenir(d, aujourdhui, HORIZON, { fetes: lireReglages().fetes });
  const duJour = evs.filter((e) => e.dans === 0);
  const deces = evs.filter((e) => e.genre === 'deces' && e.dans <= 1);
  return [
    blocAujourdhui(d, moi, duJour, lireReglages().fetes === false ? [] : fetesDuJour(aujourdhui, duJour)),
    blocBientot(d, evs, aujourdhui),
    ...deces.map(souvenir),
    raccourcis(d, listees, moi),
  ].filter((e): e is HTMLElement => e !== false);
}

export function accueil(): HTMLElement {
  const d = lireDonnees();
  const listees = personnesListees(d);
  const moi = ficheMoi(lireReglages(), d);
  const { titre, date } = salutation(moi && !estDecede(moi) ? moi.prenom : undefined, new Date());
  const tete = h(
    'div',
    { class: 'entete-ligne' },
    h('h1', { class: 'salut' }, titre, h('span', { class: 'secondaire' }, date)),
    h('a', { class: 'bouton-icone bouton-reglages', href: '#/reglages', 'aria-label': 'Réglages' }, icone('reglages', 24)),
  );
  if (listees.length === 0) return h('div', { class: 'ecran' }, h('header', { class: 'entete-accueil' }, tete), accueilVide());

  const zone = h('div', { class: 'accueil' });
  const montrer = () => zone.replaceChildren(...(recherche.trim() ? resultats(d, moi, recherche) : sommaire(d, moi, listees)));
  const effacer = h(
    'button',
    {
      type: 'button',
      class: 'effacer',
      'aria-label': 'Effacer la recherche',
      hidden: !recherche,
      onclick: () => {
        recherche = champ.value = '';
        effacer.hidden = true;
        montrer();
        champ.focus();
      },
    },
    icone('croix', 18),
  );
  const champ = h('input', {
    type: 'search',
    placeholder: 'Chercher quelqu’un',
    value: recherche,
    autocomplete: 'off',
    enterkeyhint: 'search',
    oninput: () => {
      recherche = champ.value;
      effacer.hidden = !recherche;
      montrer();
    },
  });
  montrer();

  return h(
    'div',
    { class: 'ecran' },
    h(
      'header',
      { class: 'entete-accueil' },
      tete,
      h('label', { class: 'champ-filtre champ-recherche' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Chercher quelqu’un'), champ, effacer),
    ),
    zone,
  );
}
