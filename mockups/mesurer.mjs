// Mesures automatiques des maquettes et de l'arbre actuel de Tribu (voir mockups/README.md).
//   node mockups/mesurer.mjs <export.json> <id-de-Moi> [--json sortie.json]
//   node mockups/mesurer.mjs --fictives [--json sortie.json]   (familles de référence + familles de mockups/js/familles.js)
// Les maquettes sont mesurées avec les mêmes fichiers que la page (js/*.js) ; l'arbre actuel avec disposerArbre
// (src/modele/arbreGlobal.ts, chargé par Vite) et la géométrie de traitsArbre (src/ui/geometrieArbre.ts).
// N'affiche aucun nom : seulement des nombres.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ici = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const D = require('./js/disposition.js');
const Rd = require('./js/rendu.js');
const M = require('./js/mesures.js');
const F = require('./js/foyers.js');
const Fict = require('./js/familles.js');

const args = process.argv.slice(2);
const json = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

const vite = await createServer({ root: resolve(ici, '..'), configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { disposerArbre } = await vite.ssrLoadModule('/src/modele/arbreGlobal.ts');
  const geo = await vite.ssrLoadModule('/src/ui/geometrieArbre.ts');
  const { migrer } = await vite.ssrLoadModule('/src/modele/migration.ts');
  const jeux = [];
  if (args[0] === '--fictives') {
    const { famillesDeReference } = await vite.ssrLoadModule('/src/modele/test/familles.ts');
    for (const f of famillesDeReference()) jeux.push({ nom: f.fichier, donnees: f.donnees, moi: f.moi });
    for (const f of Fict.familles()) jeux.push({ nom: f.fichier, donnees: f.donnees, moi: f.moi });
  } else {
    const brut = JSON.parse(readFileSync(args[0], 'utf8'));
    jeux.push({ nom: 'export', donnees: migrer(brut.donnees || brut), moi: args[1] });
  }
  const resultats = {};
  for (const j of jeux) {
    resultats[j.nom] = {};
    const g = D.graphe(j.donnees, j.moi);
    for (const v of ['Actuel', 'A', 'A proches', 'B1', 'B2']) {
      const scene = v === 'Actuel' ? sceneActuelle(j.donnees, j.moi, g) : sceneMaquette(g, v);
      const m = M.tout(scene, g, j.moi, v !== 'Actuel');
      resultats[j.nom][v] = m;
    }
  }
  afficher(resultats);
  if (json) writeFileSync(json, JSON.stringify(resultats, null, 2) + '\n');

  /** Scène de l'arbre actuel : cartes et traits en pixels, comme les dessine l'appli (amis exclus). */
  function sceneActuelle(donnees, moi, g) {
    const disp = disposerArbre(donnees, moi);
    const P = geo.positions(disp);
    const { R, LARG, SOUS_NOM, PAS_X } = geo;
    const places = disp.places.filter((pl) => !pl.bulle);
    const ici = new Map(places.map((pl) => [((c) => c.x + ',' + c.y)(P.px(pl)), pl.personne.id]));
    const cartes = places.map((pl) => {
      const { x, y } = P.px(pl);
      const id = pl.personne.id;
      return pl.personne.inconnu ? { id, vrai: id, x, y, g: x - R + 3, d: x + R - 3, h: y - R + 3, b: y + R - 3 } : { id, vrai: id, x, y, g: x - LARG / 2, d: x + LARG / 2, h: y - R, b: y + R + 40 };
    });
    const liens = [];
    const groupe = (ids) => 'g:' + ids.slice().sort().join('+');
    // Couples : le trait exact de traitsArbre (droit sur une ligne, courbe entre deux lignes).
    const traits = geo.traitsArbre({ ...disp, branches: [], amities: [] }, P, undefined, moi);
    disp.couples.forEach((c, i) => {
      const courbe = /C/.test(traits[i].d);
      liens.push({ groupe: groupe([c.a, c.b]), type: 'couple', membres: [c.a, c.b], courbe, chemins: [chemin(traits[i].d)] });
    });
    // Fratries : même géométrie que traitsArbre (descente de chaque parent, trait commun, descente vers chaque enfant).
    for (const br of disp.branches) {
      const bus = P.px({ x: 0, y: br.bus }).y;
      const origines = br.origines.filter((o) => !o.inconnu).map((o) => ({ ...P.px(o), seul: o.parent !== undefined }));
      const parents = origines.map((o) => ici.get(o.x + ',' + o.y)).filter(Boolean);
      const enfants = br.enfants.map((e) => ({ ...P.px(e), id: e.id }));
      const ps = g.parents(br.enfants[0].id).filter((p) => !p.startsWith('?/'));
      const chemins = [];
      for (const o of origines)
        for (const e of enfants) {
          const y0 = o.seul ? o.y + SOUS_NOM : o.y;
          chemins.push(Math.abs(o.x - e.x) < 0.5 ? [[o.x, y0], [e.x, e.y - R - 3]] : [[o.x, y0], [o.x, bus], [e.x, bus], [e.x, e.y - R - 3]]);
        }
      liens.push({ groupe: groupe(ps), type: 'fratrie', membres: [...parents, ...ps, ...enfants.map((e) => e.id)], chemins });
    }
    return { cartes, liens, pas: PAS_X };
  }
  // « M x y H x », « M x y C x1 y1, x2 y2, x y » → points (courbe échantillonnée).
  function chemin(d) {
    const n = d.match(/-?[0-9.]+/g).map(Number);
    if (d.includes('H')) return [[n[0], n[1]], [n[2], n[1]]];
    const [x0, y0, x1, y1, x2, y2, x3, y3] = n;
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12,
        u = 1 - t;
      pts.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
    }
    return pts;
  }
  function sceneMaquette(g, v) {
    if (v === 'B2') return F.dessiner(g, F.disposer(g)).scene;
    const res = v === 'A' ? D.disposerA2(g) : v === 'A proches' ? D.disposerA2(g, { proches: true, plier: 4 }) : D.disposerB(g);
    const pos = res.bloc.n;
    const tr = D.traits(g, pos);
    return Rd.dessiner(g, pos, tr, { renvois: res.renvois, fantomes: res.fantomes }).scene;
  }
  function afficher(r) {
    const lignes = M.LIGNES;
    for (const [nom, vs] of Object.entries(r)) {
      console.log(`\n### ${nom}\n\n| Mesure | ${Object.keys(vs).join(' | ')} |\n|---|${Object.keys(vs).map(() => '---:').join('|')}|`);
      for (const [l, f] of lignes) console.log(`| ${l} | ${Object.values(vs).map(f).join(' | ')} |`);
    }
  }
} finally {
  await vite.close();
}
