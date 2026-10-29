# Tribu

PWA personnelle, sur téléphone, pour noter les liens familiaux de ses proches :
fiches personnes, couples actuels et passés, parents et enfants (biologiques ou
adoptifs), décès, groupes d'amis. Les frères et sœurs et la famille élargie sont
déduits des parents. Un arbre global montre toute la famille et les amis.

Les données restent sur l'appareil (localStorage), sans compte ni serveur.

**Pense à exporter régulièrement** (Réglages → Exporter) : l'export JSON est la
seule sauvegarde. Sur iPhone, Safari peut effacer les données d'un site visité
dans le navigateur au bout de quelques jours sans visite : installe l'appli sur
l'écran d'accueil (Partager → Sur l'écran d'accueil) pour les garder.

TypeScript sans framework, Vite, vite-plugin-pwa, Vitest.

## Commandes

```sh
npm install
npm run dev            # serveur de développement
npm test               # tests Vitest
npm run build          # vérification des types puis build de production (dist/)
npm run preview        # sert le build en local, pour tester la PWA et la CSP
npm run format:check   # vérifie la mise en forme (Prettier), sans rien modifier
npm run captures -- <export.json> <dossier> [id-de-Moi]
                       # captures d'écran clair et sombre (Edge headless, port 5199)
```

Le script de captures lance lui-même le serveur de dev et Edge. L'export et le
dossier de sortie doivent rester hors du dépôt : ils contiennent des données réelles.

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
  "version": 6,
  "personnes": [
    { "id": "…", "prenom": "Anne", "nom": "Martin", "nomNaissance": "Roux", "sexe": "F", "naissance": "1950-05", "lieuNaissance": "Nantes", "deces": "2020", "lieuDeces": "Brest", "note": "" },
    { "id": "…", "prenom": "Louis", "nom": "Martin", "sexe": "M", "naissance": "--10-24", "decede": true, "note": "", "sansRappel": true, "ignorerIncomplet": true },
    { "id": "…", "prenom": "", "nom": "", "note": "", "inconnu": true },
    { "id": "…", "prenom": "Parent inconnu", "nom": "", "note": "", "sansNom": true }
  ],
  "unions": [
    { "id": "…", "personneA": "…", "personneB": "…", "marie": true, "statut": "actuelle", "date": "2010-06-12", "lieu": "Valbrume" },
    { "id": "…", "personneA": "…", "personneB": "…", "marie": false, "statut": "separee" }
  ],
  "filiations": [
    { "id": "…", "parent": "…", "enfant": "…", "type": "biologique" }
  ],
  "groupes": [
    { "id": "…", "nom": "Lycée", "membres": ["…", "…"] }
  ]
}
```

- `naissance` et `deces` (facultatifs) : `AAAA`, `AAAA-MM`, `AAAA-MM-JJ`, ou `--MM-JJ`
  (jour et mois sans année).
- `decede: true` : décès sans date connue (absent quand `deces` est rempli).
- `nomNaissance` (facultatif) : nom de naissance, pour tous (« nom de jeune fille » pour une femme) ; jamais égal à `nom`, qui est le nom d'usage.
- `lieuNaissance`, `lieuDeces` (facultatifs) : texte libre ; `lieuDeces` seulement pour une personne décédée.
- `ignorerIncomplet: true` : la personne ne figure plus dans « À compléter ». `sansRappel: true` : aucun rappel de ses dates
  (anniversaire, fête, décès, unions).
- `sexe` (facultatif) : `F` ou `M`.
- `inconnu: true` : parent inconnu, créé en coulisse pour relier des frères et sœurs
  dont on ignore les parents ; jamais affiché.
- `sansNom: true` : parent sans nom enregistré (le « ? » de l'arbre), affiché comme une personne.
- Unions : `date` (facultative) : `AAAA`, `AAAA-MM`, `AAAA-MM-JJ` ou `--MM-JJ` ; `statut` vaut `actuelle` (une seule avec un vivant par personne : un veuf ou
  une veuve remarié garde aussi son union avec le défunt) ou `separee` (un ex, sans limite de nombre) ; `lieu` (facultatif)
  seulement pour un mariage.
- `type` d'une filiation : `biologique` ou `adoptif` ; au plus deux parents par type.
- Groupes d'amis : au moins deux membres, tous amis entre eux ; une personne dans un
  seul groupe ; `nom` peut être vide.

L'import est fusionné avec les données existantes (questions en cas de conflit ou de doute), après validation complète du fichier. Un export
plus ancien (version 1 à 5) est converti à l'import, sans perte ; seul disparaît, en version 6, un « ? » vide dont chaque enfant
a déjà un autre parent. Au premier chargement en version 6, une copie des données v5 est gardée sous `tribu:donnees:v5`.
Les réglages (tri, thème, « Moi », date du dernier export) ne font pas partie de la sauvegarde.

Si les données stockées deviennent illisibles, l'appli ne les écrase pas : elle
en garde une copie sous la clé `tribu:secours` et propose de les exporter telles
quelles dans `tribu-secours-AAAA-MM-JJ.txt`.
