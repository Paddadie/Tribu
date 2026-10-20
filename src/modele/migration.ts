// Changements de format des données. `migrer` amène un contenu lu (stockage ou import) à la
// version courante, avant la validation : un ancien export reste donc importable.
// Elle ne vérifie rien et ne lève jamais d'erreur : un contenu inconnu ressort tel quel et c'est
// la validation qui le refuse.

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * v1 → v2 : chaque union reçoit un statut. Elles étaient toutes « actuelles » en v1 (une séparation
 * effaçait l'union) ; si une personne en avait pourtant plusieurs, seule la première reste actuelle,
 * pour que le fichier reste lisible sans rien perdre.
 */
function v1versV2(v: Record<string, unknown>): Record<string, unknown> {
  const unions = Array.isArray(v.unions) ? v.unions : [];
  const enCouple = new Set<unknown>();
  const migrees = unions.map((u) => {
    if (!estObjet(u)) return u;
    const libres = !enCouple.has(u.personneA) && !enCouple.has(u.personneB);
    if (libres) {
      enCouple.add(u.personneA);
      enCouple.add(u.personneB);
    }
    return { ...u, statut: libres ? 'actuelle' : 'separee' };
  });
  return { ...v, version: 2, unions: migrees };
}

/** v2 → v3 : apparition des amitiés, aucune au départ. */
function v2versV3(v: Record<string, unknown>): Record<string, unknown> {
  return { ...v, version: 3, amities: [] };
}

/**
 * v3 → v4 : les amitiés deux à deux deviennent des groupes d'amis. Chaque ensemble de personnes reliées
 * par des amitiés (transitivement) forme un groupe sans nom : les amis d'amis rejoignent donc le même groupe.
 */
function v3versV4(v: Record<string, unknown>): Record<string, unknown> {
  const { amities, ...reste } = v;
  const chef = new Map<unknown, unknown>();
  const trouver = (x: unknown): unknown => {
    let r = x;
    while (chef.has(r) && chef.get(r) !== r) r = chef.get(r);
    return r;
  };
  const ordre: unknown[] = [];
  for (const a of Array.isArray(amities) ? amities : []) {
    if (!estObjet(a)) continue;
    for (const x of [a.personneA, a.personneB]) {
      if (!chef.has(x)) {
        chef.set(x, x);
        ordre.push(x);
      }
    }
    chef.set(trouver(a.personneA), trouver(a.personneB));
  }
  const parGroupe = new Map<unknown, unknown[]>();
  for (const x of ordre) parGroupe.set(trouver(x), [...(parGroupe.get(trouver(x)) ?? []), x]);
  const groupes = [...parGroupe.values()].map((membres) => ({ id: crypto.randomUUID(), nom: '', membres }));
  return { ...reste, version: 4, groupes };
}

/**
 * v4 → v5 : le parent sans nom enregistré n'est plus reconnu à son prénom mais à `sansNom: true`.
 * Mêmes critères qu'avant : prénom « Parent inconnu », nom vide, pas un parent inconnu caché.
 */
function v4versV5(v: Record<string, unknown>): Record<string, unknown> {
  const personnes = Array.isArray(v.personnes) ? v.personnes : [];
  const migrees = personnes.map((p) => (estObjet(p) && p.prenom === 'Parent inconnu' && !p.nom && !p.inconnu ? { ...p, sansNom: true } : p));
  return { ...v, version: 5, personnes: migrees };
}

export function migrer(brut: unknown): unknown {
  let v = brut;
  if (estObjet(v) && v.version === 1) v = v1versV2(v);
  if (estObjet(v) && v.version === 2) v = v2versV3(v);
  if (estObjet(v) && v.version === 3) v = v3versV4(v);
  if (estObjet(v) && v.version === 4) v = v4versV5(v);
  return v;
}
