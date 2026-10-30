// Prépare les données de la page des maquettes (voir mockups/README.md).
//   node mockups/preparer.mjs                        → js/familles-reference.js (familles fictives, versionné)
//   node mockups/preparer.mjs <export.json> <id-Moi> → en plus local/donnees.js (tes données, ignoré par Git)
// Les familles de référence viennent de src/modele/test/familles.ts, chargé par Vite comme dans mesurer.mjs.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ici = dirname(fileURLToPath(import.meta.url));
const [exportJson, moi] = process.argv.slice(2);
const vite = await createServer({ root: resolve(ici, '..'), configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { famillesDeReference } = await vite.ssrLoadModule('/src/modele/test/familles.ts');
  const { migrer } = await vite.ssrLoadModule('/src/modele/migration.ts');
  const familles = famillesDeReference().map((f) => ({ fichier: f.fichier, donnees: f.donnees, moi: f.moi }));
  writeFileSync(
    resolve(ici, 'js/familles-reference.js'),
    '// Généré par mockups/preparer.mjs depuis src/modele/test/familles.ts (familles fictives). Ne pas modifier à la main.\n' +
      'window.FAMILLES_REFERENCE = ' + JSON.stringify(familles) + ';\n',
  );
  console.log(`js/familles-reference.js : ${familles.length} familles fictives.`);
  if (exportJson) {
    const brut = JSON.parse(readFileSync(exportJson, 'utf8'));
    const donnees = migrer(brut.donnees || brut);
    mkdirSync(resolve(ici, 'local'), { recursive: true });
    writeFileSync(resolve(ici, 'local/donnees.js'), 'window.DONNEES_LOCALES = ' + JSON.stringify({ donnees, moi: moi || null }) + ';\n');
    console.log(`local/donnees.js : ${donnees.personnes.length} personnes (dossier ignoré par Git).`);
  }
} finally {
  await vite.close();
}
