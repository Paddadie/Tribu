/*
 * Familles fictives propres aux maquettes : elles ajoutent les cas absents des familles de référence
 * (src/modele/test/familles.ts) : implexe (cousins mariés), double intermariage (deux frères et deux sœurs),
 * remariage avec enfants des deux unions, ex sans enfant, adoption, parent inconnu, branches très inégales,
 * 7 générations. Toutes les personnes sont inventées.
 */
(function (racine) {
  'use strict';
  function constructeur(fichier) {
    const personnes = [],
      unions = [],
      filiations = [];
    const id = (k) => fichier + '-' + k;
    const api = {
      p(k, prenom, nom, sexe, an, o = {}) {
        personnes.push({ id: id(k), prenom, nom, note: '', sexe, naissance: an ? an + '-03-12' : undefined, ...o });
        return api;
      },
      u(a, b, o = {}) {
        unions.push({ id: id('u-' + a + '-' + b), personneA: id(a), personneB: id(b), marie: o.marie ?? true, statut: o.statut || 'actuelle' });
        return api;
      },
      e(parents, enfants, type = 'biologique') {
        for (const c of [].concat(enfants)) for (const p of parents) filiations.push({ parent: id(p), enfant: id(c), type });
        return api;
      },
      fin(nom, moi) {
        return { nom, fichier, moi: id(moi), donnees: { version: 4, personnes, unions, filiations, groupes: [] } };
      },
    };
    return api;
  }

  /** Implexe, double intermariage, remariages, ex, adoption, parent inconnu ; 7 générations. */
  function implexe() {
    const f = constructeur('implexe');
    // Génération −4 : un couple dont deux petits-enfants cousins germains s'épouseront.
    f.p('a1', 'Hervé', 'Morvan', 'M', 1850).p('a2', 'Soizic', 'Morvan', 'F', 1852, { nomNaissance: 'Le Goff' }).u('a1', 'a2').e(['a1', 'a2'], ['b1', 'b2']);
    f.p('b1', 'Corentin', 'Morvan', 'M', 1875).p('c1', 'Gaïd', 'Morvan', 'F', 1877, { nomNaissance: 'Lacombe' }).u('b1', 'c1').e(['b1', 'c1'], ['d1', 'd2']);
    f.p('b2', 'Anne-Lise', 'Riou', 'F', 1878, { nomNaissance: 'Morvan' }).p('c2', 'Pierrick', 'Riou', 'M', 1874).u('c2', 'b2').e(['c2', 'b2'], ['d3', 'd4']);
    // Génération −2 : cousins germains mariés (implexe).
    f.p('d1', 'Yann', 'Morvan', 'M', 1900).p('d2', 'Nolwenn', 'Morvan', 'F', 1903).p('d3', 'Rozenn', 'Morvan', 'F', 1902, { nomNaissance: 'Riou' }).p('d4', 'Loïc', 'Riou', 'M', 1905);
    f.u('d1', 'd3').e(['d1', 'd3'], ['e1', 'e2']);
    f.p('d5', 'Malo', 'Kerdren', 'M', 1899).u('d5', 'd2').e(['d5', 'd2'], ['e6']).p('e6', 'Gwenola', 'Kerdren', 'F', 1926);
    // Génération −1 : un remariage (ex avec un enfant, puis union actuelle avec trois enfants dont un adopté).
    f.p('e1', 'Alain', 'Morvan', 'M', 1928).p('e2', 'Maïwenn', 'Morvan', 'F', 1931);
    f.p('x1', 'Odile', 'Morvan', 'F', 1929, { nomNaissance: 'Pellen' }).u('e1', 'x1', { statut: 'separee' }).e(['e1', 'x1'], ['f0']);
    f.p('g1', 'Armel', 'Kerguen', 'M', 1900).p('g2', 'Tifenn', 'Kerguen', 'F', 1903).u('g1', 'g2').e(['g1', 'g2'], ['e3', 'e4']);
    f.p('e3', 'Katell', 'Morvan', 'F', 1932, { nomNaissance: 'Kerguen' }).p('e4', 'Goulven', 'Kerguen', 'M', 1934);
    f.p('e5', 'Morgane', 'Kerguen', 'F', 1936, { nomNaissance: 'Le Bihan' }).u('e4', 'e5').e(['e4', 'e5'], ['k1', 'k2']);
    f.p('k1', 'Tanguy', 'Kerguen', 'M', 1960).p('k2', 'Enora', 'Kerguen', 'F', 1963);
    f.u('e1', 'e3').e(['e1', 'e3'], ['f1', 'f2']).e(['e1', 'e3'], ['f3'], 'adoptif');
    // Génération 0 des parents : deux demi-frères épousent deux sœurs (double intermariage).
    f.p('f0', 'Erwan', 'Morvan', 'M', 1951).p('f1', 'Gildas', 'Morvan', 'M', 1955).p('f2', 'Solenn', 'Garnier', 'F', 1957, { nomNaissance: 'Morvan' }).p('f3', 'Mathurin', 'Morvan', 'M', 1960);
    f.p('l0', 'Jean-Yves', 'Garnier', 'M', 1925).p('l9', 'Annaïg', 'Garnier', 'F', 1927).u('l0', 'l9').e(['l0', 'l9'], ['l1', 'l2']);
    f.p('l1', 'Brieuc', 'Garnier', 'M', 1954).p('l2', 'Klervi', 'Morvan', 'F', 1953, { nomNaissance: 'Garnier' });
    f.u('l1', 'f2').e(['l1', 'f2'], ['m1', 'm2']).u('f0', 'l2').e(['f0', 'l2'], ['m3']);
    f.p('m1', 'Ewen', 'Garnier', 'M', 1982).p('m2', 'Lena', 'Garnier', 'F', 1985).p('m3', 'Titouan', 'Morvan', 'M', 1980);
    // Les parents de Moi : la mère n'a qu'un parent connu (parent inconnu) ; le père a une ex avec un enfant.
    f.p('j1', 'Marie-Jo', 'Ollivier', 'F', 1935).e(['j1'], ['h1', 'h2']);
    f.p('h1', 'Bleuenn', 'Morvan', 'F', 1958, { nomNaissance: 'Ollivier' }).p('h2', 'Riwal', 'Ollivier', 'M', 1961);
    f.p('h0', 'Sterenn', 'Pellen', 'F', 1956).u('f1', 'h0', { statut: 'separee' }).e(['f1', 'h0'], ['s0']);
    f.u('f1', 'h1').e(['f1', 'h1'], ['moi', 's1']);
    f.p('s0', 'Judicaël', 'Morvan', 'M', 1979).p('moi', 'Gurvan', 'Morvan', 'M', 1985).p('s1', 'Azilis', 'Morvan', 'F', 1988);
    // Moi, son conjoint, ses enfants et un petit-enfant.
    f.p('q1', 'Clervie', 'Morvan', 'F', 1986, { nomNaissance: 'Quéré' }).u('moi', 'q1').e(['moi', 'q1'], ['r1', 'r2']);
    f.p('r1', 'Paol', 'Morvan', 'M', 2010).p('r2', 'Lou', 'Morvan', 'F', 2013).p('r3', 'Nina', 'Morvan', 'F', 2034).p('r4', 'Owen', 'Tanguy', 'M', 2009);
    f.u('r1', 'r4', { marie: false }).e(['r1', 'r4'], ['r3']);
    return f.fin('Morvan (implexe)', 'moi');
  }

  /** Branches très inégales : côté paternel foisonnant sur 4 générations, côté maternel en fil unique sur 6. */
  function inegale() {
    const f = constructeur('inegale');
    const P = ['Basile', 'Léon', 'Félix', 'Gaston', 'Marius', 'Ernest', 'Octave', 'Jules', 'Firmin', 'Achille', 'Anatole', 'Célestin'];
    const Fm = ['Berthe', 'Léonie', 'Félicie', 'Augustine', 'Marthe', 'Ernestine', 'Odette', 'Julie', 'Rosalie', 'Adèle', 'Clémence', 'Célestine'];
    const NOMS = ['Vidal', 'Roussel', 'Brunet', 'Chauvin', 'Delorme', 'Ferrand', 'Gauthier', 'Hamel', 'Jacquet', 'Lemaire', 'Marchal', 'Noël', 'Perrin', 'Rigaud', 'Tessier', 'Vallet'];
    let n = 0;
    const nouveau = (nom, sexe, an) => {
      const k = 'p' + ++n;
      f.p(k, (sexe === 'M' ? P : Fm)[n % 12], nom, sexe, an);
      return k;
    };
    // Côté paternel : un couple, 6 enfants, chacun marié avec 2 ou 3 enfants, eux-mêmes avec 1 ou 2 enfants.
    const ap = nouveau('Vidal', 'M', 1880),
      am = nouveau('Vidal', 'F', 1882);
    f.u(ap, am);
    let pere = null;
    for (let i = 0; i < 6; i++) {
      const sexe = i % 2 ? 'F' : 'M';
      const c = nouveau('Vidal', sexe, 1905 + i * 2);
      f.e([ap, am], [c]);
      const conj = nouveau(NOMS[(i + 1) % 16], sexe === 'M' ? 'F' : 'M', 1905 + i * 2);
      f.u(sexe === 'M' ? c : conj, sexe === 'M' ? conj : c);
      const nomE = sexe === 'M' ? 'Vidal' : NOMS[(i + 1) % 16];
      for (let j = 0; j < 2 + (i % 2); j++) {
        const s = (i + j) % 2 ? 'F' : 'M';
        const e = nouveau(nomE, s, 1932 + j * 3);
        f.e([c, conj], [e]);
        if (i === 2 && j === 0) {
          pere = e;
          continue;
        }
        const ce = nouveau(NOMS[(i * 3 + j + 5) % 16], s === 'M' ? 'F' : 'M', 1933);
        f.u(s === 'M' ? e : ce, s === 'M' ? ce : e);
        for (let k = 0; k < 1 + ((i + j) % 2); k++) f.e([e, ce], [nouveau(s === 'M' ? nomE : NOMS[(i * 3 + j + 5) % 16], k % 2 ? 'F' : 'M', 1960 + k * 2)]);
      }
    }
    // Côté maternel : un seul enfant par génération, sur 6 générations au-dessus de la mère.
    let mere = nouveau('Lemaire', 'F', 1935);
    const bas = mere;
    for (let gen = 1; gen <= 5; gen++) {
      const pp = nouveau('Lemaire', 'M', 1935 - gen * 28),
        mm = nouveau(NOMS[(gen * 5) % 16], 'F', 1936 - gen * 28);
      f.u(pp, mm).e([pp, mm], [mere]);
      mere = pp;
    }
    f.u(pere, bas).e([pere, bas], ['moi']).p('moi', 'Aurèle', 'Vidal', 'M', 1962);
    return f.fin('Vidal (branches inégales)', 'moi');
  }

  const familles = () => [implexe(), inegale()];
  const api = { familles };
  if (typeof module !== 'undefined') module.exports = api;
  else racine.Familles = api;
})(this);
