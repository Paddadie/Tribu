// Génère les maquettes statiques S1.html, S2.html, S3.html (cas 1, 5, 6, 10, 12, 15, 17 en 360 px) à partir des
// fixtures de tests/fixtures/famille-proche, et affiche la largeur de chaque cas aux trois largeurs de téléphone.
// node docs/maquettes/famille-proche/generer.mjs
// Captures : npm run captures -- --maquettes docs/maquettes/famille-proche <dossier-de-sortie>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE, disposer, famille, rendu } from './prototype.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(ICI, '../../../tests/fixtures/famille-proche');
const CAS = JSON.parse(readFileSync(join(FIXTURES, 'cas.json'), 'utf-8'));
const BUDGETS = { 320: 254, 360: 294, 390: 324 };
const MONTRES = ['01', '05', '06', '10', '12', '15', '17'];

export const STRATEGIES = {
  S1: {
    nom: 'Une rangée par génération',
    principe:
      "Parents, puis fratrie avec la personne et ses partenaires, puis enfants : une rangée chacun, chaque groupe sous son couple. Au-delà de la largeur, le cadre défile de côté, ouvert sur la personne.",
  },
  S2: {
    nom: 'Rangées repliées',
    principe:
      "Comme S1, mais une fratrie ou des enfants trop nombreux passent sur une deuxième ligne, sous le même couple (la descente traverse par un couloir). Le cadre ne défile que si une rangée insécable ne tient pas : les parents avec leurs autres partenaires, ou la personne avec les siens (seuil : 5 personnes, 4 en 320 px).",
  },
  S3: {
    nom: 'Tronc et branches',
    principe:
      "Le tronc (parents, frères et sœurs, la personne, ses partenaires et enfants) tient toujours dans la largeur. Chaque autre couple d'un parent descend en branche sous le tronc, reliée à ce parent par un rail sur la marge. Jamais de défilement.",
  },
};

export const lire = (c) => JSON.parse(readFileSync(join(FIXTURES, c.fichier), 'utf-8'));
export const cas = CAS;
export const budgets = BUDGETS;

/** Carte « Famille proche » d'un cas, pour une stratégie et une largeur de dessin. */
export function carte(c, strategie, budget) {
  const fam = famille(lire(c), c.centre, c.moi);
  const dispo = disposer(fam, strategie, budget);
  const cachees = dispo.defile ? dispo.noeuds.filter((n) => n.x - 28 < 0 || n.x + 28 > budget).length : 0;
  const indice = dispo.defile
    ? `<div class="indice"><i><b style="left:${0}%;width:${Math.round((100 * budget) / dispo.largeur)}%"></b></i>Glisse pour voir toute la famille</div>`
    : '';
  return { dispo, html: `<div class="fp-carte">${rendu(dispo)}${indice}</div>`, cachees };
}

function page(strategie) {
  const s = STRATEGIES[strategie];
  const cartes = CAS.filter((c) => MONTRES.includes(c.fichier.slice(0, 2)))
    .map((c) => {
      const { html } = carte(c, strategie, BUDGETS[360]);
      return `<section><h2>${c.fichier.slice(0, 2)} · ${c.titre}</h2><p class="fp-titre">Famille proche</p>${html}</section>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Famille proche ${strategie}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&display=swap" rel="stylesheet">
<style>${STYLE}
body{margin:0;padding:16px;background:var(--fond);color:var(--encre);font:14px/1.4 'Figtree',system-ui,sans-serif}
h1{font-size:18px;margin:0 0 4px}.principe{color:var(--secondaire);margin:0 0 20px;font-size:13px}
section{margin:0 0 28px}h2{font-size:13px;font-weight:600;margin:0 0 12px;color:var(--secondaire)}
</style></head><body>
<h1>${strategie} · ${s.nom}</h1><p class="principe">${s.principe}</p>
${cartes}
<script>for(const c of document.querySelectorAll('.cadre.defile')){c.scrollLeft=Number(c.dataset.ici)-c.clientWidth/2;const b=c.parentElement.querySelector('.indice b');if(b)b.style.left=(100*c.scrollLeft/c.scrollWidth)+'%'}</script>
</body></html>`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const s of Object.keys(STRATEGIES)) writeFileSync(join(ICI, `${s}.html`), page(s));
  // Largeur de chaque cas : la largeur de S1 décide du défilement ; S2 défile si la rangée des parents déborde.
  const lignes = [];
  for (const c of CAS) {
    const cols = [];
    for (const [l, b] of Object.entries(BUDGETS)) {
      const r = Object.keys(STRATEGIES).map((s) => {
        const d = carte(c, s, b).dispo;
        return d.defile ? `${s} ${d.largeur}` : `${s} ok${d.lignes.g1 + d.lignes.g2 > 2 ? ` (${d.lignes.g1}+${d.lignes.g2} l.)` : ''} h${d.hauteur}`;
      });
      cols.push(`${l}: ${r.join(', ')}`);
    }
    lignes.push(`${c.fichier.slice(0, 2)}  ${cols.join(' | ')}`);
  }
  console.log(lignes.join('\n'));
}
