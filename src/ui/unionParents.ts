// Choix « Union avec X » quand on donne un second parent à des enfants qui n'en avaient qu'un (ajout d'un parent,
// « Qui est ce parent ? ») : en couple, mariés ou séparés. « Séparés » d'office si l'un des deux est déjà en couple ;
// sinon « En couple ». Un avertissement nomme les unions en cours qui passeraient en « séparés » (`unirParents`).

import { prenomOuNom } from '../modele/liste';
import { enCouple, unionEntre, unionsQuiSeSepareraient, type ChoixUnion } from '../modele/modele';
import type { Donnees, Personne } from '../modele/types';
import { h } from './dom';

export interface ChoixUnionParents {
  noeud: HTMLElement;
  /** Le second parent a changé : visibilité (rien à choisir s'ils sont déjà unis), choix d'office, avertissement. */
  maj: () => void;
  /** Choix coché ; `undefined` si les deux sont déjà unis (aucune union à ajouter). */
  choix: () => ChoixUnion | undefined;
}

/** `autre()` : id du second parent, ou un id absent des données pour une personne pas encore créée. */
export function choixUnionParents(d: Donnees, connu: Personne, autre: () => string): ChoixUnionParents {
  let touche = false;
  const radio = (valeur: ChoixUnion, libelle: string) => {
    const r = h('input', {
      type: 'radio',
      name: 'union-parents',
      value: valeur,
      onchange: () => {
        touche = true;
        maj();
      },
    });
    return { r, noeud: h('label', { class: 'choix' }, r, h('span', {}, libelle)) };
  };
  const radios = { couple: radio('couple', 'En couple'), marie: radio('marie', 'Mariés'), separee: radio('separee', 'Séparés') };
  const coche = (): ChoixUnion => (Object.keys(radios) as ChoixUnion[]).find((c) => radios[c].r.checked) ?? 'separee';
  const avertissement = h('p', { class: 'avertissement', role: 'status', hidden: true });
  const noeud = h(
    'fieldset',
    { class: 'champ' },
    h('legend', {}, `Union avec ${prenomOuNom(connu)}`),
    h('div', { class: 'choix-groupe' }, radios.couple.noeud, radios.marie.noeud, radios.separee.noeud),
    avertissement,
  );

  const nom = (id: string) => {
    const x = d.personnes.find((q) => q.id === id);
    return x ? prenomOuNom(x) : '';
  };

  const maj = () => {
    const b = autre();
    noeud.hidden = unionEntre(d, connu.id, b) !== undefined;
    if (!touche) radios[enCouple(d, connu.id) || enCouple(d, b) ? 'separee' : 'couple'].r.checked = true;
    avertissement.textContent = unionsQuiSeSepareraient(d, connu.id, b, coche())
      .map((u) => {
        const membre = [connu.id, b].includes(u.personneA) ? u.personneA : u.personneB;
        const conjoint = membre === u.personneA ? u.personneB : u.personneA;
        return `${nom(membre)} est en couple avec ${nom(conjoint)} : cette union-là passera en « séparés ».`;
      })
      .join(' ');
    avertissement.hidden = avertissement.textContent === '';
  };
  maj();

  return { noeud, maj, choix: () => (noeud.hidden ? undefined : coche()) };
}
