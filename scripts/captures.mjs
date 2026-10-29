// Captures d'écran de Tribu (TEST-06), sans rien écrire dans le projet.
// npm run captures -- <export.json> <dossier-sortie> [id-de-Moi]
// Lance le serveur de dev (port 5199) et Edge headless, remplit le localStorage
// par CDP, puis capture chaque écran en 390×844, DPR 2, clair et sombre.
// L'export et le dossier de sortie restent hors du dépôt (données réelles).
//
// npm run captures -- --famille-proche <dossier-sortie> [préfixe-de-cas…]
// Fixtures fictives de tests/fixtures/famille-proche : la carte « Famille proche » de la personne
// centrale, en 320, 360 et 390 de large, clair et sombre, et la géométrie mesurée (mesures.json).
//
// npm run captures -- --maquettes <dossier-html> <dossier-sortie>
// Chaque page HTML du dossier (maquettes statiques), en 360 de large, clair et sombre.
//
// npm run captures -- --familles <dossier-familles> <dossier-sortie> [préfixe-de-fichier…]
// Familles fictives écrites par `npm run familles` : écrans clés de chaque famille (Moi de la famille) en
// téléphone, tablette et ordinateur, clair et sombre. Données fictives : la sortie peut aller dans captures/.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const MODES = { '--famille-proche': 'famille-proche', '--maquettes': 'maquettes', '--familles': 'familles' };
const mode = MODES[args[0]] ?? 'ecrans';
const [exportPath, sortie, moiArg] = mode === 'ecrans' ? args : mode === 'famille-proche' ? [undefined, args[1]] : [args[1], args[2]];
const prefixes = mode === 'famille-proche' ? args.slice(2) : mode === 'familles' ? args.slice(3) : [];
if (!sortie || (mode !== 'famille-proche' && !exportPath)) {
  console.error('Usage : npm run captures -- <export.json> <dossier-sortie> [id-de-Moi]');
  console.error('        npm run captures -- --famille-proche <dossier-sortie> [préfixe-de-cas…]');
  console.error('        npm run captures -- --maquettes <dossier-html> <dossier-sortie>');
  console.error('        npm run captures -- --familles <dossier-familles> <dossier-sortie> [préfixe-de-fichier…]');
  process.exit(1);
}

const PORT_VITE = 5199;
const PORT_CDP = 9333;
const BASE = `http://localhost:${PORT_VITE}/Tribu/`;
const NAVIGATEUR = process.env.NAVIGATEUR ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const donnees = mode === 'ecrans' ? readFileSync(exportPath, 'utf-8') : '';
const MOI = mode === 'ecrans' ? (moiArg ?? JSON.parse(donnees).personnes[0]?.id) : undefined;
const dossier = resolve(sortie);
mkdirSync(dossier, { recursive: true });

/** Viewports de téléphone du mode « famille proche ». */
const VIEWPORTS = [
  [320, 640],
  [360, 800],
  [390, 844],
];
const FIXTURES = resolve('tests/fixtures/famille-proche');

/** Appareils du mode « familles » : téléphone, tablette, ordinateur (sans émulation tactile). */
const APPAREILS = [
  { nom: 'telephone', largeur: 390, hauteur: 844, mobile: true },
  { nom: 'tablette', largeur: 820, hauteur: 1180, mobile: true },
  { nom: 'ordinateur', largeur: 1440, hauteur: 900, mobile: false },
];

/**
 * Géométrie réelle de la carte « Famille proche », relative à la carte : nœuds (avatar, nom, années), visibilité
 * (dans la carte, et dans la partie montrée d'une bande qui défile), noms coupés, chevauchements, zoom, défilement.
 */
const MESURE = `(() => {
  const titre = [...document.querySelectorAll('h2.titre-section')].find((t) => t.textContent === 'Famille proche');
  if (!titre) return null;
  const section = titre.parentElement;
  const carte = section.querySelector('.carte.dessin');
  const arbre = carte.querySelector('.arbre');
  const rc = carte.getBoundingClientRect();
  const rel = (r) => ({ x: Math.round(r.left - rc.left), y: Math.round(r.top - rc.top), w: Math.round(r.width), h: Math.round(r.height) });
  const noeuds = [...arbre.querySelectorAll('.noeud')].map((n) => {
    const href = n.getAttribute('href') || '';
    const id = n.classList.contains('ici') ? 'centre' : n.classList.contains('manque') ? '+parent' : href.replace('#/personne/', '');
    const defile = n.closest('.defile');
    const zone = defile ? defile.getBoundingClientRect() : rc;
    const parts = ['.avatar', '.nom', '.an'].map((s) => n.querySelector(s)).filter(Boolean);
    const boites = parts.map((p) => p.getBoundingClientRect());
    // Visible si l'avatar, le nom et les dates tiennent tous dans la carte (et dans la partie montrée de la bande).
    const gauche = Math.min(...boites.map((b) => b.left));
    const droite = Math.max(...boites.map((b) => b.right));
    const visible = gauche >= Math.max(zone.left, rc.left) - 1 && droite <= Math.min(zone.right, rc.right) + 1;
    const nom = n.querySelector('.nom');
    const coupe = !!nom && (nom.scrollHeight > nom.clientHeight + 1 || nom.scrollWidth > nom.clientWidth + 1);
    return { id, nom: nom ? nom.textContent : '', visible, coupe, defile: !!defile, boites: boites.map(rel) };
  });
  const chevauchements = [];
  for (let i = 0; i < noeuds.length; i++)
    for (let j = i + 1; j < noeuds.length; j++) {
      if (!noeuds[i].visible || !noeuds[j].visible) continue;
      for (const a of noeuds[i].boites)
        for (const b of noeuds[j].boites) {
          const l = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (l > 1 && h > 1 && !chevauchements.some((c) => c[0] === noeuds[i].id && c[1] === noeuds[j].id)) chevauchements.push([noeuds[i].id, noeuds[j].id]);
        }
    }
  const bandes = [...arbre.querySelectorAll('.defile')].filter((b) => b.scrollWidth > b.clientWidth + 1).length;
  return {
    sonde: carte.querySelector('.sonde').clientWidth,
    zoom: Number(arbre.style.zoom || 1),
    bandes,
    hors: noeuds.filter((n) => !n.visible).map((n) => n.id),
    coupes: noeuds.filter((n) => n.coupe).map((n) => n.nom),
    chevauchements,
    noeuds: noeuds.map((n) => n.id),
    clip: (() => { const r = section.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height, scale: 1 }; })(),
  };
})()`;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Attend qu'une adresse réponde (serveur de dev, port CDP). */
async function attendre(url, essais = 60) {
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch {
      // pas encore prêt
    }
    await pause(500);
  }
  throw new Error(`Pas de réponse de ${url}`);
}

/** Arrête un processus et ses enfants (npx lance vite dans un sous-processus). */
function arreter(proc) {
  if (!proc?.pid) return;
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    else proc.kill();
  } catch {
    // déjà arrêté
  }
}

const profil = mkdtempSync(join(tmpdir(), 'tribu-captures-'));
const vite = spawn('npx', ['vite', '--port', String(PORT_VITE), '--strictPort'], { shell: true, stdio: 'ignore' });
const edge = spawn(NAVIGATEUR, ['--headless=new', `--remote-debugging-port=${PORT_CDP}`, `--user-data-dir=${profil}`, '--window-size=500,900', 'about:blank'], {
  stdio: 'ignore',
});

try {
  await attendre(BASE);
  await attendre(`http://127.0.0.1:${PORT_CDP}/json/version`);

  const cibles = await (await fetch(`http://127.0.0.1:${PORT_CDP}/json/list`)).json();
  const page = cibles.find((c) => c.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let n = 0;
  const attente = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && attente.has(m.id)) {
      attente.get(m.id)(m);
      attente.delete(m.id);
    }
  });
  const cdp = (method, params = {}) =>
    new Promise((r) => {
      const id = ++n;
      attente.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluer = (expression) => cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  const clic = (texte) => `[...document.querySelectorAll('button, a')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(texte)}))?.click()`;

  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp('Page.navigate', { url: BASE });
  await pause(1500);

  async function capture(nom, route, theme, script = '', hauteur = 844, o = {}) {
    const { largeur = 390, json = donnees, moi = MOI, mesure = false, mobile = true } = o;
    await cdp('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: 2, mobile });
    await evaluer(`localStorage.setItem('tribu:donnees', ${JSON.stringify(json)});
      localStorage.setItem('tribu:reglages', JSON.stringify({ tri: 'prenom', theme: '${theme}', dernierExport: null, moi: '${moi}' }));`);
    await cdp('Page.navigate', { url: BASE + route });
    await pause(300);
    await cdp('Page.reload', { ignoreCache: true });
    await pause(1800);
    if (script) {
      await evaluer(script);
      await pause(900);
    }
    const m = mesure ? (await evaluer(MESURE)).result.result.value : undefined;
    const clip = m?.clip ? { clip: m.clip, captureBeyondViewport: true } : {};
    const { result } = await cdp('Page.captureScreenshot', { format: 'png', ...clip });
    writeFileSync(join(dossier, `${nom}-${theme}.png`), Buffer.from(result.data, 'base64'));
    console.log('ok', `${nom}-${theme}`);
    return m;
  }

  if (mode === 'famille-proche') {
    const cas = JSON.parse(readFileSync(join(FIXTURES, 'cas.json'), 'utf-8')).filter(
      (c) => prefixes.length === 0 || prefixes.some((p) => c.fichier.startsWith(p)),
    );
    const mesures = {};
    for (const c of cas) {
      const json = readFileSync(join(FIXTURES, c.fichier), 'utf-8');
      for (const [largeur, hauteur] of VIEWPORTS)
        for (const theme of ['clair', 'sombre']) {
          const nom = `${c.fichier.replace('.json', '')}-${largeur}`;
          const m = await capture(nom, `#/personne/${c.centre}`, theme, '', hauteur, { largeur, json, moi: c.moi, mesure: true });
          if (theme === 'clair' && m) {
            delete m.clip;
            mesures[nom] = m;
          }
        }
    }
    writeFileSync(join(dossier, 'mesures.json'), JSON.stringify(mesures, null, 1));
  } else if (mode === 'familles') {
    const source = resolve(exportPath);
    const familles = JSON.parse(readFileSync(join(source, 'familles.json'), 'utf-8')).filter(
      (f) => prefixes.length === 0 || prefixes.some((p) => f.fichier.startsWith(p)),
    );
    for (const f of familles) {
      const json = readFileSync(join(source, f.fichier), 'utf-8');
      const fam = f.fichier.replace('.json', '');
      for (const { nom, largeur, hauteur, mobile } of APPAREILS)
        for (const theme of ['clair', 'sombre']) {
          const o = { largeur, json, moi: f.moi, mobile };
          await capture(`${fam}-${nom}-01-accueil`, '#/', theme, '', hauteur, o);
          await capture(`${fam}-${nom}-02-fiche`, `#/personne/${f.moi}`, theme, '', Math.max(hauteur, 1600), o);
          await capture(`${fam}-${nom}-03-personnes`, '#/personnes', theme, '', hauteur, o);
          await capture(`${fam}-${nom}-04-arbre-toi`, '#/arbre', theme, '', hauteur, o);
          await capture(`${fam}-${nom}-05-arbre-tout`, '#/arbre', theme, clic('Tout'), hauteur, o);
        }
    }
  } else if (mode === 'maquettes') {
    const source = resolve(exportPath);
    for (const fichier of readdirSync(source).filter((f) => f.endsWith('.html'))) {
      for (const theme of ['clair', 'sombre']) {
        await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme === 'sombre' ? 'dark' : 'light' }] });
        await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
        await cdp('Page.navigate', { url: pathToFileURL(join(source, fichier)).href });
        await pause(1200);
        const haut = (await evaluer('document.documentElement.scrollHeight')).result.result.value;
        await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: haut, deviceScaleFactor: 2, mobile: true });
        await pause(300);
        const { result } = await cdp('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(dossier, `${fichier.replace('.html', '')}-${theme}.png`), Buffer.from(result.data, 'base64'));
        console.log('ok', `${fichier}-${theme}`);
      }
    }
  } else
    for (const theme of ['clair', 'sombre']) {
      await capture('01-accueil', '#/', theme);
      await capture('02-fiche', `#/personne/${MOI}`, theme, '', 1600);
      await capture('03-proche', `#/personne/${MOI}`, theme, clic('Ajouter un proche'));
      await capture('04-arbre-toi', '#/arbre', theme);
      await capture('05-arbre-tout', '#/arbre', theme, clic('Tout'));
      await capture('06-arbre-familles', '#/arbre', theme, clic('Familles'));
      await capture('07-reglages', '#/reglages', theme, '', 1200);
    }
  await evaluer('localStorage.clear()');
  ws.close();
  console.log(`Captures dans ${dossier}`);
} finally {
  arreter(edge);
  arreter(vite);
  await pause(1500);
  try {
    rmSync(profil, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {
    console.warn(`Profil temporaire d'Edge à effacer à la main : ${profil}`);
  }
}
