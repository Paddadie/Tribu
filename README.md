# Tribu

PWA personnelle, sur téléphone, pour noter les liens familiaux de ses proches :
fiches personnes, couples, parents et enfants (biologiques ou adoptifs).
Les frères et sœurs sont déduits des parents. Les données restent sur l'appareil
(localStorage), sans compte ni serveur ; on les sauvegarde par export JSON.

TypeScript sans framework, Vite, vite-plugin-pwa, Vitest.

## Commandes

```sh
npm install
npm run dev       # serveur de développement
npm test          # tests Vitest
npm run build     # vérification des types puis build de production (dist/)
npm run preview   # sert le build en local, pour tester la PWA et la CSP
```

## Déploiement

GitHub Pages, par le workflow `.github/workflows/deploy.yml` à chaque push sur `main`
(tests, build, publication). L'appli est servie sous `/Tribu/` : la valeur `base`
de `vite.config.ts` doit rester égale au nom du dépôt. Elle se met à jour toute
seule à l'ouverture suivante.

La politique de sécurité du contenu (CSP) est ajoutée au build seulement : la
vérifier avec `npm run preview`, pas avec `npm run dev`.

## Format des sauvegardes

Export depuis Réglages, dans un fichier `tribu-AAAA-MM-JJ.json` :

```json
{
  "version": 1,
  "personnes": [
    { "id": "…", "prenom": "Anne", "nom": "Martin", "note": "", "naissance": "1980-05", "sexe": "F" }
  ],
  "unions": [
    { "id": "…", "personneA": "…", "personneB": "…", "marie": true }
  ],
  "filiations": [
    { "id": "…", "parent": "…", "enfant": "…", "type": "biologique" }
  ]
}
```

- `naissance` (facultatif) : `AAAA`, `AAAA-MM` ou `AAAA-MM-JJ`.
- `sexe` (facultatif) : `F` ou `M`.
- `type` d'une filiation : `biologique` ou `adoptif` ; au plus deux parents par type.
- Une personne n'a qu'une union à la fois.

L'import remplace toutes les données, après validation complète du fichier.
Les réglages (tri, thème, date du dernier export) ne font pas partie de la sauvegarde.

Si les données stockées deviennent illisibles, l'appli ne les écrase pas : elle
en garde une copie sous la clé `tribu:secours` et propose de les exporter telles
quelles dans `tribu-secours-AAAA-MM-JJ.txt`.
