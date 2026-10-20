// Captures d'écran de Tribu (TEST-06), sans rien écrire dans le projet.
// npm run captures -- <export.json> <dossier-sortie> [id-de-Moi]
// Lance le serveur de dev (port 5199) et Edge headless, remplit le localStorage
// par CDP, puis capture chaque écran en 390×844, DPR 2, clair et sombre.
// L'export et le dossier de sortie restent hors du dépôt (données réelles).
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [exportPath, sortie, moiArg] = process.argv.slice(2);
if (!exportPath || !sortie) {
  console.error('Usage : npm run captures -- <export.json> <dossier-sortie> [id-de-Moi]');
  process.exit(1);
}

const PORT_VITE = 5199;
const PORT_CDP = 9333;
const BASE = `http://localhost:${PORT_VITE}/Tribu/`;
const NAVIGATEUR = process.env.NAVIGATEUR ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const donnees = readFileSync(exportPath, 'utf-8');
const MOI = moiArg ?? JSON.parse(donnees).personnes[0]?.id;
const dossier = resolve(sortie);
mkdirSync(dossier, { recursive: true });

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

  async function capture(nom, route, theme, script = '', hauteur = 844) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: hauteur, deviceScaleFactor: 2, mobile: true });
    await evaluer(`localStorage.setItem('tribu:donnees', ${JSON.stringify(donnees)});
      localStorage.setItem('tribu:reglages', JSON.stringify({ tri: 'prenom', theme: '${theme}', dernierExport: null, moi: '${MOI}' }));`);
    await cdp('Page.navigate', { url: BASE + route });
    await pause(300);
    await cdp('Page.reload', { ignoreCache: true });
    await pause(1800);
    if (script) {
      await evaluer(script);
      await pause(900);
    }
    const { result } = await cdp('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(dossier, `${nom}-${theme}.png`), Buffer.from(result.data, 'base64'));
    console.log('ok', `${nom}-${theme}`);
  }

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
