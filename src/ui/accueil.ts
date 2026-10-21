// Accueil (#/) : salutation, recherche directe, dates du jour (« Aujourd'hui »), des 30 prochains jours (« Bientôt »),
// souvenir des décès du jour et du lendemain, quatre raccourcis, bouton +.
// Sans personne : « Ajouter la première personne » et « Restaurer une sauvegarde ».

import {
  dateEvenement,
  depuisUnion,
  detailEvenement,
  evenementsAVenir,
  libelleAnnees,
  nomEvenement,
  quandCourt,
  titreEvenement,
  type Evenement,
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

const SVG = 'http://www.w3.org/2000/svg';
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
/** Lignes de personnes du bloc « Aujourd'hui » avant « + N autres ». */
const MAX_AUJOURDHUI = 4;
const MAX_FETES_AUJOURDHUI = 2;
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

/** Avatar d'une personne décédée : grisé. */
function avatarGris(p: Personne): HTMLElement {
  const a = avatarPersonne(p);
  a.classList.add('decede');
  return a;
}

/** Avatar seul, ou les deux d'un couple qui se chevauchent (le conjoint décédé en gris). */
function avatars(e: Evenement): HTMLElement {
  const un = (p: Personne) => (estDecede(p) ? avatarGris(p) : avatarPersonne(p));
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

function ligneFete(d: Donnees, moi: Personne | undefined, e: Evenement): HTMLElement {
  const [p] = e.personnes;
  const lien = lienDe(d, moi, p);
  return h(
    'a',
    { class: 'fete', href: lienFiche(e) },
    h('span', { class: 'picto' }, icone('fete', 16)),
    h(
      'span',
      { class: 'ligne-texte' },
      h('span', { class: 'ligne-nom' }, `Bonne fête ${nomComplet(p)}`),
      h('span', { class: 'detail' }, lien ? `${e.saint} · ${lien}` : e.saint),
    ),
  );
}

/** Carte verte : anniversaires et unions du jour en lignes blanches, fêtes en dessous ; au-delà, « + N autres » ouvre l'agenda. */
function blocAujourdhui(d: Donnees, moi: Personne | undefined, evs: Evenement[]): HTMLElement | false {
  const personnes = evs.filter((e) => e.genre === 'anniversaire' || e.genre === 'union');
  const fetes = evs.filter((e) => e.genre === 'fete');
  if (personnes.length + fetes.length === 0) return false;
  const montrees = personnes.slice(0, MAX_AUJOURDHUI);
  const fetesMontrees = fetes.slice(0, MAX_FETES_AUJOURDHUI);
  const autres = personnes.length - montrees.length + fetes.length - fetesMontrees.length;
  return h(
    'section',
    { class: 'aujourdhui', 'aria-label': 'Aujourd’hui' },
    h('h2', { class: 'tete' }, 'Aujourd’hui'),
    montrees.length > 0 && h('div', { class: 'carte' }, ...montrees.map((e) => ligneDuJour(d, moi, e))),
    ...fetesMontrees.map((e) => ligneFete(d, moi, e)),
    autres > 0 && h('a', { class: 'autres', href: '#/agenda' }, `+ ${autres} ${autres > 1 ? 'autres' : 'autre'}`),
  );
}

// --- Bientôt --------------------------------------------------------------------------------------------------------

const ICONES = { anniversaire: 'gateau', union: 'coeur', fete: 'fete', deces: 'agenda' } as const;

function vignette(e: Evenement, aujourdhui: Date): HTMLElement {
  const annees = e.genre === 'union' && e.annees === 0 ? 'le grand jour' : e.genre === 'fete' ? '' : libelleAnnees(e.annees);
  return h(
    'a',
    { class: 'vignette', href: lienFiche(e) },
    h('span', { class: 'type' }, icone(ICONES[e.genre], 14), titreEvenement(e)),
    avatars(e),
    h('span', { class: 'ligne-nom' }, nomEvenement(e, true)),
    h('span', { class: 'secondaire' }, [quandCourt(e, aujourdhui), annees].filter(Boolean).join(' · ')),
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
    h('h2', { class: 'titre-section titre-lien' }, 'Bientôt', h('a', { href: '#/agenda' }, 'Tout voir')),
    montrees.length === 0
      ? calme(d, aujourdhui)
      : h(
          'div',
          { class: 'defile' },
          ...montrees.map((e) => vignette(e, aujourdhui)),
          h('a', { class: 'vignette fin', href: '#/agenda' }, icone('agenda', 20), 'Tout voir'),
        ),
  );
}

// --- Souvenir -------------------------------------------------------------------------------------------------------

/** Décès d'aujourd'hui ou de demain : sobre, encadré en pointillés, sans phrase. */
function souvenir(e: Evenement): HTMLElement {
  const [p] = e.personnes;
  return h(
    'a',
    { class: 'souvenir', href: lienFiche(e) },
    avatarGris(p),
    h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nomComplet(p)), h('span', {}, libelleDeces(p.deces, p.sexe))),
    h('span', { class: 'quand' }, h('span', {}, e.dans === 0 ? 'aujourd’hui' : 'demain'), h('span', { class: 'etiquette' }, libelleAnnees(e.annees))),
  );
}

// --- Raccourcis -----------------------------------------------------------------------------------------------------

/** Dessin de 72 × 40 : des ronds de couleur (cx, cy, r, couleur CSS). */
function dessin(ronds: [number, number, number, string][], traits?: string, contour?: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'dessin');
  svg.setAttribute('viewBox', '0 0 72 40');
  svg.setAttribute('aria-hidden', 'true');
  if (traits) {
    const chemin = document.createElementNS(SVG, 'path');
    chemin.setAttribute('d', traits);
    chemin.setAttribute('class', 'traits');
    svg.append(chemin);
  }
  for (const [cx, cy, r, couleur] of ronds) {
    const rond = document.createElementNS(SVG, 'circle');
    rond.setAttribute('cx', String(cx));
    rond.setAttribute('cy', String(cy));
    rond.setAttribute('r', String(r));
    if (contour) rond.setAttribute('class', 'cerne');
    // Par le CSSOM : la CSP du build bloque un attribut style posé en texte.
    rond.style.fill = couleur;
    svg.append(rond);
  }
  return svg;
}

function raccourci(href: string | (() => void), image: Element, titre: string, detail: string): HTMLElement {
  const contenu = [image, h('strong', {}, titre), h('span', { class: 'secondaire' }, detail)];
  return typeof href === 'string'
    ? h('a', { class: 'raccourci', href }, ...contenu)
    : h('button', { type: 'button', class: 'raccourci', onclick: href }, ...contenu);
}

type Familles = ReturnType<typeof resumesFamilles>;

/** Familles de l'arbre autour de Moi, séparées entre la famille et les amis (nom porté seulement dans la bulle des amis). */
function famillesDe(d: Donnees, moi: Personne | undefined): { famille: Familles; amis: Familles } {
  const toutes = moi ? resumesFamilles(disposerArbre(d, moi.id)) : [];
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

function raccourcis(d: Donnees, listees: Personne[], moi: Personne | undefined): HTMLElement {
  const n = listees.length;
  const { famille, amis } = famillesDe(d, moi);
  const quatre = (fs: Familles) =>
    [...fs]
      .sort((a, b) => b.n - a.n)
      .map((f) => f.couleur)
      .concat([undefined, undefined, undefined, undefined])
      .slice(0, 4)
      .map((c) => (c === undefined ? 'var(--pastille)' : `var(--c${c})`));
  const nombre = (fs: Familles, vide: string) => (fs.length === 0 ? vide : pluriel(fs.length, 'nom de famille', 'noms de famille'));
  return h(
    'nav',
    { class: 'raccourcis', 'aria-label': 'Raccourcis' },
    raccourci(
      () => listeFamilles(d, moi),
      dessin(
        quatre(famille).map((c, i) => [11 + 14 * i, 20, 10, c]),
        undefined,
        true,
      ),
      'Ma famille',
      nombre(famille, 'Aucun nom de famille'),
    ),
    raccourci(
      () => listeAmis(d, moi),
      dessin(
        quatre(amis).map((c, i) => [11 + 14 * i, 20, 10, c]),
        undefined,
        true,
      ),
      'Mes amis',
      nombre(amis, 'Aucune famille d’amis'),
    ),
    raccourci(
      '#/arbre',
      dessin(
        [
          [22, 7, 6, 'var(--c2)'],
          [50, 7, 6, 'var(--c1)'],
          [14, 32, 6, 'var(--c2)'],
          [36, 32, 7, 'var(--accent)'],
          [58, 32, 6, 'var(--c1)'],
        ],
        'M22 7h28M36 7v12M14 19h44M14 19v12M36 19v12M58 19v12',
      ),
      'Arbre global',
      pluriel(n, 'personne', 'personnes'),
    ),
    raccourci(
      '#/personnes',
      h('span', { class: 'dessin duo' }, ...listees.slice(0, 3).map((p) => avatarPersonne(p))),
      'Toutes les fiches',
      pluriel(n, 'fiche', 'fiches'),
    ),
  );
}

// --- Écran ----------------------------------------------------------------------------------------------------------

function sommaire(d: Donnees, moi: Personne | undefined, listees: Personne[]): HTMLElement[] {
  const aujourdhui = new Date();
  const evs = evenementsAVenir(d, aujourdhui, HORIZON, { fetes: lireReglages().fetes });
  const duJour = evs.filter((e) => e.dans === 0);
  const deces = evs.filter((e) => e.genre === 'deces' && e.dans <= 1);
  return [blocAujourdhui(d, moi, duJour), blocBientot(d, evs, aujourdhui), ...deces.map(souvenir), raccourcis(d, listees, moi)].filter(
    (e): e is HTMLElement => e !== false,
  );
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
    h('a', { class: 'ajout', href: '#/nouveau', 'aria-label': 'Ajouter une personne' }, icone('plus', 28)),
  );
}
