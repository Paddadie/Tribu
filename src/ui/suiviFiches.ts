// Écrans « Fiche par fiche » de Réglages › Suivi : #/suivi/rappels et #/suivi/completer. Chaque fiche, rangée par cercle,
// avec un interrupteur ; basculer passe par les exceptions de la fiche (suivreFiche), jamais par les réglages des cercles.

import { etiquette } from '../modele/parente';
import { MANQUES, manquesDe } from '../modele/filtres';
import { comparateur, filtrerParNom, grouperParLettre, nomListe } from '../modele/liste';
import { personnesListees } from '../modele/modele';
import { CERCLES, aException, retirerException, suivis, suivreFiche, type Cercle, type Suivi } from '../modele/suivi';
import type { Personne } from '../modele/types';
import { h, icone } from './dom';
import { barreEcran } from './ecran';
import { lireDonnees, lireReglages, modifierDonnees, suiviCourant } from './etat';
import { avatarPersonne } from './lignePersonne';

type Montrer = 'toutes' | 'oui' | 'non' | 'exceptions';

const TEXTES: Record<keyof Suivi, { titre: string; oui: string; ouis: string; cercle: string; aide: string }> = {
  rappels: {
    titre: 'Rappels',
    oui: 'suivie',
    ouis: 'suivies',
    cercle: 'suivi',
    aide: 'Anniversaires, fêtes, décès et unions sur l’accueil, l’agenda et l’export .ics.',
  },
  completer: {
    titre: 'À compléter',
    oui: 'signalée',
    ouis: 'signalées',
    cercle: 'signalé',
    aide: 'Seules les fiches à qui il manque un nom ou une date sont listées : signalée, la fiche apparaît dans « À compléter ».',
  },
};

// Le filtre survit à l'aller-retour vers les réglages, comme celui de « Toutes les fiches ».
const filtres: Record<keyof Suivi, { nom: string; montrer: Montrer }> = {
  rappels: { nom: '', montrer: 'toutes' },
  completer: { nom: '', montrer: 'toutes' },
};

/** `quoi` : fin de l'adresse `#/suivi/<quoi>` ; un nom inconnu ouvre les rappels. */
export function ecranSuiviFiches(adresse?: string): HTMLElement {
  const quoi: keyof Suivi = adresse === 'completer' ? 'completer' : 'rappels';
  const t = TEXTES[quoi];
  const filtre = filtres[quoi];
  const resume = h('p', { class: 'secondaire resume-suivi', 'aria-live': 'polite' });
  const puces = h('div', { class: 'puces', role: 'group', 'aria-label': 'Montrer' });
  const zone = h('div', { class: 'liste-suivi' });
  const erreur = h('p', { class: 'erreur', role: 'alert', hidden: true });

  const changer = (transformation: Parameters<typeof modifierDonnees>[0]) => {
    erreur.hidden = true;
    try {
      modifierDonnees(transformation);
    } catch (e) {
      erreur.textContent = e instanceof Error ? e.message : 'Enregistrement impossible';
      erreur.hidden = false;
    }
    // Le focus suit la fiche touchée, redessinée.
    const actif = document.activeElement?.closest<HTMLElement>('[data-id]')?.dataset.id;
    dessiner();
    if (actif) zone.querySelector<HTMLElement>(`[data-id="${actif}"] .bascule`)?.focus();
  };

  const dessiner = () => {
    const d = lireDonnees();
    const { moi, suivi } = suiviCourant(d);
    const s = suivis(d, moi, suivi);
    const etat = quoi === 'rappels' ? s.rappel : s.signale;
    const duCercle = quoi === 'rappels' ? s.rappelDuCercle : s.signaleDuCercle;
    // « À compléter » : une fiche complète n'y apparaîtrait pas, signalée ou non.
    const toutes = personnesListees(d).filter((p) => quoi === 'rappels' || manquesDe(p).length > 0);
    const nOui = toutes.filter(etat).length;
    const nExceptions = toutes.filter((p) => aException(p, quoi)).length;
    resume.textContent = `${nOui} ${nOui > 1 ? t.ouis : t.oui} sur ${toutes.length} · ${nExceptions} exception${nExceptions > 1 ? 's' : ''}`;

    const choix: [Montrer, string, number][] = [
      ['toutes', 'Toutes', toutes.length],
      ['oui', t.ouis[0].toUpperCase() + t.ouis.slice(1), nOui],
      ['non', `Non ${t.ouis}`, toutes.length - nOui],
      ['exceptions', 'Exceptions', nExceptions],
    ];
    puces.replaceChildren(
      ...choix.map(([id, libelle, n]) =>
        h(
          'button',
          {
            type: 'button',
            class: 'puce',
            'aria-pressed': String(filtre.montrer === id),
            onclick: () => {
              filtre.montrer = id;
              dessiner();
            },
          },
          `${libelle} `,
          h('span', { class: 'nombre-puce' }, String(n)),
        ),
      ),
    );

    const garde = (p: Personne) =>
      filtre.montrer === 'oui' ? etat(p) : filtre.montrer === 'non' ? !etat(p) : filtre.montrer === 'exceptions' ? aException(p, quoi) : true;
    const vues = filtrerParNom(toutes, filtre.nom).filter(garde);
    const tri = lireReglages().tri;

    const ligne = (p: Personne) => {
      const actif = etat(p);
      const nom = nomListe(p, tri);
      const detail =
        quoi === 'completer'
          ? h(
              'span',
              { class: 'pastilles-manque' },
              ...manquesDe(p).map((m) => h('span', { class: 'pastille-manque' }, MANQUES.find((x) => x.manque === m)?.detail)),
            )
          : moi && h('span', { class: 'secondaire' }, etiquette(d, moi, p.id) ?? '');
      // Exception « sans effet » : elle dit comme le cercle ; l'interrupteur ne peut pas la retirer, ce bouton si.
      const sansEffet = actif === duCercle(p);
      const exception =
        aException(p, quoi) &&
        h(
          'span',
          { class: 'exception-suivi' },
          h('span', { class: sansEffet ? 'pastille-exception sans-effet' : 'pastille-exception' }, sansEffet ? 'Exception sans effet' : 'Exception'),
          h('span', { class: 'secondaire' }, sansEffet ? 'son cercle dit pareil' : `son cercle : ${duCercle(p) ? '' : 'non '}${t.cercle}`),
          h(
            'button',
            {
              type: 'button',
              class: 'lien-exception',
              'aria-label': `${sansEffet ? 'Retirer l’exception' : 'Revenir au cercle'} : ${nom}`,
              onclick: () => changer((x) => retirerException(x, p.id, quoi)),
            },
            sansEffet ? 'Retirer' : 'Revenir au cercle',
          ),
        );
      const boite = h('input', {
        type: 'checkbox',
        class: 'bascule',
        checked: actif,
        'aria-label': `${t.titre} : ${nom}`,
        onchange: () => changer((x) => suivreFiche(x, moi, suivi, p.id, quoi, boite.checked)),
      });
      return h(
        'div',
        { class: 'ligne ligne-suivi-fiche', 'data-id': p.id },
        avatarPersonne(p),
        h('span', { class: 'ligne-texte' }, h('span', { class: 'ligne-nom' }, nom), detail, exception),
        h('label', { class: 'case-bascule' }, boite),
      );
    };
    const section = (titre: string, personnes: Personne[], dit?: string) =>
      h(
        'section',
        { class: 'groupe-reglages' },
        h('h2', { class: 'titre-section titre-cercle' }, h('span', {}, titre), dit && h('span', { class: 'dit-cercle' }, dit)),
        h('div', { class: 'carte' }, ...personnes.sort(comparateur(tri)).map(ligne)),
      );

    let sections: HTMLElement[];
    if (!moi) {
      // Sans cercles : par lettre, comme « Toutes les fiches ».
      sections = grouperParLettre(vues, tri).map((g) => section(g.lettre, g.personnes));
    } else {
      const parCercle = new Map<Cercle | undefined, Personne[]>();
      for (const p of vues) parCercle.set(s.cercle(p), [...(parCercle.get(s.cercle(p)) ?? []), p]);
      const dit = (c: Cercle) => (suivi[quoi][c] ? `cercle ${t.cercle}` : `cercle non ${t.cercle}`);
      sections = [
        parCercle.has(undefined) && section('Toi et ton conjoint', parCercle.get(undefined)!, 'toujours suivis'),
        ...CERCLES.map(({ cercle, libelle }) => parCercle.has(cercle) && section(libelle, parCercle.get(cercle)!, dit(cercle))),
      ].filter((x): x is HTMLElement => !!x);
    }
    const vide = toutes.length === 0 ? (quoi === 'completer' ? 'Toutes tes fiches sont complètes.' : 'Aucune fiche.') : 'Aucun résultat.';
    zone.replaceChildren(...(sections.length > 0 ? sections : [h('p', { class: 'vide' }, vide)]));
    // Rien à lister : ni résumé, ni recherche, ni puces.
    resume.hidden = rechercher.hidden = puces.hidden = toutes.length === 0;
  };

  const champ = h('input', {
    type: 'search',
    placeholder: 'Filtrer par prénom ou nom',
    value: filtre.nom,
    autocomplete: 'off',
    enterkeyhint: 'search',
    oninput: () => {
      filtre.nom = champ.value;
      dessiner();
    },
  });
  const rechercher = h('label', { class: 'champ-filtre' }, icone('recherche'), h('span', { class: 'sr-only' }, 'Filtrer par nom'), champ);
  dessiner();
  const sansMoi = !suiviCourant(lireDonnees()).moi;
  return h(
    'div',
    { class: 'ecran' },
    barreEcran('#/reglages/suivi', t.titre),
    h(
      'div',
      { class: 'contenu' },
      resume,
      rechercher,
      puces,
      erreur,
      zone,
      h(
        'p',
        { class: 'secondaire aide-section' },
        t.aide,
        sansMoi ? ' Les cercles se comptent depuis ta fiche ; en attendant, tout le monde est suivi.' : ' Les cercles se règlent dans Réglages › Suivi.',
      ),
    ),
  );
}
