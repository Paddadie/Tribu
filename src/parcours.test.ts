// @vitest-environment happy-dom
// Tests d'écran : l'appli entière (main.ts) tourne dans un faux navigateur, et
// chaque test suit un parcours qui touche aux données, comme Paul au doigt.
// On vérifie ce qui s'affiche et ce qui est réellement enregistré.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ajouterFiliation, ajouterUnion, creerGroupe, creerPersonne, donneesVides } from './modele/modele';
import { charger, exporterJson, sauvegarder } from './modele/stockage';
import { entreesCalendrier } from './modele/fetes';
import type { Donnees, Sexe } from './modele/types';

vi.mock('./pwa', () => ({ initPwa: () => {} }));

// Écouteurs posés par main.ts sur window : retirés après chaque test, sinon
// l'appli du test précédent réagirait encore aux changements de route.
const ecouteurs: [string, EventListenerOrEventListenerObject][] = [];
const ajouterEcouteur = window.addEventListener.bind(window);

// Comme un vrai navigateur (happy-dom diffère) :
// - history.replaceState ne déclenche pas hashchange : l'appli doit redessiner d'elle-même ;
// - history.back recule plus tard, pas pendant l'appel.
const backOrigine = history.back.bind(history);
history.back = () => queueMicrotask(backOrigine);
let hashchangeFactice = false;
const replaceStateOrigine = history.replaceState.bind(history);
history.replaceState = (etat: unknown, titre: string, url?: string | URL | null) => {
  if (url != null && new URL(url, location.href).hash !== location.hash) hashchangeFactice = true;
  replaceStateOrigine(etat, titre, url);
};
ajouterEcouteur('hashchange', (e) => {
  if (!hashchangeFactice) return;
  hashchangeFactice = false;
  e.stopImmediatePropagation();
});

beforeEach(() => {
  vi.spyOn(window, 'addEventListener').mockImplementation((type: string, f: EventListenerOrEventListenerObject, o?: boolean | AddEventListenerOptions) => {
    ecouteurs.push([type, f]);
    ajouterEcouteur(type, f, o);
  });
});

afterEach(() => {
  for (const [type, f] of ecouteurs.splice(0)) window.removeEventListener(type, f);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const pause = () => new Promise((r) => setTimeout(r, 5));

/** Lance l'appli sur `route` avec `donnees` déjà enregistrées. */
async function demarrer(donnees: Donnees = donneesVides(), route = '#/', reglages?: { moi?: string; fetes?: boolean }) {
  localStorage.clear();
  sauvegarder(localStorage, donnees);
  if (reglages) localStorage.setItem('tribu:reglages', JSON.stringify(reglages));
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = route;
  await pause();
  // L'historique de happy-dom survit d'un test à l'autre : l'appli repart d'une entrée vierge.
  history.replaceState(null, '');
  vi.resetModules();
  await import('./main');
  await pause();
}

const ecran = () => document.querySelector<HTMLElement>('#app')!;
const titre = () => ecran().querySelector('h1')?.textContent;
/** Titre de l'accueil : « Bonjour » (ou « Bonsoir ») suivi de la date. */
const ACCUEIL = /^Bon(jour|soir)/;
/** Texte du raccourci « Toutes les fiches » de l'accueil (avec le nombre de fiches). */
const fiches = () => trouver('a.raccourci', 'Toutes les fiches').textContent;
const retour = () => toucher(ecran().querySelector<HTMLElement>('.barre a[aria-label="Retour"], .barre a[aria-label="Annuler"]')!);

/** Données réellement enregistrées dans le stockage. */
function enregistrees(): Donnees {
  const c = charger(localStorage);
  if (!c.lisible) throw new Error('Stockage illisible');
  return c.donnees;
}

/** Premier élément `selecteur` dont le texte contient `texte`. */
function trouver(selecteur: string, texte: string, racine: ParentNode = document): HTMLElement {
  const el = [...racine.querySelectorAll<HTMLElement>(selecteur)].find((e) => e.textContent?.includes(texte));
  if (!el) throw new Error(`Introuvable : ${selecteur} « ${texte} »`);
  return el;
}

async function toucher(el: HTMLElement) {
  el.click();
  await pause();
}

function saisir(id: string, valeur: string) {
  const champ = ecran().querySelector<HTMLInputElement>(`#${id}`)!;
  champ.value = valeur;
  champ.dispatchEvent(new Event('input'));
}

/** Choisit un fichier dans le sélecteur caché de l'écran courant. */
async function choisirFichier(nom: string, contenu: string) {
  const champ = ecran().querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(champ, 'files', { configurable: true, value: [new File([contenu], nom, { type: 'application/json' })] });
  champ.dispatchEvent(new Event('change'));
  await pause();
}

const dialogue = () => document.querySelector<HTMLDialogElement>('dialog.confirmation');
const bandeau = () => document.querySelector<HTMLElement>('.bandeau');

/** Famille de test : Anne et Bruno en couple, Chloé leur fille, Denis sans lien. */
function famille() {
  let d = donneesVides();
  const ids: Record<string, string> = {};
  const ajouter = (prenom: string, sexe: Sexe) => {
    const r = creerPersonne(d, { prenom, nom: 'Martin', sexe });
    d = r.donnees;
    ids[prenom] = r.personne.id;
  };
  ajouter('Anne', 'F');
  ajouter('Bruno', 'M');
  ajouter('Chloé', 'F');
  ajouter('Denis', 'M');
  d = ajouterUnion(d, ids.Anne, ids.Bruno).donnees;
  d = ajouterFiliation(d, ids.Anne, ids.Chloé, 'biologique').donnees;
  d = ajouterFiliation(d, ids.Bruno, ids.Chloé, 'biologique').donnees;
  return { donnees: d, ids };
}

describe('création d’une personne', () => {
  it('depuis la liste vide, enregistre la fiche et l’ouvre', async () => {
    await demarrer();
    await toucher(trouver('a', 'Ajouter la première personne'));
    expect(titre()).toBe('Nouvelle personne');

    saisir('prenom', 'Anne');
    saisir('nom', 'Martin');
    await toucher(trouver('button', 'Enregistrer'));

    const [anne] = enregistrees().personnes;
    expect(anne).toMatchObject({ prenom: 'Anne', nom: 'Martin' });
    expect(location.hash).toBe(`#/personne/${anne.id}`);
    expect(titre()).toBe('Anne Martin');

    // La fiche a pris la place du formulaire : Retour revient à l'accueil.
    await retour();
    expect(titre()).toMatch(ACCUEIL);
  });

  it('sans prénom ni nom, affiche une erreur et n’enregistre rien', async () => {
    await demarrer(donneesVides(), '#/nouveau');
    await toucher(trouver('button', 'Enregistrer'));

    expect(ecran().querySelector<HTMLElement>('.erreur')!.hidden).toBe(false);
    expect(enregistrees().personnes).toHaveLength(0);
    expect(titre()).toBe('Nouvelle personne');
  });
});

describe('ajout d’un lien', () => {
  it('enfant adoptif choisi parmi les personnes existantes', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Anne}`);

    await toucher(trouver('button', 'Ajouter un proche'));
    await toucher(trouver('dialog.feuille a', 'Un enfant'));
    expect(titre()).toBe('Ajouter un enfant');
    await toucher(trouver('label', 'Déjà dans Tribu').querySelector('input')!);
    // Chloé est déjà sa fille : pas choisissable une seconde fois.
    expect(trouver('button.ligne-choix', 'Chloé').hasAttribute('disabled')).toBe(true);

    await toucher(trouver('label', 'Adoptif').querySelector('input')!);
    await toucher(trouver('button.ligne-choix', 'Denis'));
    await toucher(trouver('button', 'Ajouter cet enfant'));

    // Bruno, conjoint d'Anne, est coché d'office comme second parent.
    expect(enregistrees().filiations).toContainEqual(expect.objectContaining({ parent: ids.Anne, enfant: ids.Denis, type: 'adoptif' }));
    expect(enregistrees().filiations).toContainEqual(expect.objectContaining({ parent: ids.Bruno, enfant: ids.Denis, type: 'adoptif' }));
    expect(location.hash).toBe(`#/personne/${ids.Anne}`);
    expect(trouver('section', 'Enfants').textContent).toContain('Denis Martin');
    // ANIM-03 : seule la ligne ajoutée s'éclaire au retour sur la fiche.
    const eclairees = [...ecran().querySelectorAll('.ligne.nouvelle')];
    expect(eclairees).toHaveLength(1);
    expect(eclairees[0].textContent).toContain('Denis Martin');
  });

  it('conjoint marié créé depuis l’écran d’ajout, de sexe opposé par défaut', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/conjoint/${ids.Denis}`);
    await toucher(trouver('label', 'Déjà dans Tribu').querySelector('input')!);
    expect(trouver('button.ligne-choix', 'Anne').textContent).toContain('Déjà en couple');
    expect(trouver('button.ligne-choix', 'Anne').hasAttribute('disabled')).toBe(true);

    await toucher(trouver('label', 'Nouvelle personne').querySelector('input')!);
    saisir('prenom', 'Fanny');
    saisir('nom', 'Roux');
    await toucher(ecran().querySelector<HTMLInputElement>('#marie')!);
    await toucher(trouver('button', 'Créer et ajouter'));

    const fanny = enregistrees().personnes.find((p) => p.prenom === 'Fanny')!;
    expect(fanny.sexe).toBe('F');
    expect(enregistrees().unions).toContainEqual(expect.objectContaining({ personneA: ids.Denis, personneB: fanny.id, marie: true }));
    // Nom de l'homme pour les deux, d'office ; la fiche créée remplace l'écran d'ajout.
    expect(fanny.nom).toBe('Martin');
    expect(fanny.nomNaissance).toBe('Roux');
    expect(location.hash).toBe(`#/personne/${fanny.id}`);
    expect(trouver('section', 'Conjoint').textContent).toContain('Denis Martin');
  });

  it('ami choisi parmi les fiches : forme un groupe, quitté depuis la fiche et rétabli par le bandeau', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Denis}`);
    await toucher(trouver('button', 'Ajouter un proche'));
    expect(trouver('dialog.feuille a', 'Un ami').getAttribute('href')).toBe(`#/ami/${ids.Denis}`);

    await demarrer(donnees, `#/ami/${ids.Denis}`);
    await toucher(trouver('label', 'Déjà dans Tribu').querySelector('input')!);
    await toucher(trouver('button.ligne-choix', 'Chloé'));
    await toucher(trouver('button', 'Former un groupe'));
    expect(enregistrees().groupes).toHaveLength(1);
    expect([...enregistrees().groupes[0].membres].sort()).toEqual([ids.Denis, ids.Chloé].sort());

    await demarrer(enregistrees(), `#/personne/${ids.Denis}`, { moi: ids.Chloé });
    expect(trouver('section', 'Amis', ecran()).textContent).toContain('Chloé Martin');
    expect(ecran().querySelector('.lien-moi')?.textContent).toBe('Ami');

    await toucher(ecran().querySelector<HTMLElement>('button[aria-label^="Quitter le groupe"]')!);
    expect(enregistrees().groupes).toHaveLength(0);
    expect(bandeau()!.textContent).toContain('Denis a quitté');
    expect(ecran().textContent).not.toContain('Amis');

    await toucher(trouver('.bandeau button', 'Annuler'));
    expect(enregistrees().groupes).toHaveLength(1);
    expect(trouver('section', 'Amis', ecran()).textContent).toContain('Chloé Martin');
  });

  it('plusieurs amis cochés d’un coup forment un seul groupe nommé, une seule coche par ligne, décochable', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/ami/${ids.Denis}`);
    await toucher(trouver('label', 'Déjà dans Tribu').querySelector('input')!);
    expect(trouver('button', 'Former un groupe').hasAttribute('disabled')).toBe(true);

    await toucher(trouver('button.ligne-choix', 'Chloé'));
    await toucher(trouver('button.ligne-choix', 'Anne'));
    expect(ecran().querySelectorAll('button.ligne-choix.choisie')).toHaveLength(2);
    expect(trouver('button.ligne-choix', 'Chloé').querySelector('svg')).toBeNull();

    await toucher(trouver('button.ligne-choix', 'Anne'));
    expect(trouver('button.ligne-choix', 'Anne').getAttribute('aria-pressed')).toBe('false');
    await toucher(trouver('button.ligne-choix', 'Anne'));
    saisir('nom-groupe', 'Les voisins');
    await toucher(trouver('button', 'Former un groupe de 3'));

    expect(enregistrees().groupes).toHaveLength(1);
    expect(enregistrees().groupes[0].nom).toBe('Les voisins');
    expect([...enregistrees().groupes[0].membres].sort()).toEqual([ids.Denis, ids.Anne, ids.Chloé].sort());
  });

  it('rejoint un groupe existant depuis la fiche, puis un nouvel ami rejoint ce groupe', async () => {
    const { donnees, ids } = famille();
    const groupe = creerGroupe(donnees, [ids.Anne, ids.Bruno], 'Les voisins');
    await demarrer(groupe.donnees, `#/ami/${ids.Denis}`);
    expect(ecran().textContent).toContain('Rejoindre un groupe');
    await toucher(trouver('button.ligne-choix', 'Les voisins'));
    expect([...enregistrees().groupes[0].membres].sort()).toEqual([ids.Anne, ids.Bruno, ids.Denis].sort());

    await demarrer(enregistrees(), `#/ami/${ids.Denis}`);
    expect(ecran().textContent).not.toContain('Rejoindre un groupe');
    expect(ecran().textContent).toContain('Les amis ajoutés rejoignent ce groupe');
    await toucher(trouver('label', 'Déjà dans Tribu').querySelector('input')!);
    expect(trouver('button.ligne-choix', 'Anne').hasAttribute('disabled')).toBe(true);
    await toucher(trouver('button.ligne-choix', 'Chloé'));
    await toucher(trouver('button', 'Ajouter au groupe'));
    expect(enregistrees().groupes).toHaveLength(1);
    expect(enregistrees().groupes[0].membres).toHaveLength(4);
  });

  it('réglages : renomme un groupe, retire un membre (annulable), supprime le groupe', async () => {
    const { donnees, ids } = famille();
    const groupe = creerGroupe(donnees, [ids.Anne, ids.Bruno, ids.Denis]);
    await demarrer(groupe.donnees, '#/reglages');
    await toucher(trouver('a', 'Groupes d’amis'));
    expect(location.hash).toBe('#/groupes');
    await toucher(trouver('a', 'Groupe de Anne, Bruno, Denis'));
    expect(location.hash).toBe(`#/groupe/${groupe.groupe.id}`);

    saisir('nom-groupe', 'Les voisins');
    ecran().querySelector('#nom-groupe')!.dispatchEvent(new Event('change'));
    expect(enregistrees().groupes[0].nom).toBe('Les voisins');

    await toucher(ecran().querySelector<HTMLElement>('button[aria-label="Retirer Denis du groupe"]')!);
    expect(enregistrees().groupes[0].membres).toHaveLength(2);
    await toucher(trouver('.bandeau button', 'Annuler'));
    expect(enregistrees().groupes[0].membres).toHaveLength(3);

    await toucher(trouver('button', 'Supprimer le groupe'));
    await toucher(trouver('dialog button', 'Supprimer'));
    expect(enregistrees().groupes).toHaveLength(0);
    expect(location.hash).toBe('#/groupes');
  });

  it('parent créé depuis l’écran d’ajout', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/parent/${ids.Denis}`);

    await toucher(trouver('label', 'Nouvelle personne').querySelector('input')!);
    saisir('prenom', 'Élise');
    saisir('nom', 'Durand');
    await toucher(trouver('button', 'Créer et ajouter'));

    const elise = enregistrees().personnes.find((p) => p.prenom === 'Élise')!;
    expect(enregistrees().filiations).toContainEqual(expect.objectContaining({ parent: elise.id, enfant: ids.Denis, type: 'biologique' }));
    expect(location.hash).toBe(`#/personne/${elise.id}`);
    expect(trouver('section', 'Enfants').textContent).toContain('Denis Martin');
  });

  it('s’ouvre sur « Nouvelle personne », le curseur dans le prénom', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/parent/${ids.Denis}`);
    expect(trouver('label', 'Nouvelle personne').querySelector('input')!.checked).toBe(true);
    expect(document.activeElement?.id).toBe('prenom');
  });

  it('enfant d’un couple : relié aux deux parents en une saisie, nom du père prérempli', async () => {
    const lea = creerPersonne(donneesVides(), { prenom: 'Léa', nom: 'Dubois', sexe: 'F' });
    const thomas = creerPersonne(lea.donnees, { prenom: 'Mathis', nom: 'Petit', sexe: 'M' });
    const d = ajouterUnion(thomas.donnees, lea.personne.id, thomas.personne.id).donnees;
    await demarrer(d, `#/enfant/${lea.personne.id}`);

    expect(trouver('label.case', 'Mathis Petit').querySelector('input')!.checked).toBe(true);
    expect(trouver('label.case', 'Mathis Petit').textContent).toContain('Conjoint');
    const nom = ecran().querySelector<HTMLInputElement>('#nom')!;
    expect(nom.value).toBe('Petit');
    await toucher(trouver('button.bouton-nom', 'Prendre Dubois, le nom de Léa'));
    expect(nom.value).toBe('Dubois');

    saisir('prenom', 'Jules');
    await toucher(trouver('button', 'Créer et ajouter'));
    const jules = enregistrees().personnes.find((p) => p.prenom === 'Jules')!;
    expect(jules.nom).toBe('Dubois');
    expect(
      enregistrees()
        .filiations.filter((f) => f.enfant === jules.id)
        .map((f) => f.parent),
    ).toEqual([lea.personne.id, thomas.personne.id]);
    expect(location.hash).toBe(`#/personne/${jules.id}`);
    expect(trouver('section', 'Parents').textContent).toContain('Mathis Petit');
  });

  it('frère ou sœur depuis la fiche : un seul parent coché donne un demi-frère', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Chloé}`);
    await toucher(trouver('button', 'Ajouter un proche'));
    expect(trouver('dialog.feuille a', 'Un frère ou une sœur').textContent).toContain('Enfant d’Anne et Bruno');
    await toucher(trouver('dialog.feuille a', 'Un frère ou une sœur'));
    expect(titre()).toBe('Ajouter un frère ou une sœur');

    await toucher(trouver('label.case', 'Bruno').querySelector('input')!);
    expect(ecran().querySelector<HTMLInputElement>('#nom')!.value).toBe('Martin');
    saisir('prenom', 'Hugo');
    await toucher(trouver('button', 'Créer et ajouter'));

    const hugo = enregistrees().personnes.find((p) => p.prenom === 'Hugo')!;
    expect(
      enregistrees()
        .filiations.filter((f) => f.enfant === hugo.id)
        .map((f) => f.parent),
    ).toEqual([ids.Anne]);
    expect(location.hash).toBe(`#/personne/${hugo.id}`);
    expect(ecran().textContent).toContain('Chloé Martin');
  });

  it('frère ou sœur : décocher un parent avec une date incomplète met à jour le bouton', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/frere/${ids.Chloé}`);
    const mois = ecran().querySelector<HTMLSelectElement>('#mois')!;
    mois.value = '5';
    mois.dispatchEvent(new Event('change'));

    await toucher(trouver('label.case', 'Anne').querySelector('input')!);
    await toucher(trouver('label.case', 'Bruno').querySelector('input')!);
    expect(trouver('button', 'Créer et ajouter').hasAttribute('disabled')).toBe(true);
  });

  it('frère ou sœur sans parent connu : proposé dans la feuille, sans case de parent', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Denis}`);
    await toucher(trouver('button', 'Ajouter un proche'));
    const option = trouver('dialog.feuille .option', 'Un frère ou une sœur');
    expect(option.tagName).toBe('A');
    expect(option.textContent).toContain('Parents inconnus');

    await toucher(option);
    expect(titre()).toBe('Ajouter un frère ou une sœur');
    expect(ecran().querySelector('label.case')).toBeNull();
    expect(ecran().textContent).not.toContain('Type de lien');
    expect(ecran().textContent).toContain('Parents inconnus');
  });

  it('frère ou sœur sans parent connu : créé, il apparaît sans montrer de parent inconnu', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/frere/${ids.Denis}`);
    saisir('prenom', 'Hugo');
    await toucher(trouver('button', 'Créer et ajouter'));

    expect(location.hash).toBe(`#/personne/${enregistrees().personnes.find((p) => p.prenom === 'Hugo')!.id}`);
    expect(trouver('section', 'Frères et sœurs').textContent).toContain('Denis Martin');
    expect(ecran().textContent).not.toContain('Parents');
    const d = enregistrees();
    expect(d.personnes.filter((p) => p.inconnu)).toHaveLength(1);

    // Le parent inconnu reste invisible : la liste ne compte que les vraies personnes.
    await demarrer(d, '#/personnes');
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(5);
    expect(trouver('a', 'Nouvelle fiche').getAttribute('href')).toBe('#/nouveau');

    // Un vrai parent ajouté à Hugo devient aussi celui de Denis.
    await demarrer(d, `#/parent/${enregistrees().personnes.find((p) => p.prenom === 'Hugo')!.id}`);
    saisir('prenom', 'Paula');
    await toucher(trouver('button', 'Créer et ajouter'));
    const apres = enregistrees();
    const paula = apres.personnes.find((p) => p.prenom === 'Paula')!;
    expect(apres.personnes.filter((p) => p.inconnu)).toHaveLength(0);
    expect(
      apres.filiations
        .filter((f) => f.parent === paula.id)
        .map((f) => f.enfant)
        .sort(),
    ).toEqual([ids.Denis, apres.personnes.find((p) => p.prenom === 'Hugo')!.id].sort());
  });

  it('homonyme : la création demande confirmation', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/parent/${ids.Denis}`);
    saisir('prenom', 'anne');
    saisir('nom', 'MARTIN');

    await toucher(trouver('button', 'Créer et ajouter'));
    expect(dialogue()!.textContent).toContain('Une fiche « Anne Martin » existe déjà');
    await toucher(trouver('dialog.confirmation button', 'Annuler'));
    expect(enregistrees().personnes).toHaveLength(4);

    await toucher(trouver('button', 'Créer et ajouter'));
    await toucher(trouver('dialog.confirmation button', 'Créer quand même'));
    expect(enregistrees().personnes).toHaveLength(5);
    expect(location.hash).not.toBe(`#/parent/${ids.Denis}`);
  });

  it('Retour avec une saisie en cours demande confirmation', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Denis}`);
    await toucher(trouver('button', 'Ajouter un proche'));
    await toucher(trouver('dialog.feuille a', 'Un parent'));
    saisir('prenom', 'Élise');

    await retour();
    await toucher(trouver('dialog.confirmation button', 'Continuer la saisie'));
    expect(titre()).toBe('Ajouter un parent');

    await retour();
    await toucher(trouver('dialog.confirmation button', 'Abandonner'));
    await pause();
    expect(titre()).toBe('Denis Martin');
    expect(enregistrees().personnes).toHaveLength(4);
  });

  it('le Retour du téléphone pendant une saisie ramène sur l’écran et demande confirmation', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Denis}`);
    await toucher(trouver('button', 'Ajouter un proche'));
    await toucher(trouver('dialog.feuille a', 'Un parent'));
    const route = location.hash;
    saisir('prenom', 'Élise');

    history.back();
    await pause();
    await pause();
    expect(location.hash).toBe(route);
    expect(titre()).toBe('Ajouter un parent');
    expect(ecran().querySelector<HTMLInputElement>('#prenom')!.value).toBe('Élise');
    await toucher(trouver('dialog.confirmation button', 'Continuer la saisie'));
    expect(titre()).toBe('Ajouter un parent');

    history.back();
    await pause();
    await pause();
    await toucher(trouver('dialog.confirmation button', 'Abandonner'));
    await pause();
    await pause();
    expect(titre()).toBe('Denis Martin');
    expect(enregistrees().personnes).toHaveLength(4);
  });
});

describe('retrait sans confirmation, annulable', () => {
  it('lien parent-enfant retiré, puis rétabli par le bandeau', async () => {
    const { donnees, ids } = famille();
    const lien = donnees.filiations.find((f) => f.parent === ids.Anne && f.enfant === ids.Chloé)!;
    await demarrer(donnees, `#/lien/${lien.id}/${ids.Anne}`);

    await toucher(trouver('button', 'Retirer ce lien'));
    expect(dialogue()).toBeNull();
    expect(enregistrees().filiations).not.toContainEqual(lien);
    expect(bandeau()!.textContent).toContain('Lien avec Chloé retiré.');

    await toucher(trouver('.bandeau button', 'Annuler'));
    expect(enregistrees().filiations).toContainEqual(lien);
    expect(bandeau()!.textContent).toContain('Lien rétabli.');
  });

  it('mariage où chacun garde son nom, avec date et lieu d’union, montrés sur la fiche', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/conjoint/${ids.Denis}`);
    await toucher(trouver('label', 'Nouvelle personne').querySelector('input')!);
    saisir('prenom', 'Fanny');
    saisir('nom', 'Roux');
    const choixNom = ecran().querySelector<HTMLElement>('.nom-apres')!;
    expect(choixNom.hidden).toBe(true);
    await toucher(ecran().querySelector<HTMLInputElement>('#marie')!);
    expect(choixNom.hidden).toBe(false);
    expect(trouver('label.case', 'Martin pour les deux').querySelector('input')!.checked).toBe(true);
    expect(trouver('label.case', 'Martin pour les deux').textContent).toContain('Fanny Martin, née Roux');
    await toucher(trouver('label.case', 'Chacun garde le sien').querySelector('input')!);
    saisir('annee-union', '2012');
    saisir('lieu-union', 'Quimper');
    await toucher(trouver('button', 'Créer et ajouter'));

    const fanny = enregistrees().personnes.find((p) => p.prenom === 'Fanny')!;
    expect(fanny.nom).toBe('Roux');
    expect(fanny.nomNaissance).toBeUndefined();
    expect(enregistrees().unions).toContainEqual(expect.objectContaining({ personneB: fanny.id, marie: true, date: '2012', lieu: 'Quimper' }));
    expect(trouver('section', 'Conjoint').textContent).toContain('Union en 2012');
  });

  it('modifier l’union : date ajoutée puis effacée', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/union/${donnees.unions[0].id}/${ids.Anne}`);
    saisir('annee-union', '1999');
    await toucher(trouver('button', 'Enregistrer'));
    expect(enregistrees().unions[0].date).toBe('1999');

    await demarrer(enregistrees(), `#/union/${donnees.unions[0].id}/${ids.Anne}`);
    saisir('annee-union', '');
    await toucher(trouver('button', 'Enregistrer'));
    expect(enregistrees().unions[0]).not.toHaveProperty('date');
  });

  it('suppression d’une union saisie par erreur, puis rétablie par le bandeau', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/union/${donnees.unions[0].id}/${ids.Anne}`);

    await toucher(trouver('button', 'Supprimer l’union'));
    expect(dialogue()).toBeNull();
    expect(enregistrees().unions).toHaveLength(0);
    expect(bandeau()!.textContent).toContain('Union avec Bruno supprimée.');

    await toucher(trouver('.bandeau button', 'Annuler'));
    expect(enregistrees().unions).toEqual(donnees.unions);
  });

  it('veuvage : on peut ajouter un nouveau conjoint, le défunt reste sur la fiche', async () => {
    let d = donneesVides();
    const jeanne = creerPersonne(d, { prenom: 'Jeanne', nom: 'Morel' });
    const pierre = creerPersonne(jeanne.donnees, { prenom: 'Pierre', nom: 'Morel', deces: '2015' });
    const henri = creerPersonne(pierre.donnees, { prenom: 'Henri', nom: 'Dubois' });
    d = ajouterUnion(henri.donnees, jeanne.personne.id, pierre.personne.id, true).donnees;
    await demarrer(d, `#/personne/${jeanne.personne.id}`);

    await toucher(trouver('button', 'Ajouter un proche'));
    expect(trouver('dialog.feuille .option', 'Un conjoint').tagName).toBe('A');

    await demarrer(ajouterUnion(d, jeanne.personne.id, henri.personne.id).donnees, `#/personne/${jeanne.personne.id}`);
    expect(trouver('section', 'Conjoint').textContent).toContain('Henri Dubois');
    expect(trouver('section', 'Conjoint décédé').textContent).toContain('Pierre Morel');
    await toucher(trouver('button', 'Ajouter un proche'));
    expect(trouver('dialog.feuille .option', 'Un conjoint').classList.contains('inactive')).toBe(true);
  });

  it('séparation : l’union est gardée, l’ex-conjoint reste sur la fiche, annulable par le bandeau', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/union/${donnees.unions[0].id}/${ids.Anne}`);

    await toucher(trouver('button', 'Se sont séparés'));
    expect(dialogue()).toBeNull();
    expect(enregistrees().unions).toEqual([{ ...donnees.unions[0], statut: 'separee' }]);
    expect(bandeau()!.textContent).toContain('Séparation d’avec Bruno enregistrée.');
    // Plus de conjoint actuel, un ex-conjoint.
    const titres = [...ecran().querySelectorAll('.titre-section')].map((t) => t.textContent);
    expect(titres).toContain('Ex-conjoint');
    expect(titres).not.toContain('Conjoint');

    await toucher(trouver('.bandeau button', 'Annuler'));
    expect(enregistrees().unions).toEqual(donnees.unions);
  });

  it('rétablit un couple séparé depuis l’écran de l’ex-conjoint', async () => {
    const { donnees, ids } = famille();
    const separes = { ...donnees, unions: donnees.unions.map((u) => ({ ...u, statut: 'separee' as const })) };
    await demarrer(separes, `#/union/${donnees.unions[0].id}/${ids.Anne}`);

    await toucher(trouver('button', 'Rétablir le couple'));
    expect(enregistrees().unions[0].statut).toBe('actuelle');
  });
});

describe('index alphabétique', () => {
  it('montre les 26 lettres, estompe les absentes, disparaît pendant un filtrage', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/personnes');
    const index = ecran().querySelector<HTMLElement>('.index')!;
    expect(index.children).toHaveLength(26);
    const absentes = [...index.querySelectorAll('.absente')].map((e) => e.textContent);
    expect(absentes).toContain('Z');
    expect(absentes).not.toContain('A');

    const champ = ecran().querySelector<HTMLInputElement>('input[type=search]')!;
    champ.value = 'Ann';
    champ.dispatchEvent(new Event('input'));
    expect(index.hidden).toBe(true);
  });
});

describe('import', () => {
  const fichier = () => {
    let d = donneesVides();
    d = creerPersonne(d, { prenom: 'Xavier', nom: 'Petit' }).donnees;
    d = creerPersonne(d, { prenom: 'Yvonne', nom: 'Petit' }).donnees;
    return exporterJson(d);
  };

  it('fusionne avec les données actuelles, puis peut être annulé', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/reglages');

    await choisirFichier('sauvegarde.json', fichier());
    expect(enregistrees().personnes.map((p) => p.prenom)).toEqual([...donnees.personnes.map((p) => p.prenom), 'Xavier', 'Yvonne']);
    expect(bandeau()!.textContent).toContain('2 personnes ajoutées');

    await toucher(trouver('.bandeau button', 'Annuler'));
    expect(enregistrees()).toEqual(donnees);
    expect(bandeau()!.textContent).toContain('Import annulé.');
  });

  it('pose la question en cas de conflit, et « Annuler l’import » ne change rien', async () => {
    const { donnees } = famille();
    const doublon = {
      ...donnees,
      personnes: donnees.personnes.map((p, i) => (i === 0 ? { ...p, id: 'autre-id' } : p)).slice(0, 1),
      unions: [],
      filiations: [],
      groupes: [],
    };
    await demarrer(donnees, '#/reglages');

    await choisirFichier('sauvegarde.json', exporterJson(doublon));
    expect(dialogue()!.textContent).toContain('même personne');
    await toucher(trouver('dialog.confirmation button', 'Annuler l’import'));
    expect(enregistrees()).toEqual(donnees);

    await choisirFichier('sauvegarde.json', exporterJson(doublon));
    await toucher(trouver('dialog.confirmation button', 'Oui, c’est la même personne'));
    expect(enregistrees().personnes).toHaveLength(donnees.personnes.length);
    expect(bandeau()!.textContent).toContain('1 déjà présente');
  });

  it('découpe les réglages en onglets : Général par défaut, onglet choisi par l’adresse ou au toucher', async () => {
    await demarrer(famille().donnees, '#/reglages');
    const panneau = (id: string) => ecran().querySelector<HTMLElement>(`#panneau-${id}`)!;
    expect(panneau('general').hidden).toBe(false);
    expect(panneau('exports').hidden).toBe(true);
    (ecran().querySelector('#onglet-sauvegarde') as HTMLElement).click();
    expect(panneau('sauvegarde').hidden).toBe(false);
    expect(panneau('general').hidden).toBe(true);
    expect(location.hash).toBe('#/reglages/sauvegarde');
    await demarrer(famille().donnees, '#/reglages/donnees');
    expect(panneau('donnees').hidden).toBe(false);
    await demarrer(famille().donnees, '#/reglages/inconnu');
    expect(panneau('general').hidden).toBe(false);
  });

  it('prévient que l’export contient les notes en clair', async () => {
    await demarrer(famille().donnees, '#/reglages');
    expect(ecran().textContent).toContain('L’export contient tes notes en clair : garde le fichier pour toi.');
  });

  it('l’export agenda est grisé sans date complète, actif avec une naissance datée', async () => {
    const vide = creerPersonne(donneesVides(), { prenom: 'Xavier', nom: 'Test' }).donnees;
    await demarrer(vide, '#/reglages');
    expect(ecran().textContent).toContain('Aucune date complète pour l’instant');
    expect((trouver('button', 'Exporter vers l’agenda') as HTMLButtonElement).disabled).toBe(true);

    const datee = creerPersonne(donneesVides(), { prenom: 'Yvonne', nom: 'Test', naissance: '1980-04-02' }).donnees;
    await demarrer(datee, '#/reglages');
    expect(ecran().textContent).toContain('1 naissance · 0 décès · 0 union');
    expect((trouver('button', 'Exporter vers l’agenda') as HTMLButtonElement).disabled).toBe(false);
  });

  it('l’export de l’arbre en image est grisé sans Moi, actif avec Moi', async () => {
    const d = creerPersonne(donneesVides(), { prenom: 'Zoé', nom: 'Test' });
    await demarrer(d.donnees, '#/reglages');
    expect((trouver('button', 'Exporter l’arbre en PNG') as HTMLButtonElement).disabled).toBe(true);
    expect(ecran().textContent).toContain('Choisis ta fiche dans Réglages → Moi.');

    await demarrer(d.donnees, '#/reglages', { moi: d.personne.id });
    expect((trouver('button', 'Exporter l’arbre en PNG') as HTMLButtonElement).disabled).toBe(false);
    expect(ecran().textContent).toContain('image d’environ');
  });

  it('Vérifier mes données liste une fiche « Test » isolée, avec un lien vers la fiche', async () => {
    const d = creerPersonne(donneesVides(), { prenom: 'Paul', nom: 'Test' });
    await demarrer(d.donnees, '#/reglages');
    await toucher(trouver('a', 'Vérifier mes données'));
    expect(ecran().textContent).toContain('Personnes isolées · 1');
    expect(ecran().textContent).toContain('Fiches « Test » · 1');
    expect(ecran().textContent).toContain('Aucun doublon probable.');
    expect(ecran().querySelector<HTMLAnchorElement>('a.ligne')!.getAttribute('href')).toBe(`#/personne/${d.personne.id}`);
  });

  it('un fichier illisible est refusé sans toucher aux données', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/reglages');

    await choisirFichier('photo.json', 'pas du JSON');
    expect(dialogue()).toBeNull();
    expect(trouver('.erreur', 'Tes données n’ont pas été modifiées').hidden).toBe(false);
    expect(enregistrees()).toEqual(donnees);
  });

  it('sur la liste vide, restaure sans confirmation et affiche la liste', async () => {
    await demarrer();
    await choisirFichier('sauvegarde.json', fichier());

    expect(dialogue()).toBeNull();
    expect(enregistrees().personnes).toHaveLength(2);
    expect(fiches()).toContain('2 fiches');
  });
});

describe('suppression d’une personne', () => {
  it('confirme en signalant les liens, puis les supprime avec la personne', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Anne}`);

    await toucher(trouver('button', 'Supprimer cette personne'));
    expect(dialogue()!.textContent).toContain('Supprimer Anne Martin ? Ses liens seront aussi supprimés.');
    await toucher(trouver('dialog.confirmation button', 'Annuler'));
    expect(enregistrees()).toEqual(donnees);
    expect(titre()).toBe('Anne Martin');

    await toucher(trouver('button', 'Supprimer cette personne'));
    await toucher(trouver('dialog.confirmation button', 'Supprimer'));

    const apres = enregistrees();
    expect(apres.personnes.map((p) => p.prenom)).toEqual(['Bruno', 'Chloé', 'Denis']);
    expect(apres.unions).toHaveLength(0);
    expect(apres.filiations).toEqual([expect.objectContaining({ parent: ids.Bruno, enfant: ids.Chloé })]);
    expect(location.hash).toBe('#/');
    expect(fiches()).toContain('3 fiches');
  });
});

describe('thème', () => {
  it('« Auto » suit le téléphone en direct, « Clair » et « Sombre » le forcent', async () => {
    const changements: (() => void)[] = [];
    const telephone = { matches: true, addEventListener: (_: string, f: () => void) => changements.push(f) };
    const basculer = (sombre: boolean) => {
      telephone.matches = sombre;
      changements.forEach((f) => f());
    };
    vi.stubGlobal('matchMedia', () => telephone);
    await demarrer(donneesVides(), '#/reglages');
    const theme = () => document.documentElement.dataset.theme;

    expect(theme()).toBe('sombre');
    basculer(false);
    expect(theme()).toBe('clair');

    await toucher(trouver('label', 'Sombre').querySelector('input')!);
    expect(theme()).toBe('sombre');
    basculer(false);
    expect(theme()).toBe('sombre');

    await toucher(trouver('label', 'Clair').querySelector('input')!);
    basculer(true);
    expect(theme()).toBe('clair');

    await toucher(trouver('label', 'Auto').querySelector('input')!);
    expect(theme()).toBe('sombre');
  });
});

describe('navigation', () => {
  it('liste → Anne → Chloé : une seule fiche dans l’historique, Retour revient à la liste à la même position', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/personnes');
    window.scrollTo(0, 300);
    const avant = history.length;
    await toucher(trouver('a.ligne', 'Anne'));
    expect(window.scrollY).toBe(0);
    await toucher(trouver('a.ligne-lien', 'Chloé'));
    expect(titre()).toBe('Chloé Martin');
    expect(location.hash).toBe(`#/personne/${ids.Chloé}`);
    // Chloé a pris la place d'Anne : une seule entrée ajoutée.
    expect(history.length).toBe(avant + 1);

    await retour();
    expect(titre()).toBe('Toutes les fiches');
    expect(window.scrollY).toBe(300);
    expect(history.length).toBe(avant + 1);
  });

  it('une longue chaîne de fiches se quitte d’un seul Retour, ou d’un seul geste', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/personnes');
    await toucher(trouver('a.ligne', 'Anne'));
    await toucher(trouver('a.ligne-lien', 'Chloé'));
    await toucher(trouver('a.ligne-lien', 'Anne'));
    expect(titre()).toBe('Anne Martin');

    history.back();
    await pause();
    expect(titre()).toBe('Toutes les fiches');
  });

  it('deux touchers rapides sur Retour ne reculent que d’un écran', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/');
    await toucher(trouver('a.raccourci', 'Toutes les fiches'));
    await toucher(trouver('a.ligne', 'Anne'));

    const bouton = ecran().querySelector<HTMLElement>('.barre a[aria-label="Retour"]')!;
    bouton.click();
    bouton.click();
    await pause();
    expect(titre()).toBe('Toutes les fiches');
  });

  it('appli ouverte sur une fiche : Retour ouvre l’accueil à sa place', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Anne}`);
    const entrees = history.length;

    await retour();
    expect(location.hash).toBe('#/');
    expect(titre()).toMatch(ACCUEIL);
    expect(history.length).toBe(entrees);
  });

  it('l’écran Modifier a un retour et nomme la personne', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    expect(titre()).toBe('Modifier Anne');
    expect(ecran().querySelector(`.barre a[href="#/personne/${ids.Anne}"]`)).not.toBeNull();
  });

  it('une modification enregistrée revient sur la fiche ; Retour mène ensuite à la liste', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/personnes');
    await toucher(trouver('a.ligne', 'Anne'));
    await toucher(trouver('a', 'Modifier'));
    saisir('nom', 'Leroy');
    await toucher(trouver('button', 'Enregistrer'));

    expect(location.hash).toBe(`#/personne/${ids.Anne}`);
    expect(titre()).toBe('Anne Leroy');
    await retour();
    expect(titre()).toBe('Toutes les fiches');
  });
});

describe('route vers une personne supprimée', () => {
  it.each(['personne', 'modifier', 'parent', 'union'])('#/%s/<inconnu> ramène à la liste', async (section) => {
    const { donnees } = famille();
    await demarrer(donnees, `#/${section}/inconnu`);

    expect(location.hash).toBe('#/');
    expect(titre()).toMatch(ACCUEIL);
    expect(fiches()).toContain('4 fiches');
  });
});

describe('« Moi » et parenté', () => {
  const lienMoi = () => ecran().querySelector('.lien-moi')?.textContent;
  const reglagesStockes = () => JSON.parse(localStorage.getItem('tribu:reglages') ?? '{}');

  it('choisit sa fiche dans les réglages, la change, puis ne la choisit plus', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/reglages');
    expect(ecran().textContent).toContain('Choisir ma fiche');

    await toucher(trouver('button', 'Choisir ma fiche', ecran()));
    expect(document.querySelector('dialog.feuille')?.textContent).not.toContain('Ne plus choisir');
    await toucher(trouver('dialog.feuille button', 'Chloé'));
    expect(reglagesStockes().moi).toBe(ids.Chloé);
    expect(document.querySelector('dialog.feuille')).toBeNull();
    expect(ecran().textContent).toContain('Chloé Martin');
    expect(ecran().textContent).toContain('Changer');

    await toucher(trouver('button', 'Changer', ecran()));
    await toucher(trouver('dialog.feuille button', 'Anne'));
    expect(reglagesStockes().moi).toBe(ids.Anne);

    await toucher(trouver('button', 'Changer', ecran()));
    await toucher(trouver('dialog.feuille button', 'Ne plus choisir'));
    expect(reglagesStockes().moi).toBeNull();
    expect(ecran().textContent).toContain('Choisir ma fiche');
  });

  it('affiche sur chaque fiche son lien avec moi, accordé', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Anne}`, { moi: ids.Chloé });
    expect(lienMoi()).toBe('Mère');
    await demarrer(donnees, `#/personne/${ids.Bruno}`, { moi: ids.Chloé });
    expect(lienMoi()).toBe('Père');
    await demarrer(donnees, `#/personne/${ids.Chloé}`, { moi: ids.Chloé });
    expect(lienMoi()).toBe('Toi');
    await demarrer(donnees, `#/personne/${ids.Denis}`, { moi: ids.Chloé });
    expect(lienMoi()).toBeUndefined();
  });

  it('n’affiche aucun lien tant que « Moi » n’est pas choisi, ou si sa fiche n’existe plus', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Anne}`);
    expect(lienMoi()).toBeUndefined();
    await demarrer(donnees, `#/personne/${ids.Anne}`, { moi: 'fiche-disparue' });
    expect(lienMoi()).toBeUndefined();
    await demarrer(donnees, '#/reglages', { moi: 'fiche-disparue' });
    expect(ecran().textContent).toContain('Choisir ma fiche');
  });

  it('montre les sections déduites, vides masquées, avec les étiquettes', async () => {
    const { donnees, ids } = famille();
    // Eva est la mère d'Anne (donc grand-mère de Chloé) et de Hugo (donc oncle de Chloé).
    let d = donnees;
    for (const prenom of ['Eva', 'Hugo']) {
      const r = creerPersonne(d, { prenom, nom: 'Martin', sexe: prenom === 'Eva' ? 'F' : 'M' });
      d = r.donnees;
      ids[prenom] = r.personne.id;
    }
    d = ajouterFiliation(d, ids.Eva, ids.Anne, 'biologique').donnees;
    d = ajouterFiliation(d, ids.Eva, ids.Hugo, 'biologique').donnees;

    await demarrer(d, `#/personne/${ids.Chloé}`, { moi: ids.Chloé });
    const titres = [...ecran().querySelectorAll('h2.titre-section')].map((e) => e.textContent);
    expect(titres).toEqual(['Famille proche', 'Parents', 'Grands-parents', 'Oncles et tantes']);
    expect(trouver('section', 'Grands-parents', ecran()).textContent).toContain('Eva Martin');
    expect(trouver('section', 'Oncles et tantes', ecran()).textContent).toContain('Hugo Martin');

    // Depuis Hugo, Chloé est une nièce, et c'est moi : étiquette « Toi ».
    await demarrer(d, `#/personne/${ids.Hugo}`, { moi: ids.Chloé });
    expect(lienMoi()).toBe('Oncle');
    expect(trouver('section', 'Neveux et nièces', ecran()).textContent).toContain('Toi');

    // Chez Denis, sans lien : aucune section déduite.
    await demarrer(d, `#/personne/${ids.Denis}`, { moi: ids.Chloé });
    expect(ecran().querySelectorAll('h2.titre-section')).toHaveLength(0);
  });

  it('garde « Moi » quand on importe un fichier d’une autre famille', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/reglages', { moi: ids.Chloé });
    const autre = creerPersonne(donneesVides(), { prenom: 'Zoé', nom: 'Autre' }).donnees;
    await choisirFichier('autre.json', exporterJson(autre));
    expect(ecran().textContent).toContain('Chloé Martin');
    expect(ecran().textContent).not.toContain('Choisir ma fiche');
  });
});

describe('mémo : décès, âge et anniversaires', () => {
  const deux = (n: number) => String(n).padStart(2, '0');
  /** Date dans `jours` jours, née `ans` ans plus tôt, au format « AAAA-MM-JJ ». */
  const dans = (jours: number, ans: number) => {
    const j = new Date();
    j.setDate(j.getDate() + jours);
    return `${j.getFullYear() - ans}-${deux(j.getMonth() + 1)}-${deux(j.getDate())}`;
  };
  const avec = (...champs: { prenom: string; naissance?: string; deces?: string }[]) => {
    let d = donneesVides();
    const ids: Record<string, string> = {};
    for (const c of champs) {
      const r = creerPersonne(d, { nom: 'Test', sexe: 'F', ...c });
      d = r.donnees;
      ids[c.prenom] = r.personne.id;
    }
    return { donnees: d, ids };
  };

  it('l’accueil montre les dates du jour et les prochaines, sans les décédés, et les cache pendant une recherche', async () => {
    const { donnees } = avec(
      { prenom: 'Léa', naissance: dans(0, 8) },
      { prenom: 'Paulette', naissance: dans(5, 67) },
      { prenom: 'Mort', naissance: dans(2, 50), deces: '2020' },
      { prenom: 'Loin', naissance: dans(60, 40) },
    );
    await demarrer(donnees);
    const jour = ecran().querySelector<HTMLElement>('.aujourdhui')!;
    expect(jour.textContent).toContain('Léa Test');
    expect(jour.textContent).toContain('8 ans');
    expect(trouver('.vignette', 'Paulette').textContent).toContain('67 ans');
    const bientot = ecran().querySelector<HTMLElement>('.bientot')!.textContent;
    expect(bientot).not.toContain('Mort');
    expect(bientot).not.toContain('Loin');

    const champ = ecran().querySelector<HTMLInputElement>('input[type=search]')!;
    champ.value = 'Léa';
    champ.dispatchEvent(new Event('input'));
    expect(ecran().querySelector('.aujourdhui')).toBeNull();
    expect(trouver('a.ligne', 'Léa Test')).toBeTruthy();
    expect(ecran().querySelector('.pied-recherche')!.textContent).toBe('1 fiche · Créer « Léa »');
    champ.value = '';
    champ.dispatchEvent(new Event('input'));
    expect(ecran().querySelector('.aujourdhui')).not.toBeNull();
  });

  it('l’accueil rappelle sobrement un décès de demain, pas un plus lointain', async () => {
    const { donnees } = avec({ prenom: 'Partie', deces: dans(1, 11) }, { prenom: 'Lointaine', deces: dans(5, 11) });
    await demarrer(donnees);
    const souvenirs = [...ecran().querySelectorAll('a.souvenir')].map((s) => s.textContent);
    expect(souvenirs).toHaveLength(1);
    expect(souvenirs[0]).toContain('Partie Test');
    expect(souvenirs[0]).toContain('décédée le');
    expect(souvenirs[0]).toContain('demain');
    expect(souvenirs[0]).toContain('11 ans');
    expect(ecran().querySelector('.accueil')!.textContent).not.toContain('Lointaine');
  });

  it('l’accueil rappelle un décès d’aujourd’hui', async () => {
    const { donnees } = avec({ prenom: 'Partie', deces: dans(0, 3) });
    await demarrer(donnees);
    expect(trouver('a.souvenir', 'Partie').textContent).toContain('aujourd’hui');
  });

  it('l’accueil n’a ni « Aujourd’hui » ni vignette quand rien n’approche, mais annonce la prochaine date', async () => {
    const { donnees } = avec({ prenom: 'Loin', naissance: dans(60, 40) }, { prenom: 'Sans' });
    await demarrer(donnees, '#/', { fetes: false });
    expect(ecran().querySelector('.aujourdhui')).toBeNull();
    expect(ecran().querySelector('.vignette')).toBeNull();
    expect(ecran().querySelector('.calme')!.textContent).toContain('Prochaine date');
  });

  it('l’accueil montre le saint du jour sans proche concerné, sauf si les fêtes sont désactivées', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 12));
    try {
      const { donnees } = avec({ prenom: 'Sans' });
      await demarrer(donnees);
      expect(ecran().querySelector('.aujourdhui .fete .ligne-nom')!.textContent).toBe('Sainte Céline');
      expect(ecran().querySelector('.aujourdhui .fete-proche')).toBeNull();
      await demarrer(donnees, '#/', { fetes: false });
      expect(ecran().querySelector('.aujourdhui')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('la fiche affiche l’âge d’une personne vivante, et décès puis « Morte à … » pour une décédée', async () => {
    const { donnees, ids } = avec({ prenom: 'Vivante', naissance: dans(-40, 34) }, { prenom: 'Disparue', naissance: '1941-05-03', deces: '2024-01-14' });
    await demarrer(donnees, `#/personne/${ids.Vivante}`);
    expect(ecran().querySelector('.dates .age')!.textContent).toBe('34 ans');

    await demarrer(donnees, `#/personne/${ids.Disparue}`);
    const dates = [...ecran().querySelectorAll('.dates span')].map((s) => s.textContent);
    expect(dates).toEqual(['Née le 3 mai 1941', 'Décédée le 14 janvier 2024', 'Morte à 82 ans']);
  });

  it('une ligne de liste d’une personne décédée affiche ses années de vie', async () => {
    const { donnees } = avec({ prenom: 'Disparue', naissance: '1941-05-03', deces: '2024-01-14' });
    await demarrer(donnees, '#/personnes');
    expect(trouver('a.ligne', 'Disparue').textContent).toContain('1941 – 2024');
  });

  it('le formulaire enregistre la date de décès et refuse un décès avant la naissance', async () => {
    const { donnees, ids } = avec({ prenom: 'Anne', naissance: '1941-05-03' });
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    await toucher(ecran().querySelector<HTMLInputElement>('#decede')!);
    saisir('annee-deces', '1940');
    await toucher(trouver('button', 'Enregistrer'));
    expect(ecran().textContent).toContain('Le décès ne peut pas précéder la naissance');
    expect(enregistrees().personnes[0].deces).toBeUndefined();

    saisir('annee-deces', '2024');
    ecran().querySelector<HTMLSelectElement>('#mois-deces')!.value = '1';
    saisir('jour-deces', '14');
    await toucher(trouver('button', 'Enregistrer'));
    expect(enregistrees().personnes[0].deces).toBe('2024-01-14');
    expect(location.hash).toBe(`#/personne/${ids.Anne}`);
  });

  it('une date de décès incomplète est signalée avec « de décès »', async () => {
    const { donnees, ids } = avec({ prenom: 'Anne' });
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    await toucher(ecran().querySelector<HTMLInputElement>('#decede')!);
    saisir('jour-deces', '14');
    await toucher(trouver('button', 'Enregistrer'));
    expect(ecran().textContent).toContain('de décès');
  });

  it('la date de décès n’apparaît qu’avec l’interrupteur « Décédée », accordé au sexe', async () => {
    const { donnees, ids } = avec({ prenom: 'Anne' });
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    const bascule = ecran().querySelector<HTMLInputElement>('#decede')!;
    const ligne = ecran().querySelector<HTMLElement>('label[for=decede] .ligne-nom')!;
    const date = ecran().querySelector<HTMLElement>('#annee-deces')!.closest<HTMLElement>('.champ')!.parentElement!;
    expect(bascule.checked).toBe(false);
    expect(ligne.textContent).toBe('Décédée');
    expect(date.hidden).toBe(true);

    await toucher(ecran().querySelector<HTMLInputElement>('input[name=sexe][value=M]')!);
    expect(ligne.textContent).toBe('Décédé');
    await toucher(bascule);
    expect(date.hidden).toBe(false);
  });

  it('allumé sans date : décédée sans date, affichée « Décédée », sans âge', async () => {
    // Naissance en année seule : happy-dom perd le mois prérempli (voir plus bas).
    const { donnees, ids } = avec({ prenom: 'Anne', naissance: '1941' });
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    await toucher(ecran().querySelector<HTMLInputElement>('#decede')!);
    await toucher(trouver('button', 'Enregistrer'));
    const anne = enregistrees().personnes[0];
    expect(anne.decede).toBe(true);
    expect(anne.deces).toBeUndefined();
    const dates = [...ecran().querySelectorAll('.dates span')].map((s) => s.textContent);
    expect(dates).toEqual(['Née en 1941', 'Décédée']);

    await demarrer(enregistrees(), `#/modifier/${ids.Anne}`);
    expect(ecran().querySelector<HTMLInputElement>('#decede')!.checked).toBe(true);
  });

  it('éteindre l’interrupteur efface la date de décès, même incomplète', async () => {
    const { donnees, ids } = avec({ prenom: 'Anne', deces: '2024' });
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    const bascule = ecran().querySelector<HTMLInputElement>('#decede')!;
    expect(bascule.checked).toBe(true);
    saisir('jour-deces', '14');
    await toucher(bascule);
    await toucher(trouver('button', 'Enregistrer'));
    const anne = enregistrees().personnes[0];
    expect(anne.deces).toBeUndefined();
    expect(anne.decede).toBeUndefined();
  });

  it('le formulaire enregistre un décès sans année (jour et mois)', async () => {
    const { donnees, ids } = avec({ prenom: 'Anne', naissance: '1941' });
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    await toucher(ecran().querySelector<HTMLInputElement>('#decede')!);
    ecran().querySelector<HTMLSelectElement>('#mois-deces')!.value = '1';
    saisir('jour-deces', '14');
    await toucher(trouver('button', 'Enregistrer'));
    expect(enregistrees().personnes[0].deces).toBe('--01-14');
    const dates = [...ecran().querySelectorAll('.dates span')].map((s) => s.textContent);
    expect(dates).toEqual(['Née en 1941', 'Décédée le 14 janvier']);
  });

  it('le formulaire enregistre une naissance sans année, que la fiche affiche sans âge', async () => {
    const { donnees, ids } = avec({ prenom: 'Anne' });
    await demarrer(donnees, `#/modifier/${ids.Anne}`);
    ecran().querySelector<HTMLSelectElement>('#mois')!.value = '10';
    saisir('jour', '24');
    await toucher(trouver('button', 'Enregistrer'));
    expect(enregistrees().personnes[0].naissance).toBe('--10-24');
    const dates = [...ecran().querySelectorAll('.dates span')].map((s) => s.textContent);
    expect(dates).toEqual(['Née le 24 octobre']);

    await demarrer(enregistrees(), `#/modifier/${ids.Anne}`);
    expect(ecran().querySelector<HTMLInputElement>('#jour')!.value).toBe('24');
    // Le mois prérempli n'est pas vérifié : happy-dom ignore `selected` posé avant l'insertion (le navigateur, non).
    expect(ecran().querySelector<HTMLInputElement>('#annee')!.value).toBe('');
  });

  it('l’accueil montre l’anniversaire d’une naissance sans année, sans âge', async () => {
    const date = dans(3, 0).slice(4);
    const { donnees } = avec({ prenom: 'Anniv', naissance: `-${date}` });
    await demarrer(donnees);
    const vignette = trouver('.vignette', 'Anniv');
    expect(vignette.querySelector('.secondaire')!.textContent).not.toContain(' · ');
  });
});

describe('arbre global', () => {
  it('s’ouvre depuis l’accueil et montre les personnes reliées à Moi, sans les autres', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/', { moi: ids.Chloé });
    await toucher(ecran().querySelector<HTMLElement>('a[href="#/arbre"]')!);
    expect(titre()).toBe('Arbre');
    const liens = [...ecran().querySelectorAll<HTMLAnchorElement>('.calque a.noeud')].map((a) => a.getAttribute('href'));
    expect(liens.sort()).toEqual([ids.Anne, ids.Bruno, ids.Chloé].map((id) => `#/personne/${id}`).sort());
    expect(ecran().querySelector('.calque .noeud.moi')?.textContent).toContain('Toi');
    expect(ecran().querySelectorAll('.traits-arbre .couple')).toHaveLength(1);
  });

  it('ouvre la fiche d’une personne touchée, puis revient à l’arbre', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/arbre', { moi: ids.Chloé });
    await toucher(ecran().querySelector<HTMLElement>(`.calque a[href="#/personne/${ids.Anne}"]`)!);
    expect(ecran().querySelector('.identite h1')?.textContent).toContain('Anne');
    await retour();
    await pause();
    expect(titre()).toBe('Arbre');
  });

  it('le parent « ? » touché ouvre « Qui est ce parent ? », sans rien enregistrer ; une personne créée le remplace', async () => {
    let d = donneesVides();
    const anne = creerPersonne(d, { prenom: 'Anne', nom: 'Martin', sexe: 'F' });
    const chloe = creerPersonne(anne.donnees, { prenom: 'Chloé', nom: 'Martin', sexe: 'F' });
    d = ajouterFiliation(chloe.donnees, anne.personne.id, chloe.personne.id, 'biologique').donnees;
    await demarrer(d, '#/arbre', { moi: chloe.personne.id });
    await toucher(ecran().querySelector<HTMLElement>('.calque a[href^="#/qui/virtuel:"]')!);
    expect(location.hash).toBe(`#/qui/virtuel:${anne.personne.id}`);
    expect(titre()).toBe('Qui est ce parent ?');
    expect(ecran().querySelector('.contexte')?.textContent).toBe('?L’autre parent de Chloé, enfant de Anne Martin.');
    expect(enregistrees().personnes).toHaveLength(2);

    await toucher(trouver('label', 'Nouvelle personne').querySelector('input')!);
    expect(ecran().querySelector<HTMLInputElement>('input[name=sexe][value=M]')!.checked).toBe(true);
    saisir('prenom', 'Bruno');
    saisir('nom', 'Martin');
    expect(trouver('label.choix', 'En couple').querySelector('input')!.checked).toBe(true);
    await toucher(trouver('button', 'Créer et ajouter'));

    const apres = enregistrees();
    const bruno = apres.personnes.find((p) => p.prenom === 'Bruno')!;
    expect(apres.personnes.filter((p) => p.sansNom)).toHaveLength(0);
    expect(apres.filiations).toContainEqual(expect.objectContaining({ parent: bruno.id, enfant: chloe.personne.id }));
    expect(apres.unions).toContainEqual(expect.objectContaining({ personneA: anne.personne.id, personneB: bruno.id, statut: 'actuelle' }));
    expect(location.hash).toBe(`#/personne/${bruno.id}`);
  });

  it('« Qui est ce parent ? » : une personne en couple, « Séparés » d’office, avertissement si l’on choisit « En couple »', async () => {
    let d = donneesVides();
    const ids: Record<string, string> = {};
    for (const [prenom, sexe] of [
      ['Anne', 'F'],
      ['Chloé', 'F'],
      ['Denis', 'M'],
      ['Fanny', 'F'],
    ] as const) {
      const r = creerPersonne(d, { prenom, nom: 'Martin', sexe });
      d = r.donnees;
      ids[prenom] = r.personne.id;
    }
    d = ajouterFiliation(d, ids.Anne, ids.Chloé, 'biologique').donnees;
    d = ajouterUnion(d, ids.Denis, ids.Fanny).donnees;
    await demarrer(d, `#/qui/virtuel:${ids.Anne}`);
    expect(trouver('label', 'Déjà dans Tribu').querySelector('input')!.checked).toBe(true);
    expect(trouver('button.ligne-choix', 'Chloé').hasAttribute('disabled')).toBe(true);

    await toucher(trouver('button.ligne-choix', 'Denis'));
    expect(trouver('button', 'C’est Denis')).toBeTruthy();
    expect(trouver('label.choix', 'Séparés').querySelector('input')!.checked).toBe(true);
    expect(ecran().querySelector<HTMLElement>('.avertissement')!.hidden).toBe(true);
    await toucher(trouver('label.choix', 'En couple').querySelector('input')!);
    expect(ecran().querySelector('.avertissement')!.textContent).toBe('Denis est en couple avec Fanny : cette union-là passera en « séparés ».');
    await toucher(trouver('button', 'C’est Denis'));

    const apres = enregistrees();
    expect(apres.filiations).toContainEqual(expect.objectContaining({ parent: ids.Denis, enfant: ids.Chloé }));
    expect(apres.unions).toContainEqual(expect.objectContaining({ personneA: ids.Denis, personneB: ids.Fanny, statut: 'separee' }));
    expect(apres.unions).toContainEqual(expect.objectContaining({ personneA: ids.Anne, personneB: ids.Denis, statut: 'actuelle' }));
    expect(location.hash).toBe(`#/personne/${ids.Denis}`);
  });

  it('cherche une personne de l’arbre', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/arbre', { moi: ids.Chloé });
    await toucher(ecran().querySelector<HTMLElement>('.barre button[aria-label="Chercher une personne"]')!);
    const champ = ecran().querySelector<HTMLInputElement>('.recherche-arbre input')!;
    champ.value = 'bru';
    champ.dispatchEvent(new Event('input'));
    expect([...ecran().querySelectorAll('.recherche-arbre li')].map((li) => li.textContent)).toEqual(['BMBruno Martin']);
    champ.value = 'denis';
    champ.dispatchEvent(new Event('input'));
    expect(ecran().querySelectorAll('.recherche-arbre li')).toHaveLength(0);
  });

  it('« Toi » plein au départ, puis « Tout » ; « Revenir » ramène à la vue d’avant', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/arbre', { moi: ids.Chloé });
    const puce = (texte: string) => trouver('.commandes-arbre button', texte, ecran());
    const revenir = ecran().querySelector<HTMLElement>('button[aria-label="Revenir à la vue d’avant"]')!;
    expect(puce('Toi').getAttribute('aria-pressed')).toBe('true');
    expect(revenir.hidden).toBe(true);
    await toucher(puce('Tout'));
    expect(puce('Toi').getAttribute('aria-pressed')).toBe('false');
    expect(puce('Tout').getAttribute('aria-pressed')).toBe('true');
    expect(revenir.hidden).toBe(false);
    await toucher(revenir);
    expect(puce('Toi').getAttribute('aria-pressed')).toBe('true');
    expect(revenir.hidden).toBe(true);
  });

  it('la feuille Familles se replie dès qu’on fait glisser la carte, même hors du calque', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, '#/arbre', { moi: ids.Chloé });
    await toucher(trouver('.commandes-arbre button', 'Familles', ecran()));
    expect(ecran().querySelector('.feuille-arbre.ouverte')).not.toBeNull();
    const vue = ecran().querySelector<HTMLElement>('.vue-arbre')!;
    const pointeur = (type: string, x: number) => vue.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX: x, clientY: 10, bubbles: true }));
    pointeur('pointerdown', 10);
    pointeur('pointermove', 40);
    pointeur('pointerup', 40);
    expect(ecran().querySelector('.feuille-arbre.ouverte')).toBeNull();
    expect(trouver('.commandes-arbre button', 'Familles', ecran()).getAttribute('aria-expanded')).toBe('false');
  });

  it('un membre de la famille dans un groupe d’amis porte un petit anneau', async () => {
    const { donnees, ids } = famille();
    const d = creerGroupe(donnees, [ids.Bruno, ids.Denis], 'Le foot').donnees;
    await demarrer(d, '#/arbre', { moi: ids.Chloé });
    const anneau = (id: string) => ecran().querySelector(`.calque a[href="#/personne/${id}"] .avatar .anneau-groupe`);
    expect(anneau(ids.Bruno)).not.toBeNull();
    expect(anneau(ids.Anne)).toBeNull();
    expect(anneau(ids.Chloé)).toBeNull();
  });

  it('sans fiche « Moi », renvoie vers les réglages', async () => {
    await demarrer(famille().donnees, '#/arbre');
    expect(ecran().textContent).toContain('Choisis d’abord ta fiche');
    expect(ecran().querySelector('a[href="#/reglages"]')).not.toBeNull();
    expect(ecran().querySelector('.calque')).toBeNull();
  });
});

describe('accueil, agenda et dates', () => {
  const deux = (n: number) => String(n).padStart(2, '0');
  /** Date dans `jours` jours, `ans` ans plus tôt, au format « AAAA-MM-JJ ». */
  const dans = (jours: number, ans: number) => {
    const j = new Date();
    j.setDate(j.getDate() + jours);
    return `${j.getFullYear() - ans}-${deux(j.getMonth() + 1)}-${deux(j.getDate())}`;
  };
  // Un prénom du calendrier des fêtes, sans autre date : il n'apparaît dans l'agenda que par sa fête.
  const prenomFete = entreesCalendrier()[0].prenom;
  const agenda = () => {
    let d = donneesVides();
    for (const c of [{ prenom: 'Paulette', naissance: dans(5, 67) }, { prenom: 'Partie', deces: dans(10, 5) }, { prenom: prenomFete }])
      d = creerPersonne(d, { nom: 'Test', sexe: 'F', ...c }).donnees;
    return d;
  };
  const puces = () => [...ecran().querySelectorAll('.puce')].map((p) => p.textContent);

  it('les raccourcis de l’accueil mènent aux groupes, aux familles, à l’arbre et à toutes les fiches', async () => {
    const { donnees } = famille();
    await demarrer(donnees);
    const liens = [...ecran().querySelectorAll<HTMLAnchorElement>('a.raccourci')].map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['#/arbre', '#/personnes']);
    await toucher(trouver('a.raccourci', 'Toutes les fiches'));
    expect(titre()).toBe('Toutes les fiches');
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(4);
  });

  it('les raccourcis Ma famille et Mes amis ouvrent une pop-up dont chaque ligne mène à l’arbre zoomé', async () => {
    const { donnees, ids } = famille();
    const ami = creerPersonne(donnees, { prenom: 'Victor', nom: 'Voisin', sexe: 'M' });
    const avecGroupe = creerGroupe(ami.donnees, [ids.Chloé, ami.personne.id], 'Les voisins');
    await demarrer(avecGroupe.donnees, '#/', { moi: ids.Chloé });
    const lignes = () => [...document.querySelectorAll<HTMLAnchorElement>('dialog.fenetre-liste a.ligne-feuille')];

    await toucher(trouver('button.raccourci', 'Mes amis'));
    expect(lignes().map((a) => a.getAttribute('href'))).toEqual(['#/arbre/famille/voisin']);
    expect(document.querySelector('.ligne-pied')?.getAttribute('href')).toBe('#/groupes');
    const puces = [...document.querySelectorAll('dialog.fenetre-liste .puce')].map((p) => p.textContent);
    expect(puces).toEqual(['Tout', 'Les voisins']);
    await toucher(trouver('dialog.fenetre-liste .puce', 'Les voisins'));
    expect(lignes().map((a) => a.getAttribute('href'))).toEqual(['#/arbre/famille/voisin']);
    document.querySelector('dialog.fenetre-liste')!.remove();

    await toucher(trouver('button.raccourci', 'Ma famille'));
    expect(lignes().length).toBeGreaterThan(0);
    for (const a of lignes()) expect(a.getAttribute('href')).toMatch(/^#\/arbre\/famille\/[a-z0-9%-]+$/);
    expect(lignes().map((a) => a.getAttribute('href'))).not.toContain('#/arbre/famille/voisin');
    const href = lignes()[0].getAttribute('href')!;
    await toucher(lignes()[0]);
    expect(document.querySelector('dialog.fenetre-liste')).toBeNull();
    expect(location.hash).toBe(href);
    expect(ecran().querySelector('.vue-arbre')).not.toBeNull();
  });

  it('« Créer » depuis la recherche ouvre le formulaire prérempli', async () => {
    const { donnees } = famille();
    await demarrer(donnees);
    const champ = ecran().querySelector<HTMLInputElement>('input[type=search]')!;
    champ.value = 'Zoé Petit';
    champ.dispatchEvent(new Event('input'));
    expect(ecran().querySelector('.pied-recherche')!.textContent).toBe('0 fiche · Créer « Zoé Petit »');
    await toucher(trouver('.pied-recherche a', 'Créer'));
    expect(ecran().querySelector<HTMLInputElement>('#prenom')!.value).toBe('Zoé');
    expect(ecran().querySelector<HTMLInputElement>('#nom')!.value).toBe('Petit');
  });

  it('l’agenda groupe les dates par mois et les filtre par genre', async () => {
    await demarrer(agenda(), '#/agenda');
    expect(titre()).toBe('Agenda');
    expect(puces()).toEqual(['Tout', 'Anniversaires', 'Noces', 'Fêtes', 'Décès']);
    expect(trouver('.puce', 'Tout').getAttribute('aria-pressed')).toBe('true');
    expect(ecran().querySelectorAll('section.groupe h2').length).toBeGreaterThan(0);

    await toucher(trouver('.puce', 'Anniversaires'));
    const anniversaires = [...ecran().querySelectorAll('.agenda .ligne')].map((l) => l.textContent);
    expect(anniversaires).toHaveLength(1);
    expect(anniversaires[0]).toContain('Paulette');
    expect(anniversaires[0]).toContain('67 ans');

    await toucher(trouver('.puce', 'Décès'));
    const deces = [...ecran().querySelectorAll('.agenda .ligne')];
    expect(deces).toHaveLength(1);
    expect(deces[0].classList.contains('gris')).toBe(true);
    expect(deces[0].textContent).toContain('Partie');

    await toucher(trouver('.puce', 'Fêtes'));
    expect(trouver('.agenda .ligne', prenomFete)).toBeTruthy();

    await toucher(trouver('.puce', 'Noces'));
    expect(ecran().querySelector('.agenda')!.textContent).toBe('Rien dans les 12 prochains mois.');
    expect(ecran().querySelector('a.lien-ics')!.getAttribute('href')).toBe('#/reglages');
  });

  it('sans les fêtes (réglage), l’agenda n’a ni puce ni ligne de fête', async () => {
    await demarrer(agenda(), '#/agenda', { fetes: false });
    expect(puces()).not.toContain('Fêtes');
    expect(ecran().querySelector('.agenda')!.textContent).not.toContain(prenomFete);
  });

  it('« Tout voir » de l’accueil ouvre un agenda sans fêtes, même si le réglage est actif', async () => {
    await demarrer(agenda());
    const lien = ecran().querySelector<HTMLAnchorElement>('.bientot h2 a')!;
    expect(lien.getAttribute('href')).toBe('#/agenda?sans-fetes');
    expect(ecran().querySelector('.bientot a.vignette.fin')).toBeNull();

    await demarrer(agenda(), '#/agenda?sans-fetes');
    expect(titre()).toBe('Agenda');
    expect(puces()).toEqual(['Tout', 'Anniversaires', 'Noces', 'Décès']);
    expect(ecran().querySelector('.agenda')!.textContent).not.toContain(prenomFete);
    expect(ecran().querySelectorAll('.agenda .ligne').length).toBeGreaterThan(0);

    await demarrer(agenda(), '#/agenda');
    expect(puces()).toContain('Fêtes');
    expect(ecran().querySelector('.agenda')!.textContent).toContain(prenomFete);
  });

  it('le réglage « Fêtes du prénom » s’enregistre', async () => {
    await demarrer(agenda(), '#/reglages');
    const bascule = ecran().querySelector<HTMLInputElement>('#fetes')!;
    expect(bascule.checked).toBe(true);
    await toucher(bascule);
    expect(JSON.parse(localStorage.getItem('tribu:reglages')!).fetes).toBe(false);
  });

  it('le formulaire refuse une naissance dans le futur', async () => {
    await demarrer(donneesVides(), '#/nouveau');
    saisir('prenom', 'Future');
    saisir('annee', String(new Date().getFullYear() + 1));
    await toucher(trouver('button', 'Enregistrer'));
    expect(ecran().textContent).toContain('Date de naissance dans le futur');
    expect(enregistrees().personnes).toHaveLength(0);
  });

  it('l’écran d’une union affiche sa durée et le nom des noces', async () => {
    const { donnees, ids } = famille();
    const union = { ...donnees.unions[0], marie: true, date: `${new Date().getFullYear() - 10}-01-01` };
    await demarrer({ ...donnees, unions: [union] }, `#/union/${union.id}/${ids.Anne}`);
    expect(ecran().querySelector('.duree-union')!.textContent).toBe('10 ans · noces d’étain');
  });
});

describe('filtres de la liste', () => {
  it('propose seulement les filtres utiles, indique ce qui manque et garde l’index masqué', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/personnes');
    const puces = () => [...ecran().querySelectorAll('.puces-liste button')].map((b) => b.textContent);
    // Ni « Moi » ni groupe : pas de Famille, Amis proches ni Groupe d’amis.
    expect(puces()).toEqual(['Toutes', 'À compléter']);

    await toucher(trouver('button', 'À compléter'));
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(4);
    expect(ecran().textContent).toContain('Naissance inconnue');
    expect(ecran().querySelector<HTMLElement>('.index')!.hidden).toBe(true);

    await toucher(trouver('button', 'Toutes'));
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(4);
    expect(ecran().querySelector<HTMLElement>('.index')!.hidden).toBe(false);
  });

  it('ne montre que les manques présents, et rien si une seule sorte manque', async () => {
    const { donnees } = famille();
    // Tous complets sauf une naissance inconnue : un seul manque, donc pas de sous-filtre.
    const completes = donnees.personnes.map((p) => ({ ...p, prenom: p.prenom || 'X', nom: p.nom || 'Y', naissance: '1980-01-01' }));
    const un = completes.map((p, i) => (i === 0 ? { ...p, naissance: '' } : p));
    await demarrer({ ...donnees, personnes: un }, '#/personnes');
    await toucher(trouver('button', 'À compléter'));
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(1);
    expect(ecran().querySelector<HTMLElement>('.puces-sous')!.hidden).toBe(true);

    // Un décès sans date en plus : deux sous-filtres, et seulement ceux-là.
    const deux = un.map((p, i) => (i === 1 ? { ...p, decede: true as const, deces: '' } : p));
    await demarrer({ ...donnees, personnes: deux }, '#/personnes');
    await toucher(trouver('button', 'À compléter'));
    const sous = [...ecran().querySelectorAll('.puces-sous button')].map((b) => b.textContent);
    expect(sous).toEqual(['Naissance', 'Décès']);
  });

  it('masque « À compléter » quand toutes les fiches sont complètes', async () => {
    const { donnees } = famille();
    const completes = donnees.personnes.map((p) => ({ ...p, prenom: p.prenom || 'X', nom: p.nom || 'Y', naissance: '1980-01-01' }));
    await demarrer({ ...donnees, personnes: completes }, '#/personnes');
    expect([...ecran().querySelectorAll('.puces-liste button')].map((b) => b.textContent)).toEqual(['Toutes']);
  });
});

describe('V4 lot 2 : saisie', () => {
  /** Céleste Martinez et Achille Rochefort, en couple sans être mariés. */
  function couple() {
    const celeste = creerPersonne(donneesVides(), { prenom: 'Céleste', nom: 'Martinez', sexe: 'F' });
    const achille = creerPersonne(celeste.donnees, { prenom: 'Achille', nom: 'Rochefort', sexe: 'M' });
    const { donnees, union } = ajouterUnion(achille.donnees, celeste.personne.id, achille.personne.id);
    return { donnees, union, celeste: celeste.personne.id, achille: achille.personne.id };
  }
  const coche = (texte: string) => trouver('label.case', texte).querySelector('input')!.checked;

  it('nom après le mariage : le nom de l’homme d’office, même écran des deux côtés, reprise du nom proposée à la séparation', async () => {
    const { donnees, union, celeste, achille } = couple();
    await demarrer(donnees, `#/union/${union.id}/${celeste}`);
    await toucher(ecran().querySelector<HTMLInputElement>('#marie')!);
    expect(coche('Rochefort pour les deux')).toBe(true);
    expect(trouver('label.case', 'Rochefort pour les deux').textContent).toContain('Céleste Rochefort, née Martinez');
    await toucher(trouver('button', 'Enregistrer'));
    const mariee = enregistrees().personnes.find((p) => p.id === celeste)!;
    expect([mariee.nom, mariee.nomNaissance]).toEqual(['Rochefort', 'Martinez']);

    await demarrer(enregistrees(), `#/union/${union.id}/${achille}`);
    expect(coche('Rochefort pour les deux')).toBe(true);
    await toucher(trouver('button', 'Se sont séparés'));
    await pause();
    expect(dialogue()!.textContent).toContain('Céleste porte encore le nom d’Achille. Reprendre son nom de naissance, Martinez ?');
    await toucher(trouver('dialog.confirmation button', 'Reprendre Martinez'));
    expect(enregistrees().personnes.find((p) => p.id === celeste)!.nom).toBe('Martinez');
  });

  it('Modifier : les interrupteurs « Rappels » et « Signaler » éteints sont enregistrés', async () => {
    const { donnees, celeste } = couple();
    await demarrer(donnees, `#/modifier/${celeste}`);
    await toucher(ecran().querySelector<HTMLInputElement>('#rappels')!);
    await toucher(ecran().querySelector<HTMLInputElement>('#signaler')!);
    await toucher(trouver('button', 'Enregistrer'));
    expect(enregistrees().personnes.find((p) => p.id === celeste)).toEqual(expect.objectContaining({ sansRappel: true, ignorerIncomplet: true }));
  });

  it('enfant : l’ex est proposé comme autre parent, « Autre parent ou inconnu » n’en ajoute aucun', async () => {
    const { donnees: d, celeste } = couple();
    const separes = { ...d, unions: d.unions.map((u) => ({ ...u, statut: 'separee' as const })) };
    await demarrer(separes, `#/enfant/${celeste}`);
    expect(coche('Achille Rochefort')).toBe(true);
    expect(trouver('label.case', 'Achille Rochefort').textContent).toContain('Ex');
    await toucher(trouver('label.case', 'Autre parent ou inconnu').querySelector('input')!);
    saisir('prenom', 'Zoé');
    await toucher(trouver('button', 'Créer et ajouter'));
    const zoe = enregistrees().personnes.find((p) => p.prenom === 'Zoé')!;
    expect(
      enregistrees()
        .filiations.filter((f) => f.enfant === zoe.id)
        .map((f) => f.parent),
    ).toEqual([celeste]);
  });

  it('parent : aussi parent de la fratrie présumée (cochée d’office), uni en couple à l’unique parent connu', async () => {
    let d = donneesVides();
    const ids: Record<string, string> = {};
    for (const [prenom, sexe] of [
      ['Anne', 'F'],
      ['Chloé', 'F'],
      ['Denis', 'M'],
    ] as const) {
      const r = creerPersonne(d, { prenom, nom: 'Martin', sexe });
      d = r.donnees;
      ids[prenom] = r.personne.id;
    }
    d = ajouterFiliation(d, ids.Anne, ids.Chloé, 'biologique').donnees;
    d = ajouterFiliation(d, ids.Anne, ids.Denis, 'biologique').donnees;
    await demarrer(d, `#/parent/${ids.Chloé}`);
    expect(coche('Denis Martin')).toBe(true);
    expect(trouver('label.choix', 'En couple').querySelector('input')!.checked).toBe(true);
    saisir('prenom', 'Gilles');
    await toucher(trouver('button', 'Créer et ajouter'));

    const apres = enregistrees();
    const gilles = apres.personnes.find((p) => p.prenom === 'Gilles')!;
    expect(
      apres.filiations
        .filter((f) => f.parent === gilles.id)
        .map((f) => f.enfant)
        .sort(),
    ).toEqual([ids.Chloé, ids.Denis].sort());
    expect(apres.unions).toContainEqual(expect.objectContaining({ personneA: ids.Anne, personneB: gilles.id, statut: 'actuelle' }));
    expect(location.hash).toBe(`#/personne/${gilles.id}`);
  });
});
