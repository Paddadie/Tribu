// Familles fictives de référence (V4, lot 0), en exports JSON prêts à importer ou à capturer.
// npm run familles -- <dossier-sortie>
// Écrit un <fichier>.json par famille (src/modele/test/familles.ts, tirées par graine : identiques à chaque fois)
// et l'index familles.json ([{ fichier, nom, moi }]) lu par `npm run captures -- --familles`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const [sortie] = process.argv.slice(2);
if (!sortie) {
  console.error('Usage : npm run familles -- <dossier-sortie>');
  process.exit(1);
}

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dossier = resolve(sortie);
const vite = await createServer({ root: racine, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { famillesDeReference } = await vite.ssrLoadModule('/src/modele/test/familles.ts');
  mkdirSync(dossier, { recursive: true });
  const index = [];
  for (const f of famillesDeReference()) {
    writeFileSync(join(dossier, `${f.fichier}.json`), JSON.stringify(f.donnees, null, 2) + '\n');
    index.push({ fichier: `${f.fichier}.json`, nom: f.nom, moi: f.moi });
    console.log(`${f.fichier}.json : ${f.donnees.personnes.length} personnes`);
  }
  writeFileSync(join(dossier, 'familles.json'), JSON.stringify(index, null, 2) + '\n');
  console.log(`Familles dans ${dossier}`);
} finally {
  await vite.close();
}
