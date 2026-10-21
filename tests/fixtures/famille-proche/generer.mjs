// Fixtures du dessin « Famille proche » : familles 100 % fictives, au format d'export (version 5).
// node tests/fixtures/famille-proche/generer.mjs  → réécrit les *.json et cas.json de ce dossier,
// puis npx prettier --write "tests/fixtures/famille-proche/*.json".
// Dans chaque fixture, la personne centrale a l'id « centre » ; « moi » est dans cas.json.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));

/** Petit constructeur : personnes, unions et filiations d'une famille. */
function famille() {
  const d = { version: 5, personnes: [], unions: [], filiations: [], groupes: [] };
  const api = {
    /** `p('mere', 'Nadia Roux F 1962', { deces: '2015' })` : prénom, nom, sexe (F, M ou -), naissance (ou -). */
    p(id, desc, extra = {}) {
      const [prenom, nom, sexe, naissance] = desc.split(' ');
      d.personnes.push({
        id,
        prenom,
        nom: nom === '-' ? '' : nom,
        ...(sexe && sexe !== '-' ? { sexe } : {}),
        ...(naissance && naissance !== '-' ? { naissance } : {}),
        note: '',
        ...extra,
      });
      return api;
    },
    /** Parent « ? » (sans nom), affiché. */
    sansNom(id) {
      d.personnes.push({ id, prenom: 'Parent inconnu', nom: '', note: '', sansNom: true });
      return api;
    },
    /** Parent inconnu, jamais affiché. */
    inconnu(id) {
      d.personnes.push({ id, prenom: '', nom: '', note: '', inconnu: true });
      return api;
    },
    union(a, b, statut = 'actuelle', marie = true, date) {
      d.unions.push({ id: `u-${a}-${b}`, personneA: a, personneB: b, marie, statut, ...(date ? { date } : {}) });
      return api;
    },
    /** `enfants(['mere', 'pere'], 'a', 'b')` ; `type` adoptif avec `enfantsAdoptes`. */
    enfants(parents, ...ids) {
      for (const e of ids) for (const par of parents) d.filiations.push({ id: `f-${par}-${e}`, parent: par, enfant: e, type: 'biologique' });
      return api;
    },
    enfantsAdoptes(parents, ...ids) {
      for (const e of ids) for (const par of parents) d.filiations.push({ id: `a-${par}-${e}`, parent: par, enfant: e, type: 'adoptif' });
      return api;
    },
    d,
  };
  return api;
}

/** Couple de parents marié, toujours ensemble. */
const parents = (f, pere = 'Marc Durand M 1958', mere = 'Sylvie Durand F 1960') =>
  f.p('pere', pere).p('mere', mere).union('pere', 'mere', 'actuelle', true, '1984-06-02');

const cas = [];
// Le défilement admis se déduit de la famille (src/ui/familleProche.test.ts), plus d'un drapeau par cas.
function ajouter(fichier, titre, f, { moi = 'centre' } = {}) {
  writeFileSync(join(ici, fichier), JSON.stringify(f.d, null, 2) + '\n');
  cas.push({ fichier, titre, centre: 'centre', moi });
}

// 1. Cas simple.
ajouter(
  '01-simple.json',
  'Deux parents en couple, deux frères et sœurs, pas de conjoint',
  parents(famille())
    .p('lea', 'Léa Durand F 1985')
    .p('centre', 'Hugo Durand M 1988')
    .p('tom', 'Tom Durand M 1992')
    .enfants(['pere', 'mere'], 'lea', 'centre', 'tom'),
);

// 2. Un seul parent connu ; variante avec un parent « ? ».
ajouter(
  '02a-un-seul-parent.json',
  'Enfant unique, un seul parent connu',
  famille().p('mere', 'Claire Bonnet F 1970').p('centre', 'Inès Bonnet F 2000').enfants(['mere'], 'centre'),
);
ajouter(
  '02b-parent-sans-nom.json',
  'Enfant unique, un parent connu et un parent « ? »',
  famille().p('mere', 'Claire Bonnet F 1970').sansNom('pere').p('centre', 'Inès Bonnet F 2000').enfants(['mere', 'pere'], 'centre'),
);

// 3. Parents inconnus : jamais affichés.
ajouter(
  '03-parents-inconnus.json',
  'Fratrie reliée par des parents inconnus',
  famille()
    .inconnu('i1')
    .inconnu('i2')
    .p('ana', 'Ana Lefort F 1990')
    .p('centre', 'Yanis Lefort M 1993')
    .p('noe', 'Noé Lefort M 1997')
    .enfants(['i1', 'i2'], 'ana', 'centre', 'noe'),
);

// 4. Famille nombreuse : 8 frères et sœurs, dates partielles ou absentes, jumeaux.
ajouter(
  '04-famille-nombreuse.json',
  'Huit frères et sœurs complets, dates partielles ou absentes, jumeaux',
  parents(famille(), 'Bernard Morel M 1948', 'Odile Morel F 1950')
    .p('f1', 'Agnès Morel F 1972')
    .p('f2', 'Benoît Morel M 1973-09')
    .p('f3', 'Cécile Morel F 1975-02-11')
    .p('f4', 'Damien Morel M 1977-06-14')
    .p('f5', 'Denis Morel M 1977-06-14')
    .p('centre', 'Émilie Morel F 1980')
    .p('f6', 'Florian Morel M --05-12')
    .p('f7', 'Gaëlle Morel F -')
    .p('f8', 'Henri Morel M 1986')
    .enfants(['pere', 'mere'], 'f1', 'f2', 'f3', 'f4', 'f5', 'centre', 'f6', 'f7', 'f8'),
);

// 5. Recomposée d'un seul côté : la mère a eu trois enfants avec un ex.
ajouter(
  '05-recomposee-un-cote.json',
  'La mère a eu trois enfants avec un ex, puis deux avec le père',
  famille()
    .p('ex', 'Bruno Garnier M 1955')
    .p('mere', 'Nadia Roux F 1960')
    .p('pere', 'Olivier Roux M 1958')
    .union('ex', 'mere', 'separee', true, '1979')
    .union('pere', 'mere', 'actuelle', true, '1990')
    .p('d1', 'Kevin Garnier M 1980')
    .p('d2', 'Laura Garnier F 1982')
    .p('d3', 'Enzo Garnier M 1985')
    .p('centre', 'Manon Roux F 1992')
    .p('f1', 'Lucas Roux M 1995')
    .enfants(['ex', 'mere'], 'd1', 'd2', 'd3')
    .enfants(['pere', 'mere'], 'centre', 'f1'),
);

// 6. Recomposée des deux côtés.
ajouter(
  '06-recomposee-deux-cotes.json',
  'La mère a deux ex avec enfants ; le père un ex avec enfants et une nouvelle conjointe avec un enfant',
  famille()
    .p('exm1', 'Alain Vidal M 1950')
    .p('exm2', 'Denis Masson M 1952')
    .p('mere', 'Martine Leroy F 1955')
    .p('pere', 'Patrick Leroy M 1954')
    .p('exp', 'Fabienne Caron F 1956')
    .p('conjp', 'Hélène Faure F 1965')
    .union('exm1', 'mere', 'separee', true, '1974')
    .union('exm2', 'mere', 'separee', false)
    .union('exp', 'pere', 'separee', true, '1976')
    .union('pere', 'mere', 'separee', true, '1985')
    .union('pere', 'conjp', 'actuelle', false)
    .p('a1', 'Sandra Vidal F 1975')
    .p('a2', 'Yohan Vidal M 1977')
    .p('b1', 'Céline Masson F 1980')
    .p('b2', 'Romain Masson M 1982')
    .p('c1', 'Karine Leroy F 1977')
    .p('c2', 'Mickaël Leroy M 1979')
    .p('centre', 'Anaïs Leroy F 1987')
    .p('f1', 'Bastien Leroy M 1989')
    .p('e1', 'Jade Leroy F 2000')
    .enfants(['exm1', 'mere'], 'a1', 'a2')
    .enfants(['exm2', 'mere'], 'b1', 'b2')
    .enfants(['exp', 'pere'], 'c1', 'c2')
    .enfants(['pere', 'mere'], 'centre', 'f1')
    .enfants(['pere', 'conjp'], 'e1'),
);

// 7. Parents sans union enregistrée.
ajouter(
  '07-parents-sans-union.json',
  'Les parents ont un enfant en commun sans union enregistrée',
  famille()
    .p('pere', 'Thierry Blanc M 1970')
    .p('mere', 'Aurélie Petit F 1972')
    .p('centre', 'Nathan Blanc M 1998')
    .p('f1', 'Chloé Blanc F 2001')
    .enfants(['pere', 'mere'], 'centre', 'f1'),
);

// 8. Demis dont l'autre parent est « ? » ou inconnu.
ajouter(
  '08-demis-sans-nom-inconnu.json',
  "Un demi-frère dont l'autre parent est « ? », une demi-sœur dont l'autre parent est inconnu",
  parents(famille(), 'Gilles Fabre M 1960', 'Karima Fabre F 1963')
    .sansNom('sn')
    .inconnu('inc')
    .p('d1', 'Jordan Fabre M 1982')
    .p('d2', 'Océane Fabre F 1984')
    .p('centre', 'Mehdi Fabre M 1990')
    .enfants(['pere', 'sn'], 'd1')
    .enfants(['pere', 'inc'], 'd2')
    .enfants(['pere', 'mere'], 'centre'),
);

// 9. L'ex d'un parent a eu des enfants avec une tierce personne : pas des demis.
ajouter(
  '09-ex-d-un-parent.json',
  "Les ex de la mère ont eu d'autres enfants avec une tierce personne (pas des demis)",
  parents(famille(), 'Franck Henry M 1962', 'Isabelle Henry F 1964')
    .p('ex1', 'Gérard Lambert M 1958')
    .p('tierce1', 'Monique Lambert F 1960')
    .p('ex2', 'Rémi Barbier M 1961')
    .p('tierce2', 'Josiane Barbier F 1963')
    .union('ex1', 'mere', 'separee', false)
    .union('ex1', 'tierce1', 'actuelle', true)
    .union('ex2', 'mere', 'separee', false)
    .union('ex2', 'tierce2', 'actuelle', true)
    .p('d1', 'Arnaud Lambert M 1983')
    .p('x1', 'Delphine Lambert F 1988')
    .p('x2', 'Fabien Lambert M 1990')
    .p('y1', 'Maëva Barbier F 1992')
    .p('centre', 'Clara Henry F 1993')
    .enfants(['ex1', 'mere'], 'd1')
    .enfants(['ex1', 'tierce1'], 'x1', 'x2')
    .enfants(['ex2', 'tierce2'], 'y1')
    .enfants(['pere', 'mere'], 'centre'),
);

// 10. La personne centrale : conjoint actuel, ex, enfants avec chacun, et un enfant sans union.
ajouter(
  '10-conjoint-ex-enfants.json',
  'Conjoint actuel, un ex, des enfants avec chacun, et un enfant avec une personne sans union',
  parents(famille(), 'Michel Robin M 1950', 'Annie Robin F 1952')
    .p('s1', 'Élodie Robin F 1978')
    .p('centre', 'Julien Robin M 1980')
    .p('ex', 'Sophie Marchand F 1981')
    .p('conj', 'Camille Robin F 1984')
    .p('aut', 'Aurélie Dupuis F 1983')
    .union('centre', 'ex', 'separee', true, '2005')
    .union('centre', 'conj', 'actuelle', true, '2015')
    .p('k1', 'Lucie Robin F 2006')
    .p('k2', 'Théo Robin M 2008')
    .p('k3', 'Mathis Robin M 2011')
    .p('k4', 'Louise Robin F 2016')
    .p('k5', 'Gabin Robin M 2019')
    .enfants(['pere', 'mere'], 's1', 'centre')
    .enfants(['centre', 'ex'], 'k1', 'k2')
    .enfants(['centre', 'aut'], 'k3')
    .enfants(['centre', 'conj'], 'k4', 'k5'),
);

// 11. Six enfants avec le conjoint actuel.
ajouter(
  '11-six-enfants.json',
  'Six enfants avec le conjoint actuel',
  parents(famille(), 'Jacques Perrot M 1945', 'Monique Perrot F 1948')
    .p('centre', 'Nicolas Perrot M 1972')
    .p('conj', 'Virginie Perrot F 1974')
    .union('centre', 'conj', 'actuelle', true, '1996')
    .p('k1', 'Adrien Perrot M 1997')
    .p('k2', 'Bérénice Perrot F 1999')
    .p('k3', 'Corentin Perrot M 2001')
    .p('k4', 'Diane Perrot F 2003')
    .p('k5', 'Éloi Perrot M 2006')
    .p('k6', 'Flore Perrot F 2010')
    .enfants(['pere', 'mere'], 'centre')
    .enfants(['centre', 'conj'], 'k1', 'k2', 'k3', 'k4', 'k5', 'k6'),
);

// 12. Décès : parent décédé, frère mort enfant, veuvage puis remariage.
// Une seule union actuelle par personne : l'union avec le conjoint décédé est forcément « séparée ».
ajouter(
  '12-deces.json',
  'Père décédé, frère mort enfant, conjoint décédé puis remariage',
  famille()
    .p('pere', 'Roger Martin M 1940', { deces: '2015-03-02' })
    .p('mere', 'Simone Martin F 1943')
    .union('pere', 'mere', 'actuelle', true, '1964')
    .p('f1', 'Alain Martin M 1965', { deces: '1972' })
    .p('centre', 'Brigitte Martin F 1967')
    .p('f2', 'Pascal Martin M 1970')
    .p('defunt', 'Christian Lopez M 1962', { deces: '2005' })
    .p('conj', 'Henri Dubois M 1960')
    .union('centre', 'defunt', 'separee', true, '1988')
    .union('centre', 'conj', 'actuelle', true, '2010')
    .p('k1', 'Laetitia Lopez F 1990')
    .p('k2', 'Sébastien Lopez M 1993', { decede: true })
    .enfants(['pere', 'mere'], 'f1', 'centre', 'f2')
    .enfants(['centre', 'defunt'], 'k1', 'k2'),
);

// 13. Adoption : 2 parents biologiques + 2 adoptifs ; fratrie mêlant enfants biologiques et adoptés.
ajouter(
  '13-adoption.json',
  'Deux parents biologiques et deux adoptifs ; fratrie adoptive mêlant enfants biologiques et adoptés',
  famille()
    .p('bio1', 'Lina Haddad F 1975')
    .p('bio2', 'Samir Haddad M 1973')
    .union('bio1', 'bio2', 'separee', false)
    .p('ad1', 'Philippe Moreau M 1965')
    .p('ad2', 'Catherine Moreau F 1967')
    .union('ad1', 'ad2', 'actuelle', true, '1990')
    .p('s1', 'Victor Moreau M 1992')
    .p('centre', 'Yasmine Moreau F 1996')
    .p('s2', 'Kim Moreau F 1998')
    .p('s3', 'Rayan Haddad M 2001')
    .enfants(['ad1', 'ad2'], 's1')
    .enfants(['bio1', 'bio2'], 'centre', 's3')
    .enfantsAdoptes(['ad1', 'ad2'], 'centre', 's2'),
);

// 14. Couple de même sexe, sexes non renseignés.
ajouter(
  '14-meme-sexe.json',
  'Deux mères ; conjoint et enfants sans sexe renseigné',
  famille()
    .p('mere', 'Sarah Klein F 1975')
    .p('mere2', 'Julie Klein F 1977')
    .union('mere', 'mere2', 'actuelle', true, '2005')
    .p('f1', 'Sacha Klein - 2008')
    .p('centre', 'Alex Klein - 2006')
    .p('conj', 'Charlie Weber - 2005')
    .union('centre', 'conj', 'actuelle', false)
    .p('k1', 'Lou Klein - 2025')
    .enfants(['mere', 'mere2'], 'centre', 'f1')
    .enfants(['centre', 'conj'], 'k1'),
);

// 15. Prénoms et noms très longs partout.
ajouter(
  '15-noms-longs.json',
  'Prénoms composés et noms très longs sur tous les nœuds',
  famille()
    .p('pere', 'Jean-Christophe de-La-Rochefoucauld-Montbel M 1955')
    .p('mere', 'Marie-Bernadette Saint-Exupéry-Delacroix F 1957')
    .union('pere', 'mere', 'actuelle', true, '1980')
    .p('ex', 'Pierre-Alexandre Vandenberghe-Lefebvre M 1950')
    .union('ex', 'mere', 'separee', true, '1975')
    .p('d1', 'Anne-Charlotte Vandenberghe-Lefebvre F 1976')
    .p('s1', 'Marie-Loan de-La-Rochefoucauld-Montbel F 1982')
    .p('centre', 'Charles-Edouard de-La-Rochefoucauld-Montbel M 1985')
    .p('conj', 'Maximilienne Grandjean-Bonaventure F 1986')
    .union('centre', 'conj', 'actuelle', true, '2012')
    .p('k1', 'Pierre-Emmanuel de-La-Rochefoucauld-Montbel M 2014')
    .p('k2', 'Marie-Antoinette de-La-Rochefoucauld-Montbel F 2017')
    .enfants(['ex', 'mere'], 'd1')
    .enfants(['pere', 'mere'], 's1', 'centre')
    .enfants(['centre', 'conj'], 'k1', 'k2'),
);

// 16. Fiche d'une autre personne que « Moi » : « Moi » est sa sœur.
ajouter(
  '16-autre-que-moi.json',
  'Fiche du frère de « Moi » : pas de badge « Toi » sur la personne centrale (mais sur sa sœur)',
  parents(famille(), 'Daniel Girard M 1955', 'Françoise Girard F 1957')
    .p('moi', 'Margaux Girard F 1984')
    .p('centre', 'Quentin Girard M 1981')
    .p('conj', 'Pauline Girard F 1983')
    .union('centre', 'conj', 'actuelle', true, '2010')
    .p('k1', 'Rose Girard F 2012')
    .p('k2', 'Jules Girard M 2015')
    .enfants(['pere', 'mere'], 'centre', 'moi')
    .enfants(['centre', 'conj'], 'k1', 'k2'),
  { moi: 'moi' },
);

// 17. Cas extrême : 4 parents, 12 frères, sœurs et demis sur 4 couples, conjoint, ex, 7 enfants.
ajouter(
  '17-extreme.json',
  'Quatre parents, douze frères, sœurs et demis sur quatre couples, conjoint, ex, sept enfants',
  famille()
    .p('bio1', 'Valérie Noël F 1960')
    .p('bio2', 'Stéphane Noël M 1958')
    .union('bio1', 'bio2', 'separee', true, '1980')
    .p('ad1', 'Laurent Brun M 1955')
    .p('ad2', 'Évelyne Brun F 1957')
    .union('ad1', 'ad2', 'actuelle', true, '1978')
    .p('exb1', 'Didier Roche M 1956')
    .union('bio1', 'exb1', 'separee', false)
    .p('conjb2', 'Nathalie Noël F 1966')
    .union('bio2', 'conjb2', 'actuelle', true, '1992')
    .p('s1', 'Amandine Noël F 1981')
    .p('s2', 'Benjamin Noël M 1983')
    .p('centre', 'Coralie Noël F 1985')
    .p('r1', 'Damien Roche M 1978')
    .p('r2', 'Estelle Roche F 1979')
    .p('r3', 'Félix Roche M 1988')
    .p('n1', 'Gaspard Noël M 1993')
    .p('n2', 'Héloïse Noël F 1995')
    .p('n3', 'Ilan Noël M 1998')
    .p('b1', 'Jérémie Brun M 1979')
    .p('b2', 'Karen Brun F 1982')
    .p('b3', 'Loïc Brun M 1987')
    .p('b4', 'Maud Brun F 1990')
    .enfants(['bio1', 'bio2'], 's1', 's2', 'centre')
    .enfants(['bio1', 'exb1'], 'r1', 'r2', 'r3')
    .enfants(['bio2', 'conjb2'], 'n1', 'n2', 'n3')
    .enfants(['ad1', 'ad2'], 'b1', 'b2', 'b3', 'b4')
    .enfantsAdoptes(['ad1', 'ad2'], 'centre')
    .p('ex', 'Olivier Mercier M 1982')
    .p('conj', 'Rachid Benali M 1984')
    .union('centre', 'ex', 'separee', true, '2005')
    .union('centre', 'conj', 'actuelle', true, '2014')
    .p('k1', 'Anna Mercier F 2006')
    .p('k2', 'Bilal Mercier M 2008')
    .p('k3', 'Célia Mercier F 2010')
    .p('k4', 'Dalia Benali F 2015')
    .p('k5', 'Elias Benali M 2017')
    .p('k6', 'Farah Benali F 2019')
    .p('k7', 'Gabriel Benali M 2022')
    .enfants(['centre', 'ex'], 'k1', 'k2', 'k3')
    .enfants(['centre', 'conj'], 'k4', 'k5', 'k6', 'k7'),
);

// --- Cas repérés pendant l'audit ---

// 18. Un parent a un conjoint actuel sans enfant avec lui (faut-il le dessiner ?).
ajouter(
  '18-conjoint-de-parent.json',
  'Parents séparés ; chacun a un nouveau conjoint, sans enfant avec lui',
  famille()
    .p('pere', 'Serge Aubert M 1962')
    .p('mere', 'Valérie Aubert F 1964')
    .union('pere', 'mere', 'separee', true, '1988')
    .p('cp', 'Corinne Lemaire F 1966')
    .p('cm', 'Yves Charpentier M 1960')
    .union('pere', 'cp', 'actuelle', false)
    .union('mere', 'cm', 'actuelle', true, '2001')
    .p('centre', 'Léna Aubert F 1990')
    .p('f1', 'Maxime Aubert M 1993')
    .enfants(['pere', 'mere'], 'centre', 'f1'),
);

// 19. Un frère adopté par les mêmes parents qui a aussi ses parents biologiques enregistrés :
// pour `fratrie()`, il devient un « demi » (tous types de filiation confondus).
ajouter(
  '19-frere-adopte-avec-bio.json',
  'Frère adopté par les mêmes parents, avec ses parents biologiques enregistrés',
  parents(famille(), 'Hervé Collin M 1960', 'Agathe Collin F 1962')
    .p('b1', 'Ngozi Okafor F 1975')
    .p('b2', 'Emeka Okafor M 1973')
    .p('centre', 'Ambre Collin F 1990')
    .p('ad', 'Tobi Collin M 1994')
    .enfants(['pere', 'mere'], 'centre')
    .enfants(['b1', 'b2'], 'ad')
    .enfantsAdoptes(['pere', 'mere'], 'ad'),
);

// 20. Demi par un parent adoptif seulement (le parent n'est pas parmi les deux premiers parents).
ajouter(
  '20-demi-par-parent-adoptif.json',
  'Deux parents biologiques ; une mère adoptive qui a un autre enfant avec son conjoint',
  famille()
    .p('pere', 'Pierre Simon M 1965')
    .p('mere', 'Lucie Simon F 1967')
    .union('pere', 'mere', 'separee', false)
    .p('ad', 'Hélène Carré F 1960')
    .p('cad', 'Marc Carré M 1958')
    .union('ad', 'cad', 'actuelle', true, '1985')
    .p('centre', 'Tristan Simon M 1992')
    .p('dx', 'Juliette Carré F 1988')
    .enfants(['pere', 'mere'], 'centre')
    .enfants(['ad', 'cad'], 'dx')
    .enfantsAdoptes(['ad'], 'centre'),
);

// 21. Enfants avec deux ex différents, sans conjoint actuel ; parent « ? » d'un autre enfant.
ajouter(
  '21-deux-ex-sans-conjoint.json',
  'Sans conjoint actuel : enfants avec deux ex et avec un parent « ? »',
  parents(famille(), 'Alain Giraud M 1950', 'Mireille Giraud F 1953')
    .p('centre', 'Sylvain Giraud M 1975')
    .p('ex1', 'Nadège Poirier F 1976')
    .p('ex2', 'Sonia Leclerc F 1980')
    .sansNom('sn')
    .union('centre', 'ex1', 'separee', true, '1998')
    .union('centre', 'ex2', 'separee', false)
    .p('k1', 'Hugo Giraud M 1999')
    .p('k2', 'Zoé Giraud F 2006')
    .p('k3', 'Malo Giraud M 2012')
    .enfants(['pere', 'mere'], 'centre')
    .enfants(['centre', 'ex1'], 'k1')
    .enfants(['centre', 'ex2'], 'k2')
    .enfants(['centre', 'sn'], 'k3'),
);

writeFileSync(join(ici, 'cas.json'), JSON.stringify(cas, null, 2) + '\n');
console.log(`${cas.length} fixtures écrites dans ${ici}`);
