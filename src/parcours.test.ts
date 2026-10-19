// @vitest-environment happy-dom
// Tests d'écran : l'appli entière (main.ts) tourne dans un faux navigateur, et
// chaque test suit un parcours qui touche aux données, comme Paul au doigt.
// On vérifie ce qui s'affiche et ce qui est réellement enregistré.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ajouterFiliation, ajouterUnion, creerPersonne, donneesVides } from './modele/modele';
import { charger, exporterJson, sauvegarder } from './modele/stockage';
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
async function demarrer(donnees: Donnees = donneesVides(), route = '#/') {
  localStorage.clear();
  sauvegarder(localStorage, donnees);
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

    // La fiche a pris la place du formulaire : Retour revient à la liste.
    await retour();
    expect(titre()).toBe('Tribu');
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
    // Chloé est déjà sa fille : pas choisissable une seconde fois.
    expect(trouver('button.ligne-choix', 'Chloé').hasAttribute('disabled')).toBe(true);

    await toucher(trouver('label', 'Adoptif').querySelector('input')!);
    await toucher(trouver('button.ligne-choix', 'Denis'));
    await toucher(trouver('button', 'Ajouter cet enfant'));

    expect(enregistrees().filiations).toContainEqual(expect.objectContaining({ parent: ids.Anne, enfant: ids.Denis, type: 'adoptif' }));
    expect(location.hash).toBe(`#/personne/${ids.Anne}`);
    expect(trouver('section', 'ENFANTS').textContent).toContain('Denis Martin');
  });

  it('conjoint marié créé depuis l’écran d’ajout, de sexe opposé par défaut', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/conjoint/${ids.Denis}`);
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
    expect(trouver('section', 'CONJOINT').textContent).toContain('Fanny Roux');
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
    expect(location.hash).toBe(`#/personne/${ids.Denis}`);
    expect(trouver('section', 'PARENTS').textContent).toContain('Élise Durand');
  });
});

describe('import', () => {
  const fichier = () => {
    let d = donneesVides();
    d = creerPersonne(d, { prenom: 'Xavier', nom: 'Petit' }).donnees;
    d = creerPersonne(d, { prenom: 'Yvonne', nom: 'Petit' }).donnees;
    return exporterJson(d);
  };

  it('demande confirmation avant de remplacer, puis peut être annulé', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/reglages');

    // Refus : rien ne change.
    await choisirFichier('sauvegarde.json', fichier());
    expect(dialogue()!.textContent).toContain('contient 2 personnes');
    expect(dialogue()!.textContent).toContain('Vos 4 personnes actuelles seront perdues');
    await toucher(trouver('dialog.confirmation button', 'Annuler'));
    expect(enregistrees()).toEqual(donnees);

    // Confirmation : remplacé, avec bandeau « Annuler ».
    await choisirFichier('sauvegarde.json', fichier());
    await toucher(trouver('dialog.confirmation button', 'Remplacer'));
    expect(enregistrees().personnes.map((p) => p.prenom)).toEqual(['Xavier', 'Yvonne']);
    expect(bandeau()!.textContent).toContain('2 personnes importées.');

    await toucher(trouver('.bandeau button', 'Annuler'));
    expect(enregistrees()).toEqual(donnees);
    expect(bandeau()!.textContent).toContain('Import annulé.');
  });

  it('un fichier illisible est refusé sans toucher aux données', async () => {
    const { donnees } = famille();
    await demarrer(donnees, '#/reglages');

    await choisirFichier('photo.json', 'pas du JSON');
    expect(dialogue()).toBeNull();
    expect(trouver('.erreur', 'Vos données n’ont pas été modifiées').hidden).toBe(false);
    expect(enregistrees()).toEqual(donnees);
  });

  it('sur la liste vide, restaure sans confirmation et affiche la liste', async () => {
    await demarrer();
    await choisirFichier('sauvegarde.json', fichier());

    expect(dialogue()).toBeNull();
    expect(enregistrees().personnes).toHaveLength(2);
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(2);
  });
});

describe('suppression d’une personne', () => {
  it('confirme en signalant les liens, puis les supprime avec la personne', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Anne}`);

    await toucher(trouver('button', 'Supprimer cette personne'));
    expect(dialogue()!.textContent).toContain('Supprimer Anne Martin ? Ses liens familiaux seront aussi supprimés.');
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
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(3);
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
  it('liste → Anne → Chloé : Retour revient sur Anne, puis sur la liste à la même position', async () => {
    const { donnees } = famille();
    await demarrer(donnees);
    window.scrollTo(0, 300);
    await toucher(trouver('a.ligne', 'Anne'));
    expect(window.scrollY).toBe(0);
    await toucher(trouver('a.ligne-lien', 'Chloé'));
    expect(titre()).toBe('Chloé Martin');
    const entrees = history.length;

    await retour();
    expect(titre()).toBe('Anne Martin');
    await retour();
    expect(titre()).toBe('Tribu');
    expect(window.scrollY).toBe(300);
    // Retour recule dans l'historique au lieu d'y empiler la liste.
    expect(history.length).toBe(entrees);
  });

  it('deux touchers rapides sur Retour ne reculent que d’un écran', async () => {
    const { donnees } = famille();
    await demarrer(donnees);
    await toucher(trouver('a.ligne', 'Anne'));
    await toucher(trouver('a.ligne-lien', 'Chloé'));

    const bouton = ecran().querySelector<HTMLElement>('.barre a[aria-label="Retour"]')!;
    bouton.click();
    bouton.click();
    await pause();
    expect(titre()).toBe('Anne Martin');
  });

  it('appli ouverte sur une fiche : Retour ouvre la liste à sa place', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees, `#/personne/${ids.Anne}`);
    const entrees = history.length;

    await retour();
    expect(location.hash).toBe('#/');
    expect(titre()).toBe('Tribu');
    expect(history.length).toBe(entrees);
  });

  it('une modification enregistrée revient sur la fiche ; Retour mène ensuite à la liste', async () => {
    const { donnees, ids } = famille();
    await demarrer(donnees);
    await toucher(trouver('a.ligne', 'Anne'));
    await toucher(trouver('a', 'Modifier'));
    saisir('nom', 'Leroy');
    await toucher(trouver('button', 'Enregistrer'));

    expect(location.hash).toBe(`#/personne/${ids.Anne}`);
    expect(titre()).toBe('Anne Leroy');
    await retour();
    expect(titre()).toBe('Tribu');
  });
});

describe('route vers une personne supprimée', () => {
  it.each(['personne', 'modifier', 'parent', 'union'])('#/%s/<inconnu> ramène à la liste', async (section) => {
    const { donnees } = famille();
    await demarrer(donnees, `#/${section}/inconnu`);

    expect(location.hash).toBe('#/');
    expect(titre()).toBe('Tribu');
    expect(ecran().querySelectorAll('a.ligne')).toHaveLength(4);
  });
});
