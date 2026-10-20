// Fixture anonymisée de l'arbre global (ARCH-05), à partir d'un vrai export resté hors du dépôt.
// npm run anonymiser -- <export.json> <Moi : id ou « Prénom Nom »>
// Écrit src/modele/fixtures/arbre-anonyme.json (versionné) et vérifie que l'arbre global se dispose
// exactement comme celui de l'export. Les modules TypeScript sont chargés par Vite (src/modele/anonymiser.ts).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const [exportPath, moiArg] = process.argv.slice(2);
if (!exportPath || !moiArg) {
  console.error('Usage : npm run anonymiser -- <export.json> <Moi : id ou « Prénom Nom »>');
  process.exit(1);
}

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sortie = resolve(racine, 'src/modele/fixtures/arbre-anonyme.json');
const vite = await createServer({ root: racine, configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { migrer } = await vite.ssrLoadModule('/src/modele/migration.ts');
  const { anonymiser, ID_MOI } = await vite.ssrLoadModule('/src/modele/anonymiser.ts');
  const { disposerArbre } = await vite.ssrLoadModule('/src/modele/arbreGlobal.ts');

  const donnees = migrer(JSON.parse(readFileSync(exportPath, 'utf-8')));
  const moi = donnees.personnes.find((p) => p.id === moiArg || `${p.prenom} ${p.nom}`.trim() === moiArg.trim());
  if (!moi) throw new Error(`Moi introuvable dans l'export : ${moiArg}`);
  const anonyme = anonymiser(donnees, moi.id);

  // Même disposition, personne par personne (l'ordre des personnes est gardé).
  const rang = (ps, id) => ps.findIndex((p) => p.id === id);
  const places = (d, m) => disposerArbre(d, m).places.map((pl) => ({ rang: rang(d.personnes, pl.personne.id), x: pl.x, y: pl.y }));
  const [avant, apres] = [places(donnees, moi.id), places(anonyme, ID_MOI)];
  const ecarts = avant.filter((p, i) => !apres[i] || apres[i].rang !== p.rang || Math.abs(apres[i].x - p.x) > 1e-9 || apres[i].y !== p.y);
  if (avant.length !== apres.length || ecarts.length > 0) {
    throw new Error(`La disposition change après anonymisation (${ecarts.length} place(s) sur ${avant.length}) : fixture non écrite.`);
  }

  mkdirSync(dirname(sortie), { recursive: true });
  writeFileSync(sortie, JSON.stringify(anonyme, null, 2) + '\n');
  console.log(`${anonyme.personnes.length} personnes, ${avant.length} placées, disposition identique.`);
  console.log(`Écrit : ${sortie}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await vite.close();
}
