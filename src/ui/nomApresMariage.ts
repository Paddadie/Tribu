// Choix « Nom après le mariage », commun à l'ajout d'un conjoint et à l'écran d'union : chacun garde le sien,
// le nom de l'un pour les deux, ou un nom composé porté par l'un, l'autre ou les deux. Même écran quel que soit le
// côté par lequel on arrive ; le choix n'est pas enregistré, il s'applique aux noms (`appliquerNomApres`).

import { accorder, lieuxConnus } from '../modele/liste';
import { personnesVisibles } from '../modele/modele';
import { nomApresParDefaut, type NomApres } from '../modele/nomApres';
import type { Personne } from '../modele/types';
import { h } from './dom';
import { lireDonnees } from './etat';

/** Une personne du couple, avec le nom qu'elle aurait sans ce mariage (`origine`). */
export type Membre = Pick<Personne, 'id' | 'prenom' | 'sexe'> & { origine: string };

type Mode = 'chacun' | 'a' | 'b' | 'compose';
type Porteurs = 'a' | 'b' | 'deux';

export interface ChoixNomApres {
  noeud: HTMLElement;
  /** Le couple a changé (nom ou sexe saisi) : libellés, aperçus, et choix d'office tant qu'on n'y a pas touché. */
  rafraichir: () => void;
  /** Choix coché, avec les ids réels du couple (une nouvelle personne n'a son id qu'après création). */
  lire: (idA: string, idB: string) => NomApres;
  modifie: () => boolean;
}

const appel = (m: Membre) => m.prenom || m.origine;

/** Choix d'office : le nom de l'homme pour les deux (`nomApresParDefaut`). */
export const defautNomApres = (a: Membre, b: Membre): NomApres => nomApresParDefaut({ ...a, nom: a.origine }, { ...b, nom: b.origine });

/** Champ « Lieu du mariage », avec les lieux déjà saisis en propositions. */
export function champLieuUnion(valeur: string | undefined) {
  const d = lireDonnees();
  const liste = h('datalist', { id: 'lieux-union' }, ...lieuxConnus(personnesVisibles(d), d.unions).map((n) => h('option', { value: n })));
  const champ = h('input', { id: 'lieu-union', type: 'text', value: valeur ?? '', autocomplete: 'off', autocapitalize: 'words', list: 'lieux-union' });
  return {
    noeud: h('div', { class: 'champ' }, h('label', { for: 'lieu-union' }, 'Lieu du mariage'), champ, liste),
    lire: () => champ.value,
  };
}

/**
 * `couple()` donne les deux membres (a : la fiche de départ) ; `initial` le choix de départ, sinon le choix d'office
 * `parDefaut(a, b)` recalculé à chaque `rafraichir` tant que rien n'a été coché à la main.
 */
export function choixNomApres(couple: () => [Membre, Membre], parDefaut: (a: Membre, b: Membre) => NomApres, initial?: NomApres): ChoixNomApres {
  let touche = false;
  const versMode = (choix: NomApres, [a]: [Membre, Membre]): { mode: Mode; porteurs: Porteurs; nom?: string } => {
    if (choix.mode === 'de') return { mode: choix.id === a.id ? 'a' : 'b', porteurs: 'a' };
    if (choix.mode === 'compose') {
      const porteurs = choix.porteurs.length === 2 ? 'deux' : choix.porteurs[0] === a.id ? 'a' : 'b';
      return { mode: 'compose', porteurs, nom: choix.nom };
    }
    return { mode: 'chacun', porteurs: 'a' };
  };

  const radio = (valeur: Mode) => h('input', { type: 'radio', class: 'boite', name: 'nom-apres', value: valeur });
  const radios = { chacun: radio('chacun'), a: radio('a'), b: radio('b'), compose: radio('compose') };
  const titres = {
    chacun: h('span', { class: 'ligne-nom' }, 'Chacun garde le sien'),
    a: h('span', { class: 'ligne-nom' }),
    b: h('span', { class: 'ligne-nom' }),
    compose: h('span', { class: 'ligne-nom' }, 'Nom composé'),
  };
  const apercus = {
    chacun: h('span', { class: 'secondaire' }),
    a: h('span', { class: 'secondaire' }),
    b: h('span', { class: 'secondaire' }),
    compose: h('span', { class: 'secondaire' }),
  };
  const option = (m: Mode) => h('label', { class: 'case' }, radios[m], h('span', { class: 'ligne-texte' }, titres[m], apercus[m]));
  const options = { chacun: option('chacun'), a: option('a'), b: option('b'), compose: option('compose') };

  const nomCompose = h('input', { id: 'nom-compose', type: 'text', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Nom composé' });
  const porte = (valeur: Porteurs) => h('input', { type: 'radio', name: 'nom-compose-porte', value: valeur });
  const portes = { a: porte('a'), b: porte('b'), deux: porte('deux') };
  const libellesPorte = { a: h('span', {}), b: h('span', {}), deux: h('span', {}, 'Les deux') };
  const blocCompose = h(
    'div',
    { class: 'nom-compose' },
    nomCompose,
    h(
      'div',
      { class: 'choix-groupe', role: 'radiogroup', 'aria-label': 'Porté par' },
      ...(['a', 'b', 'deux'] as const).map((v) => h('label', { class: 'choix' }, portes[v], libellesPorte[v])),
    ),
  );

  const mode = (): Mode => (Object.keys(radios) as Mode[]).find((m) => radios[m].checked) ?? 'chacun';
  const porteurs = (): Porteurs => (Object.keys(portes) as Porteurs[]).find((p) => portes[p].checked) ?? 'a';
  const composeParDefaut = ([a, b]: [Membre, Membre]) => {
    // Le nom de l'homme d'abord, comme le choix d'office.
    const [x, y] = b.sexe === 'M' && a.sexe !== 'M' ? [b, a] : [a, b];
    return [x.origine.trim(), y.origine.trim()].filter(Boolean).join('-');
  };

  const poser = (choix: NomApres) => {
    const c = couple();
    const m = versMode(choix, c);
    radios[m.mode].checked = true;
    portes[m.porteurs].checked = true;
    nomCompose.value = m.nom ?? composeParDefaut(c);
  };

  const lire = (idA: string, idB: string): NomApres => {
    const m = mode();
    if (m === 'a') return { mode: 'de', id: idA };
    if (m === 'b') return { mode: 'de', id: idB };
    if (m === 'compose') {
      const p = porteurs();
      return { mode: 'compose', nom: nomCompose.value, porteurs: p === 'deux' ? [idA, idB] : [p === 'a' ? idA : idB] };
    }
    return { mode: 'chacun' };
  };

  const rafraichir = () => {
    const [a, b] = couple();
    if (!touche) poser(parDefaut(a, b));
    const ne = (x: Membre) => accorder(x.sexe, 'né', 'née', 'né(e)');
    const devient = (x: Membre, nom: string) =>
      nom && nom !== x.origine ? `${x.prenom} ${nom}${x.origine ? `, ${ne(x)} ${x.origine}` : ''}` : `${x.prenom} ${x.origine}`;
    titres.a.textContent = `${a.origine} pour les deux`;
    titres.b.textContent = `${b.origine} pour les deux`;
    apercus.chacun.textContent = `${a.prenom} ${a.origine} · ${b.prenom} ${b.origine}`;
    apercus.a.textContent = devient(b, a.origine);
    apercus.b.textContent = devient(a, b.origine);
    // Un nom vide ne se donne pas ; deux noms identiques ne font qu'une option.
    options.a.hidden = !a.origine.trim();
    options.b.hidden = !b.origine.trim() || b.origine.trim() === a.origine.trim();
    if ((radios.a.checked && options.a.hidden) || (radios.b.checked && options.b.hidden)) radios.chacun.checked = true;
    libellesPorte.a.textContent = appel(a);
    libellesPorte.b.textContent = appel(b);
    const p = porteurs();
    const nom = nomCompose.value.trim();
    apercus.compose.textContent =
      mode() !== 'compose' || !nom
        ? 'Pour celui ou celle qui le porte'
        : [...(p !== 'b' ? [a] : []), ...(p !== 'a' ? [b] : [])].map((x) => devient(x, nom)).join(' · ');
    blocCompose.hidden = mode() !== 'compose';
  };

  for (const r of Object.values(radios)) r.addEventListener('change', () => ((touche = true), rafraichir()));
  for (const r of Object.values(portes)) r.addEventListener('change', () => ((touche = true), rafraichir()));
  nomCompose.addEventListener('input', () => ((touche = true), rafraichir()));

  const [a0, b0] = couple();
  poser(initial ?? parDefaut(a0, b0));
  const depart = JSON.stringify(lire('a', 'b'));
  if (initial) touche = true;
  rafraichir();

  return {
    noeud: h(
      'fieldset',
      { class: 'champ nom-apres' },
      h('legend', {}, 'Nom après le mariage'),
      h('div', { class: 'carte' }, options.chacun, options.a, options.b, options.compose, blocCompose),
    ),
    rafraichir,
    lire,
    modifie: () => JSON.stringify(lire('a', 'b')) !== depart,
  };
}
